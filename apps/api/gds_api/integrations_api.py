"""What is actually integrated, measured against this platform rather than described.

The builder's integrations pages were the last place on the routed surface where the copy was invented: one hardcoded
"AWS connected / Azure connected (0 findings) / 3 secrets configured", a static grid offering twelve connectors with
disabled buttons (including Jira, which is permanently removed from this platform), and a connectors dashboard that read
four stores that do not exist and therefore printed "No connectors registered" - an absence of a table reading as an
absence of configuration.

This route answers the question the pages actually ask, from sources that exist:

* Linear, through the same client the ticketing route uses: a key present and a workspace answering are reported
  separately, because they are different facts.
* Cloud environments, from cloud_environments: provider, discovery status, asset count, last successful discovery.
* Notification channels, from the host environment: whether a Slack webhook and a Resend key are present. Presence only,
  never a value, and never a claim that a message was delivered.
* The connector stores the builder pages expect, with existence read from the live schema on every request. A table that
  does not exist is reported as such, so no page can render "0 connectors" for a store that was never created.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api import linear
from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/integrations", tags=["integrations"])

# Stores the builder's connector pages read. Their existence is measured, never assumed.
CANDIDATE_STORES = (
    "integration_configs",
    "connector_registrations",
    "webhook_endpoints",
    "connector_executions",
    "event_bus_messages",
)


async def _tenant(db: AsyncSession, current_user: CurrentUser) -> str:
    tenant_id = getattr(current_user, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=403, detail="This session is not bound to a tenant.")
    await db.execute(text("SELECT set_config('app.tenant_id', :tid, false)"), {"tid": str(tenant_id)})
    return str(tenant_id)


def _env_present(name: str) -> bool:
    return bool(os.getenv(name, "").strip())


async def _linear_surface() -> dict[str, Any]:
    surface: dict[str, Any] = {
        "configured": _env_present("LINEAR_API_KEY"),
        "reachable": False,
        "viewer": None,
        "teams": [],
    }
    if not surface["configured"]:
        surface["reason"] = "LINEAR_API_KEY is not configured on this platform."
        return surface
    try:
        teams = await linear.list_teams()
    except linear.LinearError as exc:
        # A key Linear rejects is reported. An empty team list would read as a workspace with no teams.
        surface["reason"] = str(exc)
        return surface
    surface.update(reachable=True, viewer=teams["viewer"], teams=teams["teams"])
    return surface


async def _store_state(db: AsyncSession, tenant_id: str) -> dict[str, dict[str, Any]]:
    """Whether each connector store exists, and how many rows this tenant has in it.

    A table that exists and is empty is a different fact from a table that exists and holds endpoints, and from a table
    that was never created. Reporting only "exists" would let an empty webhook store read as a configured one.
    """
    rows = (
        await db.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        )
    ).all()
    tables = {row[0] for row in rows}
    state: dict[str, dict[str, Any]] = {}
    for name in CANDIDATE_STORES:
        if name not in tables:
            state[name] = {"exists": False, "rows": None}
            continue
        # The name comes from CANDIDATE_STORES, never from a request, so it cannot carry injected SQL.
        counted = (
            await db.execute(
                text(f"SELECT count(*) AS total FROM {name} WHERE tenant_id = :tid"),  # noqa: S608
                {"tid": tenant_id},
            )
        ).mappings().first()
        state[name] = {"exists": True, "rows": counted["total"] if counted else 0}
    return state


@router.get("/status")
async def integrations_status(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
) -> dict[str, Any]:
    """Every integration surface this platform can speak to, and the stores it cannot."""
    tenant_id = await _tenant(db, current_user)

    environments = (
        await db.execute(
            text(
                """
                SELECT provider, name, native_id, status, discovery_status, asset_count,
                       last_successful_discovery_at, enabled
                FROM cloud_environments
                WHERE tenant_id = :tid
                ORDER BY provider
                """
            ),
            {"tid": tenant_id},
        )
    ).mappings().all()

    stores = await _store_state(db, tenant_id)

    cloud_rows = [
        {
            "provider": row["provider"],
            "name": row["name"],
            "native_id": row["native_id"],
            "status": row["status"],
            "discovery_status": row["discovery_status"],
            "asset_count": row["asset_count"],
            "last_discovered_at": row["last_successful_discovery_at"].isoformat()
            if row["last_successful_discovery_at"]
            else None,
            "enabled": row["enabled"],
        }
        for row in environments
    ]

    return {
        "linear": await _linear_surface(),
        "cloud": {
            "environments": cloud_rows,
            "providers": sorted({row["provider"] for row in cloud_rows}),
            "total_assets": sum(row["asset_count"] or 0 for row in cloud_rows),
        },
        "notifications": {
            "slack_webhook_present": _env_present("SLACK_WEBHOOK_URL"),
            "resend_key_present": _env_present("RESEND_API_KEY"),
            "email_sender_configured": _env_present("EMAIL_FROM"),
            "note": (
                "Presence of a credential is not delivery. Nothing on this route sends a message."
            ),
        },
        "stores": stores,
        "secrets": {
            "measurable": False,
            "reason": (
                "This platform has no secrets inventory: credentials live in the host environment, so a count of "
                "configured secrets cannot be measured and is not reported."
            ),
        },
        "measured_at": datetime.now(timezone.utc).isoformat(),
    }
