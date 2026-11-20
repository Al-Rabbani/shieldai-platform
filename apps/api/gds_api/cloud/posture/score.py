"""Cloud security score, computed from real posture evaluations.

19 Nov 2026: no code in this platform computed a cloud score at all. The dashboard's cloud_score
(62) was a stored number with no producer behind it, last written 1 August. This module derives the
score from the evaluations that actually ran, and returns the inputs it used so the number can be
audited rather than trusted.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.models import CloudPolicyEvaluation, CloudPostureEvaluationRun

# A failing control's penalty by severity. Deliberately blunt and documented: the score is a
# summary of how many controls fail, weighted by how much each failure matters.
_PENALTY = {"critical": 25, "high": 15, "medium": 8, "low": 3, "info": 0}


def grade_for(score: float) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


async def compute_cloud_score(
    db: AsyncSession, *, tenant_id: uuid.UUID, environment_id: uuid.UUID | None = None,
    provider: str | None = None
) -> dict[str, Any]:
    """Score the tenant's (or one environment's) most recent completed evaluation."""
    run_query = select(CloudPostureEvaluationRun).where(
        CloudPostureEvaluationRun.tenant_id == tenant_id,
        CloudPostureEvaluationRun.status == "completed",
    )
    if environment_id is not None:
        run_query = run_query.where(CloudPostureEvaluationRun.environment_id == environment_id)
    if provider:
        run_query = run_query.where(CloudPostureEvaluationRun.provider == provider)
    run = (
        await db.execute(run_query.order_by(CloudPostureEvaluationRun.created_at.desc()).limit(1))
    ).scalars().first()

    if run is None:
        if provider:
            return {
                "status": "no_run",
                "provider": provider,
                "score": None,
                "grade": None,
                "detail": "no completed evaluation exists for this provider; another provider run is never substituted",
            }
        return {
            "status": "unavailable",
            "score": None,
            "grade": None,
            "detail": "no completed cloud posture evaluation exists for this tenant",
        }

    failing = (
        await db.execute(
            select(CloudPolicyEvaluation).where(
                CloudPolicyEvaluation.tenant_id == tenant_id,
                CloudPolicyEvaluation.evaluation_run_id == run.id,
                CloudPolicyEvaluation.result == "fail",
            )
        )
    ).scalars().all()

    # One penalty per distinct failing control, so the same control failing on 40 assets is one
    # control failure, not forty. The affected asset count is reported separately.
    by_policy: dict[str, dict[str, Any]] = {}
    for record in failing:
        entry = by_policy.setdefault(
            record.policy_id,
            {
                "policy_id": record.policy_id,
                "severity": record.severity,
                "assets_affected": 0,
                "explanation": None,
            },
        )
        entry["assets_affected"] += 1
        if entry["explanation"] is None:
            entry["explanation"] = record.explanation

    penalty = sum(_PENALTY.get(str(e["severity"]).lower(), 0) for e in by_policy.values())
    score = float(max(0, 100 - penalty))
    evaluated = int(run.passed_count or 0) + int(run.failed_count or 0)
    pass_rate = round((int(run.passed_count or 0) / evaluated) * 100, 1) if evaluated else None

    return {
        "status": "computed",
        "score": score,
        "grade": grade_for(score),
        "penalty": penalty,
        "failing_controls": sorted(
            by_policy.values(), key=lambda e: _PENALTY.get(str(e["severity"]).lower(), 0), reverse=True
        ),
        "inputs": {
            "evaluation_run_id": str(run.id),
            "environment_id": str(run.environment_id),
            "run_completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "assets_considered": run.assets_considered,
            "policies_considered": run.policies_considered,
            "evaluations_attempted": run.evaluations_attempted,
            "passed": run.passed_count,
            "failed": run.failed_count,
            "not_applicable": run.not_applicable_count,
            "error_count": run.error_count,
            "control_pass_rate_pct": pass_rate,
        },
        "method": (
            "100 minus the sum of severity penalties (critical 25, high 15, medium 8, low 3) for "
            "each distinct failing control in the most recent completed evaluation"
        ),
    }
