"""Age-policy escalation: a real engine existed as a cron script, and the UI's button called nothing.

Measured 22 Nov 2026, before writing this:

    scripts/ops/escalate_stale_findings.py      128 lines, run by cron, policy per severity
    findings WHERE status='open'                849 rows (330 high, 513 medium, ...)
    /executive/risk-score                       already reports 28 stale findings
    routes mentioning escalation                0
    functions.invoke("gdsAutoAssignFindings")   1 routed site, refused, on AssignmentRulesPage

So the capability was real and measured - the executive score has been counting stale findings all along - but the
only caller was a CLI. The page's "escalate past the 3-day triage limit" button asked a refused function, and its
wording was wrong too: the policy is per severity (critical 24h, high 168h, medium 720h, low 2160h, info 4320h),
never a flat three days.

This module serves that engine over HTTP without copying it. POLICY_HOURS and band_for are IMPORTED from the script
by file path, so there is exactly one definition of the policy in the platform and a change to the cron job changes
the route. The write path mirrors the script's: raw_data.escalation records the band, the policy and the real age, and
one notification is raised per finding and band, skipped when that band is already recorded.

Read by default. `apply` must be true to write, because a GET-shaped preview is what the page shows before the button
is pressed, and a click that mutates the estate should be the click that says so.
"""

from __future__ import annotations

import functools
import importlib.util
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/findings", tags=["findings-escalation"])

#: The cron script is the source of truth for the policy. Imported, never re-typed.
POLICY_SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "ops" / "escalate_stale_findings.py"

#: The accountable write. Granted to platform_owner by migration 059; admin holds the wildcard.
WRITE_PERMISSION = "findings:escalate"

_OPEN_SQL = """
    SELECT id,
           severity,
           title,
           detected_at,
           extract(epoch FROM (now() - detected_at)) / 3600.0 AS age_hours,
           raw_data -> 'escalation' ->> 'band' AS prior_band
      FROM security_findings
     WHERE tenant_id = :tenant_id
       AND status = 'open'
     ORDER BY detected_at
"""

_NOTIFY_USER_SQL = """
    SELECT id FROM users WHERE tenant_id = :tenant_id ORDER BY created_at LIMIT 1
"""

_RECORD_SQL = """
    UPDATE security_findings
       SET raw_data = coalesce(raw_data, '{}'::jsonb) || jsonb_build_object(
             'escalation', jsonb_build_object(
               'at', now()::text,
               'band', :band,
               'policy_hours', :policy,
               'age_hours', round(cast(:age AS numeric), 1),
               'note', 'open past the age policy for its severity'))
     WHERE id = :finding_id
       AND tenant_id = :tenant_id
"""

_NOTIFICATION_SQL = """
    INSERT INTO notifications (id, tenant_id, user_id, type, message, severity, requires_ack, escalation_level, created_at)
    VALUES (gen_random_uuid(), :tenant_id, :user_id, 'sla_escalation', :message, :severity, TRUE, 0, now())
"""


class EscalationRequest(BaseModel):
    #: False is the default on purpose: previewing the estate must not change it.
    apply: bool = False


@functools.lru_cache(maxsize=1)
def policy():
    """POLICY_HOURS and band_for, loaded from the cron script so both callers share one policy."""
    if not POLICY_SCRIPT.is_file():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"the escalation policy script is missing at {POLICY_SCRIPT}",
        )
    spec = importlib.util.spec_from_file_location("_gds_escalation_policy", POLICY_SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _require_write(current_user: CurrentUser) -> None:
    """Mirror of require_permission's wildcard rule, for the apply half of a route that also reads."""
    if WRITE_PERMISSION in current_user.permissions or "*" in current_user.permissions:
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, f"Missing permission: {WRITE_PERMISSION}")


def _iso(value):
    return value.isoformat() if isinstance(value, datetime) else value


def _plan(rows, mod) -> list[dict]:
    """Rows past their severity policy whose band is not already recorded."""
    plan = []
    for row in rows:
        m = row._mapping
        severity = (m["severity"] or "").lower()
        hours = mod.POLICY_HOURS.get(severity)
        if not hours:
            continue
        age = float(m["age_hours"] or 0.0)
        band = mod.band_for(age, hours)
        if band is None:
            continue
        if m["prior_band"] == band:
            continue  # already escalated at this level; the script makes the same skip
        plan.append({
            "finding_id": str(m["id"]),
            "severity": m["severity"],
            "title": m["title"],
            "age_hours": round(age, 1),
            "policy_hours": hours,
            "band": band,
            "detected_at": _iso(m["detected_at"]),
        })
    return plan


@router.post("/escalate-stale")
async def escalate_stale(
    body: EscalationRequest | None = None,
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Evaluate the age policy over open findings, and write only when apply is true."""
    mod = policy()
    apply = bool(body.apply) if body else False
    if apply:
        _require_write(current_user)

    params = {"tenant_id": current_user.tenant_id}
    rows = (await db.execute(text(_OPEN_SQL), params)).fetchall()
    plan = _plan(rows, mod)

    by_band: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    for item in plan:
        by_band[item["band"]] = by_band.get(item["band"], 0) + 1
        by_severity[(item["severity"] or "unknown")] = by_severity.get((item["severity"] or "unknown"), 0) + 1

    escalated = 0
    notifications = 0
    if apply and plan:
        user_id = (await db.execute(text(_NOTIFY_USER_SQL), params)).scalar_one_or_none()
        if user_id is None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "no user on this tenant to notify, so nothing was written",
            )
        for item in plan:
            await db.execute(text(_RECORD_SQL), {
                "tenant_id": current_user.tenant_id,
                "finding_id": item["finding_id"],
                "band": item["band"],
                "policy": item["policy_hours"],
                "age": item["age_hours"],
            })
            await db.execute(text(_NOTIFICATION_SQL), {
                "tenant_id": current_user.tenant_id,
                "user_id": user_id,
                "message": (f"[{item['band'].upper()}] {item['severity']} finding open "
                            f"{item['age_hours']:.0f}h, policy {item['policy_hours']}h: {item['title'][:120]}"),
                "severity": item["severity"],
            })
            escalated += 1
            notifications += 1
        await db.commit()

    oldest = min((r._mapping["detected_at"] for r in rows), default=None)
    return {
        "checked": len(rows),
        "stale": len(plan),
        "applied": apply,
        "escalated": escalated,
        "notifications_raised": notifications,
        "by_band": by_band,
        "by_severity": by_severity,
        "policy_hours": mod.POLICY_HOURS,
        "oldest_open_detected_at": _iso(oldest),
        "preview": plan[:10],
        # No Slack send happens here: delivery of an alert is the webhook's job, and the browser must not hold it.
        "slack_delivered": False,
        "delivery": "in-app notifications only; this route sends no Slack message",
        "basis": ("security_findings rows with status='open', age measured from detected_at, policy imported from "
                  "scripts/ops/escalate_stale_findings.py"),
    }
