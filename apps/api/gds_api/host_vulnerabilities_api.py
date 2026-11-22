"""Host package vulnerabilities: the VM page's real estate, and the one it does not have.

Measured on 22 Nov 2026, before writing this:

    information_schema.tables matching vm|endpoint|patch  ->  webhook_endpoints only
    security_findings WHERE source='osv'                  ->  60 rows, 55 resolved, 5 open
    findings (the other store)                            ->  317 rows, no `target` column at all
    findings WHERE source='dependency_scan'               ->  14 rows (repository dependencies)
    scripts/ops/osv_check.py VENV                         ->  /opt/gds-os/apps/api/venv/bin/pip

So there is no per-instance VM or endpoint scan store on this platform at all: no vm_findings, no vm_scans,
nothing that could answer "how many instances were scanned". What does exist is the OSV check, which reads
the API virtualenv's installed packages and records a finding per affected package. That is a host package
estate, and it was readable by nothing: the builder's VM Security page asked for VMFinding/VMScan, the adapter
refused both, and the page printed "No VM findings found" - which reads as a clean estate rather than as an
absence of the thing being asked for.

Two stores exist and they are not interchangeable: `findings` holds the 317 governed rows (314 container + 3
cloud), `security_findings` holds the 1,002 scanner rows and is where the OSV check writes. This module reads the
scanner store, and `target` - the package name - exists only there.

This module serves the estate that exists, and states the one that does not, so a page can be honest without
inventing a zero. Nothing is inferred: a null cvss is returned as null, and `instances_scanned` is absent
rather than 0.

Tenant-scoped by explicit predicate (security_findings is FORCE RLS) and permission-gated on the same permission the
container route uses.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/host", tags=["host-vulnerabilities"])

#: The one source value the host package check writes. Not a guess: it is the value in the table, and
#: scripts/ops/osv_check.py is the only writer of it.
HOST_SOURCE = "osv"

#: What the OSV check actually reads, quoted from scripts/ops/osv_check.py (VENV).
HOST_BASIS = "OSV advisories for the packages installed in the API virtualenv (/opt/gds-os/apps/api/venv)"

#: States that mean the finding is no longer live work. Anything else counts as open, because the platform
#: stores 'observed' as its fresh state and a page that filters only 'open' shows zero over a real estate.
CLOSED_STATES = ("resolved", "accepted_risk", "false_positive")

_COLUMNS = """
       id::text AS id,
       title,
       target AS package,
       severity,
       status,
       cve,
       cvss,
       epss,
       kev_listed,
       remediation,
       source,
       detected_at,
       resolved_at
"""

_LIST_SQL = f"""
    SELECT {_COLUMNS}
      FROM security_findings
     WHERE tenant_id = :tenant_id
       AND source = :source
       AND (cast(:severity AS text) IS NULL OR severity = cast(:severity AS text))
       AND (cast(:status_filter AS text) IS NULL OR status = cast(:status_filter AS text))
       AND (cast(:search AS text) IS NULL OR title ILIKE cast(:search AS text)
            OR cve ILIKE cast(:search AS text) OR target ILIKE cast(:search AS text))
     ORDER BY (status IN ('resolved','accepted_risk','false_positive')), detected_at DESC NULLS LAST, id DESC
     LIMIT :limit OFFSET :offset
"""

_COUNT_SQL = """
    SELECT count(*) AS total
      FROM security_findings
     WHERE tenant_id = :tenant_id
       AND source = :source
       AND (cast(:severity AS text) IS NULL OR severity = cast(:severity AS text))
       AND (cast(:status_filter AS text) IS NULL OR status = cast(:status_filter AS text))
       AND (cast(:search AS text) IS NULL OR title ILIKE cast(:search AS text)
            OR cve ILIKE cast(:search AS text) OR target ILIKE cast(:search AS text))
