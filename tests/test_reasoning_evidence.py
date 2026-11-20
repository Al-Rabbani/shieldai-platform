"""The reasoning engine must be measured, never declared.

/bridge/health answered "declared_unverified" as a literal string for months. That was wrong in both directions:
it understated an engine that had demonstrably reasoned, and it could not warn anyone if reasoning stopped. The
fix is not a nicer string - it is recording what the model chose and deriving the flag from that record.

The distinction these tests protect: a mission row proves a goal was submitted (templated work writes rows too).
A stored tool call proves a function-calling loop decided, acted and got a real result back.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

BRIDGE = (ROOT / "apps" / "api" / "gds_api" / "reasoning" / "bridge.py").read_text(encoding="utf-8")
TOOLS = (ROOT / "apps" / "api" / "gds_api" / "reasoning" / "governed_tools.py").read_text(encoding="utf-8")
VERIFY = (ROOT / "apps" / "api" / "gds_api" / "bridge" / "verification.py").read_text(encoding="utf-8")
HEALTH = (ROOT / "apps" / "api" / "gds_api" / "bridge" / "super_agent_bridge.py").read_text(encoding="utf-8")


def test_health_no_longer_hardcodes_the_reasoning_verdict():
    assert '"reasoning_engine": "declared_unverified",' not in HEALTH
    assert 'verification["reasoning_verified"]' in HEALTH


def test_health_reports_the_evidence_beside_the_verdict():
    """A flag without its evidence cannot be checked by the reader."""
    assert '"reasoning_evidence": verification["evidence"].get("reasoning")' in HEALTH
    assert 'verification["unverified_reasons"].get("reasoning")' in HEALTH


def test_the_bridge_persists_what_the_model_chose():
    assert "record_reasoning_tool_calls" in BRIDGE
    assert "tool_calls=result.tool_calls or []" in BRIDGE


def test_the_mission_report_records_iterations_and_the_model():
    """A run that never iterated produced prose, not a decision; the report must say which it was."""
    assert "iterations=result.iterations" in BRIDGE
    assert "tool_call_count=len(result.tool_calls or [])" in BRIDGE
    assert '"iterations": iterations,' in TOOLS
    assert '"model": model,' in TOOLS


def test_the_recorder_writes_one_row_per_tool_call_with_its_result():
    assert "for index, call in enumerate(tool_calls, start=1):" in TOOLS
    assert "result=result if isinstance(result, dict) else {\"value\": result}" in TOOLS


def test_the_recorder_binds_the_tenant_before_the_flush():
    """mission_tasks is FORCE RLS: the INSERT policy needs the tenant, and ORM RETURNING is checked twice."""
    body = TOOLS.split("async def record_reasoning_tool_calls", 1)[1]
    assert "await bind_tenant(session, tid)" in body
    assert body.index("await bind_tenant(session, tid)") < body.index("session.add(MissionTask(")


def test_a_mission_row_alone_does_not_count_as_reasoning():
    """The flag must come from tool tasks, not from missions, or templated work would satisfy it."""
    assert "reasoning_verified = bool(reasoning and reasoning[0])" in VERIFY
    query = VERIFY.split("reasoning = (await session.execute(", 1)[1].split("isolation = ", 1)[0]
    assert "mission_tasks" in query
    assert "t.tool_name IS NOT NULL" in query


def test_the_reasoning_flag_is_part_of_production_ready():
    assert '"reasoning_verified": reasoning_verified,' in VERIFY
    flags = VERIFY.split("flags = {", 1)[1].split("}", 1)[0]
    assert "reasoning_verified" in flags


def test_unverified_reasoning_says_why():
    assert 'reasons["reasoning"] = (' in VERIFY
    assert "no reasoning mission stored a tool call" in VERIFY
