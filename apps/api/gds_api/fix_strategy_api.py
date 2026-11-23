"""The fix strategy library's real store.

FixStrategyLibraryPage performs create, update and delete on FixStrategy (lines 49/51/60 of that page) and TriageQueuePage
reads published strategies ordered by times_reused and writes the counter back when one is applied. Measured 23 Nov 2026:
no table matched '%strateg%', so a strategy typed into the form vanished and the library was permanently empty.

Only what a person wrote is stored. There is no derived score, rank or success rate: none of those can be known from a
strategy somebody authored, and inventing them would be the same defect as a hardcoded coverage figure.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/fix-strategies", tags=["fix-strategies"])

_COLUMNS = (
    "id, title, vulnerability_type, severity, tags, summary, remediation_steps, validation_steps, "
    "is_published, source, times_reused, created_at, updated_at"
)

_SELECT_BASE = f"""
SELECT {_COLUMNS}
  FROM fix_strategies
 WHERE tenant_id = :tenant_id
"""

_INSERT = """
INSERT INTO fix_strategies
       (tenant_id, title, vulnerability_type, severity, tags, summary, remediation_steps, validation_steps,
        is_published, source, created_by)
VALUES (:tenant_id, :title, :vulnerability_type, :severity, :tags, :summary, :remediation_steps, :validation_steps,
        :is_published, :source, :created_by)
RETURNING id
"""

_SELECT_ONE = f"""
SELECT {_COLUMNS}
  FROM fix_strategies
 WHERE tenant_id = :tenant_id AND id = :id
"""

_UPDATE = """
UPDATE fix_strategies
   SET title = COALESCE(:title, title),
       vulnerability_type = COALESCE(:vulnerability_type, vulnerability_type),
       severity = COALESCE(:severity, severity),
       tags = COALESCE(:tags, tags),
       summary = COALESCE(:summary, summary),
       remediation_steps = COALESCE(:remediation_steps, remediation_steps),
       validation_steps = COALESCE(:validation_steps, validation_steps),
       is_published = COALESCE(:is_published, is_published),
       times_reused = COALESCE(:times_reused, times_reused),
       updated_at = now()
 WHERE tenant_id = :tenant_id AND id = :id
"""

_DELETE = "DELETE FROM fix_strategies WHERE tenant_id = :tenant_id AND id = :id"


class StrategyIn(BaseModel):
    title: str = Field(min_length=1)
    vulnerability_type: str = Field(min_length=1)
    severity: str = "high"
    tags: list[str] = Field(default_factory=list)
    summary: str = ""
    remediation_steps: str = ""
    validation_steps: str = ""
    is_published: bool = True
    source: str = "manual"


class StrategyPatch(BaseModel):
    title: str | None = None
    vulnerability_type: str | None = None
    severity: str | None = None
    tags: list[str] | None = None
    summary: str | None = None
    remediation_steps: str | None = None
    validation_steps: str | None = None
    is_published: bool | None = None
    times_reused: int | None = None


def _row(r) -> dict:
    m = r._mapping
    return {
        "id": str(m["id"]),
        "title": m["title"],
        "vulnerability_type": m["vulnerability_type"],
        "severity": m["severity"],
        "tags": list(m["tags"] or []),
        "summary": m["summary"],
        "remediation_steps": m["remediation_steps"],
        "validation_steps": m["validation_steps"],
        "is_published": m["is_published"],
        "source": m["source"],
        "times_reused": m["times_reused"],
        "created_at": m["created_at"].isoformat() if m["created_at"] else None,
        "updated_at": m["updated_at"].isoformat() if m["updated_at"] else None,
    }


@router.get("")
async def list_strategies(
    is_published: bool | None = None,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
) -> dict:
    params: dict = {"tenant_id": str(current_user.tenant_id), "limit": max(1, min(limit, 500))}
    sql = _SELECT_BASE
    if is_published is not None:
        sql += "   AND is_published = :is_published\n"
        params["is_published"] = is_published
    # the pages ask for -times_reused; that is the only ordering either of them requests
    sql += " ORDER BY times_reused DESC, created_at DESC LIMIT :limit"
    rows = (await db.execute(text(sql), params)).all()
    items = [_row(r) for r in rows]
    return {"items": items, "count": len(items), "tenant_scoped": True}


@router.post("", status_code=201)
async def create_strategy(
    body: StrategyIn,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("fixes:write")),
) -> dict:
    params = {
        "tenant_id": str(current_user.tenant_id),
        "title": body.title.strip(),
        "vulnerability_type": body.vulnerability_type.strip(),
        "severity": body.severity.strip() or "high",
        "tags": [t.strip() for t in body.tags if t.strip()],
        "summary": body.summary,
        "remediation_steps": body.remediation_steps,
        "validation_steps": body.validation_steps,
        "is_published": body.is_published,
        "source": body.source or "manual",
        "created_by": str(current_user.user_id),
    }
    new_id = (await db.execute(text(_INSERT), params)).scalar_one()
    await db.commit()
    row = (await db.execute(text(_SELECT_ONE), {"tenant_id": params["tenant_id"], "id": str(new_id)})).first()
    return _row(row)


@router.patch("/{strategy_id}")
async def update_strategy(
    strategy_id: uuid.UUID,
    body: StrategyPatch,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("fixes:write")),
) -> dict:
    params = {
        "tenant_id": str(current_user.tenant_id),
        "id": str(strategy_id),
        "title": body.title.strip() if body.title else None,
        "vulnerability_type": body.vulnerability_type.strip() if body.vulnerability_type else None,
        "severity": body.severity,
        "tags": [t.strip() for t in body.tags if t.strip()] if body.tags is not None else None,
        "summary": body.summary,
        "remediation_steps": body.remediation_steps,
        "validation_steps": body.validation_steps,
        "is_published": body.is_published,
        "times_reused": body.times_reused,
    }
    result = await db.execute(text(_UPDATE), params)
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="No strategy with that id in this tenant.")
    row = (await db.execute(text(_SELECT_ONE), {"tenant_id": params["tenant_id"], "id": params["id"]})).first()
    return _row(row)


@router.delete("/{strategy_id}", status_code=204)
async def delete_strategy(
    strategy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("fixes:write")),
) -> Response:
    result = await db.execute(text(_DELETE), {"tenant_id": str(current_user.tenant_id), "id": str(strategy_id)})
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="No strategy with that id in this tenant.")
    return Response(status_code=204)
