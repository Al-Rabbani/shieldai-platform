"""The two behaviours that make an approval reminder useful rather than noise.

Measured 25 Nov 2026: four critical scheduled exposure scans expired undecided and the only notification about any of
them was sent at 24 hours, to the requester, after the action had already failed. A reminder that fires late, fires
repeatedly for the same request, or reaches nobody who can decide would reproduce the same silence.
"""
import importlib.util
import pathlib

_SPEC = importlib.util.spec_from_file_location(
    "approval_reminders", pathlib.Path(__file__).resolve().parents[1] / "scripts/ops/approval_reminders.py"
)
reminders = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(reminders)


def test_the_highest_crossed_threshold_is_the_one_reported():
    """A job that first sees an approval at 21 hours must not open with 12 and then immediately open 20."""
    assert reminders.threshold_crossed(11.9, (12, 20)) is None
    assert reminders.threshold_crossed(12.0, (12, 20)) == 12
    assert reminders.threshold_crossed(13.0, (12, 20)) == 12
    assert reminders.threshold_crossed(21.0, (12, 20)) == 20


def test_the_message_is_identical_on_every_run_for_the_same_approval_and_threshold():
    """The pager dedupes on exact text. An age in the message re-pages on every tick - measured on the SLO alerts."""
    first = reminders.reminder_message("c2bec31f-aa6e", "critical", "port coverage", 12, 24, True)
    again = reminders.reminder_message("c2bec31f-aa6e", "critical", "port coverage", 12, 24, True)
    assert first == again
    assert "c2bec31f" in first
    assert "12h" in first
    assert "24h" in first
    assert "approvals:decide" in first


def test_a_tenant_where_nobody_can_decide_says_so_instead_of_naming_a_queue():
    message = reminders.reminder_message("abcd1234-0000", "high", "recon", 20, 24, False)
    assert "NOBODY in this tenant holds approvals:decide" in message
    assert "governance defect" in message


def test_the_default_window_matches_the_job_that_expires_the_row():
    """A reminder computed against a different deadline than the expiry job would be wrong in one direction or the
    other: too early is noise, too late is the silence this exists to break."""
    expiry = importlib.util.spec_from_file_location(
        "expire_stale_approvals", pathlib.Path(__file__).resolve().parents[1] / "scripts/ops/expire_stale_approvals.py"
    )
    module = importlib.util.module_from_spec(expiry)
    expiry.loader.exec_module(module)
    assert reminders.DEFAULT_WINDOW_HOURS == module.DEFAULT_MAX_AGE_HOURS


def test_every_default_threshold_falls_inside_the_window():
    assert all(0 < t < reminders.DEFAULT_WINDOW_HOURS for t in reminders.DEFAULT_THRESHOLDS)
