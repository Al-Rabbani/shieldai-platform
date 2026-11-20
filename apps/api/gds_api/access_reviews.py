"""Periodic access review: standing access is re-justified on a cadence.

Deactivation already existed; what did not was any record that someone had looked at who still has access and
said so. The compliance control reported exactly that. This module generates a review from live data, records a
decision per person, and makes 'revoke' actually revoke rather than annotate.

Design choices worth stating:
  * Each item snapshots the role and last authenticated session at generation time, so a reviewer is judging the
    access that existed when the review ran, not whatever the table says months later.
  * 'revoke' deactivates the account and revokes its live sessions. A review that records an opinion without
    changing access is paperwork, which is the failure mode this control exists to catch.
  * A reviewer cannot revoke their own account. With one administrator, self-revocation would lock the tenant
    out of its own review with no way back in.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import get_current_user

router = APIRouter(prefix="/access/reviews", tags=["access"])

REVIEW_PERIOD_DAYS = 90


class DecideBody(BaseModel):
    item_id: uuid.UUID
    decision: str = Field(pattern="^(retain|revoke)$")
    note: str | None = None


async def generate_review(db: AsyncSession, tenant_id: uuid.UUID, actor_id: uuid.UUID | None,
                          period_days: int = REVIEW_PERIOD_DAYS) -> dict:
    """Snapshot every active user in the tenant and open a review over them."""
    rows = (await db.execute(text("""
        SELECT u.id AS user_id, u.email, r.name AS role_name,
               max(s.created_at) AS last_session_at,
               CASE WHEN max(s.created_at) IS NULL THEN NULL
                    ELSE extract(day FROM now() - max(s.created_at))::int END AS days_since_last_session
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        LEFT JOIN user_sessions s ON s.user_id = u.id AND s.revoked_at IS NULL
        WHERE u.tenant_id = :t AND u.is_active
        GROUP BY u.id, u.email, r.name
        ORDER BY u.email
    """), {"t": str(tenant_id)})).mappings().all()

    review_id = (await db.execute(text("""
        INSERT INTO access_reviews (tenant_id, period_days, generated_by, total_items)
        VALUES (:t, :p, :g, :n) RETURNING id
    """), {"t": str(tenant_id), "p": period_days, "g": str(actor_id) if actor_id else None,
           "n": len(rows)})).scalar()

    for row in rows:
        await db.execute(text("""
            INSERT INTO access_review_items
                (review_id, tenant_id, user_id, email, role_name, last_session_at, days_since_last_session)
            VALUES (:r, :t, :u, :e, :role, :ls, :d)
        """), {"r": str(review_id), "t": str(tenant_id), "u": str(row["user_id"]), "e": row["email"],
               "role": row["role_name"], "ls": row["last_session_at"], "d": row["days_since_last_session"]})
    await db.commit()
    return {"review_id": str(review_id), "total_items": len(rows), "status": "open"}


async def decide(db: AsyncSession, tenant_id: uuid.UUID, review_id: uuid.UUID, item_id: uuid.UUID,
                 decision: str, actor_id: uuid.UUID, note: str | None = None) -> dict:
    item = (await db.execute(text("""
        SELECT i.id, i.user_id, i.email, i.decision, r.status AS review_status
        FROM access_review_items i JOIN access_reviews r ON r.id = i.review_id
        WHERE i.id = :i AND i.review_id = :r
    """), {"i": str(item_id), "r": str(review_id)})).mappings().first()
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Review item not found")
    if item["review_status"] != "open":
        raise HTTPException(status.HTTP_409_CONFLICT, "This review is already closed")

    revoked = False
    if decision == "revoke":
        if str(item["user_id"]) == str(actor_id):
            raise HTTPException(status.HTTP_409_CONFLICT,
                                "You cannot revoke your own account: with one administrator the tenant would "
                                "lose the ability to finish its own review")
        await db.execute(text("UPDATE users SET is_active = false WHERE id = :u"), {"u": str(item["user_id"])})
        await db.execute(text("UPDATE user_sessions SET revoked_at = now() "
                              "WHERE user_id = :u AND revoked_at IS NULL"), {"u": str(item["user_id"])})
        revoked = True

    await db.execute(text("""
        UPDATE access_review_items
        SET decision = :d, decided_by = :a, decided_at = now(), note = :n
        WHERE id = :i
    """), {"d": decision, "a": str(actor_id), "n": note, "i": str(item_id)})

    counts = (await db.execute(text("""
        SELECT count(*) FILTER (WHERE decision <> 'pending') AS decided,
               count(*) FILTER (WHERE decision = 'revoke') AS revoked,
               count(*) AS total
        FROM access_review_items WHERE review_id = :r
    """), {"r": str(review_id)})).mappings().first()

    closed = counts["decided"] == counts["total"] and counts["total"] > 0
    await db.execute(text("""
        UPDATE access_reviews
        SET decided_items = :d, revoked_items = :v,
            status = CASE WHEN :closed THEN 'completed' ELSE status END,
            completed_at = CASE WHEN :closed THEN now() ELSE completed_at END
        WHERE id = :r
    """), {"d": counts["decided"], "v": counts["revoked"], "closed": closed, "r": str(review_id)})
    await db.commit()
    return {"item_id": str(item_id), "decision": decision, "account_deactivated": revoked,
            "decided": counts["decided"], "total": counts["total"], "review_completed": closed}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_review(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    return await generate_review(db, current_user.tenant_id, current_user.user_id)


@router.get("")
async def list_reviews(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    rows = (await db.execute(text("""
        SELECT id, status, total_items, decided_items, revoked_items, generated_at, completed_at, period_days
        FROM access_reviews ORDER BY generated_at DESC LIMIT 24
    """))).mappings().all()
    return {"reviews": [dict(r) for r in rows], "count": len(rows), "period_days": REVIEW_PERIOD_DAYS}


@router.get("/{review_id}")
async def get_review(review_id: uuid.UUID, current_user=Depends(get_current_user),
                     db: AsyncSession = Depends(get_db)) -> dict:
    review = (await db.execute(text("""
        SELECT id, status, total_items, decided_items, revoked_items, generated_at, completed_at, period_days
        FROM access_reviews WHERE id = :r
    """), {"r": str(review_id)})).mappings().first()
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Review not found")
    items = (await db.execute(text("""
        SELECT id, email, role_name, last_session_at, days_since_last_session, decision, decided_at, note
        FROM access_review_items WHERE review_id = :r ORDER BY email
    """), {"r": str(review_id)})).mappings().all()
    return {"review": dict(review), "items": [dict(i) for i in items], "count": len(items)}


@router.post("/{review_id}/decide")
async def decide_item(review_id: uuid.UUID, body: DecideBody, current_user=Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)) -> dict:
    return await decide(db, current_user.tenant_id, review_id, body.item_id, body.decision,
                        current_user.user_id, body.note)
