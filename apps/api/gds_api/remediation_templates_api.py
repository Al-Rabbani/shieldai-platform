"""Remediation templates: the library that saved nothing.

Measured 23 Nov 2026: RemediationTemplateForm calls RemediationTemplate.create, and both RemediationTemplatesPage and
TriageQueuePage call filter({is_active: true}, "-usage_count", N) then update(id, {usage_count}) when a template is
applied to findings. No table matched '%templ%', so a template vanished on reload and the usage counter could never
move. These routes store exactly the fields the form submits and the cards read.
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/remediation-templates", tags=["remediation-templates"])

_COLUMNS = (
    "id, template_name, vulnerability_type, severity, description, remediation_steps, "
    "testing_guidance, estimated_effort, target, is_active, usage_count, created_at, updated_at"
)

_SELECT = f"""
SELECT {_COLUMNS}
  FROM remediation_templates
 WHERE tenant_id = :tenant_id
"""

_SELECT_ONE = f"""
SELECT {_COLUMNS}
  FROM remediation_templates
 WHERE tenant_id = :tenant_id AND id = :id
"""

# Only the fields the form sends and the cards read. Nothing derived is written: usage_count moves only when a caller
# says a template was applied, never on read.
_WRITABLE = (
    "template_name",
    "vulnerability_type",
    "severity",
    "description",
    "remediation_steps",
    "testing_guidance",
    "estimated_effort",
    "target",
    "is_active",
    "usage_count",
)


class TemplateCreate(BaseModel):
    template_name: str = Field(min_length=1)
    remediation_steps: str = Field(min_length=1)
    vulnerability_type: str = ""
    severity: str = "high"
    description: str = ""
    testing_guidance: str = ""
    estimated_effort: str = "1-4 hours"
    target: str = ""


class TemplatePatch(BaseModel):
    template_name: str | None = None
    vulnerability_type: str | None = None
    severity: str | None = None
    description: str | None = None
    remediation_steps: str | None = None
    testing_guidance: str | None = None
    estimated_effort: str | None = None
    target: str | None = None
    is_active: bool | None = None
    usage_count: int | None = Field(default=None, ge=0)


def _row(row: Any) -> dict:
    m = row._mapping
    out = {k: m[k] for k in m.keys()}
    out["id"] = str(out["id"])
    for key in ("created_at", "updated_at"):
        if out.get(key) is not None:
            out[key] = out[key].isoformat()
    return out


@router.get("")
async def list_templates(
    is_active: bool | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Active templates by usage, as both call sites ask for. The filter is built in Python: a bind parameter that
    appears only in a null test cannot be typed by asyncpg (item 9)."""
    sql = _SELECT
    params: dict[str, Any] = {"tenant_id": current_user.tenant_id, "limit": limit}
    if is_active is not None:
        sql += " AND is_active = :is_active"
        params["is_active"] = is_active
    sql += " ORDER BY usage_count DESC, created_at DESC LIMIT :limit"
    rows = (await db.execute(text(sql), params)).fetchall()
    return {
        "items": [_row(r) for r in rows],
        "count": len(rows),
        "tenant_scoped": True,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_template(
    body: TemplateCreate,
    current_user: CurrentUser = Depends(require_permission("fixes:write")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = (
        await db.execute(
            text(
                """
INSERT INTO remediation_templates
    (tenant_id, template_name, vulnerability_type, severity, description, remediation_steps,
     testing_guidance, estimated_effort, target, created_by)
VALUES
    (:tenant_id, :template_name, :vulnerability_type, :severity, :description, :remediation_steps,
     :testing_guidance, :estimated_effort, :target, :created_by)
RETURNING """
                + _COLUMNS
            ),
            {"tenant_id": current_user.tenant_id, "created_by": current_user.user_id, **body.model_dump()},
        )
    ).first()
    await db.commit()
    return _row(row)


@router.patch("/{template_id}")
async def patch_template(
    template_id: uuid.UUID,
    body: TemplatePatch,
    current_user: CurrentUser = Depends(require_permission("fixes:write")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    provided = {k: v for k, v in body.model_dump(exclude_unset=True).items() if k in _WRITABLE}
    if not provided:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no writable field was supplied")
    sets = ", ".join(f"{name} = :{name}" for name in provided)
    row = (
        await db.execute(
            text(
                f"UPDATE remediation_templates SET {sets}, updated_at = now() "
                "WHERE tenant_id = :tenant_id AND id = :id RETURNING " + _COLUMNS
            ),
            {"tenant_id": current_user.tenant_id, "id": template_id, **provided},
        )
    ).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no such template on this tenant")
    await db.commit()
    return _row(row)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("fixes:write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("DELETE FROM remediation_templates WHERE tenant_id = :tenant_id AND id = :id"),
        {"tenant_id": current_user.tenant_id, "id": template_id},
    )
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no such template on this tenant")
    await db.commit()
    return None
