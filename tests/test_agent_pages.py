"""The offensive page tier: one route, keyed by the task string each page actually sends.

What this pins, and why each assertion exists:

* THE REGISTRY MUST MATCH THE CALL SITES. The first build of this route answered 404 to every page because the registry
  was keyed on my guesses ("exploits", "dark_web") while the pages send their own names ("exploit_analysis",
  "dark_web_scan"). The page caught the 404 and drew its "Could not load" banner, so the tier looked exactly as broken
  as before while the route itself was healthy. The call-site test reads the pages and fails on any task name the route
  does not serve.
* A COLLECTION IS NEVER A SCALAR. An em dash placed in a key the page also maps threw and blanked /offensive/dark-web.
  Every key that a page reads as a collection must arrive as a list.
* AN ABSENT KEY IS NOT ZERO. Keys the route cannot measure are named in _absent so the page can print an em dash. A zero
  there would claim a measurement that was never taken.
"""
from __future__ import annotations

import asyncio
import pathlib
import re

import pytest
from fastapi import HTTPException

from gds_api import agent_pages_api as m

WEB = pathlib.Path(__file__).resolve().parents[1] / "apps" / "web" / "src"


class _Rows:
    def __init__(self, rows):
        self._rows = rows

    def one(self):
        return self._rows[0]

    def all(self):
        return self._rows

    def mappings(self):
        return self


class FakeDb:
    """Answers by the table the SQL reads, so a handler is exercised without Postgres."""

    def __init__(self, rows):
        self.rows = rows

    async def execute(self, statement, params=None):
        sql = str(statement)
        if "set_config" in sql:
            return _Rows([{}])
        if "compliance_assessments" in sql:
            return _Rows(self.rows["compliance"])
        if "cloud_environments" in sql:
            return _Rows(self.rows["environments"])
        if "cloud_assets" in sql:
            return _Rows(self.rows["assets"])
        if "incidents" in sql:
            return _Rows(self.rows["incidents"])
        if "user_sessions" in sql:
            return _Rows(self.rows["identity"])
        if "ai_models" in sql:
            return _Rows(self.rows["ai"])
        if "security_findings" in sql:
            return _Rows(self.rows["findings"])
        raise AssertionError(f"unexpected SQL: {sql[:80]}")


def _db():
    return FakeDb(
        {
            "findings": [
                {
                    "open_total": 849, "open_critical": 0, "open_high": 330, "open_medium": 513,
                    "kev_open": 0, "kev_total": 0, "high_epss": 2, "open_cve": 899, "patchable": 677,
                    "exploitable_high": 0, "cloud_open": 0, "cloud_critical": 0, "cloud_high": 0,
                    "cloud_medium": 0, "kev_unknown": 101, "stale": 325,
                }
            ],
            "incidents": [{"total": 2, "open_total": 2, "open_critical": 2}],
            "assets": [{"total": 145, "internet_facing": 73}],
            "environments": [{"total": 2}],
            "identity": [{"sessions": 57, "ciem_critical": 0, "ciem_open": 28, "ciem_scans": 2}],
            "ai": [{"models": 5, "invocations": 90}],
            "compliance": [{"name": "pci_dss", "passing": 1, "failing": 11, "score": 8.3}],
        }
    )


def test_every_task_the_pages_send_is_served():
    """The defect that made this route look broken: keys must be the call sites' own strings."""
    sent = set()
    for page in (WEB / "pages").rglob("*.jsx"):
        for match in re.finditer(r'useAgentPage\(\s*"[^"]*"\s*,\s*"([^"]+)"', page.read_text()):
            sent.add(match.group(1))
    assert sent, "no useAgentPage call sites found; the scan itself is broken"
    unserved = sent - set(m.TASKS)
    assert not unserved, f"pages send task names the route does not serve: {sorted(unserved)}"


@pytest.mark.parametrize(
    "task,collection",
    [
        ("dark_web_scan", "credential_leaks"),
        ("dark_web_scan", "ransomware_groups"),
        ("threat_hunt", "active_iocs"),
        ("osint_recon", "shadow_it"),
        ("exploit_analysis", "critical_paths"),
    ],
)
def test_dual_use_keys_are_collections_not_dashes(task, collection):
    """A dash in one of these keys satisfied the tile and threw on .map, blanking the page."""
    payload = asyncio.run(m.TASKS[task](_db(), "t"))
    assert isinstance(payload[collection], list), f"{task}.{collection} must be a list, got {type(payload[collection])}"


def test_absent_split_separates_scalars_from_collections():
    split = m._split_absent(["active_alerts", "top_alerts", "shadow_it_list", "credential_leaks_count"])
    assert split["scalar"] == ["active_alerts", "credential_leaks_count"]
    assert split["list"] == ["top_alerts", "shadow_it_list"]


def test_unserved_task_is_refused_with_the_served_list():
    with pytest.raises(HTTPException) as err:
        asyncio.run(m.agent_page(task="exploits", agent=None, db=_db(), current_user=type("U", (), {"tenant_id": "t"})()))
    assert err.value.status_code == 404
    assert "exploit_analysis" in err.value.detail["served"]


def test_dark_web_states_the_absence_instead_of_zero():
    payload = asyncio.run(m.agent_page(task="dark_web_scan", agent="dark-web", db=_db(), current_user=type("U", (), {"tenant_id": "t"})()))
    assert payload["status"] == "NOT MEASURED"
    assert "no dark-web collector" in payload["headline"].lower()
    assert set(payload["_absent"]["scalar"]) >= {"active_alerts", "critical"}
    for key in ("active_alerts", "critical"):
        assert key not in payload, "an unmeasured count must be absent, never 0"


def test_exploits_reports_measured_kev_and_names_the_missing_path_engine():
    payload = asyncio.run(m.agent_page(task="exploit_analysis", agent="exploit", db=_db(), current_user=type("U", (), {"tenant_id": "t"})()))
    assert payload["kev_listed"] == 0 and payload["high_epss"] == 2
    assert "critical_paths_count" in payload["_absent"]["scalar"]
    assert payload["critical_paths"] == [], "critical_paths is a collection the page maps over"


def test_hook_reads_the_route_and_no_longer_posts_the_refused_action():
    hook = (WEB / "components" / "platform" / "PageTemplate.jsx").read_text()
    assert "base44.platform.agentPage(" in hook
    assert "gdsMasterOrchestrator" not in hook, "the refused orchestrator action is still wired into the hook"
    assert 'payload._absent?.scalar' in hook and 'payload._absent?.list' in hook


def test_adapter_exposes_the_route():
    adapter = (WEB / "api" / "base44Client.js").read_text()
    assert "agentPage(task, agent)" in adapter
    assert "/platform/agent-page" in adapter
