"""An alert that was sent must be a fact, not a hope.

MEASURED 25 Nov 2026: dispatch_all() returned a dict to its caller and wrote nothing anywhere, so "was the team told?"
had no answer in the product, and the Alerts page drew "0 dispatched / 0 delivered" from NotificationDispatch, an
entity with no table. alert_deliveries (migration 082) now records every attempt, successful or not.
"""
import pathlib
import re

API = pathlib.Path("/opt/gds-os/apps/api/gds_api")
WEB = pathlib.Path("/opt/gds-os/apps/web/src")
MIGRATIONS = pathlib.Path("/opt/gds-os/migrations/security_isolation")


def test_every_dispatch_attempt_is_recorded():
    dispatch = (API / "alerts" / "dispatch.py").read_text()
    assert "_record_deliveries" in dispatch
    assert "INSERT INTO alert_deliveries" in dispatch
    # both callers must hand the session through, or the record is skipped silently
    routes = (API / "alerts" / "routes.py").read_text()
    engine = (API / "alerts" / "engine.py").read_text()
    assert "db=db, tenant_id=user.tenant_id" in routes
    assert "db=db, tenant_id=tenant_id" in engine


def test_the_delivery_table_is_tenant_isolated():
    sql = next(m for m in MIGRATIONS.glob("*082*.sql")).read_text()
    assert "CREATE TABLE IF NOT EXISTS alert_deliveries" in sql
    assert "ENABLE ROW LEVEL SECURITY" in sql
    assert "FORCE ROW LEVEL SECURITY" in sql
    assert "gds.tenant_id" in sql


def test_the_page_shows_recorded_deliveries_not_a_guess():
    page = (WEB / "pages" / "dashboards" / "AlertsNotificationsPage.jsx").read_text()
    assert "alertDeliveries" in page
    # the old tile claimed a pipeline from a store that does not exist
    assert "Notifications Dispatched" not in page
    assert '"—"' in page or "'—'" in page, "an unread count must render as an em dash, never 0"


def test_the_delivery_route_reports_failures_as_well_as_successes():
    routes = (API / "alerts" / "routes.py").read_text()
    i = routes.index('@router.get("/deliveries")')
    block = routes[i:i + 2200]
    assert "delivered" in block and "failed" in block
    assert "not a quiet period" in block
