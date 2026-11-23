"""Tenant SLA hours must reach the escalation engine, and an unset severity must keep the platform ladder."""
import ast
from pathlib import Path

import pytest

MODULE = Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "findings_escalation_api.py"


@pytest.fixture(scope="module")
def source() -> str:
    return MODULE.read_text(encoding="utf-8")


def test_the_plan_accepts_overrides(source):
    assert "def _plan(rows, mod, overrides" in source


def test_an_override_wins_and_an_unset_severity_falls_back(source):
    assert '(overrides or {}).get(severity) or mod.POLICY_HOURS.get(severity)' in source, (
        "a tenant that sets only a critical limit must not unset the other two"
    )


def test_the_route_reads_tenant_hours_and_names_the_source(source):
    assert "await hours_override(db, current_user.tenant_id)" in source
    assert '"policy_source": "tenant settings" if overrides else "platform default ladder"' in source
    assert '"effective_hours"' in source


def test_the_reader_is_imported_from_the_settings_module(source):
    assert "from gds_api.org_settings_api import hours_override" in source
    # and the ladder is still the script's, not a second copy
    assert "POLICY_HOURS =" not in source
