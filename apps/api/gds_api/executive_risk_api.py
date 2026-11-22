"""Step 14: the executive risk surface, computed from real findings.

Measured before writing. The routed Executive dashboard asks for ten sources that have no endpoint. The two
that looked closest are not what they seem:

  * GET /metrics/summary is a view over the Prometheus registry - request counts and latency, not posture.
  * GET /executive/report exports mission reports as documents, not a risk register.

So GlobalRiskScore and KPI were genuinely absent, and the dashboard tiles had nothing real behind them.

Everything here is derived from security_findings, and "open" means status = 'open', which is the same
definition the alert job uses, so the totals agree with the number the platform already prints rather than
inventing a second one.

THE SCORE IS A STATED POLICY, NOT AN INDUSTRY STANDARD. Every weight is a named constant below with its
threshold, so it can be read, argued with and changed in one place. It is not CVSS, not EPSS, and not a
vendor score. The platform previously carried "88/100 grade A" as a figure; that number was not produced by
any formula in this codebase and is not reproduced here. This is the first computed score.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/executive", tags=["executive"])

# --- the policy, in one place -------------------------------------------------------------------
# Each entry is (cap, threshold): the penalty is cap at the threshold and scales linearly below it.
CRITICAL_CAP, CRITICAL_AT = 25.0, 10
HIGH_CAP, HIGH_AT = 20.0, 50
KEV_CAP, KEV_AT = 15.0, 5
EXPLOIT_CAP, EXPLOIT_AT = 10.0, 20
STALE_CAP, STALE_AT = 10.0, 100
EXPOSURE_CAP, EXPOSURE_AT = 10.0, 50
FRESHNESS_BONUS = 5.0

# A finding is "high EPSS" at or above this probability of exploitation within 30 days.
HIGH_EPSS = 0.5
# A finding is stale when it has stayed open this long.
STALE_DAYS = 30

GRADES = ((90, "A"), (80, "B"), (70, "C"), (60, "D"))


def _penalty(value: int | float, cap: float, threshold: float) -> float:
    if threshold <= 0:
        return 0.0
    return cap * min(1.0, float(value) / float(threshold))


def _grade(score: float) -> str:
    for floor, letter in GRADES:
        if score >= floor:
            return letter
    return "F"


def score_from_counts(counts: dict[str, Any]) -> dict[str, Any]:
    """Pure: the whole score is a function of these counts, which is why it can be tested without a DB."""
    penalties = {
        "critical_volume": _penalty(counts.get("critical", 0), CRITICAL_CAP, CRITICAL_AT),
        "high_volume": _penalty(counts.get("high", 0), HIGH_CAP, HIGH_AT),
        "known_exploited": _penalty(counts.get("kev_open", 0), KEV_CAP, KEV_AT),
        "exploitable": _penalty(counts.get("high_epss", 0), EXPLOIT_CAP, EXPLOIT_AT),
        "stale_backlog": _penalty(counts.get("stale", 0), STALE_CAP, STALE_AT),
        "internet_exposed": _penalty(counts.get("internet_exposed", 0), EXPOSURE_CAP, EXPOSURE_AT),
    }
    new_7d = int(counts.get("new_7d") or 0)
    resolved_7d = int(counts.get("resolved_7d") or 0)
    bonus = FRESHNESS_BONUS if resolved_7d > new_7d else 0.0

    raw = 100.0 - sum(penalties.values()) + bonus
    score = max(0.0, min(100.0, raw))
    delta = resolved_7d - new_7d
    trend = "improving" if delta > 0 else ("worsening" if delta < 0 else "stable")

    return {
        "overall_score": round(score, 1),
        "grade": _grade(score),
        "trend": trend,
        "score_delta": delta,
        "penalties": {k: round(v, 1) for k, v in penalties.items()},
        "freshness_bonus": bonus,
        "policy": {
            "critical": {"cap": CRITICAL_CAP, "at": CRITICAL_AT},
            "high": {"cap": HIGH_CAP, "at": HIGH_AT},
            "known_exploited": {"cap": KEV_CAP, "at": KEV_AT},
            "exploitable": {"cap": EXPLOIT_CAP, "at": EXPLOIT_AT, "epss_at_or_above": HIGH_EPSS},
            "stale_backlog": {"cap": STALE_CAP, "at": STALE_AT, "days": STALE_DAYS},
            "internet_exposed": {"cap": EXPOSURE_CAP, "at": EXPOSURE_AT},
            "freshness_bonus": FRESHNESS_BONUS,
        },
    }


_COUNT_SQL = """
SELECT
  count(*) FILTER (WHERE status = 'open')                                        AS open_total,
  count(*) FILTER (WHERE status = 'open' AND severity = 'critical')              AS critical,
  count(*) FILTER (WHERE status = 'open' AND severity = 'high')                  AS high,
  count(*) FILTER (WHERE status = 'open' AND severity = 'medium')                AS medium,
  count(*) FILTER (WHERE status = 'open' AND severity = 'low')                   AS low,
  count(*) FILTER (WHERE status = 'open' AND kev_listed IS TRUE)                 AS kev_open,
  count(*) FILTER (WHERE status = 'open' AND epss >= :high_epss)                 AS high_epss,
  count(*) FILTER (WHERE status = 'open' AND exposure ILIKE '%internet%')        AS internet_exposed,
  count(*) FILTER (WHERE status = 'open'
                     AND detected_at < now() - make_interval(days => :stale_days)) AS stale,
  count(*) FILTER (WHERE detected_at >= now() - interval '7 days')               AS new_7d,
  count(*) FILTER (WHERE resolved_at >= now() - interval '7 days')               AS resolved_7d,
  count(*)                                                                       AS total,
  round(avg(extract(epoch FROM now() - detected_at) / 86400.0)
          FILTER (WHERE status = 'open')::numeric, 1)                            AS mean_age_days
