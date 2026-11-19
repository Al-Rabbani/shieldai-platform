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
    """Per-framework compliance position, with coverage stated alongside the score.

    The score is deliberately NOT "percent of the framework compliant". It is the pass rate over
    controls that were actually assessed, and coverage_pct sits next to it because a 100% score over
    7 assessed controls out of 58 is not a compliant framework. Manual rows carry no evidence and are
    counted separately rather than being allowed to lift the score.
    """
    fw_rows = (await db.execute(text(
        "SELECT framework_key, name, version, official_control_count "
        "FROM compliance_frameworks ORDER BY framework_key"
    ))).mappings().all()

    counts = (await db.execute(text(
        "SELECT framework, "
        "COUNT(*) FILTER (WHERE verdict_source = 'automated') AS automated, "
        "COUNT(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) = 'pass') AS passing, "
        "COUNT(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) = 'fail') AS failing, "
        "COUNT(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) NOT IN ('pass','fail')) AS not_tested, "
        "COUNT(*) FILTER (WHERE verdict_source = 'manual') AS manual, "
        "MAX(assessed_at) AS last_assessed "
        "FROM compliance_assessments GROUP BY framework"
    ))).mappings().all()
    by_fw = {r["framework"]: r for r in counts}

    frameworks = []
    tot_assessed = tot_pass = tot_fail = 0
    for f in fw_rows:
        r = by_fw.get(f["framework_key"])
        passing = int(r["passing"]) if r else 0
        failing = int(r["failing"]) if r else 0
        not_tested = int(r["not_tested"]) if r else 0
        assessed = passing + failing
        official = int(f["official_control_count"] or 0)
        tot_assessed += assessed
        tot_pass += passing
        tot_fail += failing
        frameworks.append({
            "framework": f["framework_key"],
            "name": f["name"],
            "version": f["version"],
            "official_control_count": official,
            "catalogued": (passing + failing + not_tested),
            "assessed": assessed,
            "passing": passing,
            "failing": failing,
            "not_tested": not_tested,
            "manual_unevidenced": int(r["manual"]) if r else 0,
            "coverage_pct": round(100.0 * assessed / official, 1) if official else None,
            "score_over_assessed": round(100.0 * passing / assessed, 1) if assessed else None,
            "last_assessed": r["last_assessed"].isoformat() if r and r["last_assessed"] else None,
        })

    return {
        "score_over_assessed": round(100.0 * tot_pass / tot_assessed, 1) if tot_assessed else None,
        "total_assessed": tot_assessed,
        "passing": tot_pass,
        "failing": tot_fail,
        "frameworks": frameworks,
        "score_basis": "pass rate over controls that were actually assessed; not a percentage of the framework",
        "tenant_scoped": False,
        "note": TENANT_SCOPE_NOTE,
    }


@router.get("/controls")
async def list_controls(
    framework: str | None = None,
    verdict: str | None = None,
    limit: int = 200,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Control-level verdicts with the observed facts behind each one."""
    clauses, params = [], {"limit": max(1, min(limit, 500))}
    if framework:
        clauses.append("c.framework_key = :fw")
        params["fw"] = framework
    if verdict:
        clauses.append("a.status = :v")
        params["v"] = verdict
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    rows = (await db.execute(text(
        "SELECT c.framework_key, c.control_ref, c.title, c.category, c.check_key, c.severity, "
        "c.mapping_basis, a.status, a.collector, a.observed, a.evidence_sha, a.assessed_at "
        "FROM compliance_controls c "
        "LEFT JOIN compliance_assessments a "
        "  ON a.framework = c.framework_key AND a.control_id = c.control_ref "
        "  AND a.verdict_source = 'automated' "
        f"{where} ORDER BY c.framework_key, c.control_ref LIMIT :limit"
    ), params)).mappings().all()

    return {
        "controls": [{
            "framework": r["framework_key"],
            "control_ref": r["control_ref"],
            "title": r["title"],
            "category": r["category"],
            "severity": r["severity"],
            "check_key": r["check_key"],
            "mapping_basis": r["mapping_basis"],
            "verdict": r["status"],
            "collector": r["collector"],
            "observed": r["observed"],
            "evidence_sha": r["evidence_sha"],
            "assessed_at": r["assessed_at"].isoformat() if r["assessed_at"] else None,
        } for r in rows],
        "count": len(rows),
        "note": "verdict is not_tested when no automated check exists or the check could not collect facts",
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
