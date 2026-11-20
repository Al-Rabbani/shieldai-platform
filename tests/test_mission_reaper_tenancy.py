"""The reaper reported a clean sweep every hour for two days while missions piled up.

Root cause, measured rather than guessed: it discovered tenants with an unbound
`SELECT DISTINCT tenant_id FROM missions WHERE status NOT IN (...)`. While `missions` was unforced that
worked. Once it became FORCE ROW LEVEL SECURITY the same query returned zero rows and raised nothing, so the
sweep had no tenants to sweep, cancelled 0, and exited 0. Twenty-four missions were sitting in `running`, the
oldest 37 hours old.

The lesson these tests encode: on a forced table, zero rows from an unbound read is a missing binding, not an
empty result. Tenants must be supplied, never discovered that way.
"""
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from gds_api.mission_reaper import (  # noqa: E402
    DEFAULT_GRACE_HOURS,
    _configured_tenants,
    reap_cutoff,
    stale_mission_statement,
)

MODULE = (ROOT / "apps" / "api" / "gds_api" / "mission_reaper.py").read_text(encoding="utf-8")
CLI = (ROOT / "apps" / "api" / "reap_stale_missions.py").read_text(encoding="utf-8")

TENANT = "2ec10dd0-e48e-4043-8c88-5998ba5e23b0"


def test_tenants_are_never_discovered_from_a_forced_table():
    """The exact regression: an unbound DISTINCT over missions cannot be how the sweep finds work.

    The old query survives in the module docstring, where it belongs - as the record of what went wrong. What
    must not survive is the code that ran it.
    """
    assert "select(Mission.tenant_id)" not in MODULE
    assert "tenant_ids = _configured_tenants(tenants)" in MODULE


def test_explicit_tenants_win():
    resolved = _configured_tenants([TENANT])
    assert resolved == [uuid.UUID(TENANT)]


def test_environment_tenant_is_the_default(monkeypatch):
    monkeypatch.setenv("GDS_TENANT_ID", TENANT)
    assert _configured_tenants(None) == [uuid.UUID(TENANT)]


def test_no_tenant_resolves_to_nothing_so_the_caller_can_be_loud(monkeypatch):
    monkeypatch.delenv("GDS_TENANT_ID", raising=False)
    assert _configured_tenants(None) == []


def test_duplicates_and_junk_are_handled_without_raising(monkeypatch):
    monkeypatch.delenv("GDS_TENANT_ID", raising=False)
    resolved = _configured_tenants([TENANT, TENANT, "not-a-uuid", None])
    assert resolved == [uuid.UUID(TENANT)]


def test_the_statement_binds_the_tenant_as_a_uuid():
    """A tenant comparison against a str matches nothing on a UUID column, so the bound value must be a UUID."""
    compiled = stale_mission_statement(TENANT, reap_cutoff()).compile()
    assert uuid.UUID(TENANT) in compiled.params.values()
    assert "missions.tenant_id = " in str(compiled)


def test_only_non_terminal_missions_are_eligible():
    compiled = str(stale_mission_statement(TENANT, reap_cutoff()).compile(
        compile_kwargs={"literal_binds": True}))
    assert "NOT IN ('completed', 'failed', 'cancelled')" in compiled


def test_the_grace_period_is_generous_enough_not_to_race_real_work():
    assert DEFAULT_GRACE_HOURS >= 6
    now = datetime(2026, 11, 20, 16, 0, tzinfo=timezone.utc)
    assert reap_cutoff(12, now=now) == now - timedelta(hours=12)


def test_the_cli_refuses_to_run_blind():
    """Exit 2 with a reason beats exit 0 with 'cancelled 0' and nobody noticing for two days."""
    assert "no tenant to sweep" in CLI
    assert "return 2" in CLI


def test_the_cli_passes_the_tenant_through():
    assert "tenants=args.tenant," in CLI
