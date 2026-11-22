"""The agent fleet panel.

Measured 22 Nov 2026: the panel showed "18 ACTIVE" over 26 hardcoded entries in components/copilot/agentFleetData.js,
including jira_ticket_creator, because functions.invoke("gdsAgentOS") has no route here. The platform's real registry is
gds_api/agents/registry.py, already served at GET /agents with GET /agents/fleet/status for heartbeats. These tests pin
that the frontend reads those and that the fabricated list cannot come back.
"""
import pathlib

SRC = pathlib.Path("/opt/gds-os/apps/web/src")


def _code(rel: str) -> str:
    """Comments stripped, block comments included. Earlier versions of this file failed because the module's own comments
    name the arrays and the function they replaced, so the assertions matched prose instead of code."""
    import re

    text = (SRC / rel).read_text()
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"//[^\n]*", "", text)
    return text


PANEL = _code("components/copilot/AgentFleetPanel.jsx")
DATA = _code("components/copilot/agentFleetData.js")
ADAPTER = _code("api/base44Client.js")


def test_the_panel_reads_the_real_agents_route():
    assert "base44.entities.Agent.list()" in PANEL
    assert "base44.entities.Agent.summary()" in PANEL


def test_the_panel_no_longer_calls_an_unserved_function_for_the_fleet():
    assert "gdsAgentOS" not in PANEL


def test_the_fabricated_fleet_is_gone():
    assert "AGENT_FLEET" not in DATA
    assert "MCP_TOOLS_FALLBACK" not in DATA
    assert "jira" not in DATA.lower()


def test_the_panel_does_not_claim_a_count_of_active_agents():
    assert "ACTIVE" not in PANEL.replace("HEARTBEAT", "")
    assert "registered" in PANEL


def test_the_adapter_maps_the_agent_entity_to_the_existing_route():
    assert "Agent: { path: '/agents', summaryPath: '/agents/fleet/status' }" in ADAPTER
    assert "/agents/fleet', summaryPath" not in ADAPTER, "the duplicate fleet route must not be mapped"


def test_the_duplicate_backend_module_is_gone():
    assert not pathlib.Path("/opt/gds-os/apps/api/gds_api/agents_api.py").exists()
    main = pathlib.Path("/opt/gds-os/apps/api/gds_api/main.py").read_text()
    assert "agents_api" not in main


def test_the_real_registry_declares_no_jira_tool():
    registry = pathlib.Path("/opt/gds-os/apps/api/gds_api/agents/registry.py").read_text().lower()
    assert "jira" not in registry


def test_quick_actions_survive_because_three_components_import_them():
    assert "QUICK_ACTIONS" in DATA
    assert "DEFAULT_ACTIVE_AGENTS" in DATA
