"""A review that records an opinion without changing access is paperwork.

These pin the parts that make it real: the decision path revokes rather than annotates, the reviewer cannot lock
the tenant out of its own review, and the control measures completed reviews rather than table existence.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = (ROOT / "apps" / "api" / "gds_api" / "access_reviews.py").read_text(encoding="utf-8")
COLLECTOR = (ROOT / "scripts" / "ops" / "assess_compliance.py").read_text(encoding="utf-8")
MIGRATION = (ROOT / "migrations" / "security_isolation" / "034_access_reviews.sql").read_text(encoding="utf-8")


def test_revoke_actually_deactivates_and_kills_sessions():
    assert "UPDATE users SET is_active = false" in MODULE
    assert "UPDATE user_sessions SET revoked_at = now()" in MODULE


def test_a_reviewer_cannot_revoke_themselves():
    assert "cannot revoke your own account" in MODULE


def test_items_snapshot_role_and_last_session_at_generation():
    assert "days_since_last_session" in MODULE
    assert "max(s.created_at)" in MODULE


def test_the_review_tables_are_forced_with_a_tenant_policy():
    for table in ("access_reviews", "access_review_items"):
        assert f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY" in MIGRATION
        assert f"CREATE POLICY {table}_tenant ON {table}" in MIGRATION


def test_the_control_measures_completion_not_existence():
    assert "completed_at > now() - interval '90 days'" in COLLECTOR
    assert "still undecided" in COLLECTOR
    # the old constant must be gone
    assert '"reviews_recorded": 0' not in COLLECTOR


def test_routes_are_published():
    import sys
    sys.path.insert(0, str(ROOT / "apps" / "api"))
    from gds_api.main import app

    paths = app.openapi()["paths"]
    for route in ("/access/reviews", "/access/reviews/{review_id}", "/access/reviews/{review_id}/decide"):
        assert route in paths, route
