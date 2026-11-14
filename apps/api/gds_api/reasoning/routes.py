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
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("gds.reasoning.routes")

sys.path.insert(0, "/opt/gds-os/apps/api")

from gds_api.reasoning.bridge import reasoning_bridge
from gds_api.reasoning.prompts import list_agents, AGENT_REGISTRY
from gds_api.security import CurrentUser, get_current_user

router = APIRouter(prefix="/reasoning", tags=["reasoning"])


class MissionRequest(BaseModel):
    goal: str
    agent_id: Optional[str] = None  # If null, auto-select
    context: Optional[dict] = None


def _tenant(user: CurrentUser) -> str:
    """Tenant identity from the verified token. Never falls back to a global scope."""
    tid = getattr(user, "tenant_id", None)
    if not tid:
        raise HTTPException(403, "Token carries no tenant identity")
    return str(tid)


@router.post("/mission")
async def create_mission(req: MissionRequest, user: CurrentUser = Depends(get_current_user)):
    """Create and execute a mission using the LLM reasoning loop."""
    tid = _tenant(user)
    try:
        if req.agent_id:
            result = await reasoning_bridge.execute_task(
                req.agent_id, req.goal, req.context, tenant_id=tid)
        else:
            result = await reasoning_bridge.run_with_auto_select(
                req.goal, req.context, tenant_id=tid)

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
async def auto_execute(req: MissionRequest, user: CurrentUser = Depends(get_current_user)):
    """Auto-select the best agent and execute the goal."""
    result = await reasoning_bridge.run_with_auto_select(
        req.goal, req.context, tenant_id=_tenant(user))
    return {
        "success": result.success,
        "selected_agent": result.agent_id,
        "summary": result.summary,
        "tool_calls": len(result.tool_calls),
        "iterations": result.iterations,
        "duration_ms": result.duration_ms
    }
