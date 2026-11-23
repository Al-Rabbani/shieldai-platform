"""The integrations surface: measured, not described.

What this pins:

* THE ROUTE REPORTS WHAT IT CAN PROVE. Linear reachability comes from the Linear client, cloud environments from
  cloud_environments, credentials as presence only. A key that exists and a workspace that answers stay separate facts.
* A MISSING STORE IS NOT AN EMPTY ONE. The builder's connector pages read five entities; four have no table. The route
  reads existence from information_schema and row counts for what exists, so "0 connectors" can never again mean "no
  table".
* NO INVENTED COPY SURVIVES. The page used to hardcode "AWS connected", "Azure connected (0 findings)" and a count of
  configured secrets, and the connector grid offered Jira, which is permanently removed from this platform.
"""
from __future__ import annotations

import asyncio
import pathlib
import re

import pytest
from fastapi import HTTPException

from gds_api import integrations_api as m

WEB = pathlib.Path(__file__).resolve().parents[1] / "apps" / "web" / "src"

def _code(path: pathlib.Path) -> str:
    """The file with comments removed.

    Twice now an assertion has matched the comment that explains why the thing it forbids was removed, which fails a page
    that is correct. The prose is not the code: strip block and line comments before asserting on behaviour.
    """
    text = path.read_text()
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"^\s*//.*$", "", text, flags=re.M)



class _Result:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def mappings(self):
        return self

    def first(self):
        return self._rows[0] if self._rows else None


class FakeDb:
    def __init__(self, tables, rows=None):
        self.tables = tables
        self.rows = rows or {}

    async def execute(self, statement, params=None):
        sql = str(statement)
        if "set_config" in sql:
            return _Result([{}])
        if "information_schema.tables" in sql:
            return _Result([(t,) for t in self.tables])
        if "cloud_environments" in sql:
            return _Result(self.rows.get("environments", []))
        for name in m.CANDIDATE_STORES:
            if f"FROM {name}" in sql:
                return _Result([{"total": self.rows.get(name, 0)}])
        raise AssertionError(f"unexpected SQL: {sql[:70]}")


def _user(tenant="t-1"):
    return type("U", (), {"tenant_id": tenant})()


def _status(db):
    return asyncio.run(m.integrations_status(db=db, current_user=_user()))


def test_store_existence_is_read_not_assumed():
    payload = _status(FakeDb({"webhook_endpoints"}, {"webhook_endpoints": 0}))
    assert payload["stores"]["webhook_endpoints"] == {"exists": True, "rows": 0}
    assert payload["stores"]["connector_registrations"] == {"exists": False, "rows": None}


def test_an_empty_store_is_distinguishable_from_a_missing_one():
    """webhook_endpoints exists and holds nothing; that must not read as "connectors configured" or "no store"."""
    payload = _status(FakeDb({"webhook_endpoints"}, {"webhook_endpoints": 0}))
    empty = payload["stores"]["webhook_endpoints"]
    missing = payload["stores"]["connector_registrations"]
    assert empty["exists"] and empty["rows"] == 0
    assert not missing["exists"] and missing["rows"] is None


def test_cloud_environments_carry_real_asset_counts():
    env = {
        "provider": "aws", "name": "GDS AWS", "native_id": "696616821372", "status": "registered",
        "discovery_status": "completed", "asset_count": 144, "last_successful_discovery_at": None, "enabled": True,
    }
    payload = _status(FakeDb(set(), {"environments": [env]}))
    assert payload["cloud"]["providers"] == ["aws"]
    assert payload["cloud"]["total_assets"] == 144


def test_credentials_are_reported_as_presence_only(monkeypatch):
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://example.invalid/hook")
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    notes = _status(FakeDb(set()))["notifications"]
    assert notes["slack_webhook_present"] is True
    assert notes["resend_key_present"] is False
    assert "not delivery" in notes["note"]
    assert "example.invalid" not in str(notes), "a credential value must never be echoed"


def test_a_rejected_linear_key_is_reported_not_shown_as_no_teams(monkeypatch):
    monkeypatch.setenv("LINEAR_API_KEY", "present-but-rejected")

    async def boom():
        raise m.linear.LinearError("Linear rejected the key")

    monkeypatch.setattr(m.linear, "list_teams", boom)
    linear = _status(FakeDb(set()))["linear"]
    assert linear["configured"] is True and linear["reachable"] is False
    assert "rejected" in linear["reason"]


def test_secrets_are_declared_unmeasurable_rather_than_counted():
    secrets = _status(FakeDb(set()))["secrets"]
    assert secrets["measurable"] is False
    assert "no secrets inventory" in secrets["reason"].lower()


def test_tenant_binding_is_required():
    with pytest.raises(HTTPException) as err:
        asyncio.run(m.integrations_status(db=FakeDb(set()), current_user=_user(tenant=None)))
    assert err.value.status_code == 403


def test_page_copy_is_not_invented():
    page = _code(WEB / "pages" / "settings" / "IntegrationsSettingsPage.jsx")
    for claim in ("3 secrets configured", "Connected (0 findings)", "OPENAI_PROJECT_KEY_2"):
        assert claim not in page, f"invented claim still on the page: {claim}"
    assert "base44.integrations.status()" in page
    assert "base44.integrations.linearStatus()" in page


def test_connector_grid_never_offers_jira():
    grid = _code(WEB / "components" / "settings" / "AvailableConnectorsGrid.jsx")
    assert not re.search(r'name:\s*"Jira"', grid), "Jira is permanently removed and must not be offered"
    assert "not available" in grid.lower()


def test_connectors_page_no_longer_reads_absent_entities():
    page = _code(WEB / "pages" / "dashboards" / "ConnectorsIntegrationsPage.jsx")
    for entity in ("ConnectorRegistration", "WebhookEndpoint", "ConnectorExecution", "EventBusMessage"):
        assert entity not in page, f"{entity} has no table and must not be read"
    assert "base44.integrations.status()" in page


def test_adapter_exposes_both_routes():
    adapter = _code(WEB / "api" / "base44Client.js")
    assert "request('/integrations/status')" in adapter
    assert "request('/integrations/linear/status')" in adapter
