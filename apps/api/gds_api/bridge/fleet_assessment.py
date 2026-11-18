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

# Assessment contracts are plans, not receipts. A role moves to verified only
# after the broker executes the tool and the stated outcome is independently checked.
MISSION_CONTRACTS: dict[str, tuple[str, str, str]] = {
    "knowledge_memory": ("Search sandbox knowledge", "Search result and source IDs returned", "sandbox knowledge record"),
    "data_intelligence": ("Read sandbox metrics", "Tenant metric values and source returned", "sandbox tenant"),
    "automation_workflow": ("Read approval queue", "Tenant queue count returned", "sandbox tenant"),
    "platform_operations": ("Check platform health", "Live health result and release SHA returned", "running services"),
    "executive_advisor": ("Read recent missions", "Tenant mission list returned", "sandbox tenant"),
    "blue_team": ("Read open findings", "Tenant findings list returned", "sandbox tenant"),
    "incident_response": ("Read open incidents", "Tenant incident list returned", "sandbox tenant"),
    "security_architecture": ("Inspect tenant isolation", "RLS inventory and missing policies returned", "live schema"),
    "identity_access_management": ("Inventory identity evidence", "Tenant user, role, session counts returned with unmeasured controls explicit", "live identity tables"),
    "compliance_grc": ("Review compliance posture", "Tenant evidence and control state returned", "sandbox tenant"),
    "risk_business_intelligence": ("Calculate risk exposure", "Tenant exposure calculation and input counts returned", "sandbox tenant"),
    "threat_intelligence": ("Cross-check one sandbox CVE against CISA KEV", "Feed response, match and raw source evidence recorded", "sandbox CVE watchlist and reachable CISA feed"),
    "vulnerability_management": ("Assess one pinned sandbox package", "OSV match, dedup finding, enrichment and priority checked", "pinned test package and reachable OSV/EPSS feeds"),
    "threat_hunting": ("Hunt one controlled indicator", "URLhaus lookup, matched finding or explicit clean result checked", "controlled indicator and reachable URLhaus feed"),
    "network_security": ("Inspect an authorized sandbox host", "Scoped network observations and target authorization receipt checked", "owned local target and written scope"),
    "api_application_security": ("Assess an authorized sandbox API", "Scoped API observations and issue evidence checked", "owned local API and written scope"),
    "digital_forensics": ("Verify a sandbox evidence object", "Stored digest matches independent content digest", "tenant evidence object and content"),
    "devsecops": ("Inspect a sandbox dependency manifest", "Dependency finding and repository provenance checked", "isolated repository fixture"),
    "malware_analysis": ("Analyze an inert known sample", "Sample hash, classification and source evidence checked", "safe sample and isolated analyzer"),
    "red_team": ("Run approved recon on local target", "Technique scope and observed DNS/port/TLS receipts checked", "owned local target and human authorization"),
    "validation_retest": ("Independently retest a remediated finding", "Fresh source evidence and verdict checked; closure remains separate", "sandbox finding with reproducible source"),
    "defensive_remediation_autofix": ("Remediate in isolated workspace", "Finding, worktree, approval, commit and independent retest linked", "validated sandbox finding and governed engineering workspace"),
    "penetration_testing_coordinator": ("Coordinate authorized engagement", "Every in-scope target has bounded technique receipts and outcome summary", "owned local targets and approved engagement"),
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


def outcome_verified(agent_id: str, result: Any) -> bool:
    """A successful dispatch is insufficient when the result lacks the evidence contract."""
    if not isinstance(result, dict) or result.get("success") is not True:
        return False
    if agent_id == "identity_access_management":
        observed = result.get("observed")
        return (result.get("tenant_scoped") is True
                and result.get("evidence_status") == "inventory_only"
                and result.get("grade") is None
                and isinstance(result.get("unmeasured_controls"), list)
                and isinstance(observed, dict)
                and all(isinstance(observed.get(key), int) and observed[key] >= 0
                        for key in ("users", "active_users", "roles", "sessions",
                                    "current_sessions", "users_without_tenant_role")))
    return True


def assessment_plan() -> list[dict[str, Any]]:
    return [{
        "agent_id": agent_id,
        "declared_status": str(agent.status),
        "assessment_status": "read_only_case_available" if verified_case(agent_id) else "not_executed",
        "tool": verified_case(agent_id).tool if verified_case(agent_id) else None,
        "reason": None if verified_case(agent_id) else
            "No fixed R0, side-effect-free case. Requires a scoped fixture, connector, target authorization, or policy approval.",
        "mission": MISSION_CONTRACTS[agent_id][0],
        "outcome_check": MISSION_CONTRACTS[agent_id][1],
        "required_fixture": MISSION_CONTRACTS[agent_id][2],
        "approval_required": bool(agent.approval_requirements),
    } for agent_id, agent in AGENT_REGISTRY.items()]
