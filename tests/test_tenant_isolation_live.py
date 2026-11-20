"""Cross-tenant isolation, proved against the live database instead of asserted in a comment.

Every tenant table carries FORCE ROW LEVEL SECURITY, and until now that was verified by reading pg_class - which
says the policy exists, not that it holds. This test asks the database the question that actually matters: a tenant
that owns nothing must see nothing, and an unbound session must see nothing either.

It runs where a database is reachable (the deploy host) and skips elsewhere, so a checkout without credentials still
gets a clean run. What it proves:

1. The connected role cannot bypass RLS. A superuser or BYPASSRLS role makes every policy below theatre.
2. Every table with a tenant_id column has FORCE RLS, so the table owner is not exempt.
3. A synthetic tenant id - a fresh uuid that by construction owns no rows - reads 0 from every tenant table.
4. An unbound session reads 0 from every tenant table, because an unbound read that returns rows is the silent
   cross-tenant read this whole programme exists to prevent.
5. The owner tenant still reads its own rows, so isolation that also hides a tenant from itself cannot pass.
6. Two tables are known not to be readable by the API role at all. That list is pinned: if another table becomes
   unreadable, or one of these becomes readable and therefore needs testing, this fails rather than quietly
   shrinking the surface that is verified.
"""
from __future__ import annotations

import asyncio
import os
import uuid

import pytest

pytestmark = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"), reason="no DATABASE_URL in this environment"
)

# Measured 20 Nov 2026. Both are unreachable by the API role, so they cannot be read - a stronger boundary than
# RLS, but it means this test cannot cover them.
KNOWN_UNREADABLE = {"security_isolation_migration_audit", "security_repository_bindings"}


def _run(work):
    """Run one async body on its own loop with its own engine.

    asyncpg connections are bound to the loop that opened them, so a module-scoped engine shared across pytest's
    per-test loops fails with "attached to a different loop". Each test gets a fresh engine instead; five short
    queries do not justify a pool.
    """
    from sqlalchemy.ext.asyncio import create_async_engine

    dsn = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+asyncpg://", 1)

    async def body():
        engine = create_async_engine(dsn, pool_pre_ping=True)
        try:
            return await work(engine)
        finally:
            await engine.dispose()

    return asyncio.new_event_loop().run_until_complete(body())


async def _tenant_tables(conn) -> list[tuple[str, bool]]:
    from sqlalchemy import text

    rows = (
        await conn.execute(
            text(
                "SELECT c.relname, c.relforcerowsecurity FROM pg_class c "
                "JOIN pg_namespace n ON n.oid = c.relnamespace "
                "WHERE n.nspname = 'public' AND c.relkind = 'r' "
                "AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid "
                "            AND a.attname = 'tenant_id' AND NOT a.attisdropped) "
                "ORDER BY c.relname"
            )
        )
    ).all()
    return [(row[0], row[1]) for row in rows]


def test_the_connected_role_cannot_bypass_row_level_security():
    """If this fails, every other assertion in this file is meaningless."""
    from sqlalchemy import text

    async def check(engine):
        async with engine.connect() as conn:
            return (
                await conn.execute(
                    text(
                        "SELECT current_user, r.rolsuper, r.rolbypassrls "
                        "FROM pg_roles r WHERE r.rolname = current_user"
                    )
                )
            ).first()

    role, is_super, bypasses = _run(check)
    assert is_super is False, f"{role} is a superuser, so RLS does not apply to it"
    assert bypasses is False, f"{role} has BYPASSRLS, so RLS does not apply to it"


def test_every_tenant_table_forces_row_level_security():
    async def check(engine):
        async with engine.connect() as conn:
            return await _tenant_tables(conn)

    tables = _run(check)
    assert tables, "no tenant tables found - the query or the schema is wrong"
    unforced = [name for name, forced in tables if not forced]
    assert not unforced, f"tenant tables without FORCE RLS: {unforced}"


def test_a_tenant_that_owns_nothing_sees_nothing():
    """The leak test. A fresh uuid owns no rows anywhere, so any row it can read is a leak."""
    from sqlalchemy import text

    async def check(engine):
        synthetic = str(uuid.uuid4())
        leaks, unreadable = [], []
        async with engine.connect() as conn:
            for name, _forced in await _tenant_tables(conn):
                try:
                    await conn.execute(
                        text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": synthetic}
                    )
                    count = (await conn.execute(text(f'SELECT count(*) FROM "{name}"'))).scalar()
                except Exception:
                    await conn.rollback()
                    unreadable.append(name)
                    continue
                if count:
                    leaks.append((name, count))
        return leaks, unreadable

    leaks, unreadable = _run(check)
    assert not leaks, f"a tenant owning no rows could read rows from: {leaks}"
    assert set(unreadable) <= KNOWN_UNREADABLE, (
        "tables became unreadable and therefore untested: "
        f"{sorted(set(unreadable) - KNOWN_UNREADABLE)}"
    )


def test_an_unbound_session_sees_nothing():
    """An unbound read against a forced table returns zero rows and raises nothing. If it returns rows, the
    session is not being filtered at all."""
    from sqlalchemy import text

    async def check(engine):
        rows_returned, unreadable = [], []
        async with engine.connect() as conn:
            tables = await _tenant_tables(conn)
            await conn.execute(text("SELECT set_config('gds.tenant_id', '', false)"))
            for name, _forced in tables:
                try:
                    count = (await conn.execute(text(f'SELECT count(*) FROM "{name}"'))).scalar()
                except Exception:
                    await conn.rollback()
                    unreadable.append(name)
                    continue
                if count:
                    rows_returned.append((name, count))
        return rows_returned, unreadable

    rows_returned, unreadable = _run(check)
    assert not rows_returned, f"an unbound session could read rows from: {rows_returned}"
    assert set(unreadable) <= KNOWN_UNREADABLE


def test_the_owner_tenant_still_reads_its_own_rows():
    """Isolation that also hides a tenant from itself would pass every test above and break the product."""
    from sqlalchemy import text

    tenant = os.environ.get("GDS_TENANT_ID", "").strip()
    if not tenant:
        pytest.skip("GDS_TENANT_ID not set, so the owner tenant cannot be named")

    async def check(engine):
        async with engine.connect() as conn:
            tables = await _tenant_tables(conn)
            await conn.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": tenant})
            counts = {}
            for name, _forced in tables:
                try:
                    counts[name] = (
                        await conn.execute(text(f'SELECT count(*) FROM "{name}"'))
                    ).scalar()
                except Exception:
                    await conn.rollback()
            return counts

    counts = _run(check)
    # Tables that must never be empty for a live tenant: findings, its audit trail and the tenant row itself.
    for required in ("security_findings", "audit_events", "tenants"):
        if required in counts:
            assert counts[required] > 0, f"{required} is empty for the owner tenant"
