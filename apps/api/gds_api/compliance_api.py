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


def coverage_of(assessed: int, applicable: int) -> float | None:
    """Pure helper, unit tested. Coverage divides by what applies, not by the framework's total size.

    A requirement excluded by an approved scope determination is not an untested one. Dividing by the full official
    count would report a framework that has honestly excluded 11 of its 12 requirements as 8% covered, which reads as
    neglect rather than as a scope decision. Returning None when nothing applies keeps a division by zero out of the
    response instead of inventing a percentage.
    """
    if not applicable:
        return None
    return round(100.0 * assessed / applicable, 1)


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
    # UNION of both sources. Listing only compliance_frameworks silently dropped four frameworks whose verdicts
    # exist but whose catalogue row does not: measured 20 Nov 2026, compliance_assessments held 18 manual rows for
    # iso27001, nist_csf, pci_dss and soc2, and none of those keys appeared anywhere on the compliance surface. A
    # verdict that is not shown is indistinguishable from a verdict that was never taken.
    fw_rows = (await db.execute(text(
        "SELECT f.framework_key, f.name, f.version, f.official_control_count, f.jurisdiction, true AS catalogued "
        "FROM compliance_frameworks f "
        "UNION ALL "
        "SELECT DISTINCT a.framework AS framework_key, a.framework AS name, NULL::varchar AS version, "
        "       NULL::integer AS official_control_count, NULL::varchar AS jurisdiction, false AS catalogued "
        "FROM compliance_assessments a "
        "WHERE a.framework NOT IN (SELECT framework_key FROM compliance_frameworks) "
        "ORDER BY framework_key"
    ))).mappings().all()

    counts = (await db.execute(text(
        "SELECT framework, "
        "COUNT(*) FILTER (WHERE verdict_source = 'automated') AS automated, "
        "COUNT(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) = 'pass') AS passing, "
        "COUNT(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) = 'fail') AS failing, "
        "COUNT(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) NOT IN ('pass','fail')) AS not_tested, "
        "COUNT(*) FILTER (WHERE verdict_source = 'determination') AS not_applicable, "
        "COUNT(*) FILTER (WHERE verdict_source = 'manual') AS manual, "
        "MAX(assessed_at) AS last_assessed "
        "FROM compliance_assessments GROUP BY framework"
    ))).mappings().all()
    by_fw = {r["framework"]: r for r in counts}

    # A determination says what a framework applies to. It is reported beside the counts because "not applicable"
    # and "not tested" are different answers and a reader must be able to tell which one they are looking at.
    determinations = (await db.execute(text(
        "SELECT framework_key, determination_ref, status, cde_defined, saq_track, approved_by, approved_at, "
        "review_due_at, jsonb_array_length(applicable_refs) AS applicable_refs, "
        "jsonb_array_length(not_applicable_refs) AS not_applicable_refs, caveats "
        "FROM compliance_scope_determinations WHERE status = 'approved'"
    ))).mappings().all()
    det_by_fw = {d["framework_key"]: d for d in determinations}

    frameworks = []
    tot_assessed = tot_pass = tot_fail = tot_manual = 0
    for f in fw_rows:
        r = by_fw.get(f["framework_key"])
        passing = int(r["passing"]) if r else 0
        failing = int(r["failing"]) if r else 0
        not_tested = int(r["not_tested"]) if r else 0
        not_applicable = int(r["not_applicable"]) if r else 0
        assessed = passing + failing
        official = int(f["official_control_count"] or 0)
        manual = int(r["manual"]) if r else 0
        # Coverage divides by what applies. A requirement excluded by a written determination is not an untested
        # one, and dividing by the full official count would penalise a framework for being out of scope.
        applicable = max(0, official - not_applicable) if official else 0
        det = det_by_fw.get(f["framework_key"])
        tot_assessed += assessed
        tot_pass += passing
        tot_fail += failing
        tot_manual += manual
        frameworks.append({
            "framework": f["framework_key"],
            "name": f["name"],
            "version": f["version"],
            "official_control_count": official or None,
            # Which legal order this framework binds in. Stated, never inferred by the browser.
            "jurisdiction": f["jurisdiction"],
            # True only when the framework has a catalogue row, so its size is known. An uncatalogued framework can
            # report verdicts but never a coverage percentage - dividing by an unknown total is how a fabricated
            # 0% or 100% gets into a board pack.
            "catalogued": bool(f["catalogued"]),
            "control_rows": (passing + failing + not_tested + not_applicable),
            "assessed": assessed,
            "passing": passing,
            "failing": failing,
            "not_tested": not_tested,
            # Excluded from scope by an approved determination, with the record that decided it.
            "not_applicable": not_applicable,
            "applicable_count": applicable or None,
            "manual_unevidenced": manual,
            "coverage_pct": coverage_of(assessed, applicable),
            "score_over_assessed": round(100.0 * passing / assessed, 1) if assessed else None,
            "scope_determination": ({
                "determination_ref": det["determination_ref"],
                "cde_defined": det["cde_defined"],
                "saq_track": det["saq_track"],
                "applicable_refs": det["applicable_refs"],
                "not_applicable_refs": det["not_applicable_refs"],
                "approved_by": det["approved_by"],
                "approved_at": det["approved_at"].isoformat() if det["approved_at"] else None,
                "review_due_at": det["review_due_at"].isoformat() if det["review_due_at"] else None,
                "caveats": det["caveats"],
            } if det else None),
            "last_assessed": r["last_assessed"].isoformat() if r and r["last_assessed"] else None,
        })

    return {
        "score_over_assessed": round(100.0 * tot_pass / tot_assessed, 1) if tot_assessed else None,
        "total_assessed": tot_assessed,
        "passing": tot_pass,
        "failing": tot_fail,
        "frameworks": frameworks,
        # Manual verdicts carry no evidence. They are excluded from the score on purpose and reported here so the
        # exclusion is visible rather than silent.
        "manual_unevidenced": tot_manual,
        "score_basis": "pass rate over controls that were actually assessed; not a percentage of the framework",
        "coverage_basis": "coverage is assessed controls divided by APPLICABLE controls: the framework's official "
                          "count minus any requirement excluded by an approved scope determination. A framework with "
                          "no determination has nothing excluded. A requirement excluded by determination is reported "
                          "as not_applicable, which is not the same as untested",
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
        "c.mapping_basis, a.status, a.collector, a.observed, a.evidence_sha, a.assessed_at, a.verdict_source "
        "FROM compliance_controls c "
        "LEFT JOIN compliance_assessments a "
        "  ON a.framework = c.framework_key AND a.control_id = c.control_ref "
        "  AND a.verdict_source IN ('automated', 'determination') "
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
            # automated = a collector measured it; determination = a written scope decision excluded it. Without
            # this a reader cannot tell "nobody tested it" from "it does not apply here".
            "verdict_source": r["verdict_source"],
            "collector": r["collector"],
            "observed": r["observed"],
            "evidence_sha": r["evidence_sha"],
            "assessed_at": r["assessed_at"].isoformat() if r["assessed_at"] else None,
        } for r in rows],
        "count": len(rows),
        "note": "verdict is not_tested when no automated check exists or the check could not collect facts; "
                "not_applicable means an approved scope determination excluded the control and names it in observed",
    }


