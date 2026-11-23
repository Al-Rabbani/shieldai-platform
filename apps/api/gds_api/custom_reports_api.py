"""Saved custom report definitions: the builder could run a report but not keep one.

Measured 23 Nov 2026: CustomReportsPage calls CustomReport.list/create/update/delete across four sites and no table
matched '%report%', so a saved report vanished on reload while the six report sources it queries were all served and a
report really ran. This store holds only what the operator chose - source, columns, filters, dates, sort and row limit.
It derives nothing: no cached row counts, no generated text, no "last run" timestamp the page never sets.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/custom-reports", tags=["custom-reports"])

_COLUMNS = (
    "id, name, description, source_entity, columns, status_filter, severity_filter, framework, "
    "date_from, date_to, sort_order, row_limit, created_at, updated_at"
)

_SELECT = f"""
SELECT {_COLUMNS}
  FROM custom_reports
 WHERE tenant_id = :tenant_id
 ORDER BY created_at DESC
 LIMIT :limit
"""

_INSERT = """
INSERT INTO custom_reports (tenant_id, name, description, source_entity, columns, status_filter, severity_filter,
                            framework, date_from, date_to, sort_order, row_limit, created_by)
VALUES (:tenant_id, :name, :description, :source_entity, :columns, :status_filter, :severity_filter,
        :framework, :date_from, :date_to, :sort_order, :row_limit, :created_by)
RETURNING id
"""

_SELECT_ONE = f"""
SELECT {_COLUMNS}
  FROM custom_reports
 WHERE tenant_id = :tenant_id AND id = :id
"""

_DELETE = "DELETE FROM custom_reports WHERE tenant_id = :tenant_id AND id = :id"


class ReportIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    source_entity: str = Field(min_length=1, max_length=64)
    columns: list[str] = Field(default_factory=list)
    status_filter: str = ""
    severity_filter: str = ""
    framework: str = ""
    date_from: str = ""
    date_to: str = ""
    sort_order: str = "newest"
    row_limit: int = Field(default=100, ge=1, le=200)


class ReportPatch(BaseModel):
    name: str | None = None
    description: str | None = None
    source_entity: str | None = None
    columns: list[str] | None = None
    status_filter: str | None = None
    severity_filter: str | None = None
    framework: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    sort_order: str | None = None
    row_limit: int | None = Field(default=None, ge=1, le=200)


def _row(row) -> dict:
    m = row._mapping
    out = {k: m[k] for k in m.keys()}
    for key in ("id",):
        out[key] = str(out[key])
    for key in ("created_at", "updated_at"):
        if out.get(key) is not None:
            out[key] = out[key].isoformat()
    out["columns"] = list(out.get("columns") or [])
    return out


@router.get("")
async def list_reports(
    limit: int = Query(default=100, ge=1, le=200),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows = (await db.execute(text(_SELECT), {"tenant_id": current_user.tenant_id, "limit": limit})).fetchall()
    return {"items": [_row(r) for r in rows], "count": len(rows), "tenant_scoped": True}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_report(
    body: ReportIn,
    current_user: CurrentUser = Depends(require_permission("reports:write")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    params = body.model_dump()
    params["tenant_id"] = current_user.tenant_id
    params["created_by"] = current_user.user_id
    params["columns"] = list(body.columns)
    new_id = (await db.execute(text(_INSERT), params)).scalar_one()
    row = (await db.execute(text(_SELECT_ONE), {"tenant_id": current_user.tenant_id, "id": new_id})).first()
    await db.commit()
    return _row(row)


@router.patch("/{report_id}")
async def update_report(
    report_id: uuid.UUID,
    body: ReportPatch,
    current_user: CurrentUser = Depends(require_permission("reports:write")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # Only the fields the caller actually sent are written; a partial edit must not blank the rest.
    provided = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not provided:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no fields to update")
    sets = ", ".join(f"{name} = :{name}" for name in provided)
    params = dict(provided)
    params.update({"tenant_id": current_user.tenant_id, "id": report_id})
    result = await db.execute(
        text(f"UPDATE custom_reports SET {sets}, updated_at = now() WHERE tenant_id = :tenant_id AND id = :id"),
        params,
    )
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no such report on this tenant")
    row = (await db.execute(text(_SELECT_ONE), {"tenant_id": current_user.tenant_id, "id": report_id})).first()
    await db.commit()
    return _row(row)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("reports:write")),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(text(_DELETE), {"tenant_id": current_user.tenant_id, "id": report_id})
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no such report on this tenant")
    await db.commit()
