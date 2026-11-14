"""Bind a tenant onto a database session so RLS policies can be enforced (R2).

The API, worker and kernel all connect as role 'gds', which owns these tables, so RLS
only applies once a table is set to FORCE. Once forced, a session with no tenant bound
sees ZERO rows rather than an error (measured: security_findings 0 vs 153,
mission_results 0 vs 144). Anything that reads or writes a forced table must therefore
bind first, or it will silently observe nothing.

Binding is session-level (is_local=false) so it survives a commit inside a long activity.
db.py uses NullPool, so each session gets a fresh connection that is discarded afterwards
and the context cannot leak into another tenant's work.
"""
from typing import Any
from uuid import UUID

from sqlalchemy import text


class TenantBindingError(Exception):
    """Raised when a tenant cannot be established. Fail closed; never run unscoped."""


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
    """Set gds.tenant_id on this session's connection. Returns the normalised id."""
    value = normalise_tenant_id(tenant_id)
    await session.execute(
        text("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": value}
    )
    return value


async def current_bound_tenant(session: Any) -> str | None:
    """Read back the bound tenant, for assertions and diagnostics."""
    result = await session.execute(
        text("SELECT NULLIF(current_setting('gds.tenant_id', true), '')")
    )
    return result.scalar()
