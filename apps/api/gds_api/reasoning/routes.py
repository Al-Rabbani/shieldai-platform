"""FastAPI routes for the LLM Reasoning Engine.

TENANT ISOLATION (R2). Every endpoint previously ran with no authentication at all:
any caller could start an LLM mission (spending API credits and executing tools),
list every mission on the platform, and fetch any mission by id. Mission ids are
guessable (mission_<timestamp>_<agent_id>), so an unauthenticated reader could
enumerate other tenants' runs.

Now each endpoint requires a verified user, and the tenant is passed into the bridge
so mission records are attributed and filtered. A mission belonging to another tenant
returns the same "Mission not found" as one that does not exist, so ids cannot be
probed.

Endpoints:
  POST /reasoning/mission        — Create and execute a mission
  GET  /reasoning/missions       — List this tenant's missions
  GET  /reasoning/mission/{id}   — Get mission status (own tenant only)
  GET  /reasoning/agents          — List all agents
  POST /reasoning/auto            — Auto-select agent and execute
"""
import os, sys, json, logging
from fastapi import APIRouter, Depends, HTTPException, Request

from .. import ai_guard
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("gds.reasoning.routes")

sys.path.insert(0, "/opt/gds-os/apps/api")

from gds_api.reasoning.bridge import reasoning_bridge
from gds_api.reasoning.prompts import list_agents, AGENT_REGISTRY
from gds_api.security import CurrentUser, get_current_user

router = APIRouter(prefix="/reasoning", tags=["reasoning"])

STANDING_MEMORY_PREFIX = "Standing instructions the operator recorded for this tenant"


