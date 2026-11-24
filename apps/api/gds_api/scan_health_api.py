"""Scanner liveness — whether the estate is being watched, stated as a measured fact.

MEASURED BEFORE THIS (23 Nov 2026): the finding register had not moved since 19 Nov while the 6-hourly scan was in
fact running and writing `new=0 duplicate=0 failed=0 register 1002 -> 1002` three times a day. The only place that
was visible was /var/log/gds-deterministic-scan.log. From inside the product, a scanner that had died and an estate
that had changed nothing were indistinguishable, and the deterministic scan was not in scan_schedules, so the
existing "Scanner silent" alert could not fire for it either.

This route answers one question per scanner — when did it last run, did it write anything, and is it overdue — and
refuses to guess where it has no data. A scanner with no recorded run reports `never_run`, not a green tick.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/scan", tags=["scan"])

# A scanner is overdue at 1x its interval and silent at 2x. Silence is the dangerous state: one missed run is normal
# on a busy host, two in a row means nothing is watching and the register is stale, not quiet.
_OVERDUE_FACTOR = 1.0
_SILENT_FACTOR = 2.0


def _verdict(age_minutes: float | None, interval_minutes: int | None) -> str:
    if age_minutes is None:
        return "never_run"
    if not interval_minutes:
        return "unknown_interval"
    if age_minutes > interval_minutes * _SILENT_FACTOR:
        return "silent"
    if age_minutes > interval_minutes * _OVERDUE_FACTOR:
        return "overdue"
    return "alive"


@router.get("/health")
async def scan_health(
    now: datetime | None = None,
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db=Depends(get_db),
) -> dict:
    """Per-scanner liveness plus the register's own movement.

    Deliberately two independent measurements: the schedule table says what SHOULD be running and when it last
    completed; scan_runs says what each run actually produced. A schedule stamped by a runner that then wrote nothing
    is a different failure from a schedule that was never stamped, and collapsing the two would hide it.
    """
    tenant = str(current_user.tenant_id)
    await db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": tenant})
    now = now or datetime.now(timezone.utc)

    schedules = (await db.execute(text(
        """
        SELECT name, monitor_type, interval_minutes, last_run_at, next_run_at,
               last_run_findings, total_runs, total_findings, last_error, status
          FROM scan_schedules
         ORDER BY name
        """
    ))).mappings().all()

    runs = (await db.execute(text(
        """
        SELECT scanner, started_at, finished_at, duration_ms, targets, new_findings, duplicates, failed,
               register_before, register_after, outcome
          FROM scan_runs
         ORDER BY started_at DESC
         LIMIT 40
        """
    ))).mappings().all()

    by_scanner: dict[str, dict] = {}
    for row in runs:
        entry = by_scanner.setdefault(row["scanner"], {
            "scanner": row["scanner"],
            "runs_recorded": 0,
            "last_run_at": None,
            "last_outcome": None,
            "last_new_findings": None,
            "total_new_findings": 0,
        })
        entry["runs_recorded"] += 1
        entry["total_new_findings"] += row["new_findings"] or 0
        if entry["last_run_at"] is None:
            entry["last_run_at"] = row["started_at"]
            entry["last_outcome"] = row["outcome"]
            entry["last_new_findings"] = row["new_findings"]

    scanners = []
    for row in schedules:
        last_run = row["last_run_at"]
        age_minutes = None
        if last_run is not None:
            if last_run.tzinfo is None:
                last_run = last_run.replace(tzinfo=timezone.utc)
            age_minutes = round((now - last_run).total_seconds() / 60.0, 1)
        verdict = _verdict(age_minutes, row["interval_minutes"])
        recorded = by_scanner.get(row["name"]) or by_scanner.get(row["monitor_type"])
        scanners.append({
            "name": row["name"],
            "monitor_type": row["monitor_type"],
            "interval_minutes": row["interval_minutes"],
            "last_run_at": last_run.isoformat() if last_run else None,
            "next_run_at": row["next_run_at"].isoformat() if row["next_run_at"] else None,
            "age_minutes": age_minutes,
            "overdue_by_minutes": (
                round(age_minutes - row["interval_minutes"], 1)
                if age_minutes is not None and row["interval_minutes"] and verdict in ("overdue", "silent")
                else None
            ),
            "last_run_findings": row["last_run_findings"],
            "total_runs": row["total_runs"],
            "total_findings": row["total_findings"],
            "last_error": row["last_error"],
            "verdict": verdict,
            "run_history": recorded,
        })

    # critical_open is computed here rather than by a page counting a 500-row sample of the register: a page
    # length read as a total is how this platform has reported 487 where the truth was 849.
    register = (await db.execute(text(
        "SELECT count(*) AS total, "
        "count(*) FILTER (WHERE status = 'open') AS open, "
        "count(*) FILTER (WHERE status = 'open' AND severity = 'critical') AS critical_open "
        "FROM security_findings"
    ))).mappings().first()

    newest_finding = (await db.execute(text(
        "SELECT max(detected_at) AS newest FROM security_findings"
    ))).scalar()

    silent = [s["name"] for s in scanners if s["verdict"] in ("silent", "never_run")]
    overdue = [s["name"] for s in scanners if s["verdict"] == "overdue"]
    overall = "silent" if silent else ("overdue" if overdue else ("alive" if scanners else "no_schedules"))

    return {
        "verdict": overall,
        "scanners": scanners,
        "silent": silent,
        "overdue": overdue,
        "recent_runs": [
            {
                "scanner": r["scanner"],
                "started_at": r["started_at"].isoformat() if r["started_at"] else None,
                "duration_ms": r["duration_ms"],
                "targets": r["targets"],
                "new_findings": r["new_findings"],
                "duplicates": r["duplicates"],
                "failed": r["failed"],
                "register_before": r["register_before"],
                "register_after": r["register_after"],
                "outcome": r["outcome"],
            }
            for r in runs[:15]
        ],
        "register": {
            "total": register["total"] if register else None,
            "open": register["open"] if register else None,
            "critical_open": register["critical_open"] if register else None,
            "newest_finding": newest_finding.isoformat() if newest_finding else None,
        },
        "thresholds": {
            "overdue_at": f"{_OVERDUE_FACTOR}x the interval",
            "silent_at": f"{_SILENT_FACTOR}x the interval",
        },
        "note": (
            "Every figure here is a measurement. A scanner with no recorded run says never_run rather than showing a "
            "green tick, and the register's newest finding is reported as a date rather than assumed current. Runs "
            "are recorded from migration 076 onwards: a scanner that ran before that has a stamped schedule but no "
            "run history, and the two are reported separately on purpose."
        ),
    }
