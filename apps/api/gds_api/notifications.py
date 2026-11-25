"""In-app notifications only. No Slack/email/Teams integration is wired up here yet --
there are no credentials for those, and fabricating that integration would violate the
project's "no fabricated integrations" rule. See integrations/README.md.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.models import Notification
from gds_api.schemas import NotificationOut
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    unread_only: bool = False,
    current_user: CurrentUser = Depends(require_permission("notifications:read")),
    db: AsyncSession = Depends(get_db),
) -> list[Notification]:
    query = select(Notification).where(Notification.user_id == current_user.user_id)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    result = await db.execute(query.order_by(Notification.created_at.desc()))
    return list(result.scalars().all())


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("notifications:read")),
    db: AsyncSession = Depends(get_db),
) -> Notification:
    notification = await db.get(Notification, notification_id)
    if notification is None or notification.user_id != current_user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        # Refresh BEFORE the commit: these tables are FORCE RLS, so a commit can drop the tenant context
        # from the connection and db.refresh() then raises InvalidRequestError "Could not refresh
        # instance" - measured 25 Nov 2026, POST /red-team/targets returned 500 after the row was written.
        await db.flush()
        await db.refresh(notification)
        await db.commit()
    return notification


@router.get("/pending")
async def pending_acknowledgements(
    current_user: CurrentUser = Depends(require_permission("notifications:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """What is still unanswered for this user, and how far it has climbed.

    A page that nobody answers is the failure this endpoint exists to make visible: escalation_level shows the
    rung, and a row at the top rung is a recorded silence, not a handled alert.
    """
    rows = (await db.execute(text("""
        SELECT id, type, message, severity, escalation_level, notify_count, last_notified_at,
               last_delivery, created_at
        FROM notifications
        WHERE user_id = :u AND requires_ack AND acknowledged_at IS NULL
        ORDER BY created_at
    """), {"u": str(current_user.user_id)})).mappings().all()
    return [dict(r) for r in rows]


@router.post("/{notification_id}/acknowledge")
async def acknowledge(
    notification_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("notifications:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Stop the escalation. Only the user the page was raised to can answer it."""
    row = (await db.execute(text("""
        UPDATE notifications
        SET acknowledged_at = now(), acknowledged_by = :u, read_at = coalesce(read_at, now())
        WHERE id = :id AND user_id = :u AND requires_ack AND acknowledged_at IS NULL
        RETURNING id, acknowledged_at, escalation_level, notify_count
    """), {"id": str(notification_id), "u": str(current_user.user_id)})).mappings().first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No open acknowledgement for that notification")
    await db.commit()
    return dict(row)
