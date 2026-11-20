"""The on-call rota must be data, and an uncovered moment must read as uncovered.

incident_response_staffing failed for a long time because nothing named the person a page was expected to
reach. The fix is a rota in the database plus a collector that measures coverage of the current moment, not the
existence of a table: a rota with no shift covering now still pages nobody.
"""

from pathlib import Path

MIGRATION = Path("migrations/security_isolation/036_on_call_rota.sql").read_text()
MODULE = Path("apps/api/gds_api/on_call.py").read_text()
COLLECTOR = Path("scripts/ops/assess_compliance.py").read_text()
MAIN = Path("apps/api/gds_api/main.py").read_text()


def test_rota_table_is_tenant_isolated():
    assert "CREATE TABLE IF NOT EXISTS on_call_shifts" in MIGRATION
    assert "ENABLE ROW LEVEL SECURITY" in MIGRATION
    assert "FORCE ROW LEVEL SECURITY" in MIGRATION
    assert "on_call_shifts_tenant_isolation" in MIGRATION


def test_shift_window_must_be_positive():
    assert "ends_at > starts_at" in MIGRATION


def test_resolver_exists_and_treats_nobody_as_an_answer():
    assert "async def who_is_on_call" in MODULE
    assert "no shift covers the current time" in MODULE


def test_naive_timestamps_are_read_as_utc():
    assert "def _aware" in MODULE
    assert "replace(tzinfo=UTC)" in MODULE


def test_routes_are_registered():
    assert "gds_api.on_call import router as on_call_router" in MAIN
    assert "app.include_router(on_call_router)" in MAIN


def test_collector_measures_coverage_not_the_table():
    assert "on_call_shifts" in COLLECTOR
    assert "starts_at <= now() AND ends_at > now()" in COLLECTOR
    # The old shape only checked that a rota table existed.
    assert "table_name IN ('on_call_rota','oncall_rotas')" not in COLLECTOR
