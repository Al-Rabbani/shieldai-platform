"""The tool menu offered to the model must match what the capability broker will allow.

Measured 19 Nov 2026: 64 tool slots were advertised across 15 reasoning agents and only 15
were reachable. Every mission therefore ended in DENY or CAPABILITY_NOT_MAPPED while the
model believed it had the tool. These tests pin the alignment so it cannot silently return.
"""
import pytest

from gds_api.agents.manifest import RiskCeiling, Team
from gds_api.agents.registry import AGENT_REGISTRY
from gds_api.capabilities.catalog import CAPABILITY_REGISTRY
from gds_api.capabilities.definitions import CapabilityStatus
from gds_api.reasoning.agent_loop import TOOL_NAME_MAP
from gds_api.reasoning.governed_tools import resolve_capability_for_tool, resolve_requesting_agent
from gds_api.reasoning.tool_definitions import (
    _AGENT_TOOL_MAP,
    get_tool_names,
    reachable_tool_names,
)


def _broker_allows(capability, agent) -> bool:
    """The broker's allow-list predicate, mirrored so the explicit-grant route is pinned."""
    if not (capability.allowed_team_types or capability.allowed_agent_ids):
        return False
    return (
        agent.name in (capability.allowed_agent_ids or ())
        or agent.team in (capability.allowed_team_types or ())
        or capability.stable_key in (getattr(agent, "allowed_capability_ids", ()) or ())
    )


@pytest.mark.parametrize("reasoning_agent", sorted(_AGENT_TOOL_MAP))
def test_offered_tool_is_always_executable(reasoning_agent):
    offered = get_tool_names(reasoning_agent)
    assert offered, f"{reasoning_agent} is offered no tool at all"
    for name in offered:
        canonical = TOOL_NAME_MAP.get(name, name)
        key = resolve_capability_for_tool(canonical)
        assert key is not None, f"{reasoning_agent} offered {name}, which no capability declares"
        capability = CAPABILITY_REGISTRY[key]
        assert capability.status == CapabilityStatus.OPERATIONAL
        agent = AGENT_REGISTRY[resolve_requesting_agent(reasoning_agent)]
        assert _broker_allows(capability, agent), (
            f"{reasoning_agent} is offered {name} but the broker would refuse {key}"
        )


def test_menu_never_exceeds_the_declared_agent_map():
    for agent_id, declared in _AGENT_TOOL_MAP.items():
        assert set(get_tool_names(agent_id)) <= set(declared)


def test_executive_advisor_can_reach_read_only_posture():
    agent = AGENT_REGISTRY["executive_advisor"]
    assert "finding.list_open" in agent.allowed_capability_ids
    assert "network.check_url_headers" in agent.allowed_capability_ids
    assert agent.risk_ceiling in (RiskCeiling.R2, RiskCeiling.R3, RiskCeiling.R4, RiskCeiling.R5)


def test_offensive_capabilities_are_red_team_only_and_target_gated():
    for key in (
        "network.port_scan",
        "network.vulnerability_scan",
        "network.injection_scan",
        "network.content_discovery",
        "network.cms_scan",
        "network.web_server_scan",
    ):
        capability = CAPABILITY_REGISTRY[key]
        assert capability.allowed_team_types == (Team.RED,), key
        assert capability.requires_target_authorisation is True, key
        assert capability.status == CapabilityStatus.OPERATIONAL, key


def test_every_declared_tool_resolves_to_exactly_one_capability():
    declared = {
        tool
        for capability in CAPABILITY_REGISTRY.values()
        for tool in (capability.required_tool_ids or ())
    }
    for tool in sorted(declared):
        matches = [
            key
            for key, capability in CAPABILITY_REGISTRY.items()
            if tool in (capability.required_tool_ids or ())
        ]
        assert len(matches) == 1, f"{tool} is declared by {matches} - ambiguous"


def test_foundation_agent_cannot_reach_offensive_scanning():
    agent = AGENT_REGISTRY["executive_advisor"]
    assert not _broker_allows(CAPABILITY_REGISTRY["network.port_scan"], agent)
    assert "nmap_scan" not in reachable_tool_names("ai-chief-ciso")
