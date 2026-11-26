"""One window, and a queue that shows it.

MEASURED 26 Nov 2026: the 24 hour approval window was written three times - the expiry job's default, the reminder
job's window, and the service-level objective's threshold - and nothing tied them together. These tests fail if they
ever drift, because a countdown that disagrees with the job that kills the request is worse than no countdown.
"""
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path

from gds_api.approval_window import APPROVAL_WINDOW_HOURS, expires_at, hours_remaining

REPO = Path(__file__).resolve().parents[1]


def test_expiry_lands_exactly_on_the_window():
    created = datetime(2026, 11, 26, 9, 0, tzinfo=UTC)
    assert expires_at(created) == created + timedelta(hours=APPROVAL_WINDOW_HOURS)


def test_hours_remaining_counts_down_and_goes_negative_past_the_window():
    created = datetime(2026, 11, 26, 9, 0, tzinfo=UTC)
    assert hours_remaining(created, now=created) == APPROVAL_WINDOW_HOURS
    assert hours_remaining(created, now=created + timedelta(hours=18)) == 6.0
    assert hours_remaining(created, now=created + timedelta(hours=30)) == -6.0


def _constant_in(path: str, name: str) -> str:
    text = (REPO / path).read_text()
    match = re.search(rf"^{name}\s*=\s*(.+)$", text, flags=re.M)
    assert match, f"{name} not found in {path}"
    return match.group(1).strip()


def test_the_three_places_that_act_on_the_window_read_it_from_the_same_definition():
    assert _constant_in("scripts/ops/expire_stale_approvals.py", "DEFAULT_MAX_AGE_HOURS") == "APPROVAL_WINDOW_HOURS"
    assert _constant_in("scripts/ops/approval_reminders.py", "DEFAULT_WINDOW_HOURS") == "APPROVAL_WINDOW_HOURS"
    assert _constant_in("apps/api/gds_api/slo_api.py", "_APPROVAL_THRESHOLD_HOURS") == "APPROVAL_WINDOW_HOURS"


def test_the_queue_response_carries_a_deadline_and_the_countdown():
    from gds_api.schemas import ApprovalOut

    fields = ApprovalOut.model_fields
    assert "expires_at" in fields
    assert "hours_remaining" in fields
