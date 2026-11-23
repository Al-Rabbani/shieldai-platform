"""P1-3: every table either isolates by tenant or is on a written allowlist.

MEASURED BEFORE THIS (23 Nov 2026): 9 of 102 tables had no tenant_id. Four are correctly global - the compliance
framework and control catalogues, schema_migrations, and tenants itself - and five carried tenant data with no
isolation at all: incident_findings (20 rows, joining incidents to findings), repository_policies (1), workspace_policies
(1), security_incidents (1, legacy, no foreign key), engagement_targets (0). platform_data.py had already excluded
security_incidents from tenant-scoped reads and said why, so that absence was stated; the other four were simply
unprotected and nothing in the product said so.

Migration 078 gave all five a tenant_id, backfilled it from the parent row (0 unresolvable in every case), made it NOT
NULL, and enabled FORCE RLS with the NULLIF policy this repo uses everywhere. These tests hold that line: a new table
without isolation fails here rather than being discovered by a customer.

Two corrections to my own first attempt, both caught by running it:
  - scanning migration FILES for unguarded policies flagged 035/036/037, which each created one and were each
    replaced by a later migration. The files no longer decide anything, so the file check is scoped to 078 onwards
    and the live pg_policies check is the one that counts.
  - counting rows as `postgres` proves nothing: a superuser bypasses row-level security outright. The unbound-read
    test now does SET ROLE gds, and then also binds a real tenant to show the zero is isolation rather than an
    empty table.
"""
from __future__ import annotations

import pathlib

import pytest

REPO = pathlib.Path(__file__).resolve().parent.parent
MIGRATION = REPO / "migrations/security_isolation/078_tenant_isolation_last_five.sql"

# Deliberately small and argued, not a place to park anything inconvenient.
GLOBAL_TABLES = {
    "compliance_frameworks",   # the framework catalogue, identical for every tenant
    "compliance_controls",     # the control catalogue, identical for every tenant
    "schema_migrations",       # the migration ledger
}
MIGRATED_BY_078 = {
    "incident_findings",
    "repository_policies",
    "workspace_policies",
    "engagement_targets",
    "security_incidents",
}
GDS_TENANT = "2ec10dd0-e48e-4043-8c88-5998ba5e23b0"


# ------------------------------------------------------------------ the migration itself
def test_migration_078_covers_all_five_and_never_guesses_a_tenant():
    sql = MIGRATION.read_text()
    for table in MIGRATED_BY_078:
        assert f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS tenant_id uuid" in sql, table
        assert f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY" in sql, table
        assert f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY" in sql, table
        assert f"CREATE POLICY {table}_tenant ON {table}" in sql, table
        assert f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO gds" in sql, table
    assert "NULLIF(current_setting('gds.tenant_id', true), '')::uuid" in sql
    # a row that cannot resolve a parent must abort the migration rather than sit there unisolated
    assert "RAISE EXCEPTION" in sql
    # the one table with no parent to resolve through says who it was attributed to, in writing
    assert GDS_TENANT in sql


def test_new_migrations_use_the_null_safe_policy_form():
    """A '' cast to uuid RAISES rather than matching nothing, so an unbound session gets a 500, not an empty read.

    Scoped to 078 onwards deliberately: 035/036/037 predate the convention and were each replaced by a later
    migration, so failing on them would be a permanent failure over files that decide nothing.
    """
    bad = []
    for path in sorted((REPO / "migrations/security_isolation").glob("*.sql")):
        stem = path.name.split("_", 1)[0]
        if not stem.isdigit() or int(stem) < 78:
            continue
        for line in path.read_text().splitlines():
            if "current_setting('gds.tenant_id'" in line and "nullif" not in line.lower():
                bad.append(f"{path.name}: {line.strip()[:90]}")
    assert not bad, "policy without NULLIF guard:\n" + "\n".join(bad)


def test_platform_data_no_longer_claims_the_legacy_table_lacks_a_tenant():
    """The old note said security_incidents has no tenant_id and is excluded until migrated. It is migrated."""
    src = (REPO / "apps/api/gds_api/platform_data.py").read_text()
    assert "has no tenant_id column, so it is excluded" not in src
    assert "migration 078" in src


