"""A calendar integration that does not exist must not read as one sitting idle.

Measured 23 Nov 2026: no SlaCalendarEvent store, gdsCriticalDeadlineSync refused by the adapter, no calendar entry in the
root crontab, and no Google service account on the host.

Assertions run against the rendered component with comments stripped: an earlier version matched the explanatory comment
that NAMES the claims it removed, which is a test that passes or fails on prose rather than behaviour.
"""
import re
from pathlib import Path

PANEL = Path(__file__).resolve().parents[1] / "apps" / "web" / "src" / "components" / "fixes" / "SlaCalendarSyncPanel.jsx"


def _rendered() -> str:
    text = PANEL.read_text(encoding="utf-8")
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def test_the_panel_asserts_no_daily_sync():
    text = _rendered()
    assert "06:00" not in text, "no scheduled sync exists on this host"
    assert "Sync now" not in text, "a button that cannot sync must not be offered"


def test_the_panel_invokes_no_refused_function():
    text = _rendered()
    assert "gdsCriticalDeadlineSync" not in text
    assert "functions.invoke" not in text


def test_the_panel_states_the_absence_in_words():
    text = _rendered()
    assert "not connected" in text
    assert "no Google service account" in text
    assert "no calendar sync job runs" in text
    assert "absence of the integration" in text
