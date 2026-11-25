"""The five-stage warfare campaign must be executable, not a diagram.

Measured 25 Nov 2026: the platform had 23 roles and no way to run them as one workflow, and 35 capabilities
(including every scanner) had no owning role. These tests pin the campaign that joins the teams.
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "api"))

from gds_api.agents.registry import AGENT_REGISTRY
from gds_api.capabilities.catalog import CAPABILITY_REGISTRY
from gds_api.reasoning.governed_tools import resolve_capability_for_tool
from gds_api.tool_gateway import TOOL_REGISTRY
from gds_api.warfare.campaign import STAGES, resolve_stage_tool

REQUIRED = {
    "vulnerability_assessment",
    "vulnerability_management",
    "vulnerability_remediation",
    "incident_response",
    "penetration_testing",
}


def test_the_owner_s_five_stages_are_all_present_and_ordered():
    keys = [s["key"] for s in STAGES]
    assert set(keys) == REQUIRED, keys
    assert [s["number"] for s in STAGES] == [1, 2, 3, 4, 5]


def test_every_stage_has_a_registered_owner_that_owns_the_capability():
    for stage in STAGES:
        assert stage["owner_agent"] in AGENT_REGISTRY, stage["owner_agent"]
        manifest = AGENT_REGISTRY[stage["owner_agent"]]
        assert stage["capability_key"] in CAPABILITY_REGISTRY, stage["capability_key"]
        assert stage["capability_key"] in manifest.allowed_capability_ids, (
            f"{stage['key']}: {stage['owner_agent']} does not own {stage['capability_key']}"
        )


def test_every_stage_resolves_to_a_real_tool_that_matches_its_capability():
    for stage in STAGES:
        tool = resolve_stage_tool(stage)
        assert tool is not None, f"{stage['key']} has no tool"
        assert tool in TOOL_REGISTRY, tool
        assert resolve_capability_for_tool(tool) == stage["capability_key"], (stage["key"], tool)


def test_the_two_teams_both_fight():
    teams = {s["team"] for s in STAGES}
    assert teams == {"BLUE", "RED"}, teams


def test_both_targeted_stages_are_marked_as_needing_a_target():
    targeted = {s["key"] for s in STAGES if s["needs_target"]}
    assert targeted == {"vulnerability_assessment", "penetration_testing"}, targeted


def test_stages_that_do_not_depend_on_each_other_run_together():
    """The war is not a queue: assessment, incident response and penetration testing are independent."""
    from gds_api.warfare.campaign import parallel_groups

    waves = [[s["key"] for s in w] for w in parallel_groups(list(STAGES))]
    assert waves[0] == ["vulnerability_assessment", "incident_response", "penetration_testing"], waves
    assert waves[1] == ["vulnerability_management"], waves
    assert waves[2] == ["vulnerability_remediation"], waves


def test_every_dependency_names_a_real_stage_and_runs_before_it():
    from gds_api.warfare.campaign import parallel_groups

    keys = {s["key"] for s in STAGES}
    for stage in STAGES:
        for dep in stage["depends_on"]:
            assert dep in keys, f"{stage['key']} depends on unknown stage {dep}"
    waves = [[s["key"] for s in w] for w in parallel_groups(list(STAGES))]
    position = {k: i for i, w in enumerate(waves) for k in w}
    for stage in STAGES:
        for dep in stage["depends_on"]:
            assert position[dep] < position[stage["key"]], f"{stage['key']} runs before its dependency {dep}"


def test_management_receives_the_assessment_result_as_a_handoff():
    """A downstream stage must be told what upstream really produced - but never by substituting a tool
    argument after approval: the execution binding refuses a request whose parameters changed."""
    import pathlib

    src = (pathlib.Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "warfare"
           / "campaign.py").read_text()
    assert 'handoff_text = " | upstream: "' in src
    assert "shared[stage[\"key\"]] = {" in src
    assert 'args["_upstream"]' not in src, "the handoff must not be smuggled into the bound parameters"
    assert "handoff_text" in src.split("purpose=")[1][:200]
