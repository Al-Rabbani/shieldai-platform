"""A notification nobody acknowledges is a log entry, not a page.

Measured before this existed: 183 notifications, all 183 unread, and nothing re-raised any of them. These
tests pin the ladder's timing so escalation cannot be quietly shortened into noise or lengthened into silence,
and pin the runbook's honesty so it cannot claim a paging provider that does not exist.
"""
import datetime as dt
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("gds_page", ROOT / "scripts" / "ops" / "gds-page.py")
page = importlib.util.module_from_spec(spec)
spec.loader.exec_module(page)


def _row(level, base):
    return {"escalation_level": level, "last_notified_at": base, "created_at": base}


def test_ladder_widens_rather_than_repeating():
    assert list(page.LADDER_MINUTES) == sorted(page.LADDER_MINUTES)
    assert len(set(page.LADDER_MINUTES)) == len(page.LADDER_MINUTES), "a repeated rung is noise, not escalation"


def test_not_due_before_the_rung_elapses():
    now = dt.datetime(2026, 11, 19, 22, 0, tzinfo=dt.timezone.utc)
    base = now - dt.timedelta(minutes=1)
    assert page.due(_row(0, base), now) is False


def test_due_once_the_rung_elapses():
    now = dt.datetime(2026, 11, 19, 22, 0, tzinfo=dt.timezone.utc)
    assert page.due(_row(0, now - dt.timedelta(minutes=6)), now) is True
    assert page.due(_row(1, now - dt.timedelta(minutes=16)), now) is True
    assert page.due(_row(2, now - dt.timedelta(minutes=61)), now) is True


def test_top_rung_is_never_re_raised_again():
    # At the top rung the record must stand as silence, not keep shouting.
    now = dt.datetime(2026, 11, 19, 22, 0, tzinfo=dt.timezone.utc)
    assert page.due(_row(page.MAX_LEVEL, now - dt.timedelta(days=30)), now) is False


def test_runbook_does_not_claim_a_paging_provider_it_lacks():
    text = (ROOT / "docs" / "operations" / "RUNBOOK.md").read_text(encoding="utf-8")
    assert "no paging provider" in text.lower(), "the runbook must keep stating there is no provider"
    assert "No paging integration is configured" not in text, "that claim is now out of date"
    assert "acknowledge" in text.lower(), "the runbook must describe the acknowledgement path"


def test_acknowledgement_endpoint_exists_in_the_api():
    src = (ROOT / "apps" / "api" / "gds_api" / "notifications.py").read_text(encoding="utf-8")
    assert "/{notification_id}/acknowledge" in src
    assert "acknowledged_at = now()" in src
