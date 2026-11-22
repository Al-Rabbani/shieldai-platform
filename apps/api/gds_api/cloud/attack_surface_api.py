"""Cloud attack surface: the 145 assets, and only the columns this platform can actually measure.

Measured 22 Nov 2026 before writing this module:

    cloud_assets                145 rows
      internet_exposure_known     true 73, null 72  (false never appears)
      normalized_category         subnet 56, network 17, security_group 17, region 17,
                                  firewall 17, gateway 17, subscription/account/identity/org 4
    cloud_finding_contexts        3 rows - the ONLY link from a finding to a cloud asset
    security_findings         1,002 rows with no asset_id column at all

The builder's Attack Surface tab had three problems and only one of them was a missing route:

  * `AttackSurface.list()` was refused, so the tab showed the not-served banner;
  * mapping it to GET /cloud/assets would have filled `name` and `asset_type` and left finding_count,
    cve_count, technologies and risk_level undefined - and the card renders an undefined count as 0
    and an undefined exposure as INTERNAL. That is two fabricated claims in a security product;
  * the honest answer is that cloud asset records carry no CVE scan and no technology stack, and 72
    of the 145 assets have no exposure measurement at all.

So this route returns a real count of linked findings, a risk level derived from those findings'
severities, and an explicit null everywhere nothing measured anything. The card was changed in the
same commit to render a null as an em dash instead of a zero or INTERNAL.

Tenant scoping is an explicit predicate because cloud_assets and findings are both FORCE RLS, and
every caller-supplied value is a bound parameter cast at each appearance (asyncpg cannot type a
parameter that only ever appears as `:p IS NULL`, which is how GET /containers/findings returned 500).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/cloud", tags=["attack-surface"])

#: Severity ordering, so the worst linked finding decides the card's risk level.
_SEVERITY_RANK = """
           CASE lower(f.severity)
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
             ELSE 5
           END
"""

_ASSETS_SQL = f"""
    SELECT a.id::text AS id,
           a.name AS name,
           coalesce(a.normalized_category, a.native_resource_type) AS asset_type,
           a.provider AS provider,
           a.region_or_location AS region,
           a.internet_exposure_known AS is_internet_facing,
           a.last_seen_at AS last_seen,
           coalesce(link.finding_count, 0) AS finding_count,
           /* No cloud asset carries a CVE scan, so this is a stated absence, not a zero. */
           NULL::text AS cve_count,
           /* Cloud asset records hold provider plumbing, not a technology stack. */
           NULL::text AS technologies,
           CASE link.worst_rank
             WHEN 1 THEN 'critical'
             WHEN 2 THEN 'high'
             WHEN 3 THEN 'medium'
             WHEN 4 THEN 'low'
             WHEN 5 THEN 'info'
             ELSE NULL
           END AS risk_level
      FROM cloud_assets a
      LEFT JOIN (
           SELECT c.cloud_asset_id AS asset_id,
                  count(*) AS finding_count,
                  min({_SEVERITY_RANK}) AS worst_rank
             FROM cloud_finding_contexts c
             JOIN findings f ON f.id = c.finding_id
            GROUP BY c.cloud_asset_id
      ) link ON link.asset_id = a.id
     WHERE a.tenant_id = :tenant_id
       AND (cast(:asset_type AS text) IS NULL
            OR coalesce(a.normalized_category, a.native_resource_type) = cast(:asset_type AS text))
       AND (cast(:provider AS text) IS NULL OR a.provider = cast(:provider AS text))
     ORDER BY coalesce(link.finding_count, 0) DESC, a.name ASC
     LIMIT :limit OFFSET :offset
"""

_SUMMARY_SQL = """
    SELECT count(DISTINCT a.id) AS assets,
           count(DISTINCT a.id) FILTER (WHERE a.internet_exposure_known IS TRUE) AS with_known_exposure,
           count(DISTINCT a.id) FILTER (WHERE a.internet_exposure_known IS FALSE) AS measured_internal,
           count(DISTINCT a.id) FILTER (WHERE a.internet_exposure_known IS NULL) AS exposure_unknown,
           count(DISTINCT c.cloud_asset_id) AS assets_with_linked_findings,
           count(c.id) AS linked_findings
      FROM cloud_assets a
      LEFT JOIN cloud_finding_contexts c ON c.cloud_asset_id = a.id
     WHERE a.tenant_id = :tenant_id
"""


@router.get("/attack-surface")
async def list_attack_surface(
    asset_type: str | None = None,
    provider: str | None = None,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_permission("cloud:assets:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    params = {
        "tenant_id": str(current_user.tenant_id),
        "asset_type": asset_type,
        "provider": provider,
        "limit": limit,
        "offset": offset,
    }
    rows = (await db.execute(text(_ASSETS_SQL), params)).mappings().all()
    assets = []
    for r in rows:
        assets.append(
            {
                "id": r["id"],
                "name": r["name"],
                "asset_type": r["asset_type"],
                "provider": r["provider"],
                "region": r["region"],
                "is_internet_facing": r["is_internet_facing"],
                "last_seen": r["last_seen"].isoformat() if r["last_seen"] else None,
                "finding_count": int(r["finding_count"] or 0),
                "cve_count": r["cve_count"],
                "technologies": r["technologies"],
                "risk_level": r["risk_level"],
            }
        )
    return {
        "assets": assets,
        "returned": len(assets),
        "limit": limit,
        "offset": offset,
        "basis": {
            "finding_count": "cloud_finding_contexts rows linked to this asset; 0 means no finding is linked, "
                             "not that none was looked for",
            "cve_count": "null: cloud asset records carry no CVE scan",
            "technologies": "null: cloud asset records carry no technology stack",
            "is_internet_facing": "null where internet_exposure_known is null; the platform never writes false",
            "risk_level": "worst severity among linked findings; null where nothing is linked",
        },
    }


@router.get("/attack-surface/summary")
async def attack_surface_summary(
    current_user: CurrentUser = Depends(require_permission("cloud:assets:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = (await db.execute(text(_SUMMARY_SQL), {"tenant_id": str(current_user.tenant_id)})).mappings().first()
    data = dict(row) if row else {}
    return {
        "assets": int(data.get("assets") or 0),
        "with_known_exposure": int(data.get("with_known_exposure") or 0),
        "measured_internal": int(data.get("measured_internal") or 0),
        "exposure_unknown": int(data.get("exposure_unknown") or 0),
        "assets_with_linked_findings": int(data.get("assets_with_linked_findings") or 0),
        "linked_findings": int(data.get("linked_findings") or 0),
        "basis": {
            "exposure": "internet_exposure_known is the only exposure measurement on a cloud asset; "
                        "an asset with null is unknown, not internal",
            "findings": "cloud_finding_contexts is the only finding-to-asset link that exists",
            "cve_scan": "cloud assets are not CVE-scanned; container images are, at /containers/findings",
        },
    }
