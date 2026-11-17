"""Read API for compliance posture.

Until now compliance existed only as numbers inside mission reports: the database holds 18
rows in compliance_assessments and the platform quotes 22.2% everywhere, but OpenAPI offered
no GET for it, so no client could show what the platform claims.

HONEST LIMIT, stated in every response: compliance_assessments has no tenant_id and no RLS.
It is a single global assessment set, so `tenant_scoped` is false. This endpoint therefore does
not pretend the figures are per-tenant. Partitioning compliance per tenant is a schema decision
(control status genuinely differs per customer) and is not faked here.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, get_current_user

router = APIRouter(prefix="/compliance", tags=["compliance"])

TENANT_SCOPE_NOTE = (
    "compliance_assessments is a global assessment set with no tenant_id or RLS; "
    "these figures are platform-wide, not per-tenant."
)


def score_of(passing: int, failing: int) -> float:
    """Pure helper, unit tested. Untested controls are excluded rather than counted as passes."""
    tested = passing + failing
    return round(100.0 * passing / tested, 1) if tested else 0.0


@router.get("/frameworks")
async def list_frameworks(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows = (await db.execute(text(
        "SELECT framework, "
        "COUNT(*) AS controls, "
        "COUNT(*) FILTER (WHERE lower(status) = 'pass') AS passing, "
        "COUNT(*) FILTER (WHERE lower(status) = 'fail') AS failing, "
        "COUNT(*) FILTER (WHERE lower(status) NOT IN ('pass', 'fail')) AS not_tested, "
        "MAX(assessment_date) AS last_assessed "
        "FROM compliance_assessments GROUP BY framework ORDER BY framework"
    ))).mappings().all()

    frameworks = []
    total_controls = total_passing = total_failing = 0
    for r in rows:
        passing, failing = int(r["passing"]), int(r["failing"])
        total_controls += int(r["controls"])
        total_passing += passing
        total_failing += failing
        frameworks.append({
            "framework": r["framework"],
            "controls": int(r["controls"]),
            "passing": passing,
            "failing": failing,
            "not_tested": int(r["not_tested"]),
            "score": score_of(passing, failing),
            "last_assessed": r["last_assessed"].isoformat() if r["last_assessed"] else None,
        })

    return {
        "overall_score": score_of(total_passing, total_failing),
        "total_controls": total_controls,
        "passing": total_passing,
        "failing": total_failing,
        "frameworks": frameworks,
        "tenant_scoped": False,
        "note": TENANT_SCOPE_NOTE,
    }


@router.get("/assessments")
async def list_assessments(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    framework: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(200, ge=1, le=1000),
) -> dict:
    clauses, params = [], {"limit": limit}
    if framework:
        clauses.append("lower(framework) = lower(:framework)")
        params["framework"] = framework
    if status:
        clauses.append("lower(status) = lower(:status)")
        params["status"] = status
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = (await db.execute(text(
        "SELECT id, framework, control_id, control_name, status, severity, "
        "mapped_finding, assessment_date FROM compliance_assessments "
        f"{where} ORDER BY framework, control_id LIMIT :limit"), params)).mappings().all()
    return {
        "count": len(rows),
        "assessments": [{
            "id": str(r["id"]),
            "framework": r["framework"],
            "control_id": r["control_id"],
            "control_name": r["control_name"],
            "status": r["status"],
            "severity": r["severity"],
            "mapped_finding": r["mapped_finding"],
            "assessment_date": r["assessment_date"].isoformat() if r["assessment_date"] else None,
        } for r in rows],
        "tenant_scoped": False,
        "note": TENANT_SCOPE_NOTE,
    }
