"""The fix calendar's real store.

FixCalendarPage and FixPlanningBoardPage call FixScheduleItem across 11 sites and perform create, update and delete on
it. Measured 23 Nov 2026: no table matched fix/schedul, so a drag that called create() was refused and the board
reverted on the next load while appearing to have saved.

This route records only what a person placed. It derives no strategy, priority or risk: those would be invented.
finding_id is text because the platform holds two registers - integer ids in security_findings (what the UI shows) and
UUID ids in findings - and the caller's own string is stored, never coerced.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/fix-schedule", tags=["fix-schedule"])

_COLUMNS = "id, finding_id, finding_title, week_key, week_number, created_at, updated_at"

# No bind parameter may be followed by a :: cast: SQLAlchemy's text() parser reads ":week_key::text" as a
# broken parameter and Postgres answers "syntax error at or near ':'", so the week predicate is
# appended in Python instead. Measured 23 Nov 2026: GET /fix-schedule 500'd on exactly this.
_SELECT_BASE = f"""
SELECT {_COLUMNS}
  FROM fix_schedule_items
 WHERE tenant_id = :tenant_id
"""
_SELECT_ORDER = """
 ORDER BY created_at DESC
 LIMIT :limit
"""

_SELECT_ONE = f"""
SELECT {_COLUMNS}
  FROM fix_schedule_items
 WHERE tenant_id = :tenant_id AND id = :id
"""

_UPSERT = """
INSERT INTO fix_schedule_items (tenant_id, finding_id, finding_title, week_key, week_number, created_by)
VALUES (:tenant_id, :finding_id, :finding_title, :week_key, :week_number, :created_by)
ON CONFLICT (tenant_id, finding_id) DO UPDATE
   SET week_key = EXCLUDED.week_key,
       week_number = EXCLUDED.week_number,
       finding_title = CASE WHEN EXCLUDED.finding_title = '' THEN fix_schedule_items.finding_title
                            ELSE EXCLUDED.finding_title END,
       updated_at = now()
RETURNING id, (xmax = 0) AS inserted
"""

_UPDATE = """
UPDATE fix_schedule_items
   SET week_key = COALESCE(:week_key, week_key),
       week_number = COALESCE(:week_number, week_number),
       finding_title = COALESCE(:finding_title, finding_title),
       updated_at = now()
 WHERE tenant_id = :tenant_id AND id = :id
"""

_DELETE = "DELETE FROM fix_schedule_items WHERE tenant_id = :tenant_id AND id = :id"


class ScheduleItemIn(BaseModel):
    finding_id: str = Field(min_length=1)
    finding_title: str = ""
    week_key: str = Field(min_length=1)
    week_number: int | None = None


class ScheduleItemPatch(BaseModel):
    week_key: str | None = None
    week_number: int | None = None
    finding_title: str | None = None


def _row(r: Any) -> dict:
    m = r._mapping
    return {
        "id": str(m["id"]),
        "finding_id": m["finding_id"],
        "finding_title": m["finding_title"],
        "week_key": m["week_key"],
        "week_number": m["week_number"],
        "created_at": m["created_at"].isoformat() if m["created_at"] else None,
        "updated_at": m["updated_at"].isoformat() if m["updated_at"] else None,
    }


@router.get("")
async def list_schedule(
    limit: int = 400,
    week_key: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
) -> dict:
    params = {"tenant_id": str(current_user.tenant_id), "limit": max(1, min(limit, 1000))}
    sql = _SELECT_BASE
    if week_key:
        sql += "   AND week_key = :week_key\n"
        params["week_key"] = week_key
    sql += _SELECT_ORDER
    rows = (await db.execute(text(sql), params)).all()
    items = [_row(r) for r in rows]
    return {"items": items, "count": len(items), "tenant_scoped": True}


@router.post("")
async def place_fix(
    body: ScheduleItemIn,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:schedule")),
) -> dict:
    params = {
        "tenant_id": str(current_user.tenant_id),
        "finding_id": body.finding_id.strip(),
        "finding_title": (body.finding_title or "").strip(),
        "week_key": body.week_key.strip(),
        "week_number": body.week_number,
        "created_by": str(current_user.user_id),
    }
    result = (await db.execute(text(_UPSERT), params)).first()
    await db.commit()
    response.status_code = 201 if result._mapping["inserted"] else 200
    row = (await db.execute(text(_SELECT_ONE), {"tenant_id": params["tenant_id"], "id": str(result._mapping["id"])})).first()
    return _row(row)


@router.patch("/{item_id}")
async def move_fix(
    item_id: uuid.UUID,
    body: ScheduleItemPatch,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:schedule")),
) -> dict:
    params = {
        "tenant_id": str(current_user.tenant_id),
        "id": str(item_id),
        "week_key": body.week_key.strip() if body.week_key else None,
        "week_number": body.week_number,
        "finding_title": body.finding_title,
    }
    result = await db.execute(text(_UPDATE), params)
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="No scheduled item with that id in this tenant.")
    row = (await db.execute(text(_SELECT_ONE), {"tenant_id": params["tenant_id"], "id": params["id"]})).first()
    return _row(row)


@router.delete("/{item_id}", status_code=204)
async def unschedule_fix(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:schedule")),
) -> Response:
    result = await db.execute(text(_DELETE), {"tenant_id": str(current_user.tenant_id), "id": str(item_id)})
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="No scheduled item with that id in this tenant.")
    return Response(status_code=204)
