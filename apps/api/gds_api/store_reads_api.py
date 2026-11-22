"""Read routes for stores that exist and hold rows but had no way to be read.

Item 7 of the sequential build. 74 entity names the routed pages call are refused by the adapter; before deciding that
a name is absent, the database was asked. Four of them have a real table:

    cloud_asset_relationships   FORCE RLS, 0 rows   -> no list route existed at all, only per-asset
    linear_issue_links          FORCE RLS, 0 rows   -> only POST /integrations/linear and /status
    remediation_plans           FORCE RLS, 0 rows   -> GET /remediation/plans already serves it
    webhook_endpoints           FORCE RLS, 0 rows   -> GET /webhooks already serves it

So two routes are missing, not four. This module adds them and states the zero honestly: an empty list here means
nothing has been recorded, which is different from a panel that cannot ask.

Field names are the ones the consuming components read, taken from the components themselves rather than guessed:

    lib/attackPaths.js buildAttackGraph   dependency.asset_name, dependency.depends_on_name, dependency.dependency_type
    pages/Assets.jsx                      dependency.asset_name, dependency.depends_on_name, dependency.dependency_type

`asset_name` is the SOURCE asset and `depends_on_name` its TARGET, joined from cloud_assets by id, because the table
stores ids only. A relationship whose endpoints are not in the inventory keeps its ids and reports null names rather
than inventing a label.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(tags=["inventory"])

#: Explicit tenant predicate on every query, in addition to FORCE RLS. NULLIF guards the unset-GUC case: with no
#: tenant bound the cast would raise, and a read that raises is worse than a read that returns nothing.
TENANT = "NULLIF(current_setting('gds.tenant_id', true), '')::uuid"


@router.get("/cloud/relationships")
async def list_cloud_relationships(
    limit: int = Query(300, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("cloud:read")),
):
    """Declared asset-to-asset edges, named for the components that draw the dependency graph."""
    rows = (await db.execute(text(f"""
        SELECT r.id,
               r.source_asset_id,
               r.target_asset_id,
               r.relationship_type,
               r.is_direct,
               r.confidence_basis,
               r.first_seen_at,
               r.last_seen_at,
               sa.name AS asset_name,
               ta.name AS depends_on_name
          FROM cloud_asset_relationships r
          LEFT JOIN cloud_assets sa ON sa.id = r.source_asset_id
          LEFT JOIN cloud_assets ta ON ta.id = r.target_asset_id
         WHERE r.tenant_id = {TENANT}
         ORDER BY r.created_at DESC
         LIMIT :limit
    """), {"limit": limit})).mappings().all()

    relationships = [{
        "id": str(r["id"]),
        "source_asset_id": str(r["source_asset_id"]) if r["source_asset_id"] else None,
        "target_asset_id": str(r["target_asset_id"]) if r["target_asset_id"] else None,
        "asset_name": r["asset_name"],
        "depends_on_name": r["depends_on_name"],
        "dependency_type": r["relationship_type"],
        "is_direct": r["is_direct"],
        "confidence_basis": r["confidence_basis"],
        "first_seen_at": r["first_seen_at"].isoformat() if r["first_seen_at"] else None,
        "last_seen_at": r["last_seen_at"].isoformat() if r["last_seen_at"] else None,
    } for r in rows]

    unnamed = sum(1 for r in relationships if not r["asset_name"] or not r["depends_on_name"])
    return {
        "relationships": relationships,
        "counts": {
            "total": len(relationships),
            "direct": sum(1 for r in relationships if r["is_direct"]),
            "with_unresolved_endpoint": unnamed,
        },
        "note": ("declared dependencies only. An empty list means no asset-to-asset edge has been recorded, so the "
                 "graph draws assets with no legs rather than inferring links"),
    }


@router.get("/integrations/linear/links")
async def list_linear_issue_links(
    limit: int = Query(500, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
):
    """Findings that were actually filed in Linear, as recorded by the sync.

    A row exists only when Linear returned an identifier, so this is the audit trail of real filings. An empty list
    means nothing has been filed, which is the opposite of a finding that merely claims a ticket number.
    """
    rows = (await db.execute(text(f"""
        SELECT id, finding_id, linear_issue_id, identifier, url, team_id, team_key,
               state_name, state_type, app_status, created_at, synced_at
          FROM linear_issue_links
         WHERE tenant_id = {TENANT}
         ORDER BY synced_at DESC NULLS LAST
         LIMIT :limit
    """), {"limit": limit})).mappings().all()

    links = [{
        "id": str(r["id"]),
        "finding_id": str(r["finding_id"]) if r["finding_id"] else None,
        "linear_issue_id": r["linear_issue_id"],
        "identifier": r["identifier"],
        "url": r["url"],
        "team_id": r["team_id"],
        "team_key": r["team_key"],
        "state_name": r["state_name"],
        "state_type": r["state_type"],
        "app_status": r["app_status"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "synced_at": r["synced_at"].isoformat() if r["synced_at"] else None,
    } for r in rows]

    return {
        "links": links,
        "counts": {
            "total": len(links),
            "open": sum(1 for l in links if (l["state_type"] or "").lower() in {"unstarted", "started"}),
        },
        "note": ("one row per issue Linear actually created. Empty means no finding has been filed, not that filing "
                 "is unavailable"),
    }
