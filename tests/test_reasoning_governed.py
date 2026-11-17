"""Guards for governed tool execution in the reasoning loop.

The legacy loop refused every tool call outright, so these tests pin the mechanism that replaced it:
agent-facing names resolve to real registry tools, and execution refuses rather than guesses when the
governed context or the declared mapping is missing.
"""
from __future__ import annotations

import asyncio

from gds_api.reasoning.agent_loop import PARAM_MAP, TOOL_NAME_MAP
from gds_api.reasoning.governed_tools import execute_governed_tool, resolve_capability_for_tool


def test_agent_facing_name_resolves_to_the_real_findings_tool():
    """Measured: 19 agents are told to call get_findings, and no registry key carries that name."""
    assert TOOL_NAME_MAP["get_findings"] == "list_open_findings"
    assert resolve_capability_for_tool("list_open_findings") == "finding.list_open"


def test_resolver_returns_none_when_no_single_capability_declares_the_tool():
    """Honest refusal by design: the key is never inferred."""
    assert resolve_capability_for_tool("nmap_scan") is None
    assert resolve_capability_for_tool("nonexistent_tool") is None


def test_execution_without_governed_context_is_refused_not_attempted():
    result = asyncio.run(
        execute_governed_tool(
            tenant_id=None,
            user_id=None,
            mission_id=None,
            agent_id="ai-vuln-director",
            tool_name="list_open_findings",
            args={},
        )
    )
    assert result["success"] is False
    assert result["code"] == "GOVERNED_CONTEXT_MISSING"
    assert result["execution_mode"] == "not_executed"


def test_unmapped_tool_is_refused_with_its_own_code():
    result = asyncio.run(
        execute_governed_tool(
            tenant_id="2ec10dd0-e48e-4043-8c88-5998ba5e23b0",
            user_id="3f3f6d1e-0000-4000-8000-000000000000",
            mission_id="4f4f6d1e-0000-4000-8000-000000000000",
            agent_id="ai-vuln-director",
            tool_name="nmap_scan",
            args={},
        )
    )
    assert result["success"] is False
    assert result["code"] == "CAPABILITY_NOT_MAPPED"


def test_parameter_translation_table_still_covers_the_header_tools():
    """A tool whose params are renamed must stay renamed, or the real handler gets the wrong field."""
    assert PARAM_MAP["check_url_security_headers"]["target"] == "url"
    assert PARAM_MAP["subfinder_scan"]["target"] == "domain"
