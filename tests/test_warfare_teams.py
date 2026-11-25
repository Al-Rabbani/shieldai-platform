"""The Digital Warriors: offensive and defensive teams must own real, tool-backed capabilities.

Measured 25 Nov 2026: 35 capabilities existed that NO role owned, including network.vulnerability_scan,
network.web_server_scan, network.injection_scan, recon.*, sast/dast/container/iac scan and generate_sbom.
The scanners were installed and the capabilities were declared, but no agent could request them, so
"vulnerability assessment" was not automated at all. These tests pin the team that closes that.
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "api"))

from gds_api.agents.registry import AGENT_REGISTRY
from gds_api.capabilities.catalog import CAPABILITY_REGISTRY
from gds_api.tool_gateway import TOOL_REGISTRY
from gds_api.reasoning.governed_tools import resolve_capability_for_tool

# The five workflow stages the owner asked to be automated end to end.
STAGES = {
    "vulnerability_assessment": {
        "network.vulnerability_scan", "network.web_server_scan", "recon.subdomain_enum",
        "recon.http_probe", "security_tools.sast_scan", "security_tools.dast_scan",
        "security_tools.container_scan", "security_tools.iac_scan", "security_tools.generate_sbom",
    },
    "vulnerability_management": {
        "vulnerability.lookup", "finding.enrich", "finding.prioritise", "finding.triage",
        "finding.validate",
    },
    "vulnerability_remediation": {"remediation.auto_fix_finding"},
    "incident_response": {
        "incident.create", "incident.list_open", "evidence.verify_integrity",
        "threat_intel.lookup_malware_hash", "security_tools.darkweb_check",
        "security_tools.identity_threats",
    },
    "penetration_testing": {
        "red_team.recon_passive", "red_team.recon_active", "red_team.assess_attack_surface",
        "red_team.coordinate_pentest_engagement", "network.injection_scan", "network.port_scan",
    },
}


def _owned():
    owned = {}
    for role, a in AGENT_REGISTRY.items():
        for c in a.allowed_capability_ids:
            owned.setdefault(c, set()).add(role)
    return owned


def test_the_two_teams_exist_with_real_members():
    red = [r for r, a in AGENT_REGISTRY.items() if str(a.team).endswith("RED")]
    blue = [r for r, a in AGENT_REGISTRY.items() if str(a.team).endswith("BLUE")]
    assert len(red) >= 4, red
    assert len(blue) >= 17, blue
    for role in ("red_team", "attack_surface_recon", "exploitation_specialist",
                 "penetration_testing_coordinator"):
        assert role in red, role
    for role in ("vulnerability_assessment", "vulnerability_management", "blue_team",
                 "incident_response", "defensive_remediation_autofix", "validation_retest"):
        assert role in blue, role


def test_every_stage_of_the_workflow_has_an_owner():
    owned = _owned()
    for stage, caps in STAGES.items():
        for cap in caps:
            assert cap in CAPABILITY_REGISTRY, f"{stage}: {cap} is not a real capability"
            assert owned.get(cap), f"stage {stage}: capability {cap} has no owning role"


def test_no_role_is_decorative():
    """Every capability a role claims must be backed by a real tool in the registry."""
    for role, a in AGENT_REGISTRY.items():
        for tool in a.tool_names:
            assert tool in TOOL_REGISTRY, f"{role} declares unknown tool {tool}"
            cap = resolve_capability_for_tool(tool)
            assert cap is not None, f"{role}: tool {tool} resolves to no capability"
            assert cap in a.allowed_capability_ids, (
                f"{role}: tool {tool} maps to {cap}, which the role does not own"
            )


def test_offensive_roles_cannot_self_authorise():
    """The exploitation role must sit behind target authorisation, not run at will."""
    assert AGENT_REGISTRY["exploitation_specialist"].target_authorisation_required is True
    assert AGENT_REGISTRY["attack_surface_recon"].target_authorisation_required is True


def test_known_untooled_capabilities_are_named_not_hidden():
    """Eight capabilities are declared but have no tool at all. They cannot be assigned to a role;
    naming them keeps the remediation gap visible instead of implying it is automated."""
    untooled = {
        c for c in CAPABILITY_REGISTRY
        if not any(resolve_capability_for_tool(t) == c for t in TOOL_REGISTRY)
    }
    expected = {
        "cloud.apply_remediation", "cloud.read_posture", "engineering.commit",
        "engineering.commit_mission", "engineering.execute_session", "engineering.plan_mission",
        "repository.write", "shell.run_allowlisted", "shell.run_unrestricted",
    }
    assert untooled == expected, f"untooled set changed: {sorted(untooled)}"
    owned = _owned()
    for cap in expected:
        assert cap not in owned, f"{cap} has no tool but {owned.get(cap)} claims it"
