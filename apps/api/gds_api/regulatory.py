"""NIS2 Article 23 reporting clock.

Article 23 gives three deadlines from the moment an incident is known: an early warning within 24 hours, a
notification within 72 hours, and a final report within one month. Those are wall-clock obligations, so the only
reliable way to meet them is to compute them once, at detection, and store them. This module does that and reports
overdue items as a query.

Deliberately no auto-send: notifying a regulator is a human decision with legal consequences, so submit records
that a person sent it and when.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(tags=["regulatory"])

# Article 23(4) timings. The month is 30 days as the article's "one month" is read in practice; recorded so a
# reviewer can see the assumption rather than infer it.
EARLY_WARNING = timedelta(hours=24)
NOTIFICATION = timedelta(hours=72)
FINAL_REPORT = timedelta(days=30)

STAGES = {
    "early_warning": ("early_warning_sent_at", "early_warning_due_at"),
    "notification": ("notification_sent_at", "notification_due_at"),
    "final_report": ("final_report_sent_at", "final_report_due_at"),
}


class NotificationCreate(BaseModel):
    regulation: str = "nis2_art23"
    authority: str | None = None
    detected_at: datetime | None = None
    notes: str | None = None


class NotificationSubmit(BaseModel):
    stage: str
    sent_at: datetime | None = None


def _bind(user: CurrentUser):
    return {"tid": str(user.tenant_id)}


@router.post("/incidents/{incident_id}/regulatory-notifications", status_code=201)
async def create_notification(
    incident_id: uuid.UUID,
    body: NotificationCreate,
    current_user: CurrentUser = Depends(require_permission("incidents:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), _bind(current_user))
    detected = body.detected_at or datetime.now(UTC)
    if detected.tzinfo is None:
        detected = detected.replace(tzinfo=UTC)
    # The incident must exist for THIS tenant; a 404 here is a real answer, not an empty result.
    found = (await db.execute(text("SELECT 1 FROM incidents WHERE id = :i AND tenant_id = :t"),
                              {"i": str(incident_id), "t": str(current_user.tenant_id)})).first()
    if found is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Incident not found")
    row = (await db.execute(text("""
        INSERT INTO regulatory_notifications (id, tenant_id, incident_id, regulation, authority, detected_at,
            early_warning_due_at, notification_due_at, final_report_due_at, status, notes)
        VALUES (:id, :t, :i, :reg, :auth, :det, :ew, :nt, :fr, 'pending', :notes)
        ON CONFLICT (incident_id, regulation) DO UPDATE SET authority = EXCLUDED.authority,
            detected_at = EXCLUDED.detected_at, early_warning_due_at = EXCLUDED.early_warning_due_at,
            notification_due_at = EXCLUDED.notification_due_at, final_report_due_at = EXCLUDED.final_report_due_at,
            notes = EXCLUDED.notes, updated_at = now()
        RETURNING id, early_warning_due_at, notification_due_at, final_report_due_at, status
    """), {"id": str(uuid.uuid4()), "t": str(current_user.tenant_id), "i": str(incident_id),
           "reg": body.regulation, "auth": body.authority, "det": detected,
           "ew": detected + EARLY_WARNING, "nt": detected + NOTIFICATION, "fr": detected + FINAL_REPORT,
           "notes": body.notes})).first()
    await db.commit()
    return {"notification_id": str(row[0]), "early_warning_due_at": row[1].isoformat(),
            "notification_due_at": row[2].isoformat(), "final_report_due_at": row[3].isoformat(),
            "status": row[4]}


@router.get("/incidents/{incident_id}/regulatory-notifications")
async def list_for_incident(
    incident_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("incidents:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), _bind(current_user))
    rows = (await db.execute(text("""
        SELECT id, regulation, authority, detected_at, early_warning_due_at, notification_due_at,
               final_report_due_at, early_warning_sent_at, notification_sent_at, final_report_sent_at, status
        FROM regulatory_notifications WHERE incident_id = :i AND tenant_id = :t ORDER BY detected_at DESC
    """), {"i": str(incident_id), "t": str(current_user.tenant_id)})).all()
    return [dict(r._mapping) for r in rows]


@router.get("/regulatory-notifications/overdue")
async def overdue(
    current_user: CurrentUser = Depends(require_permission("incidents:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Every unmet deadline, oldest first. This is the list that answers 'are we late on a regulator?'."""
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), _bind(current_user))
    rows = (await db.execute(text("""
        SELECT id, incident_id, regulation, status,
               (early_warning_sent_at IS NULL AND now() > early_warning_due_at) AS early_warning_late,
               (notification_sent_at IS NULL AND now() > notification_due_at) AS notification_late,
               (final_report_sent_at IS NULL AND now() > final_report_due_at) AS final_report_late,
               early_warning_due_at, notification_due_at, final_report_due_at
        FROM regulatory_notifications WHERE tenant_id = :t
        ORDER BY notification_due_at ASC
    """), {"t": str(current_user.tenant_id)})).all()
    items = [dict(r._mapping) for r in rows]
    late = [i for i in items if i["early_warning_late"] or i["notification_late"] or i["final_report_late"]]
    return {"total": len(items), "late": len(late), "items": items}


@router.post("/regulatory-notifications/{notification_id}/submit")
async def submit(
    notification_id: uuid.UUID,
    body: NotificationSubmit,
    current_user: CurrentUser = Depends(require_permission("incidents:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.stage not in STAGES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"stage must be one of {sorted(STAGES)}")
    sent_col, due_col = STAGES[body.stage]
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), _bind(current_user))
    sent = body.sent_at or datetime.now(UTC)
    row = (await db.execute(text(f"""
        UPDATE regulatory_notifications SET {sent_col} = :sent, status = :st, updated_at = now()
        WHERE id = :id AND tenant_id = :t
        RETURNING id, status, {sent_col} AS sent_at, {due_col} AS due_at
    """), {"sent": sent, "st": body.stage, "id": str(notification_id), "t": str(current_user.tenant_id)})).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    await db.commit()
    late = row[2] > row[3]
    return {"notification_id": str(row[0]), "stage": body.stage, "status": row[1],
            "sent_at": row[2].isoformat(), "due_at": row[3].isoformat(), "sent_late": late}
