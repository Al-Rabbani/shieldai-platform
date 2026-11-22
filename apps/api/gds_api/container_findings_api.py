"""Container CVE findings: 314 real rows that no route served.

Measured on 22 Nov 2026, before writing this:

    findings            317 rows, all status 'observed', all tenant 2ec10dd0 (GDS)
      source='trivy_container'  314
      source='cspm'               3
    cloud_finding_contexts        3 rows, joined to exactly those 3 cspm findings

The only read route over that table was GET /cloud/findings, which filters `source == "cspm"` AND
inner-joins `cloud_finding_contexts`. So the platform's entire HTTP surface could return 3 of the 317
rows, and the 314 container CVEs - the same estate the weekly container watch reports on - were
readable by nothing. The builder's Container Security page had no mapping at all and showed its
"not served by this platform" banner, which was honest but pointed at the wrong fact: the data was
there, the route was missing.

This module adds the missing read surface. It reads only what exists:

  * image, package, installed_version, fixed_version, target and cwe_id live inside raw_data (jsonb),
    so they are flattened here once instead of every caller digging them out;
  * severity, cvss, epss, kev_listed and recommended_remediation are real columns;
  * nothing is inferred - a null field is returned as null rather than defaulted.

Both endpoints are tenant-scoped by explicit predicate (findings is FORCE RLS) and permission-gated.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/containers", tags=["container-findings"])

#: The one source value the container scanner writes. Not a guess: it is the value in the table.
CONTAINER_SOURCE = "trivy_container"

_COLUMNS = """
       id::text AS id,
       title,
       description,
       severity,
       status,
       cve,
       cvss,
       epss,
       kev_listed,
       raw_data->>'image' AS image,
       raw_data->>'package' AS package,
       raw_data->>'installed_version' AS installed_version,
       raw_data->>'fixed_version' AS fixed_version,
       raw_data->>'target' AS target,
       raw_data->>'cwe_id' AS cwe_id,
       recommended_remediation AS remediation,
       created_at
"""

#: One statement shape, with optional filters expressed as "param is null or column = param" so the
#: query text never changes with the caller's filters. No string interpolation of user input.
_LIST_SQL = f"""
    SELECT {_COLUMNS}
      FROM findings
     WHERE tenant_id = :tenant_id
       AND source = :source
       AND (:severity IS NULL OR severity = :severity)
       AND (:status_filter IS NULL OR status = :status_filter)
       AND (:image IS NULL OR raw_data->>'image' = :image)
       AND (:cve IS NULL OR cve = :cve)
       AND (:search IS NULL OR title ILIKE :search OR cve ILIKE :search)
     ORDER BY created_at DESC, id
     LIMIT :limit OFFSET :offset
"""

_COUNT_SQL = """
    SELECT count(*) AS total
      FROM findings
     WHERE tenant_id = :tenant_id
       AND source = :source
       AND (:severity IS NULL OR severity = :severity)
       AND (:status_filter IS NULL OR status = :status_filter)
       AND (:image IS NULL OR raw_data->>'image' = :image)
       AND (:cve IS NULL OR cve = :cve)
       AND (:search IS NULL OR title ILIKE :search OR cve ILIKE :search)
"""

_SUMMARY_SQL = """
    SELECT count(*) AS total,
           count(*) FILTER (WHERE severity = 'critical') AS critical,
           count(*) FILTER (WHERE severity = 'high') AS high,
           count(*) FILTER (WHERE severity = 'medium') AS medium,
           count(*) FILTER (WHERE severity = 'low') AS low,
           count(*) FILTER (WHERE severity = 'info') AS info,
           count(*) FILTER (WHERE kev_listed) AS kev_listed,
           count(DISTINCT raw_data->>'image') AS images,
           max(created_at) AS newest
      FROM findings
     WHERE tenant_id = :tenant_id
       AND source = :source
"""

_BY_IMAGE_SQL = """
    SELECT raw_data->>'image' AS image,
           count(*) AS total,
           count(*) FILTER (WHERE severity = 'critical') AS critical,
           count(*) FILTER (WHERE severity = 'high') AS high
      FROM findings
     WHERE tenant_id = :tenant_id
       AND source = :source
       AND raw_data->>'image' IS NOT NULL
     GROUP BY 1
     ORDER BY 3 DESC, 2 DESC, 1
"""


def _row_to_out(row) -> dict:
    mapping = row._mapping
    return {
        "id": mapping["id"],
        "title": mapping["title"],
        "description": mapping["description"],
        "severity": mapping["severity"],
        "status": mapping["status"],
        "cve_id": mapping["cve"],
        "cvss_score": mapping["cvss"],
        "epss_score": mapping["epss"],
        "kev_listed": mapping["kev_listed"],
        "image": mapping["image"],
        "package": mapping["package"],
        "installed_version": mapping["installed_version"],
        "fixed_version": mapping["fixed_version"],
        "target": mapping["target"],
        "cwe_id": mapping["cwe_id"],
        "remediation": mapping["remediation"],
        "created_at": mapping["created_at"].isoformat() if isinstance(mapping["created_at"], datetime) else mapping["created_at"],
    }


def _params(tenant_id, severity, status_filter, image, cve, search) -> dict:
    return {
        "tenant_id": tenant_id,
        "source": CONTAINER_SOURCE,
        "severity": severity,
        "status_filter": status_filter,
        "image": image,
        "cve": cve,
        "search": f"%{search}%" if search else None,
    }


@router.get("/findings")
async def list_container_findings(
    severity: str | None = None,
    status_filter: str | None = None,
    image: str | None = None,
    cve: str | None = None,
    search: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_permission("cloud:findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Container CVE findings that exist, with the count of everything matching, not just this page."""
    base = _params(current_user.tenant_id, severity, status_filter, image, cve, search)
    total = (await db.execute(text(_COUNT_SQL), base)).scalar_one()
    rows = await db.execute(
        text(_LIST_SQL), {**base, "limit": limit, "offset": offset}
    )
    findings = [_row_to_out(row) for row in rows]
    return {
        "count": total,
        "returned": len(findings),
        "limit": limit,
        "offset": offset,
        "findings": findings,
    }


@router.get("/summary")
async def container_findings_summary(
    current_user: CurrentUser = Depends(require_permission("cloud:findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Counts over the whole container estate, so a tile can never show a page size as a total."""
    params = {"tenant_id": current_user.tenant_id, "source": CONTAINER_SOURCE}
    row = (await db.execute(text(_SUMMARY_SQL), params)).one()._mapping
    by_image = [
        {
            "image": r._mapping["image"],
            "total": r._mapping["total"],
            "critical": r._mapping["critical"],
            "high": r._mapping["high"],
        }
        for r in await db.execute(text(_BY_IMAGE_SQL), params)
    ]
    newest = row["newest"]
    return {
        "source": CONTAINER_SOURCE,
        "total": row["total"],
        "by_severity": {
            "critical": row["critical"],
            "high": row["high"],
            "medium": row["medium"],
            "low": row["low"],
            "info": row["info"],
        },
        "kev_listed": row["kev_listed"],
        "images": row["images"],
        "newest": newest.isoformat() if isinstance(newest, datetime) else newest,
        "by_image": by_image,
    }
