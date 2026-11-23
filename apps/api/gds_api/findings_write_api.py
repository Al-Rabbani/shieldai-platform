"""The findings write path the fix pages always needed.

Measured 23 Nov 2026: RemediationTemplatesPage.applyTemplate and TriageQueuePage's bulk apply both call
TriagedFinding.bulkUpdate([{id, status: "in_remediation", remediation_notes, remediation_started_at}]). No PATCH
/findings/bulk and no PATCH /findings/{id} existed, so applying a template failed outright; the columns it wrote did not
exist either, and "in_remediation" is not a status this estate uses (open 849, resolved 139, accepted_risk 14).

This route records remediation only: notes, when it started, and which template was applied. It deliberately cannot set
status - changing a finding's state is a different decision with its own vocabulary and its own consequences for every
open count and SLA band, so it is not smuggled in through a template button.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/findings", tags=["findings-write"])

# security_findings ids are integers in the scanner register; the governed register uses UUIDs. The id is carried as
# text and compared against the column's own type by Postgres, so neither register is coerced (item 8).
_UPDATE_ONE = """
UPDATE security_findings
   SET remediation_notes       = COALESCE(:remediation_notes, remediation_notes),
       remediation_started_at  = COALESCE(:remediation_started_at, remediation_started_at),
       remediation_template_id = COALESCE(:remediation_template_id, remediation_template_id),
       owner                   = COALESCE(:owner, owner),
       owner_assigned_at       = CASE WHEN :owner IS NULL THEN owner_assigned_at ELSE now() END
 WHERE tenant_id = :tenant_id
   AND id::text = :id
RETURNING id
"""


class RemediationRecord(BaseModel):
    """What a fix page may record. `owner` is the assignment column added in item 23; the pages' own
    assigned_agent_id / assigned_to names do not exist on security_findings and are no longer sent."""

    # The page sends the scanner register's id as a JSON number (1023), while the governed register uses a UUID string.
    # Pydantic v2 does not coerce int to str, so a str-only field rejected the real call with a 422 the page could only
    # render as "[object Object]". Both are accepted and compared as text against the column.
    id: str | int
    remediation_notes: str | None = None
    remediation_started_at: datetime | None = None
    remediation_template_id: uuid.UUID | None = None
    owner: str | None = None


class BulkRemediation(BaseModel):
    items: list[RemediationRecord]


class BulkResult(BaseModel):
    updated: int
    requested: int
    missing: list[str]


async def _apply(db: AsyncSession, tenant_id: Any, item: RemediationRecord) -> bool:
    if not any(
        value is not None
        for value in (item.remediation_notes, item.remediation_started_at, item.remediation_template_id, item.owner)
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "a remediation record needs at least one of remediation_notes, remediation_started_at, "
            "remediation_template_id or owner",
        )
    row = (
        await db.execute(
            text(_UPDATE_ONE),
            {
                "tenant_id": tenant_id,
                "id": str(item.id),
                "remediation_notes": item.remediation_notes,
                "remediation_started_at": item.remediation_started_at,
                "remediation_template_id": item.remediation_template_id,
                "owner": item.owner,
            },
        )
    ).first()
    return row is not None


@router.patch("/bulk", response_model=BulkResult)
async def bulk_record_remediation(
    body: BulkRemediation,
    current_user: CurrentUser = Depends(require_permission("fixes:write")),
    db: AsyncSession = Depends(get_db),
) -> BulkResult:
    """Record remediation on many findings at once. Missing ids are reported, never silently skipped."""
    if not body.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no items were supplied")
    missing: list[str] = []
    updated = 0
    for item in body.items:
        if await _apply(db, current_user.tenant_id, item):
            updated += 1
        else:
            missing.append(str(item.id))
    await db.commit()
    return BulkResult(updated=updated, requested=len(body.items), missing=missing)


@router.patch("/{finding_id}")
async def record_remediation(
    finding_id: str,
    body: RemediationRecord,
    current_user: CurrentUser = Depends(require_permission("fixes:write")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    body.id = finding_id
    if not await _apply(db, current_user.tenant_id, body):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no such finding on this tenant")
    await db.commit()
    return {"id": finding_id, "recorded": True}
