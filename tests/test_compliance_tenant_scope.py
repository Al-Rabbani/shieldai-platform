"""P0-3: compliance verdicts are per tenant, and the catalogues are deliberately shared.

Before migration 074, compliance_assessments (315 rows) and compliance_scope_determinations (1) had no
tenant_id and no RLS, so all five tenants read one compliance score. These tests pin the migration, the
binding in every route, and the wording that used to deny the scoping.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "migrations/security_isolation/074_compliance_tenant_scope.sql"
API = ROOT / "apps/api/gds_api/compliance_api.py"


def migration() -> str:
    """SQL with the comment lines removed. The file explains in prose why the catalogues stay global, and an
    assertion on raw text matches that prose - the same self-inflicted failure as asserting on JSX comments."""
    assert MIGRATION.exists(), "migration 074 is missing"
    return "\n".join(
        line for line in MIGRATION.read_text().splitlines() if not line.strip().startswith("--")
    )


def api():
    return API.read_text()


def test_the_verdict_tables_get_a_tenant_column():
    sql = migration()
    for table in ("compliance_assessments", "compliance_scope_determinations"):
        assert re.search(rf"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS tenant_id uuid", sql), table
        assert re.search(rf"ALTER TABLE {table} ALTER COLUMN tenant_id SET NOT NULL", sql), table


def test_rls_is_enabled_and_forced_on_both():
    sql = migration()
    for table in ("compliance_assessments", "compliance_scope_determinations"):
        assert f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;" in sql
        assert f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;" in sql
        assert f"CREATE POLICY {table}_tenant_isolation" in sql
        assert "NULLIF(current_setting('gds.tenant_id', true), '')" in sql


def test_the_backfill_assigns_every_existing_row():
    sql = migration()
    assert sql.count("SET tenant_id = '2ec10dd0-e48e-4043-8c88-5998ba5e23b0'") == 2
    assert "WHERE tenant_id IS NULL" in sql


def test_the_catalogues_stay_global_on_purpose():
    """Frameworks and controls describe the standard, not the customer. Duplicating them per tenant would
    let two customers disagree about what PCI-DSS requires."""
    sql = migration()
    assert "compliance_controls" not in sql
    assert "compliance_frameworks" not in sql


def test_every_route_binds_the_tenant_before_reading():
    src = api()
    assert src.count("await _bind(db, user)") == 4, "frameworks, controls, determinations and assessments must bind"
    assert "set_config('gds.tenant_id'" in src


def test_no_query_reads_verdicts_without_a_tenant_predicate():
    """A read carries its tenant filter either inline or through the shared where-builder.

    Two routes build their WHERE from a clause list, so the predicate is not in the string literal: it is the
    first clause in the list. Both forms are checked, and the builder itself must be seeded with the tenant.
    """
    src = api()
    for table in ("compliance_assessments", "compliance_scope_determinations"):
        for m in re.finditer(rf"FROM {table}", src):
            window = src[m.start():m.start() + 600]
            assert "tenant_id = :tid" in window or "{where}" in window, window.split("\n")[0]
    seeded = src.count('clauses, params = ["tenant_id = :tid"]')
    assert seeded == 2, (
        f"both where-builders must start with the tenant clause, found {seeded}. Without it a filtered read "
        "returns every tenant's verdicts."
    )


def test_the_response_no_longer_denies_the_scoping():
    src = api()
    assert 'TENANT_SCOPE_NOTE = (\n    "These verdicts are this tenant' in src
    assert "platform-wide, not per-tenant" not in src
    assert "has no tenant_id and no RLS" not in src
    assert src.count('"tenant_scoped": True') == 3
    assert '"tenant_scoped": False' not in src
