"""One continuous breach is one alert, and a refresh is not a raise.

MEASURED 26 Nov 2026 from the notification table: four hours produced five approval_timeliness rows and four
mission_success rows, each carrying its own 5/15/60 escalation ladder, because the raiser dedupes on the exact message
and the message carries the live rate. One continuous breach was paging as if it were nine.
"""
import pathlib

REPO = pathlib.Path("/opt/gds-os")


def raiser() -> str:
    return (REPO / "scripts/ops/gds-raise-alert.py").read_text()


def test_the_raiser_can_dedupe_by_type_for_measured_conditions():
    body = raiser()
    assert "--dedupe-by-type" in body
    assert "acknowledged_at IS NULL" in body, "an acknowledged alert must not be the one being refreshed"
    assert "refreshed notification" in body


def test_the_refresh_updates_the_message_rather_than_inserting():
    body = raiser()
    refresh = body.split("if not existing and args.dedupe_by_type:")[1].split("return 0")[0]
    assert "UPDATE notifications SET message" in refresh
    assert "INSERT INTO notifications" not in refresh


def test_slo_check_asks_for_type_dedupe():
    assert "--dedupe-by-type" in (REPO / "scripts/ops/slo_check.py").read_text()


def test_a_refresh_is_not_logged_as_a_raise():
    body = (REPO / "scripts/ops/slo_check.py").read_text()
    assert "refreshed notification" in body.split("suppressed duplicate")[1][:200], (
        "slo_check must treat a refresh like a suppression, not print 'raised'"
    )
