"""Article 23 is a wall-clock obligation, so the deadlines are pinned here.

NIS2 Article 23: early warning within 24 hours of awareness, notification within 72 hours, final report within one
month. If these constants drift, an incident is reported late by design rather than by accident.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE = (ROOT / "apps/api/gds_api/regulatory.py").read_text(encoding="utf-8")
MIGRATION = (ROOT / "migrations/security_isolation/035_regulatory_notifications.sql").read_text(encoding="utf-8")
COLLECTOR = (ROOT / "scripts/ops/assess_compliance.py").read_text(encoding="utf-8")


def test_the_article_23_deadlines_are_the_ones_the_regulation_states():
    assert "EARLY_WARNING = timedelta(hours=24)" in MODULE
    assert "NOTIFICATION = timedelta(hours=72)" in MODULE
    assert "FINAL_REPORT = timedelta(days=30)" in MODULE


def test_deadlines_are_computed_from_detection_and_stored():
    for column in ("early_warning_due_at", "notification_due_at", "final_report_due_at"):
        assert column in MIGRATION
    assert "detected + EARLY_WARNING" in MODULE


def test_the_platform_never_notifies_a_regulator_by_itself():
    for forbidden in ("httpx", "requests.post", "urllib.request", "smtplib"):
        assert forbidden not in MODULE


def test_overdue_is_a_query_not_a_judgement():
    assert "early_warning_late" in MODULE and "notification_late" in MODULE
    assert "now() > notification_due_at" in MODULE


def test_the_table_is_tenant_isolated_by_force():
    assert "ENABLE ROW LEVEL SECURITY" in MIGRATION
    assert "FORCE ROW LEVEL SECURITY" in MIGRATION
    assert "current_setting('gds.tenant_id'" in MIGRATION
    assert "GRANT SELECT" in MIGRATION and "TO gds_runtime" in MIGRATION


def test_the_control_passes_only_on_an_exercised_procedure():
    assert "regulatory_notifications" in COLLECTOR
    assert "unexercised" in COLLECTOR