"""

_SUMMARY_SQL = """
    SELECT count(*) AS total,
           count(*) FILTER (WHERE status NOT IN ('resolved','accepted_risk','false_positive')) AS open,
           count(*) FILTER (WHERE status = 'resolved') AS resolved,
           count(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('resolved','accepted_risk','false_positive')) AS open_critical,
           count(*) FILTER (WHERE severity = 'high' AND status NOT IN ('resolved','accepted_risk','false_positive')) AS open_high,
           count(*) FILTER (WHERE severity = 'medium' AND status NOT IN ('resolved','accepted_risk','false_positive')) AS open_medium,
           count(*) FILTER (WHERE severity = 'low' AND status NOT IN ('resolved','accepted_risk','false_positive')) AS open_low,
           count(*) FILTER (WHERE kev_listed) AS kev_listed,
           count(DISTINCT target) AS packages,
           max(detected_at) AS newest,
           min(detected_at) AS oldest
      FROM security_findings
     WHERE tenant_id = :tenant_id
       AND source = :source
"""


def _iso(value):
    return value.isoformat() if isinstance(value, datetime) else value


def _row_to_out(row) -> dict:
    m = row._mapping
    return {
        "id": m["id"],
        "title": m["title"],
        "package": m["package"],
        "severity": m["severity"],
        "status": m["status"],
        "is_open": m["status"] not in CLOSED_STATES,
        "cve_id": m["cve"],
        "cvss_score": m["cvss"],
        "epss_score": m["epss"],
        "kev_listed": m["kev_listed"],
        "remediation": m["remediation"],
        "source": m["source"],
        "detected_at": _iso(m["detected_at"]),
        "resolved_at": _iso(m["resolved_at"]),
    }


def _params(tenant_id, severity, status_filter, search) -> dict:
    return {
        "tenant_id": tenant_id,
        "source": HOST_SOURCE,
        "severity": severity,
        "status_filter": status_filter,
        "search": f"%{search}%" if search else None,
    }


@router.get("/vulnerabilities")
async def list_host_vulnerabilities(
    severity: str | None = None,
    status_filter: str | None = None,
    search: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_permission("cloud:findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Host package findings that exist, with the count of everything matching, not just this page."""
    base = _params(current_user.tenant_id, severity, status_filter, search)
    total = (await db.execute(text(_COUNT_SQL), base)).scalar_one()
    rows = await db.execute(text(_LIST_SQL), {**base, "limit": limit, "offset": offset})
    findings = [_row_to_out(r) for r in rows]
    return {
        "count": total,
        "returned": len(findings),
        "limit": limit,
        "offset": offset,
        "source": HOST_SOURCE,
        "basis": HOST_BASIS,
        "findings": findings,
    }


@router.get("/summary")
async def host_vulnerability_summary(
    current_user: CurrentUser = Depends(require_permission("cloud:findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Counts over the whole host package estate, plus what this platform does not measure."""
    row = (
        await db.execute(
            text(_SUMMARY_SQL), {"tenant_id": current_user.tenant_id, "source": HOST_SOURCE}
        )
    ).one()._mapping
    return {
        "source": HOST_SOURCE,
        "basis": HOST_BASIS,
        "total": row["total"],
        "open": row["open"],
        "resolved": row["resolved"],
        "by_severity_open": {
            "critical": row["open_critical"],
            "high": row["open_high"],
            "medium": row["open_medium"],
            "low": row["open_low"],
        },
        "kev_listed": row["kev_listed"],
        "packages": row["packages"],
        "newest": _iso(row["newest"]),
        "oldest": _iso(row["oldest"]),
        # Named absences, so a page can state them instead of printing a zero. There is no vm_findings or
        # vm_scans table on this platform, so no instance-level figure can be produced from anything.
        "not_measured": {
            "instances_scanned": "no VM or endpoint scan store exists on this platform; packages are read from the API virtualenv",
            "endpoint_agents": "no endpoint agent reports to this platform",
        },
    }
