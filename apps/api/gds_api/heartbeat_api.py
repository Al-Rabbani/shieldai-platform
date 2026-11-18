"""HTTP surface for authenticated worker heartbeats and the status they justify.

The ingest endpoint deliberately takes no user session: a worker proves itself with an HMAC over the
heartbeat body using the per-tenant key derived from the server master key. Status is read with a
normal user session and is always derived from stored evidence.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api import agent_heartbeats
from gds_api.db import get_db
from gds_api.security import CurrentUser, get_current_user

router = APIRouter(prefix="/agents", tags=["agents"])


class HeartbeatIn(BaseModel):
    agent_id: str
    tenant_id: str
    worker_id: str
    release_sha: str
    observed_at: str
    health_signal: str
    task_ref: str | None = None
    nonce: str
    signature: str


@router.post("/heartbeat")
async def record_heartbeat(body: HeartbeatIn, db: AsyncSession = Depends(get_db)) -> dict:
    payload = body.model_dump(exclude={"signature"})
    try:
        return await agent_heartbeats.ingest(
            db, payload=payload, signature=body.signature, expected_tenant=body.tenant_id
        )
    except agent_heartbeats.HeartbeatRejected as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"code": exc.code, "detail": exc.detail}) from exc


@router.get("/fleet/status")
async def get_fleet_status(
    current_user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    return await agent_heartbeats.fleet_status(db, tenant_id=str(current_user.tenant_id))
