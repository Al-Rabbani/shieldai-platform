"""The Alerts page must not draw a delivery pipeline it does not have.

MEASURED 25 Nov 2026: notification_dispatches has no table, so the page's "Notifications Dispatched" tile read 0 and
its sublabel read "0 delivered" - a zero over an absent store that reads as a quiet week rather than a missing pipe.
The page also implied a delivery pipeline without reporting which channels exist. CORRECTION (25 Nov 2026): my first
measurement said no external channel was configured; that was wrong. Grepping /opt/.env from a loop reported all five
unset, while the SERVING PROCESS has RESEND_API_KEY, SLACK_WEBHOOK_URL and ALERT_EMAIL_TO set and GET /alerts/channels
reports email and slack as configured. Teams and PagerDuty are genuinely unset. Read the process environment
(/proc/<pid>/environ), not a grep of the env file, before claiming a channel is missing. GET /alerts/channels now reports the real state and the tile reads it.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
ROUTES = ROOT / "apps/api/gds_api/alerts/routes.py"
ADAPTER = ROOT / "apps/web/src/api/base44Client.js"
PAGE = ROOT / "apps/web/src/pages/dashboards/AlertsNotificationsPage.jsx"


def test_the_route_reports_every_channel_and_its_requirement():
    src = ROUTES.read_text()
    assert 'router.get("/channels")' in src, "the channel-state route is gone"
    for channel in ("in_app", "email", "slack", "teams", "pagerduty"):
        assert f'"channel": "{channel}"' in src, f"{channel} is no longer reported"
    assert "external_configured" in src
    # the note must state the in-app-only case rather than staying silent
    assert "reaches the in-app inbox only" in src


def test_the_page_reads_the_route_and_no_longer_claims_dispatches():
    src = PAGE.read_text()
    assert "Notifications Dispatched" not in src, "the page still counts an absent dispatch store"
    assert "External alert channels" in src
    assert "in-app inbox only" in src
    assert "alertChannels()" in src


def test_the_adapter_exposes_the_channel_state():
    src = ADAPTER.read_text()
    assert "alertChannels:" in src and "/alerts/channels" in src
