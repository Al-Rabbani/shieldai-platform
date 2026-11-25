"""The wave planner decides what runs at once in the five-stage cyber-warfare workflow.

Ordering here is a safety property, not a style choice: management must see the assessment, remediation must see
management, and nothing may be launched wider than the engine's declared ceiling. Measured 25 Nov 2026: coverage
was 39% overall and 23% for this module, and the planner could emit a wave wider than the max_parallel it reported.
"""
from gds_api.warfare.campaign import MAX_PARALLEL_STAGES, STAGES, parallel_groups, resolve_stage_tool


def _stage(key, depends_on=()):
    return {"key": key, "depends_on": tuple(depends_on)}


def test_the_real_five_stages_still_plan_into_three_waves():
    waves = [[s["key"] for s in w] for w in parallel_groups(list(STAGES))]
    assert waves == [
        ["vulnerability_assessment", "incident_response", "penetration_testing"],
        ["vulnerability_management"],
        ["vulnerability_remediation"],
    ]


def test_no_wave_is_wider_than_the_declared_ceiling():
    """Five independent stages must not become one five-wide wave while the engine reports max_parallel=3."""
    stages = [_stage(f"independent_{i}") for i in range(5)]
    waves = parallel_groups(stages)
    assert max(len(w) for w in waves) <= MAX_PARALLEL_STAGES
    assert [len(w) for w in waves] == [MAX_PARALLEL_STAGES, 2]


def test_a_chain_still_runs_one_stage_per_wave():
    waves = parallel_groups([_stage("a"), _stage("b", ("a",)), _stage("c", ("b",))])
    assert [[s["key"] for s in w] for w in waves] == [["a"], ["b"], ["c"]]


def test_a_dependency_outside_the_selection_does_not_hang():
    """Resuming a subset must make progress, not spin: the planner falls back to one stage at a time."""
    waves = parallel_groups([_stage("remediation", ("management",))])
    assert [[s["key"] for s in w] for w in waves] == [["remediation"]]


def test_a_cycle_makes_progress_instead_of_hanging():
    waves = parallel_groups([_stage("a", ("b",)), _stage("b", ("a",))])
    assert sum(len(w) for w in waves) == 2
    assert len(waves) == 2


def test_every_stage_appears_exactly_once():
    flat = [s["key"] for w in parallel_groups(list(STAGES)) for s in w]
    assert sorted(flat) == sorted(s["key"] for s in STAGES)


def test_a_stage_with_no_capability_tool_resolves_to_none():
    """A stage naming a capability no tool implements must resolve to nothing, never to a guessed tool."""
    assert resolve_stage_tool({"capability_key": "does.not.exist", "preferred_tool": "nuclei_scan"}) is None


def test_the_preferred_tool_is_used_when_it_belongs_to_the_capability():
    stage = next(s for s in STAGES if s["key"] == "vulnerability_assessment")
    assert resolve_stage_tool(stage) == "nuclei_scan"
