"""Fixed, read-only assessment cases for registered GDS agents.

No caller-selected tool, target, arguments, or tenant. A missing case is a
documented assessment gap, never an invitation to execute a write or scan.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from gds_api.agents.registry import AGENT_REGISTRY
from gds_api.capabilities.catalog import CAPABILITY_REGISTRY
from gds_api.capabilities.definitions import RiskClass, SideEffectType


@dataclass(frozen=True)
class ReadOnlyCase:
    tool: str
    args: dict[str, Any] = field(default_factory=dict)


READ_ONLY_CASES: dict[str, ReadOnlyCase] = {
    "knowledge_memory": ReadOnlyCase("search_knowledge", {"query": "GDS assessment sandbox", "limit": 3}),
    "data_intelligence": ReadOnlyCase("query_platform_metrics"),
    "automation_workflow": ReadOnlyCase("list_pending_approvals", {"limit": 5}),
    "platform_operations": ReadOnlyCase("check_platform_health"),
    "executive_advisor": ReadOnlyCase("list_recent_missions", {"limit": 5}),
    "blue_team": ReadOnlyCase("list_open_findings", {"limit": 5}),
    "incident_response": ReadOnlyCase("list_open_incidents", {"limit": 5}),
    "security_architecture": ReadOnlyCase("review_platform_architecture"),
    "identity_access_management": ReadOnlyCase("review_identity_posture"),
    "compliance_grc": ReadOnlyCase("review_compliance_posture"),
    "risk_business_intelligence": ReadOnlyCase("calculate_risk_exposure"),
}


def verified_case(agent_id: str) -> ReadOnlyCase | None:
    """Fail closed if a catalogue or manifest edit changes the case's safety."""
    agent = AGENT_REGISTRY.get(agent_id)
    case = READ_ONLY_CASES.get(agent_id)
    if agent is None or case is None or case.tool not in agent.tool_names:
        return None
    matches = [cap for cap in CAPABILITY_REGISTRY.values()
               if case.tool in cap.required_tool_ids]
    if (len(matches) != 1 or matches[0].risk_class != RiskClass.R0
            or matches[0].side_effect_type != SideEffectType.NONE
            or matches[0].stable_key not in agent.allowed_capability_ids):
        return None
    return case


def assessment_plan() -> list[dict[str, Any]]:
    return [{
        "agent_id": agent_id,
        "declared_status": str(agent.status),
        "assessment_status": "read_only_case_available" if verified_case(agent_id) else "not_executed",
        "tool": verified_case(agent_id).tool if verified_case(agent_id) else None,
        "reason": None if verified_case(agent_id) else
            "No fixed R0, side-effect-free case. Requires a scoped fixture, connector, target authorization, or policy approval.",
    } for agent_id, agent in AGENT_REGISTRY.items()]
