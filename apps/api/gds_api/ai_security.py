"""AI security: what models this platform runs, what it actually invoked, and what its guard refused.

Measured 22 Nov 2026: the AI security pages called five entity names with no table behind any of them, and the platform
itself ran an OpenAI reasoning loop with no ledger of its own activity. These routes read rows written by
scripts/ops/ai_posture.py (models configured, invocations derived from real missions) and by gds_api.ai_guard (refused
prompts). Nothing here is estimated: an empty table reads as an empty table.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .ai_guard import RULES
from .db import get_db
from .security import require_permission

router = APIRouter(tags=["ai"])


class AIModelOut(BaseModel):
    id: uuid.UUID
    name: str
    provider: str
    model_family: str | None
    deployment_type: str
    configured_in: str
    is_active: bool
    approved: bool
    approved_by: str | None
    risk_class: str
    first_seen: datetime
    last_seen: datetime


class AIInvocationOut(BaseModel):
    id: uuid.UUID
    mission_id: uuid.UUID | None
    model: str | None
    invocation_type: str
    status: str
    risk_class: str | None
    duration_seconds: int | None
    started_at: datetime | None
    completed_at: datetime | None


class PromptAttackOut(BaseModel):
    id: uuid.UUID
    attack_type: str
    severity: str
    target_route: str
    matched_rules: list[str] = []
    payload_preview: str | None
    blocked: bool
    actor_id: str | None
    detected_at: datetime


@router.get("/ai/models", response_model=list[AIModelOut])
async def list_ai_models(
    current_user=Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> list[AIModelOut]:
    rows = (await db.execute(text(
        "SELECT id, name, provider, model_family, deployment_type, configured_in, is_active, approved, "
        "approved_by, risk_class, first_seen, last_seen FROM ai_models WHERE tenant_id = :t "
        "ORDER BY is_active DESC, name"
    ), {"t": current_user.tenant_id})).mappings().all()
    return [AIModelOut(**dict(r)) for r in rows]


@router.get("/ai/invocations", response_model=list[AIInvocationOut])
async def list_ai_invocations(
    limit: int = 200,
    current_user=Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> list[AIInvocationOut]:
    rows = (await db.execute(text(
        "SELECT id, mission_id, model, invocation_type, status, risk_class, duration_seconds, started_at, "
        "completed_at FROM ai_invocations WHERE tenant_id = :t ORDER BY started_at DESC NULLS LAST LIMIT :limit"
    ), {"t": current_user.tenant_id, "limit": min(max(limit, 1), 1000)})).mappings().all()
    return [AIInvocationOut(**dict(r)) for r in rows]


@router.get("/ai/attacks", response_model=list[PromptAttackOut])
async def list_prompt_attacks(
    limit: int = 200,
    current_user=Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> list[PromptAttackOut]:
    rows = (await db.execute(text(
        "SELECT id, attack_type, severity, target_route, matched_rules, payload_preview, blocked, actor_id, "
        "detected_at FROM prompt_attacks WHERE tenant_id = :t ORDER BY detected_at DESC LIMIT :limit"
    ), {"t": current_user.tenant_id, "limit": min(max(limit, 1), 1000)})).mappings().all()
    return [PromptAttackOut(**dict(r)) for r in rows]


@router.get("/ai/summary", response_model=dict)
async def ai_summary(
    current_user=Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Counts of what was recorded, plus the guard's own scope stated as a fact rather than a marketing line."""
    models = (await db.execute(text(
        "SELECT count(*) AS configured, count(*) FILTER (WHERE approved) AS approved, "
        "count(*) FILTER (WHERE is_active) AS active FROM ai_models WHERE tenant_id = :t"
    ), {"t": current_user.tenant_id})).mappings().first()
    inv = (await db.execute(text(
        "SELECT count(*) AS invocations, count(*) FILTER (WHERE status = 'failed') AS failed, "
        "count(*) FILTER (WHERE started_at > now() - interval '30 days') AS last_30_days "
        "FROM ai_invocations WHERE tenant_id = :t"
    ), {"t": current_user.tenant_id})).mappings().first()
    atk = (await db.execute(text(
        "SELECT count(*) AS detected, count(*) FILTER (WHERE blocked) AS blocked, "
        "count(*) FILTER (WHERE severity = 'high') AS high, count(*) FILTER (WHERE severity = 'medium') AS medium "
        "FROM prompt_attacks WHERE tenant_id = :t"
    ), {"t": current_user.tenant_id})).mappings().first()
    return {
        "models": dict(models),
        "invocations": dict(inv),
        "attacks": dict(atk),
        "guard": {
            "rules": sorted(RULES),
            "blocking_severities": ["high"],
            "guarded_routes": ["POST /reasoning/mission", "POST /reasoning/auto"],
            "scope": "pattern matching on the submitted goal and context; no output moderation and no token-level "
                     "monitoring exists on this platform, so neither is claimed",
        },
        "basis": "counts cover every row recorded for this tenant, not a page of them",
    }