# ------------------------------------------------------------------ the live guards
def _dsn() -> str:
    """asyncpg, not psycopg: psycopg is not installed on this host and the suite skipped silently while claiming to
    guard the schema. A guard that cannot run is worse than no guard, because it reads as green."""
    import os

    dsn = os.environ.get("DATABASE_URL") or os.environ.get("GDS_DATABASE_URL")
    if not dsn:
        pytest.skip("no DATABASE_URL in the environment")
    return dsn.replace("postgresql+asyncpg://", "postgresql://")


def _run(coro_factory):
    import asyncio

    try:
        import asyncpg  # noqa: PLC0415
    except ImportError:  # pragma: no cover
        pytest.skip("asyncpg not installed")
    return asyncio.run(coro_factory())


def test_every_table_isolates_or_is_allowlisted():
    """The guard: a table added without tenant_id and FORCE RLS fails here, not in front of a customer."""
    async def _query():
        import asyncpg  # noqa: PLC0415

        conn = await asyncpg.connect(_dsn())
        try:
            return await conn.fetch(
                """
                SELECT c.relname,
                       c.relforcerowsecurity,
                       EXISTS (SELECT 1 FROM information_schema.columns col
                                WHERE col.table_schema = 'public' AND col.table_name = c.relname
                                  AND col.column_name = 'tenant_id') AS has_tenant
                  FROM pg_class c
                  JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE n.nspname = 'public' AND c.relkind = 'r'
                 ORDER BY c.relname
                """
            )
        finally:
            await conn.close()

    rows = [(r["relname"], r["relforcerowsecurity"], r["has_tenant"]) for r in _run(_query)]

    unisolated = [name for name, forced, _ in rows if not forced and name not in GLOBAL_TABLES]
    assert not unisolated, (
        "table(s) hold data without FORCE RLS and are not on the global allowlist: " + ", ".join(unisolated)
    )
    for name, _, has_tenant in rows:
        if name in GLOBAL_TABLES:
            assert not has_tenant, f"{name} is allowlisted as global but carries a tenant_id"
    by_name = {name: (forced, has_tenant) for name, forced, has_tenant in rows}
    for name in MIGRATED_BY_078:
        assert by_name[name] == (True, True), f"{name} is not FORCE-RLS with a tenant_id"


def test_every_live_policy_is_null_safe():
    """The check that counts: what Postgres is enforcing right now."""
    async def _query():
        import asyncpg  # noqa: PLC0415

        conn = await asyncpg.connect(_dsn())
        try:
            return await conn.fetch(
                """
                SELECT tablename, policyname, coalesce(qual, '') AS qual, coalesce(with_check, '') AS chk
                  FROM pg_policies
                 WHERE schemaname = 'public'
                   AND (coalesce(qual, '') LIKE '%gds.tenant_id%'
                        OR coalesce(with_check, '') LIKE '%gds.tenant_id%')
                """
            )
        finally:
            await conn.close()

    rows = [(r["tablename"], r["policyname"], r["qual"], r["chk"]) for r in _run(_query)]
    assert rows, "no tenant policies found - is this the right database?"
    unguarded = [
        f"{table}.{policy}" for table, policy, qual, chk in rows
        if "nullif" not in qual.lower() or (chk and "nullif" not in chk.lower())
    ]
    assert not unguarded, "live policy without a NULLIF guard: " + ", ".join(unguarded)


def test_an_unbound_session_sees_no_isolated_rows():
    """With no tenant bound the five read zero, and with one bound they read their own rows.

    Run as the application role, not as postgres: a superuser bypasses row-level security outright, so counting from
    a superuser session would prove nothing while looking like proof.
    """
    async def _counts():
        import asyncpg  # noqa: PLC0415

        conn = await asyncpg.connect(_dsn())
        try:
            await conn.execute("SET ROLE gds")
            await conn.execute("SELECT set_config('gds.tenant_id', '', false)")
            unbound = {}
            for table in sorted(MIGRATED_BY_078):
                unbound[table] = await conn.fetchval(f"SELECT count(*) FROM {table}")  # noqa: S608
            await conn.execute("SELECT set_config('gds.tenant_id', $1, false)", GDS_TENANT)
            bound = await conn.fetchval("SELECT count(*) FROM incident_findings")
            return unbound, bound
        finally:
            await conn.close()

    unbound, bound = _run(_counts)
    leaked = {table: n for table, n in unbound.items() if n != 0}
    assert not leaked, f"rows leaked with no tenant bound: {leaked}"
    assert bound == 20, f"the GDS tenant should see its own 20 incident links, saw {bound}"
