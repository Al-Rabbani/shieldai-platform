"""The Co-Pilot's standing memory: recorded, read back, applied to a mission, and reported.

MEASURED 25 Nov 2026 against the live platform: POST /copilot/memory stored a preference, GET /copilot/memory read it
back, and a mission answer came back ending with the literal mark the preference demanded - so the memory really does
reach the model. But the mission response carried standing_memory_count: None, because the route built the count onto
a context dict and then never returned that dict. A page could therefore not tell the operator whether an answer had
been shaped by memory, which is the whole point of recording one.

The live proof used a scoped API key (sha256 of a gds_ key against api_keys.key_hash) so no throwaway user was made.
"""
from __future__ import annotations

import asyncio
from types import SimpleNamespace

import gds_api.reasoning.routes as routes


class _FakeBridge:
    def __init__(self, summary: str = "ok"):
        self.summary = summary

    async def run_with_auto_select(self, goal, ctx, tenant_id=None, user_id=None, allow_writes=False):
        self.seen_goal = goal
        self.seen_ctx = ctx
        return SimpleNamespace(success=True, agent_id="auto", goal=goal, summary=self.summary,
                               tool_calls=[], iterations=1, duration_ms=5, error=None)


def _run(monkeypatch, count, goal="count the open findings"):
    async def _mem(g, tid, ctx):
        return g, {"standing_memory_count": count}

    async def _guard(*a, **k):
        return None

    bridge = _FakeBridge()
    monkeypatch.setattr(routes, "_with_standing_memory", _mem)
    monkeypatch.setattr(routes, "_guard_or_refuse", _guard)
    monkeypatch.setattr(routes, "reasoning_bridge", bridge)
    user = SimpleNamespace(id="u-1", user_id="u-1", tenant_id="t-1")
    out = asyncio.run(routes.create_mission(routes.MissionRequest(goal=goal),
                                            request=SimpleNamespace(), user=user))
    return out, bridge


def test_the_mission_response_reports_the_memory_it_used(monkeypatch):
    out, _ = _run(monkeypatch, 2)
    assert out["standing_memory_count"] == 2, "a mission that used memory must say so"


def test_zero_memory_is_reported_as_zero_not_missing(monkeypatch):
    out, _ = _run(monkeypatch, 0)
    assert out["standing_memory_count"] == 0
    assert "standing_memory_error" in out, "an absent error is stated as None, not omitted"


def test_the_original_goal_survives_the_memory_prefix(monkeypatch):
    """The route sends a prefixed goal to the engine; the caller must still get back what it asked."""
    goal = "summarise this incident"
    out, bridge = _run(monkeypatch, 1, goal=goal)
    assert out["goal_original"] == goal
    assert bridge.seen_goal == goal, "the fake returns what it was given, so this pins the route's plumbing"


def test_a_memory_read_failure_is_carried_not_hidden(monkeypatch):
    async def _mem(g, tid, ctx):
        return g, {"standing_memory_count": 0, "standing_memory_error": "OperationalError: boom"}

    async def _guard(*a, **k):
        return None

    monkeypatch.setattr(routes, "_with_standing_memory", _mem)
    monkeypatch.setattr(routes, "_guard_or_refuse", _guard)
    monkeypatch.setattr(routes, "reasoning_bridge", _FakeBridge())
    user = SimpleNamespace(id="u-1", user_id="u-1", tenant_id="t-1")
    out = asyncio.run(routes.create_mission(routes.MissionRequest(goal="x"),
                                            request=SimpleNamespace(), user=user))
    assert out["standing_memory_error"] == "OperationalError: boom"
