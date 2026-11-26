"""A budget that runs out must produce an answer, not a guaranteed failure.

MEASURED 26 Nov 2026: the ai-vuln-director CISA KEV mission failed on every six-hourly run with "10 iteration(s) and 38
tool call(s) without a final answer; nothing raised an error; the model kept calling tools". Nothing ever told the model
the budget existed, and nothing stopped it spending the last iteration on another tool call, so the failure was certain.

These tests use a model that NEVER stops calling tools - the worst case - and require an honest partial answer.
"""
import asyncio
from types import SimpleNamespace

import pytest

from gds_api.reasoning import agent_loop as mod
from gds_api.reasoning.agent_loop import AgenticLoop, CLOSING_DIRECTIVE
from gds_api.reasoning.governed_tools import AGENT_MISSION_TYPES, mission_type_for_agent
from gds_api.mission_taxonomy import MISSION_TYPES


class _AlwaysToolCalling:
    """A model that calls a tool every single time it is offered one."""

    def __init__(self, answer_when_forbidden="Partial: CISA KEV holds 1,805 entries; 905 open findings."):
        self.choices_made = []
        self.answer = answer_when_forbidden
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    async def _create(self, **kwargs):
        self.choices_made.append(kwargs.get("tool_choice"))
        offered = kwargs.get("tools")
        if kwargs.get("tool_choice") == "none" or not offered:
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content=self.answer, tool_calls=None))],
                usage=None,
            )
        call = SimpleNamespace(
            id=f"call_{len(self.choices_made)}",
            function=SimpleNamespace(name=offered[0]["function"]["name"], arguments="{}"),
        )
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=None, tool_calls=[call]))],
            usage=None,
        )


@pytest.fixture
def loop(monkeypatch):
    async def _no_cost(**kwargs):
        return None

    monkeypatch.setattr(mod, "record_llm_cost", _no_cost)

    async def _fake_execute(self, tool_name, args):
        return {"ok": True, "tool": tool_name}

    monkeypatch.setattr(AgenticLoop, "_execute_tool", _fake_execute)

    instance = AgenticLoop("ai-vuln-director")
    instance.MAX_ITERATIONS = 4
    instance.client = _AlwaysToolCalling()
    return instance


def test_the_last_iteration_is_not_offered_a_tool(loop):
    result = asyncio.run(loop.run("check CISA KEV"))
    assert loop.client.choices_made[-1] == "none", \
        f"the final iteration still offered tools: {loop.client.choices_made}"


def test_a_model_that_never_stops_still_yields_a_partial_answer(loop):
    result = asyncio.run(loop.run("check CISA KEV"))
    assert result.success is True, f"the run failed anyway: {result.summary}"
    assert result.summary.startswith("PARTIAL ANSWER:"), result.summary[:120]
    assert "iteration budget (4)" in result.summary
    assert "905 open findings" in result.summary, "the answer itself must survive, not just the label"


def test_the_budget_notice_is_given_before_the_last_iteration(loop):
    asyncio.run(loop.run("check CISA KEV"))
    # CLOSING_ITERATIONS is 2 by default, so with MAX_ITERATIONS=4 the notice belongs on iteration 3 of 4
    assert loop.client.choices_made[0] == "auto", "the first iteration must be unconstrained"
    assert loop.client.choices_made[-2] == "auto", "the second-to-last iteration may still use tools"


def test_the_directive_demands_an_honest_partial_answer():
    text = CLOSING_DIRECTIVE.format(remaining=1)
    assert "Do NOT call another tool" in text
    assert "could not verify" in text, "it must ask what was NOT established, not only what was"


def test_every_mapped_role_uses_a_declared_mission_type():
    undeclared = {k: v for k, v in AGENT_MISSION_TYPES.items() if v not in MISSION_TYPES}
    assert undeclared == {}, f"these roles map to types the taxonomy does not declare: {undeclared}"


def test_the_schedulers_three_roles_are_typed():
    assert mission_type_for_agent("ai-vuln-director") == "vulnerability_assessment"
    assert mission_type_for_agent("ai-threat-hunter") == "threat_hunt"
    assert mission_type_for_agent("ai-chief-ciso") == "executive_reporting"


def test_an_unknown_role_is_left_untyped_rather_than_mislabelled():
    assert mission_type_for_agent("brand-new-agent-xyz") is None, \
        "an unrecognised role must be reported as untyped, not given a type that misdescribes it"


def test_the_mission_row_carries_the_type():
    import inspect
    from gds_api.reasoning import governed_tools

    src = inspect.getsource(governed_tools.open_reasoning_mission)
    assert "mission_type=mission_type" in src
    assert "mission_type_for_agent(agent_id)" in src
