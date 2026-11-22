"""Scan activity: what is scheduled, when it last ran, and what is actually running.

The dashboard's "Active Scans" bar showed ten pills reading "⏳ — Queued" and one "✗ — Failed". Measurement first,
22 Nov 2026:

    missions            195 rows: completed 155, failed 20, cancelled 20, running 0
    scan_schedules        6 rows, all status 'active', all last_run_at 22 Nov 04:30-04:47
    cloud_discovery_jobs 24 rows, all 'completed'
    scan_jobs           does not exist. No such table, at any point.

The page read `base44.entities.ScanJob`, which the adapter pointed at /missions, so ten agent missions arrived in a
scan bar. ScanStatusBar labels `running` and `complete` and `failed`, and everything else falls through to a
"Queued" pill - so nine COMPLETED or CANCELLED missions were drawn as queued work and one failed mission was drawn
as a failed scan. The names were blank because missions have `goal`, not `repo_name`/`scan_type`.

There is no scan queue on this platform. Scans are cron-driven scripts that stamp their schedule row when they
finish (scripts/ops/scan_schedule_record.py), so between runs nothing is queued and nothing is running. This route
answers from the store that does exist and says plainly that the queue does not:

  * each schedule with its real last_run_at, next_run_at, interval, run count and last error;
  * a derived state - scheduled, overdue, never_run or disabled - computed from those timestamps, not stored;
  * counts over those states;
  * cloud discovery jobs summarised separately, because those are the only rows that record a start and an end.

Tenant-scoped: scan_schedules is FORCE RLS, so the predicate is explicit as well as enforced.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/scans", tags=["scans"])

#: How far past its next run a schedule may fall before it is called overdue. One missed interval is a late run;
#: the tolerance exists so a scan that starts a minute after its slot is not reported as broken.
OVERDUE_GRACE_MINUTES = 5


def _state(status: str | None, last_run_at: datetime | None, next_run_at: datetime | None,
           now: datetime) -> tuple[str, int | None]:
    """Derived, never stored. Returns (state, minutes_overdue)."""
    if (status or "").lower() != "active":
        return "disabled", None
    if last_run_at is None:
        return "never_run", None
    if next_run_at is None:
        return "scheduled", None
    overdue = int((now - next_run_at).total_seconds() // 60)
    if overdue > OVERDUE_GRACE_MINUTES:
        return "overdue", overdue
    return "scheduled", None


@router.get("/activity")
async def scan_activity(
    user: CurrentUser = Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows = (await db.execute(text("""
        SELECT id::text                AS id,
               name,
               monitor_type,
               interval_minutes,
               status,
               last_run_at,
               next_run_at,
               last_run_findings,
               total_runs,
               last_error
          FROM scan_schedules
         ORDER BY name
    """))).mappings().all()

    now = datetime.now(timezone.utc)
    schedules = []
    counts = {"total": 0, "scheduled": 0, "overdue": 0, "never_run": 0, "disabled": 0}
    for row in rows:
        state, overdue = _state(row["status"], row["last_run_at"], row["next_run_at"], now)
        counts["total"] += 1
        counts[state] = counts.get(state, 0) + 1
        schedules.append({
            "id": row["id"],
            "name": row["name"],
            "monitor_type": row["monitor_type"],
            "interval_minutes": row["interval_minutes"],
            "status": row["status"],
            "state": state,
            "minutes_overdue": overdue,
            "last_run_at": row["last_run_at"].isoformat() if row["last_run_at"] else None,
            "next_run_at": row["next_run_at"].isoformat() if row["next_run_at"] else None,
            "last_run_findings": row["last_run_findings"],
            "total_runs": row["total_runs"],
            "last_error": row["last_error"],
        })

    discovery = (await db.execute(text("""
        SELECT count(*)                                        AS total,
               count(*) FILTER (WHERE status = 'completed')     AS completed,
               count(*) FILTER (WHERE status = 'running')       AS running,
               count(*) FILTER (WHERE status = 'failed')        AS failed,
               max(completed_at)                                AS last_completed_at
          FROM cloud_discovery_jobs
    """))).mappings().one()

    return {
        "schedules": schedules,
        "counts": counts,
        "queue": {
            "exists": False,
            "running_now": 0,
            "note": ("scans are cron-driven scripts that stamp their schedule row on completion; the platform keeps "
                     "no job queue, so nothing is queued or running between runs"),
        },
        "discovery": {
            "total": int(discovery["total"]),
            "completed": int(discovery["completed"]),
            "running": int(discovery["running"]),
            "failed": int(discovery["failed"]),
            "last_completed_at": discovery["last_completed_at"].isoformat() if discovery["last_completed_at"] else None,
            "note": "cloud discovery jobs do record a start and an end, and are counted separately from scans",
        },
        "overdue_grace_minutes": OVERDUE_GRACE_MINUTES,
        "total_runs_basis": ("counts completed runs stamped by scripts/ops/scan_schedule_record.py; the writer did "
                             "not increment this before 22 Nov 2026, so a row's count starts from the fix rather "
                             "than covering its whole history"),
        "note": ("state is derived from last_run_at and next_run_at; nothing here is stored or defaulted. A schedule "
                 "that has never run says never_run rather than showing a zero count"),
    }
