"""Routes for the Digital Warriors campaign: start one, read one, list them, and read the team map."""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from gds_api.db import async_session_factory
from gds_api.security import CurrentUser, get_current_user
from gds_api.tenant_binding import bind_tenant
from gds_api.warfare.campaign import STAGES, resolve_stage_tool, run_campaign

router = APIRouter(prefix="/warfare", tags=["warfare"])


def _tenant(user: CurrentUser) -> str:
    tid = getattr(user, "tenant_id", None)
    if not tid:
        raise HTTPException(403, "Token carries no tenant identity")
    return str(tid)


def _uid(user: CurrentUser) -> str:
    return str(getattr(user, "user_id", None) or getattr(user, "id", ""))


class CampaignRequest(BaseModel):
    target: Optional[str] = None
    name: Optional[str] = None
    stages: Optional[list[str]] = None


@router.get("/team")
async def team_map(user: CurrentUser = Depends(get_current_user)):
    """The two teams as they really are: each stage, the role that owns it, and the tool it runs."""
    return {
        "stages": [
            {
                "stage": s["number"],
                "key": s["key"],
                "label": s["label"],
                "team": s["team"],
                "owner_agent": s["owner_agent"],
                "capability_key": s["capability_key"],
                "tool": resolve_stage_tool(s),
            }
            for s in STAGES
        ],
        "count": len(STAGES),
    }


@router.post("/campaign")
async def start_campaign(req: CampaignRequest, user: CurrentUser = Depends(get_current_user)):
    """Run the five stages in order. Every stage records what it really did."""
    return await run_campaign(
        tenant_id=_tenant(user),
        user_id=_uid(user),
        target=req.target,
        name=req.name,
        stage_keys=req.stages,
    )


@router.get("/campaigns")
async def list_campaigns(limit: int = 20, user: CurrentUser = Depends(get_current_user)):
    async with async_session_factory() as session:
        await bind_tenant(session, _tenant(user))
        rows = (
            await session.execute(
                text(
                    "SELECT id, name, target, status, stages_total, stages_executed, stages_blocked, "
                    "started_at, completed_at FROM warfare_campaigns ORDER BY started_at DESC LIMIT :l"
                ),
                {"l": max(1, min(limit, 100))},
            )
        ).mappings().all()
    return {"campaigns": [dict(r) for r in rows], "count": len(rows)}


@router.get("/campaign/{campaign_id}")
async def get_campaign(campaign_id: str, user: CurrentUser = Depends(get_current_user)):
    async with async_session_factory() as session:
        await bind_tenant(session, _tenant(user))
        campaign = (
            await session.execute(
                text("SELECT * FROM warfare_campaigns WHERE id = CAST(:i AS uuid)"), {"i": campaign_id}
            )
        ).mappings().first()
        if campaign is None:
            raise HTTPException(404, "campaign not found")
        stages = (
            await session.execute(
                text(
                    "SELECT stage_number, stage_key, stage_label, owner_agent, capability_key, tool_name, status, "
                    "findings_count, result_summary, started_at, completed_at FROM warfare_campaign_stages "
                    "WHERE campaign_id = CAST(:i AS uuid) ORDER BY stage_number"
                ),
                {"i": campaign_id},
            )
        ).mappings().all()
    return {"campaign": dict(campaign), "stages": [dict(s) for s in stages]}
