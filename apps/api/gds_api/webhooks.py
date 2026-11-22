"""Outbound webhooks that actually leave the platform.

The retired module advertised /actions/webhooks/replay, which posted a task to an agent channel and delivered
nothing to anyone. A customer wiring GDS OS into a SIEM or a ticketing queue needs events to leave the host,
signed so the receiver can trust them, with a delivery row so "we sent it" is provable rather than asserted.

Scope kept deliberately small and honest: this delivers finding events, signed with HMAC-SHA256 over the exact
body, with the outcome of every attempt recorded. It is not an event bus and it does not replay.
"""
from __future__ import annotations

import secrets
import uuid
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

Severity = Literal["critical", "high", "medium", "low", "info"]


class EndpointCreate(BaseModel):
    name: str
    url: str
    min_severity: Severity = "high"
    secret: Optional[str] = None

    @field_validator("url")
    @classmethod
    def _https_only(cls, v: str) -> str:
        # Plain HTTP is allowed only to loopback, so a signing secret cannot cross a network in the clear.
        if not (v.startswith("https://") or v.startswith("http://127.0.0.1") or v.startswith("http://localhost")):
            raise ValueError("webhook URL must be https (http is allowed only for 127.0.0.1 or localhost)")
        return v


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_endpoint(
    body: EndpointCreate,
    current_user: CurrentUser = Depends(require_permission("notifications:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """The secret is returned exactly once, at creation. It is never readable again."""
    secret = body.secret or secrets.token_urlsafe(32)
    row = (await db.execute(text("""
        INSERT INTO webhook_endpoints (tenant_id, name, url, secret, min_severity, created_by_user_id)
        VALUES (:t, :n, :u, :s, :m, :cb)
        RETURNING id, name, url, min_severity, is_active, created_at
    """), {"t": str(current_user.tenant_id), "n": body.name, "u": body.url, "s": secret,
           "m": body.min_severity, "cb": str(current_user.user_id)})).mappings().first()
    await db.commit()
    return {**dict(row), "secret": secret, "secret_note": "shown once; store it in the receiver now"}


@router.get("")
async def list_endpoints(
    current_user: CurrentUser = Depends(require_permission("notifications:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = (await db.execute(text("""
        SELECT e.id, e.name, e.url, e.min_severity, e.is_active, e.created_at,
               e.last_delivery_at, e.consecutive_failures,
               count(d.id) FILTER (WHERE d.status = 'delivered') AS delivery_count,
               count(d.id) AS delivery_attempts
          FROM webhook_endpoints e
          LEFT JOIN webhook_deliveries d ON d.endpoint_id = e.id
         WHERE e.tenant_id = :t
         GROUP BY e.id, e.name, e.url, e.min_severity, e.is_active, e.created_at,
                  e.last_delivery_at, e.consecutive_failures
         ORDER BY e.created_at DESC
    """), {"t": str(current_user.tenant_id)})).mappings().all()
    # delivery_count is counted, never defaulted: an endpoint with no deliveries reports 0 because the count is zero.
    return [dict(r) for r in rows]


@router.delete("/{endpoint_id}")
async def deactivate_endpoint(
    endpoint_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("notifications:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = (await db.execute(text("""
        UPDATE webhook_endpoints SET is_active = false
        WHERE id = :id AND tenant_id = :t RETURNING id, is_active
    """), {"id": str(endpoint_id), "t": str(current_user.tenant_id)})).mappings().first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Webhook endpoint not found")
    await db.commit()
    return dict(row)


@router.get("/deliveries")
async def list_deliveries(
    limit: int = 50,
    current_user: CurrentUser = Depends(require_permission("notifications:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Every attempt, including the failures. A delivery log that only shows successes is marketing."""
    rows = (await db.execute(text("""
        SELECT d.id, d.endpoint_id, e.name AS endpoint_name, d.event_type, d.finding_id,
               d.response_code, d.delivered, d.error, d.attempted_at
        FROM webhook_deliveries d JOIN webhook_endpoints e ON e.id = d.endpoint_id
        WHERE d.tenant_id = :t ORDER BY d.attempted_at DESC LIMIT :l
    """), {"t": str(current_user.tenant_id), "l": min(max(limit, 1), 200)})).mappings().all()
    return [dict(r) for r in rows]