@router.get("/determinations")
async def list_determinations(
    framework: str | None = Query(None),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """The written scope decisions behind applicability, with the evidence each one rests on.

    A framework that reports not_applicable without this record would be asking for trust. This returns the whole
    determination: what was measured, what was decided, who approved it, when it expires and what could void it.
    """
    clauses, params = [], {}
    if framework:
        clauses.append("framework_key = :fw")
        params["fw"] = framework
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = (await db.execute(text(
        "SELECT framework_key, determination_ref, status, cde_defined, cde_summary, chd_stored, chd_processed, "
        "chd_transmitted, saq_track, systems_in_scope, systems_out_of_scope, tpsp, applicable_refs, "
        "not_applicable_refs, evidence, caveats, determined_by, determined_at, approved_by, approved_at, "
        "approval_basis, review_due_at, superseded_by "
        f"FROM compliance_scope_determinations {where} "
        "ORDER BY framework_key, determined_at DESC"), params)).mappings().all()
    return {
        "count": len(rows),
        "determinations": [{
            "framework": r["framework_key"],
            "determination_ref": r["determination_ref"],
            "status": r["status"],
            "cde_defined": r["cde_defined"],
            "cde_summary": r["cde_summary"],
            "chd_stored": r["chd_stored"],
            "chd_processed": r["chd_processed"],
            "chd_transmitted": r["chd_transmitted"],
            "saq_track": r["saq_track"],
            "systems_in_scope": r["systems_in_scope"],
            "systems_out_of_scope": r["systems_out_of_scope"],
            "tpsp": r["tpsp"],
            "applicable_refs": r["applicable_refs"],
            "not_applicable_refs": r["not_applicable_refs"],
            "evidence": r["evidence"],
            "caveats": r["caveats"],
            "determined_by": r["determined_by"],
            "determined_at": r["determined_at"].isoformat() if r["determined_at"] else None,
            "approved_by": r["approved_by"],
            "approved_at": r["approved_at"].isoformat() if r["approved_at"] else None,
            "approval_basis": r["approval_basis"],
            "review_due_at": r["review_due_at"].isoformat() if r["review_due_at"] else None,
            "superseded_by": str(r["superseded_by"]) if r["superseded_by"] else None,
        } for r in rows],
        "note": "not_applicable verdicts are only valid where a determination listed here is approved; the evidence "
                "array is what the decision was based on, and caveats names what it does not cover",
        "tenant_scoped": False,
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
