"""Platform-wide event stream (gap C11).

Until now the only stream this API offered was per-mission, so a console showing findings and posture had
nothing to subscribe to and could only re-fetch when a person clicked. This endpoint streams what changed
for the caller's own tenant.

Two limits are stated rather than papered over, because both would be easy to imply away:

1. It polls the database; it does not subscribe to a broker. No producer publishes findings to Redis
   today, so calling this a push pipeline would be false. The cost is the poll interval, and the frames
   are ordinary SSE, so the transport can be replaced later without touching the client.

2. It streams findings only. The incidents table exists but holds no rows, so an incident feed would
   deliver nothing and prove nothing. Adding one later is a query, not a redesign.

Tenant scoping is not optional. security_findings is FORCE-RLS, so every poll re-binds gds.tenant_id on
its own short-lived transaction. A connection that lost its binding would read zero rows rather than
another tenant's rows, and the re-bind happens on every poll, not once per connection.
"""

import asyncio
import json
import time
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from starlette.responses import StreamingResponse

from gds_api.db import async_session_factory
from gds_api.logging_config import get_logger
from gds_api.metrics import sse_connections_active, sse_events_sent_total, sse_heartbeats_sent_total
from gds_api.security import CurrentUser, require_permission

router = APIRouter(tags=["streaming"])
_logger = get_logger("gds_api.platform_stream")

_POLL_SECONDS = 5.0
_HEARTBEAT_SECONDS = 15.0
_MAX_PER_POLL = 25


async def _db_now() -> datetime:
    """Server time in UTC, without an offset.

    security_findings.detected_at is `timestamp without time zone` while now() is tz-aware, and asyncpg
    refuses to compare the two. The cursor is therefore kept in naive UTC to match the column exactly,
    and the UTC offset is added back only on the way out to the client.
    """
    async with async_session_factory() as session:
        return (await session.execute(text("SELECT (now() AT TIME ZONE 'UTC')"))).scalar_one()


async def _poll_findings(
    tenant_id: uuid.UUID, since: datetime
) -> tuple[list[dict], datetime | None]:
    async with async_session_factory() as session:
        await session.execute(
            text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": str(tenant_id)}
        )
        rows = (
            await session.execute(
                text(
                    """
                    SELECT id, title, severity, status, scanner, target, detected_at
                      FROM security_findings
                     WHERE detected_at IS NOT NULL AND detected_at > :since
                     ORDER BY detected_at ASC, id ASC
                     LIMIT :lim
                    """
                ),
                {"since": since, "lim": _MAX_PER_POLL},
            )
        ).mappings().all()
        # Never commit: the transaction is short-lived by construction, so nothing is left idle.
        await session.rollback()
    # Rows are ordered ascending, so the last one carries the newest detected_at and becomes the cursor.
    newest = rows[-1]["detected_at"] if rows else None
    events = [
        {
            "type": "finding",
            "id": str(row["id"]),
            "title": row["title"],
            "severity": row["severity"],
            "status": row["status"],
            "scanner": row["scanner"],
            "target": row["target"],
            # The column is naive UTC; without an explicit offset a browser would read it as local time.
            "detected_at": row["detected_at"].replace(tzinfo=timezone.utc).isoformat(),
        }
        for row in rows
    ]
    return events, newest


async def _platform_event_stream(
    request: Request, tenant_id: uuid.UUID
) -> AsyncGenerator[str, None]:
    sse_connections_active.inc()
    try:
        since = await _db_now()
        # Flush one frame immediately: a client that is connected should be able to tell it is connected
        # before the first event exists.
        yield ": connected\n\n"
        last_heartbeat = time.monotonic()
        while True:
            if await request.is_disconnected():
                break
            try:
                events, newest = await _poll_findings(tenant_id, since)
            except Exception as exc:  # a database hiccup must not end the stream silently
                _logger.warning("platform_stream_poll_failed", error=str(exc))
                yield ": poll failed, retrying\n\n"
                events, newest = [], None
            if newest is not None:
                since = newest
            for event in events:
                yield f"event: {event['type']}\nid: {event['id']}\ndata: {json.dumps(event)}\n\n"
                sse_events_sent_total.labels(event_type=event["type"]).inc()
            if time.monotonic() - last_heartbeat >= _HEARTBEAT_SECONDS:
                yield ": heartbeat\n\n"
                sse_heartbeats_sent_total.inc()
                last_heartbeat = time.monotonic()
            await asyncio.sleep(_POLL_SECONDS)
    finally:
        sse_connections_active.dec()


@router.get("/stream/platform")
async def stream_platform(
    request: Request,
    current_user: CurrentUser = Depends(require_permission("findings:read")),
) -> StreamingResponse:
    return StreamingResponse(
        _platform_event_stream(request, current_user.tenant_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
