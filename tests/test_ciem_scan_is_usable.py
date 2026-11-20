"""CIEM could not store a single row, and nothing said so.

Measured 20 Nov 2026: POST /cloud/ciem/scans returned 500, and ciem_findings and ciem_scan_results both held
zero rows. Reproduced directly against the database: a plain CIEMScanResult flush raised
"can't subtract offset-naive and offset-aware datetimes" because every CIEM timestamp column was naive while
both models defaulted to datetime.now(timezone.utc). A CIEMFinding flush with an explicit tenant_id failed the
same way. Separately, CIEMScanResult never mapped tenant_id at all, on a NOT NULL column of a FORCE-RLS table.

These tests hold the three properties that make the feature usable: the model can describe the row, the
analyzer can run on the platform's own governed credentials, and a failed analysis is never reported as a
completed scan with nothing in it.
"""
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from gds_api.cloud.ciem.analyzer import analyze_aws_iam  # noqa: E402
from gds_api.cloud.ciem.models import CIEMFinding, CIEMScanResult  # noqa: E402

ROUTES = (ROOT / "apps" / "api" / "gds_api" / "cloud" / "ciem" / "routes.py").read_text(encoding="utf-8")
MIGRATION = (
    ROOT / "migrations" / "security_isolation" / "040_ciem_timestamps_and_identity_key.sql"
).read_text(encoding="utf-8")


def test_the_scan_model_can_describe_a_row_it_must_insert():
    columns = CIEMScanResult.__table__.c
    assert "tenant_id" in columns, "the scan model still cannot supply the NOT NULL tenant column"
    assert columns.tenant_id.nullable is False


def test_every_ciem_timestamp_is_timezone_aware():
    """The defaults are tz-aware, so a naive column rejects every value the code produces."""
    for model in (CIEMFinding, CIEMScanResult):
        for name, column in model.__table__.c.items():
            if column.type.__class__.__name__ == "DateTime":
                assert column.type.timezone is True, f"{model.__name__}.{name} is naive"


def test_the_migration_moves_the_columns_to_the_repo_standard():
    assert "detected_at TYPE timestamptz" in MIGRATION
    assert "started_at   TYPE timestamptz" in MIGRATION
    assert "AT TIME ZONE 'UTC'" in MIGRATION
    # a re-scan must be able to recognise an identity it already found
    assert "ux_ciem_findings_identity_type" in MIGRATION


def test_the_analyzer_refuses_honestly_without_any_credential():
    result = asyncio.run(analyze_aws_iam(access_key_id=None, secret_access_key=None))
    assert result["error"] == "AWS credentials not provided"
    assert result["findings"] == []


def test_the_analyzer_runs_on_the_supplied_governed_session():
    """The platform resolves its own read-only role; the analyzer must use that session, not static keys."""

    class RefusingSession:
        def __init__(self):
            self.calls = []

        def client(self, service, **kwargs):
            self.calls.append(service)
            raise RuntimeError("AccessDenied: not authorised for iam:ListUsers")

    session = RefusingSession()
    result = asyncio.run(analyze_aws_iam(None, None, boto_session=session))
    assert session.calls == ["iam"], "the analyzer did not use the governed session"
    assert "AccessDenied" in result["error"]


def test_a_failed_analysis_is_not_recorded_as_a_completed_scan():
    """The old route set status=completed unconditionally and put the error in the summary."""
    assert 'scan.status = "failed"' in ROUTES
    assert 'raise HTTPException(status_code=502, detail=f"CIEM analysis failed: {error}")' in ROUTES
    # and the governed-credential path fails the same way rather than scanning nothing
    assert "could not assume the read-only role" in ROUTES


def test_a_rescan_refreshes_and_resolves_instead_of_duplicating():
    assert "created = 0" in ROUTES and "updated = 0" in ROUTES and "resolved = 0" in ROUTES
    assert 'current.status = "resolved"' in ROUTES
    assert 'current.resolved_at = now' in ROUTES


def test_the_route_uses_the_governed_credential_path():
    assert "_resolve_governed_session" in ROUTES
    assert "asyncio.to_thread(_build_session, profile)" in ROUTES
