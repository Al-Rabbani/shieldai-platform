"""On-call rota: the named human a page is expected to reach.

The escalation ladder in scripts/ops/gds-page.py already re-delivers on a 5/15/60 minute schedule, but it
delivers to a channel and to the notification's owner. Nothing said who was expected to answer, so
incident_response_staffing failed for the right reason: a page with no named owner is an announcement, not a
page.

This module keeps that answer in data. Shifts are explicit windows, so "who is on call now" is one indexed
query, a handover is two rows, and an empty rota is visibly empty instead of implied.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import get_current_user
from gds_api.tenant_binding import bind_tenant

router = APIRouter(prefix="/on-call", tags=["on-call"])


class ShiftIn(BaseModel):
    person_name: str = Field(min_length=1, max_length=200)
    person_email: EmailStr
    starts_at: datetime
    ends_at: datetime
    notes: str | None = Field(default=None, max_length=1000)


class ShiftOut(BaseModel):
    id: uuid.UUID
    person_name: str
    person_email: str
    starts_at: datetime
    ends_at: datetime
    notes: str | None = None
    is_current: bool = False


def _aware(value: datetime) -> datetime:
    """Treat a naive timestamp as UTC rather than silently comparing against a naive now()."""
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


async def who_is_on_call(db: AsyncSession, *, tenant_id: uuid.UUID, at: datetime | None = None) -> dict[str, Any] | None:
    """The person whose shift covers `at`, or None. None is a real answer: nobody is on call."""
    moment = _aware(at) if at is not None else datetime.now(UTC)
    row = (
        await db.execute(
            text(
                "SELECT id, person_name, person_email, starts_at, ends_at, notes "
                "FROM on_call_shifts "
                "WHERE tenant_id = :t AND starts_at <= :now AND ends_at > :now "
                "ORDER BY starts_at DESC LIMIT 1"
            ),
            {"t": str(tenant_id), "now": moment},
        )
    ).mappings().first()
    return dict(row) if row else None


@router.post("/shifts", response_model=ShiftOut, status_code=status.HTTP_201_CREATED)
async def create_shift(
    body: ShiftIn,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ShiftOut:
    await bind_tenant(db, current_user.tenant_id)
    if _aware(body.ends_at) <= _aware(body.starts_at):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "ends_at must be after starts_at")
    row = (
        await db.execute(
            text(
                "INSERT INTO on_call_shifts "
                "(tenant_id, person_name, person_email, starts_at, ends_at, notes, created_by) "
                "VALUES (:t, :n, :e, :s, :en, :notes, :by) "
                "RETURNING id, person_name, person_email, starts_at, ends_at, notes"
            ),
            {
                "t": str(current_user.tenant_id),
                "n": body.person_name,
                "e": str(body.person_email),
                "s": _aware(body.starts_at),
                "en": _aware(body.ends_at),
                "notes": body.notes,
                "by": str(current_user.user_id),
            },
        )
    ).mappings().first()
    await db.commit()
    return ShiftOut(**dict(row))


@router.get("/shifts", response_model=list[ShiftOut])
async def list_shifts(
    limit: int = 50,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ShiftOut]:
    await bind_tenant(db, current_user.tenant_id)
    now = datetime.now(UTC)
    rows = (
        await db.execute(
            text(
                "SELECT id, person_name, person_email, starts_at, ends_at, notes, "
                "(starts_at <= :now AND ends_at > :now) AS is_current "
                "FROM on_call_shifts WHERE tenant_id = :t "
                "ORDER BY starts_at DESC LIMIT :lim"
            ),
            {"t": str(current_user.tenant_id), "now": now, "lim": max(1, min(limit, 500))},
        )
    ).mappings().all()
    return [ShiftOut(**dict(r)) for r in rows]


@router.get("/now")
async def get_current_on_call(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Who is on call, and if nobody is, say so plainly rather than returning an empty success."""
    await bind_tenant(db, current_user.tenant_id)
    person = await who_is_on_call(db, tenant_id=current_user.tenant_id)
    if person is None:
        return {"on_call": False, "person": None, "detail": "no shift covers the current time"}
    return {"on_call": True, "person": person, "detail": "a named person is on call now"}


@router.delete("/shifts/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift(
    shift_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await bind_tenant(db, current_user.tenant_id)
    result = await db.execute(
        text("DELETE FROM on_call_shifts WHERE id = :i AND tenant_id = :t"),
        {"i": str(shift_id), "t": str(current_user.tenant_id)},
    )
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "shift not found")
    await db.commit()
