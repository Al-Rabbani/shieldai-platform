"""Item 44: the Co-Pilot chat could only run one agent at a time.

MEASURED. POST /reasoning/mission takes a single agent_id (or auto-selects one) and runs one governed loop, so a typed
instruction produced one agent's answer. The multi-agent orchestrator already existed and was already running three
agents per cycle for the cron scheduler, but nothing a signed-in person could reach called it: the only callers were the
bridge and the scheduler runner. "The agents orchestrate" was true of the scheduler and false of the chat.

THIS ROUTE. POST /copilot/mission/orchestrate plans the goal across agents, executes them through the same governed loop
every other path uses (reasoning_bridge.execute_task, which carries tenant and user so a tool cannot run unbound), and
returns the plan, each agent's summary and tool count, the aggregate report, the wall time and the money it cost.

WHAT IT DOES NOT DO. It does not stream: there is no progress event, so the caller waits for every agent and the
aggregator (30 to 60 seconds measured) and the screen shows elapsed time only. It does not let the caller name the agents;
the planner chooses them, and the response reports what it chose. It does not persist a chat transcript; the mission row
and the cost rows are the durable record. It is read-only unless allow_writes is set, because a sentence typed into a box
must not be able to change the estate by picking a tool.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api import ai_guard
from gds_api.db import get_db
from gds_api.rate_limit import tenant_rate_limit
from gds_api.reasoning.mission_orchestrator import execute_mission
from gds_api.reasoning.routes import _with_standing_memory
from gds_api.security import CurrentUser, get_current_user, require_permission

logger = logging.getLogger("gds.copilot.orchestrate")

router = APIRouter(prefix="/copilot/mission", tags=["copilot"])

MAX_GOAL_CHARS = 4000

LIMITS = [
    "Nothing streams. There is no progress event, so the answer arrives when every agent and the aggregator have "
    "finished; 30 to 60 seconds is what a three-agent mission has measured.",
    "The planner chooses the agents, not the caller. The response reports which agents ran and what each returned.",
    "Read-only unless the request sets allow_writes: a sentence typed into the chat must not be able to change the "
    "estate by choosing a tool.",
    "Each mission costs real money - about $0.07 for three agents after the agent-loop context trim on 23 Nov 2026 - so "
    "this route is capped per tenant per hour rather than left open to a chat loop.",
    "The mission row and the cost rows are the durable record. No chat transcript is stored by this route.",
]


class OrchestrateRequest(BaseModel):
    goal: str = Field(min_length=8, max_length=MAX_GOAL_CHARS)
    allow_writes: bool = False


def _uid(user: CurrentUser) -> str:
    uid = getattr(user, "id", None) or getattr(user, "user_id", None)
    if not uid:
        raise HTTPException(403, "Token carries no user identity")
    return str(uid)


def _tenant(user: CurrentUser) -> str:
    tid = getattr(user, "tenant_id", None)
    if not tid:
        raise HTTPException(403, "Token carries no tenant identity")
    return str(tid)


async def _spent(db: AsyncSession, tenant_id: str, since) -> Optional[float]:
    try:
        await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"), {"t": tenant_id})
        value = (
            await db.execute(
                text(
                    "SELECT sum(cost_usd) FROM cost_records WHERE tenant_id = CAST(:t AS uuid)"
                    " AND created_at >= :since"
                ),
                {"t": tenant_id, "since": since},
            )
        ).scalar()
        return float(value) if value is not None else None
    except Exception as exc:  # noqa: BLE001 - an unmeasured cost is reported as unmeasured
        logger.warning("cost could not be measured: %s", exc)
        return None


@router.post(
    "/orchestrate",
    dependencies=[Depends(tenant_rate_limit("copilot_orchestrate", max_requests=8, window_seconds=3600))],
)
async def orchestrate(
    body: OrchestrateRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_permission("copilot:orchestrate")),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Plan the goal across agents, run them under governance, and report what each returned."""
    tenant_id = _tenant(current_user)
    actor_id = _uid(current_user)

    verdict = ai_guard.scan(body.goal, None)
    if verdict.triggered:
        recorded = await ai_guard.record_attack(
            tenant_id, verdict, body.goal, "POST /copilot/mission/orchestrate", actor_id,
            request.client.host if request.client else None,
        )
        if verdict.blocked:
            raise HTTPException(422, {
                "error": "prompt_guard_refused",
                "attack_type": verdict.attack_type,
                "matched_rules": verdict.matched,
                "severity": verdict.severity,
                "recorded": recorded,
                "note": "This request was not executed.",
            })

    goal, context = await _with_standing_memory(
        body.goal,
        tenant_id,
        {
            "tenant_id": tenant_id,
            "user_id": actor_id,
            "allow_writes": body.allow_writes,
            "source": "copilot_chat",
        },
    )

    from datetime import datetime, timezone

    started = datetime.now(timezone.utc)
    try:
        result = await execute_mission(goal, context)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - a failed mission is reported, never dressed as an answer
        logger.error("orchestrated mission failed: %s", exc)
        raise HTTPException(502, f"The mission did not complete: {type(exc).__name__}: {exc}") from exc

    cost = await _spent(db, tenant_id, started)

    plan = result.get("plan") or {}
    steps = plan.get("steps") or []
    agents: List[Dict[str, Any]] = [
        {
            "agent_id": ar.get("agent_id"),
            "success": ar.get("success"),
            "iterations": ar.get("iterations"),
            "tool_calls": ar.get("tool_calls"),
            "duration_ms": ar.get("duration_ms"),
            "summary": ar.get("summary"),
            "error": ar.get("error"),
        }
        for ar in (result.get("agent_results") or [])
    ]

    return {
        "mission_id": result.get("mission_id"),
        "goal": result.get("goal"),
        "answer": result.get("unified_report"),
        "plan": {
            "agents": [s.get("agent_id") for s in steps],
            "parallel": bool(plan.get("parallel")),
            "aggregator": plan.get("aggregator"),
            "reasoning": plan.get("reasoning") or plan.get("rationale"),
            "step_count": len(steps),
        },
        "agents": agents,
        "total_agents": result.get("total_agents"),
        "successful_agents": result.get("successful_agents"),
        "total_tool_calls": result.get("total_tool_calls"),
        "duration_ms": result.get("duration_ms"),
        "cost_usd": cost,
        "cost_basis": "summed from cost_records over this mission's own start and finish window",
        "guard": verdict.as_dict() if verdict.triggered else None,
        "allow_writes": body.allow_writes,
        "limits": LIMITS,
    }
