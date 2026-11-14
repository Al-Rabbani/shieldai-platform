"""Bind a tenant onto a database session so RLS policies can be enforced (R2).

The API, worker and kernel all connect as role 'gds', which owns these tables, so RLS
only applies once a table is set to FORCE. Once forced, a session with no tenant bound
sees ZERO rows rather than an error (measured: security_findings 0 vs 153,
mission_results 0 vs 144). Anything that reads or writes a forced table must therefore
bind first, or it will silently observe nothing.

TWO MECHANISMS, because binding a session is not enough on its own:

1. bind_tenant(session, tenant_id) sets gds.tenant_id on one session's connection.

2. use_tenant(tenant_id) scopes a BLOCK. While the block runs, an engine-level "begin"
   listener binds gds.tenant_id on every new transaction, so modules that open their own
   session deep inside a worker task (memory.py, incidents.py, evidence.py and roughly
   twenty others) are covered even though they know nothing about tenancy.

   Propagation is deliberately block-scoped and NOT a side effect of bind_tenant. An earlier
   version of this module had bind_tenant set the ContextVar, and testing caught it failing
   closed in exactly the way that matters: after the block exited the context was still set,
   so a later unbound session saw 153 findings instead of 0. In a worker that processes two
   tenants in sequence, that is one tenant's rows appearing inside another tenant's task.
   bind_tenant therefore never touches ambient state.

CAVEAT that must be understood before relying on the ContextVar: it is task-local, not
thread-local or global. Code that spawns a NEW asyncio task starts with an empty context and
will NOT inherit the tenant; such a task must call bind_tenant (or use use_tenant) itself.
This is deliberate - inheriting silently across a task boundary is how one tenant's query
ends up running under another tenant.
"""
import contextvars
from contextlib import contextmanager
from typing import Any
from uuid import UUID

from sqlalchemy import event, text

from gds_api.db import engine


class TenantBindingError(Exception):
    """Raised when a tenant cannot be established. Fail closed; never run unscoped."""


_current_tenant: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "gds_current_tenant", default=None
)


def normalise_tenant_id(tenant_id: Any) -> str:
    if tenant_id is None:
        raise TenantBindingError("No tenant_id available; refusing to run without tenant context")
    if isinstance(tenant_id, UUID):
        return str(tenant_id)
    value = str(tenant_id).strip()
    if not value:
        raise TenantBindingError("Empty tenant_id; refusing to run without tenant context")
    return value


async def bind_tenant(session: Any, tenant_id: Any) -> str:
    """Bind THIS session only. Ambient state is untouched - see use_tenant()."""
    value = normalise_tenant_id(tenant_id)
    await session.execute(
        text("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": value}
    )
    return value


async def current_bound_tenant(session: Any) -> str | None:
    """Read back the tenant actually set on this connection, for assertions."""
    result = await session.execute(
        text("SELECT NULLIF(current_setting('gds.tenant_id', true), '')")
    )
    return result.scalar()


def current_context_tenant() -> str | None:
    """The tenant this task is scoped to, or None."""
    return _current_tenant.get()


@contextmanager
def use_tenant(tenant_id: Any):
    """Scope a block to one tenant, including sessions opened inside it.

    Use this where a tenant is known before the first query (a workflow parameter, for
    example). It resets on exit so the scope cannot outlive the block.
    """
    value = normalise_tenant_id(tenant_id)
    token = _current_tenant.set(value)
    try:
        yield value
    finally:
        _current_tenant.reset(token)


@event.listens_for(engine.sync_engine, "begin")
def _bind_tenant_on_transaction_begin(connection):
    """Bind gds.tenant_id on any NEW transaction opened inside a tenant-scoped task.

    Registered against the ConnectionEvents "begin" event rather than Session.after_begin:
    it fires for every transaction on every connection this engine hands out, including
    sessions opened by modules that know nothing about tenancy.

    Session-level set_config (is_local=false) so the value survives the commits these code
    paths perform; db.py uses NullPool, so the connection is discarded when the session
    closes and the value cannot leak to another tenant.
    """
    tenant = _current_tenant.get()
    if not tenant:
        return
    # Validated as a UUID before interpolation: UUID() accepts only hex digits and dashes,
    # so the literal cannot carry injected SQL. exec_driver_sql bypasses SQLAlchemy's
    # paramstyle translation, which is why a bound parameter is not used here.
    try:
        safe = str(UUID(tenant))
    except (ValueError, AttributeError, TypeError) as exc:
        raise TenantBindingError("Invalid tenant id in context") from exc
    connection.exec_driver_sql(f"SELECT set_config('gds.tenant_id', '{safe}', false)")
