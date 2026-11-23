"""Incident response tasks: the playbook the page seeded and nobody kept.

Measured 23 Nov 2026: IncidentResponsePage seeds five default response tasks onto the active incident, ticks them off,
and files an "Initial Investigation" task on every incident. All of it went to a table that does not exist. These routes
store exactly what the page sends.

Two shapes arrive at POST: the adapter's create() posts one object, and its bulkCreate() posts {items: [...]} to the same
collection path, so the route accepts both rather than the page needing to know which.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/incident-tasks", tags=["incident-tasks"])

_COLUMNS = (
    "id, incident_id, title, description, task_type, status, priority, assignee_name, notes, "
    "due_at, completed_at, requires_approval, approved_by, created_at, updated_at"
)

# The page asks for "-priority". Ordering text alphabetically would put medium first and critical last, so priority is
# ranked explicitly.
_PRIORITY_RANK = "CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END"


class TaskCreate(BaseModel):
    incident_id: uuid.UUID
    title: str = Field(min_length=1)
    description: str = ""
    task_type: str = "response"
    priority: str = "medium"
    assignee_name: str = ""
    status: str = "open"
    notes: str = ""
    due_at: datetime | None = None
    requires_approval: bool = False


class TaskPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    task_type: str | None = None
    status: str | None = None
    priority: str | None = None
    assignee_name: str | None = None
    notes: str | None = None
    due_at: datetime | None = None
    completed_at: datetime | None = None
    requires_approval: bool | None = None
    approved_by: str | None = None


def _row(row: Any) -> dict:
    m = row._mapping
    out = {k: m[k] for k in m.keys()}
    out["id"] = str(out["id"])
    out["incident_id"] = str(out["incident_id"])
    for key in ("due_at", "completed_at", "created_at", "updated_at"):
        if out.get(key) is not None:
            out[key] = out[key].isoformat()
    return out


async def _insert(db: AsyncSession, tenant_id: Any, user_id: Any, task: TaskCreate) -> dict:
    row = (
        await db.execute(
            text(
                """
INSERT INTO incident_tasks
    (tenant_id, incident_id, title, description, task_type, priority, assignee_name, status, notes,
     due_at, requires_approval, created_by)
VALUES
    (:tenant_id, :incident_id, :title, :description, :task_type, :priority, :assignee_name, :status, :notes,
     :due_at, :requires_approval, :created_by)
RETURNING """
                + _COLUMNS
            ),
            {"tenant_id": tenant_id, "created_by": user_id, **task.model_dump()},
        )
    ).first()
    return _row(row)


@router.get("")
async def list_tasks(
    incident_id: uuid.UUID | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=500),
    current_user: CurrentUser = Depends(require_permission("incidents:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Tasks for one incident, or the most recent across the tenant. The WHERE is built in Python because asyncpg
    cannot type a parameter that appears only in a null test (item 9)."""
    sql = f"SELECT {_COLUMNS} FROM incident_tasks WHERE tenant_id = :tenant_id"
    params: dict[str, Any] = {"tenant_id": current_user.tenant_id, "limit": limit}
    if incident_id is not None:
        sql += " AND incident_id = :incident_id"
        params["incident_id"] = incident_id
    if status_filter is not None:
        sql += " AND status = :status_filter"
        params["status_filter"] = status_filter
    if incident_id is not None:
        sql += f" ORDER BY {_PRIORITY_RANK}, created_at DESC LIMIT :limit"
    else:
        sql += " ORDER BY created_at DESC LIMIT :limit"
    rows = (await db.execute(text(sql), params)).fetchall()
    return {"items": [_row(r) for r in rows], "count": len(rows), "tenant_scoped": True}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_tasks(
    body: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("incidents:write")),
    db: AsyncSession = Depends(get_db),
):
    """One task, or {items: [...]} from the adapter's bulkCreate. An unknown incident id is refused by the foreign key,
    which surfaces as a 400 naming the field rather than a 500."""
    if "items" in body:
        raw = body.get("items")
        if not isinstance(raw, list) or not raw:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "items must be a non-empty list")
        parsed: list[TaskCreate] = []
        for index, item in enumerate(raw):
            try:
                parsed.append(TaskCreate(**item))
            except ValidationError as exc:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY, f"items[{index}]: {exc.errors()[0]['msg']}"
                ) from exc
        created = [await _insert(db, current_user.tenant_id, current_user.user_id, task) for task in parsed]
        await db.commit()
        return created
    try:
        single = TaskCreate(**body)
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, exc.errors()[0]["msg"]) from exc
    created = await _insert(db, current_user.tenant_id, current_user.user_id, single)
    await db.commit()
    return created


@router.patch("/{task_id}")
async def patch_task(
    task_id: uuid.UUID,
    body: TaskPatch,
    current_user: CurrentUser = Depends(require_permission("incidents:write")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    provided = body.model_dump(exclude_unset=True)
    if not provided:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no writable field was supplied")
    # Completing a task records when, unless the caller says otherwise: a completed task with no time is a claim.
    if provided.get("status") == "completed" and "completed_at" not in provided:
        provided["completed_at"] = datetime.now().astimezone()
    sets = ", ".join(f"{name} = :{name}" for name in provided)
    row = (
        await db.execute(
            text(
                f"UPDATE incident_tasks SET {sets}, updated_at = now() "
                "WHERE tenant_id = :tenant_id AND id = :id RETURNING " + _COLUMNS
            ),
            {"tenant_id": current_user.tenant_id, "id": task_id, **provided},
        )
    ).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no such task on this tenant")
    await db.commit()
    return _row(row)