FROM security_findings
"""

_WORST_SQL = """
SELECT id, title, severity, cve, cvss, epss, kev_listed, target, scanner, detected_at
FROM security_findings
WHERE status = 'open'
ORDER BY (kev_listed IS TRUE) DESC, cvss DESC NULLS LAST, epss DESC NULLS LAST, detected_at ASC
LIMIT :lim
"""


async def _bind(db, tenant_id) -> None:
    await db.execute(
        text("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": str(tenant_id)}
    )


@router.get("/risk-score")
async def executive_risk_score(
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db=Depends(get_db),
) -> dict[str, Any]:
    """The dashboard's GlobalRiskScore tile, from real open findings. Tenant-scoped by RLS and by bind."""
    await _bind(db, current_user.tenant_id)
    row = (
        await db.execute(
            text(_COUNT_SQL), {"high_epss": HIGH_EPSS, "stale_days": STALE_DAYS}
        )
    ).mappings().one()
    counts = {k: (int(v) if v is not None else 0) for k, v in row.items() if k != "mean_age_days"}
    counts["mean_age_days"] = float(row["mean_age_days"] or 0.0)

    scored = score_from_counts(counts)

    worst = (await db.execute(text(_WORST_SQL), {"lim": 10})).mappings().all()
    worst_findings = [
        {
            "id": w["id"],
            "title": w["title"],
            "severity": w["severity"],
            "cve_id": w["cve"],
            "cvss_score": float(w["cvss"]) if w["cvss"] is not None else None,
            "epss_score": float(w["epss"]) if w["epss"] is not None else None,
            "exploited_in_wild": bool(w["kev_listed"]),
            "asset_name": w["target"],
            "source_scanners": [w["scanner"]] if w["scanner"] else [],
        }
        for w in worst
    ]

    return {
        **scored,
        "counts": counts,
        "worst_findings": worst_findings,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
        "definition": {
            "open": "security_findings.status = 'open', the same definition the alert job uses",
            "score": "100 minus the penalties below, plus a freshness bonus, floored at 0 and capped at 100",
        },
    }


@router.get("/kpis")
async def executive_kpis(
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db=Depends(get_db),
) -> dict[str, Any]:
    """The dashboard's KPI tiles, each one a number the database can actually produce."""
    await _bind(db, current_user.tenant_id)
    row = (
        await db.execute(
            text(_COUNT_SQL), {"high_epss": HIGH_EPSS, "stale_days": STALE_DAYS}
        )
    ).mappings().one()

    def kpi(key, label, value, unit, target, direction, good):
        return {
            "key": key,
            "label": label,
            "value": value,
            "unit": unit,
            "target": target,
            "direction": direction,
            "status": "good" if good else "attention",
        }

    critical = int(row["critical"] or 0)
    high = int(row["high"] or 0)
    kev_open = int(row["kev_open"] or 0)
    stale = int(row["stale"] or 0)
    open_total = int(row["open_total"] or 0)
    resolved_7d = int(row["resolved_7d"] or 0)
    mean_age = float(row["mean_age_days"] or 0.0)

    return {
        "kpis": [
            kpi("open_findings", "Open findings", open_total, "findings", None, "down", open_total == 0),
            kpi("critical_open", "Open critical", critical, "findings", 0, "down", critical == 0),
            kpi("high_open", "Open high", high, "findings", 0, "down", high == 0),
            kpi("kev_open", "Known exploited, open", kev_open, "findings", 0, "down", kev_open == 0),
            kpi("stale_open", "Open longer than %d days" % STALE_DAYS, stale, "findings", 0, "down", stale == 0),
            kpi("mean_age", "Mean age of open findings", mean_age, "days", 30, "down", mean_age <= 30),
            kpi("resolved_7d", "Resolved in the last 7 days", resolved_7d, "findings", None, "up", resolved_7d > 0),
        ],
        "calculated_at": datetime.now(timezone.utc).isoformat(),
    }
