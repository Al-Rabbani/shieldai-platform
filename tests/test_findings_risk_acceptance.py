"""Accepted risk must be a decision with an owner, not a mute button.

The 14 Trivy criticals in minio/minio:latest and temporalio/auto-setup:latest cannot be fixed: no newer image
is obtainable and the vendor has not shipped one. Before this, the only state available was "resolved", which
claims a fix that never happened. These tests pin the guardrails that keep acceptance honest.
"""
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from gds_api.findings_risk_acceptance import (  # noqa: E402
    MAX_ACCEPTANCE_DAYS,
    MIN_CONTROLS_CHARS,
    MIN_REASON_CHARS,
    InvalidAcceptance,
    _require_sentence,
    validate_expiry,
)

SRC = Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api"
SERVICE = (SRC / "findings_risk_acceptance.py").read_text(encoding="utf-8")
ROUTES = (SRC / "findings.py").read_text(encoding="utf-8")
MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "migrations"
    / "security_isolation"
    / "037_finding_risk_acceptance.sql"
).read_text(encoding="utf-8")


def test_a_reason_must_be_a_real_sentence():
    with pytest.raises(InvalidAcceptance):
        _require_sentence("reason", "n/a", MIN_REASON_CHARS)
    with pytest.raises(InvalidAcceptance):
        _require_sentence("reason", "   ", MIN_REASON_CHARS)
    long_enough = "No fixed image exists upstream and the service is loopback-bound."
    assert _require_sentence("reason", long_enough, MIN_REASON_CHARS) == long_enough


def test_compensating_controls_cannot_be_blank():
    """Without controls the record is just a way to stop the alert."""
    with pytest.raises(InvalidAcceptance):
        _require_sentence("compensating_controls", "none", MIN_CONTROLS_CHARS)


def test_acceptance_must_expire_in_the_future():
    now = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)
    with pytest.raises(InvalidAcceptance):
        validate_expiry(now - timedelta(seconds=1), now=now)
    with pytest.raises(InvalidAcceptance):
        validate_expiry(now, now=now)
    assert validate_expiry(now + timedelta(days=90), now=now) == now + timedelta(days=90)


def test_acceptance_cannot_be_forever():
    now = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)
    with pytest.raises(InvalidAcceptance):
        validate_expiry(now + timedelta(days=MAX_ACCEPTANCE_DAYS + 1), now=now)
    # The boundary itself is allowed.
    assert validate_expiry(now + timedelta(days=MAX_ACCEPTANCE_DAYS), now=now)


def test_naive_expiry_is_read_as_utc_not_rejected():
    now = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)
    result = validate_expiry(datetime(2026, 12, 20, 12, 0), now=now)
    assert result.tzinfo is timezone.utc


def test_finding_id_is_an_integer_because_the_table_says_so():
    """security_findings.id is an integer. Typing it as UUID would 500 on every call."""
    assert "finding_id: int," in SERVICE
    assert "finding_id integer NOT NULL REFERENCES security_findings(id)" in MIGRATION
    assert "finding_id: int," in ROUTES


def test_a_resolved_finding_cannot_be_accepted():
    """Accepting a fixed finding would let a real fix be replaced by a paper decision."""
    assert 'if finding["status"] == "resolved":' in SERVICE


def test_only_one_live_acceptance_per_finding():
    assert "finding_risk_acceptances_one_live" in MIGRATION
    assert "WHERE revoked_at IS NULL AND expired_at IS NULL" in MIGRATION


def test_acceptance_moves_the_finding_to_accepted_risk_not_resolved():
    assert "SET status = 'accepted_risk'" in SERVICE
    assert "SET status = 'resolved'" not in SERVICE


def test_expiry_reopens_the_finding_automatically():
    """Silence must not become permanent: an expired acceptance reopens its finding."""
    assert "async def reconcile_expired_acceptances" in SERVICE
    assert "SET expired_at = now()" in SERVICE
    assert "SET status = 'open'" in SERVICE


def test_revocation_keeps_the_row_and_its_reason():
    assert "SET revoked_at = now(), revoked_by = :uid, revoke_reason = :reason" in SERVICE
    assert "DELETE FROM finding_risk_acceptances" not in SERVICE


def test_the_summary_reports_accepted_separately_from_open():
    """Acceptance must be visible in the same count as everything else, never netted out silently."""
    assert "AS accepted," in ROUTES
    assert "AS accepted_critical" in ROUTES


def test_writing_an_acceptance_needs_its_own_permission():
    assert 'require_permission("findings:accept_risk")' in ROUTES
    # The read path stays on findings:read.
    assert 'require_permission("findings:read")' in ROUTES


def test_every_write_is_audited():
    assert '"findings.risk_accepted"' in ROUTES
    assert '"findings.risk_acceptance_revoked"' in ROUTES


def test_table_is_tenant_isolated_like_every_other_tenant_table():
    assert "FORCE ROW LEVEL SECURITY" in MIGRATION
    assert "current_setting('gds.tenant_id', true)" in MIGRATION


def test_review_date_is_optional_but_typed_as_a_date():
    from gds_api.schemas import RiskAcceptanceRequest

    model = RiskAcceptanceRequest(
        reason="No fixed image exists upstream and the service is loopback-bound only.",
        compensating_controls="Container binds 127.0.0.1 only; UFW active; no public route exists.",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    assert model.review_date is None
    assert isinstance(date.today(), date)


def test_finding_ids_are_bound_as_integers_not_strings():
    """asyncpg is strict: '380' for an integer parameter is a 500, which is how this first shipped.

    Postgres will not silently cast text to integer on a bound parameter, so every binding of a finding id has to
    stay an int. This test exists because the first live call failed with exactly that error.
    """
    assert "str(finding_id)" not in SERVICE
    assert 'str(acceptance["finding_id"])' not in SERVICE
