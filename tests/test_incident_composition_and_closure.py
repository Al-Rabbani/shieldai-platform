"""An incident could not be closed, and its finding count was zero while 20 findings hung off it.

Measured 20 Nov 2026, live: GET /incidents returned finding_count 0 for both incidents, each linked to 20 findings in
total (13 and 7), all of which were either resolved (6) or accepted as risk (14). Two independent defects:

1. finding_count counted IncidentFinding.finding_id, which is NULL on every row: the real links live in
   security_finding_id (integer, security_findings). The ORM did not map that column at all, so a count over an empty
   column returned 0 and looked like an answer - the same shape as the mission reaper sweeping nothing for two days.
2. GET was the only route on the resource. An incident stayed "open" for the life of the platform whatever happened
   behind it, and the page showed a bare red "open" critical beside a count of 0.

The route now returns the composition of the linked findings (open / accepted as risk / resolved, plus the latest
acceptance expiry) and POST /incidents/{id}/resolve closes an incident with a required reason, recording how many
findings were still open at closure so closure can never be read as remediation.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

ROUTE = (ROOT / "apps" / "api" / "gds_api" / "incidents.py").read_text(encoding="utf-8")
MODEL = (ROOT / "apps" / "api" / "gds_api" / "models.py").read_text(encoding="utf-8")
SCHEMA = (ROOT / "apps" / "api" / "gds_api" / "schemas.py").read_text(encoding="utf-8")
SEED = (ROOT / "apps" / "api" / "gds_api" / "seed_data.py").read_text(encoding="utf-8")
CLIENT = (ROOT / "web" / "gds_app.html").read_text(encoding="utf-8")
MIGRATION = (ROOT / "migrations" / "security_isolation" / "043_incident_write_permission.sql").read_text(encoding="utf-8")


def test_the_link_column_the_rows_actually_use_is_mapped():
    assert "security_finding_id: Mapped[int | None]" in MODEL
    assert 'ForeignKey("security_findings.id")' in MODEL


def test_the_count_comes_from_a_join_not_from_the_empty_column():
    assert "LEFT JOIN security_findings sf ON sf.id = inf.security_finding_id" in ROUTE
    assert "func.count(IncidentFinding.finding_id)" not in ROUTE


def test_the_composition_is_per_incident_and_splits_all_three_states():
    for field in ("open_findings", "accepted_risk_findings", "resolved_findings", "accepted_until"):
        assert field in SCHEMA
        assert field in ROUTE


def test_an_acceptance_carries_its_expiry():
    """'accepted' without a date is not a state anyone can act on."""
    assert "max(fra.expires_at) AS accepted_until" in ROUTE
    assert "fra.revoked_at IS NULL" in ROUTE
    assert "fra.expired_at IS NULL" in ROUTE


def test_closure_requires_a_reason_of_real_length():
    assert "min_length=20" in SCHEMA
    assert "min_length=20" in ROUTE or "Field(min_length=20" in SCHEMA


def test_closure_records_what_it_left_behind():
    assert 'f"[finding state at closure] open {still_open}' in ROUTE
    assert "open_findings_at_closure" in ROUTE


def test_closure_is_audited_and_idempotent():
    assert 'action="incident.resolved"' in ROUTE
    assert "already resolved" in ROUTE
    assert "HTTP_409_CONFLICT" in ROUTE


def test_the_permission_is_granted_to_accountable_roles_only():
    assert '"incidents:write"' in SEED
    assert "name IN ('admin', 'platform_owner', 'analyst')" in MIGRATION
    # auditor and executive_viewer must not gain a write path
    assert "executive_viewer" not in MIGRATION.split("WHERE")[1]
    assert "auditor" not in MIGRATION.split("WHERE")[1]


def test_the_page_states_the_composition_and_says_when_nothing_is_live():
    assert "No finding behind this incident is still open." in CLIENT
    assert "accepted as risk" in CLIENT
    assert "closeIncident" in CLIENT