async def _with_standing_memory(goal: str, tenant_id: str, context: dict | None) -> tuple[str, dict]:
    """Prefix the goal with the tenant's recorded preferences, read from copilot_memory.

    Read-only and best-effort: a memory that cannot be read must not block a mission, but it must not be reported as
    applied either, so the count that is returned is the count that was really included.
    """
    context = dict(context or {})
    included: list[str] = []
    try:
        from sqlalchemy import text as _text
        from gds_api.db import async_session_factory

        async with async_session_factory() as session:
            await session.execute(_text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": str(tenant_id)})
            rows = (
                await session.execute(
                    _text(
                        "SELECT kind, key, value FROM copilot_memory WHERE tenant_id = :tid"
                        " ORDER BY pinned DESC, updated_at DESC LIMIT 20"
                    ),
                    {"tid": str(tenant_id)},
                )
            ).all()
        included = [f"- [{r.kind}] {r.key}: {r.value}" for r in rows]
    except Exception as exc:  # noqa: BLE001 - named in the context, never silently dropped
        context["standing_memory_error"] = f"{type(exc).__name__}: {exc}"

    if not included:
        context["standing_memory_count"] = 0
        return goal, context

    context["standing_memory_count"] = len(included)
    combined = (
        f"{goal}\n\n{STANDING_MEMORY_PREFIX}, most important first. They are context for how to answer, not a new task:\n"
        + "\n".join(included)
    )
    return combined, context



class MissionRequest(BaseModel):
    goal: str
    agent_id: Optional[str] = None  # If null, auto-select
    context: Optional[dict] = None
    # Read-only unless the caller asks otherwise: a page that explains a finding must not be able to write one.
    allow_writes: bool = False


def _uid(user: CurrentUser) -> str:
    """The authenticated user id, for the broker's actor record. Never inferred."""
    uid = getattr(user, "id", None) or getattr(user, "user_id", None)
    if not uid:
        raise HTTPException(403, "Token carries no user identity")
    return str(uid)


def _tenant(user: CurrentUser) -> str:
    """Tenant identity from the verified token. Never falls back to a global scope."""
    tid = getattr(user, "tenant_id", None)
    if not tid:
        raise HTTPException(403, "Token carries no tenant identity")
    return str(tid)


async def _guard_or_refuse(req: MissionRequest, tenant_id: str, actor_id: str, request: Request, route: str) -> dict:
    """Inspect the submitted goal before it reaches the model.

    A high-severity match refuses the request; a medium-severity match is recorded and allowed through. The refusal names
    the rule that fired and states whether the attempt could actually be written down, because a claim that it was
    recorded must be true.
    """
    verdict = ai_guard.scan(req.goal, ai_guard.context_text(req.context))
    if not verdict.triggered:
        return {}
    client_ip = request.client.host if request and request.client else None
    recorded = await ai_guard.record_attack(tenant_id, verdict, req.goal, route, actor_id, client_ip)
    if verdict.blocked:
        raise HTTPException(422, {
            "error": "prompt_guard_refused",
            "attack_type": verdict.attack_type,
            "matched_rules": verdict.matched,
            "severity": verdict.severity,
            "recorded": recorded,
            "note": "This request was not executed.",
        })
    return {"guard": {**verdict.as_dict(), "recorded": recorded}}


@router.post("/mission")
async def create_mission(req: MissionRequest, request: Request, user: CurrentUser = Depends(get_current_user)):
    """Create and execute a mission using the LLM reasoning loop."""
    tid = _tenant(user)
    guard_note = await _guard_or_refuse(req, tid, _uid(user), request, "POST /reasoning/mission")
    try:
        if req.agent_id:
            _goal, _ctx = await _with_standing_memory(req.goal, tid, req.context)
            result = await reasoning_bridge.execute_task(
                req.agent_id, _goal, _ctx, tenant_id=tid, user_id=_uid(user),
                allow_writes=req.allow_writes)
        else:
            _goal, _ctx = await _with_standing_memory(req.goal, tid, req.context)
            result = await reasoning_bridge.run_with_auto_select(
                _goal, _ctx, tenant_id=tid, user_id=_uid(user),
                allow_writes=req.allow_writes)

        return {
            "success": result.success,
            "agent_id": result.agent_id,
            "goal": result.goal,
            "summary": result.summary,
            "tool_calls": [
                {
                    "tool": tc.tool_name,
                    "arguments": tc.arguments,
                    "result": tc.result,
                    "duration_ms": tc.duration_ms
                }
                for tc in result.tool_calls
            ],
            "iterations": result.iterations,
            "duration_ms": result.duration_ms,
            "error": result.error
        }
    except Exception as e:
        logger.error(f"Mission error: {e}")
        raise HTTPException(500, str(e))


@router.get("/missions")
async def list_missions(user: CurrentUser = Depends(get_current_user)):
    """List this tenant's completed missions."""
    return {"missions": reasoning_bridge.list_missions(tenant_id=_tenant(user))}


@router.get("/mission/{mission_id}")
async def get_mission(mission_id: str, user: CurrentUser = Depends(get_current_user)):
    """Get detailed status of a mission belonging to this tenant."""
    result = reasoning_bridge.get_mission_status(mission_id, tenant_id=_tenant(user))
    if "error" in result:
        # Same response whether the mission is absent or owned by another tenant.
        raise HTTPException(404, result["error"])
    return result


@router.get("/agents")
async def get_agents(user: CurrentUser = Depends(get_current_user)):
    """List all available agents and their capabilities."""
    return {"agents": list_agents(), "count": len(AGENT_REGISTRY)}


@router.post("/auto")
async def auto_execute(req: MissionRequest, request: Request, user: CurrentUser = Depends(get_current_user)):
    """Auto-select the best agent and execute the goal."""
    result = await reasoning_bridge.run_with_auto_select(
        req.goal, req.context, tenant_id=_tenant(user), user_id=_uid(user))
    return {
        "success": result.success,
        "selected_agent": result.agent_id,
        "summary": result.summary,
        "tool_calls": len(result.tool_calls),
        "iterations": result.iterations,
        "duration_ms": result.duration_ms
    }
