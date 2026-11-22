"""The header's intelligence strip, composed from registers the platform keeps.

The Co-Pilot shell asks for platform_intel on every page load and rendered dashes, because the function it named does
not exist here. This answers the same question from security_findings and compliance_controls.

A zero in this payload is only clean when the register was actually read: cloud_open counts open findings whose scanner
or source is 'cspm', and no cloud-posture finding is stored in this register, so that zero is an absence. The basis
block says so in the payload rather than leaving a page to imply a clean cloud.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text

from gds_api.compliance_api import score_of
from gds_api.db import get_db
from gds_api.executive_risk_api import (
    HIGH_EPSS,
    STALE_DAYS,
    _COUNT_SQL,
    _bind,
    score_from_counts,
)
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/platform", tags=["platform"])

_INTEL_SQL = """
SELECT
    count(*) FILTER (WHERE status = 'open') AS open_total,
    count(*) FILTER (WHERE status = 'open' AND lower(severity) = 'critical') AS open_critical,
    count(*) FILTER (WHERE status = 'open' AND kev_listed) AS exploited_in_wild,
    count(*) FILTER (WHERE status = 'open' AND (scanner = 'cspm' OR source = 'cspm')) AS cloud_open,
    count(*) FILTER (WHERE status = 'open' AND lower(severity) = 'critical'
                       AND (scanner = 'cspm' OR source = 'cspm')) AS cloud_critical
FROM security_findings
"""

# Verdicts live in compliance_assessments, not compliance_controls: compliance_controls holds the catalogue and has no
# verdict_source column (measured after this route answered 500). Same predicates as GET /compliance/frameworks.
_CONTROL_SQL = """
SELECT
    count(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) = 'pass') AS passing,
    count(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) = 'fail') AS failing
FROM compliance_assessments
"""


@router.get("/intel")
async def platform_intel(
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db=Depends(get_db),
) -> dict[str, Any]:
    """The header strip: risk position, finding counts and the compliance pass rate."""
    await _bind(db, current_user.tenant_id)

    counts_row = (
        await db.execute(text(_COUNT_SQL), {"high_epss": HIGH_EPSS, "stale_days": STALE_DAYS})
    ).mappings().one()
    counts = {k: (int(v) if v is not None else 0) for k, v in counts_row.items() if k != "mean_age_days"}
    counts["mean_age_days"] = float(counts_row["mean_age_days"] or 0.0)
    scored = score_from_counts(counts)

    row = (await db.execute(text(_INTEL_SQL))).mappings().one()
    control = (await db.execute(text(_CONTROL_SQL))).mappings().one()
    passing = int(control["passing"] or 0)
    failing = int(control["failing"] or 0)

    open_total = int(row["open_total"] or 0)
    cloud_open = int(row["cloud_open"] or 0)
    open_critical = int(row["open_critical"] or 0)
    cloud_critical = int(row["cloud_critical"] or 0)

    return {
        "risk": {
            # score_from_counts names it overall_score; the shell reads risk.score.
            "score": scored.get("overall_score"),
            "grade": scored.get("grade"),
            "trend": scored.get("trend"),
            "score_delta": scored.get("score_delta"),
        },
        "defensive": {
            "cloud_open": cloud_open,
            "cloud_critical": cloud_critical,
            "vuln_total": open_total - cloud_open,
            "vuln_critical": open_critical - cloud_critical,
            "exploited_in_wild": int(row["exploited_in_wild"] or 0),
            "compliance_avg": score_of(passing, failing),
        },
        "basis": {
            "risk": "the same counts and scoring as GET /executive/risk-score",
            "vuln_total": "open security_findings that are not cloud-posture rows",
            "cloud_open": (
                "open security_findings whose scanner or source is 'cspm'. No cloud-posture finding is stored in this "
                "register, so this zero is an absence, not a clean cloud"
            ),
            "compliance_avg": (
                f"pass rate over assessed controls ({passing} passing, {failing} failing), the basis "
                "GET /compliance/frameworks uses; controls that were not tested do not lift it"
            ),
            "exploited_in_wild": "open findings with kev_listed",
        },
        "calculated_at": datetime.now(timezone.utc).isoformat(),
    }
