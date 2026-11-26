"""The one way to stamp a scanner's schedule row.

WHY THIS MODULE EXISTS. On 26 Nov 2026 scan_schedules held 46 rows for 17 scanners: "Estate sweep: nikto" alone had
eight. run_estate_sweep.py wrote `INSERT ... ON CONFLICT DO NOTHING` with NO conflict target against a table that had no
unique constraint, so the clause could never fire - every run inserted a row, and the UPDATE after it matched by name
and therefore incremented total_runs on every duplicate. Counters split and inflated; and because the "scanner silent"
alert reads this table, a stale duplicate could make a live scanner look dead.

Three writers had three different ideas of how to record a run. They now all call stamp_schedule(), which upserts on
(tenant_id, name) - enforced by uq_scan_schedules_tenant_name - so a scanner has exactly one row no matter how many
scripts report on it.
"""
from __future__ import annotations

import datetime as dt
from typing import Any

from sqlalchemy import text


async def stamp_schedule(
    db,
    tenant: str,
    name: str,
    monitor_type: str,
    interval_minutes: int,
    findings: int = 0,
    error: str | None = None,
    when: dt.datetime | None = None,
) -> None:
    """Record one completed run against a scanner's single schedule row.

    The caller must already have bound the tenant on this session (set_config), because scan_schedules is RLS-bound.
    `findings` is what the run RECORDED, not what it saw - a run that saw six findings and deduped all six recorded
    zero, and saying otherwise would inflate the register's history.
    """
    moment = when or dt.datetime.now(dt.timezone.utc)
    await db.execute(
        text(
            "INSERT INTO scan_schedules (tenant_id, name, monitor_type, target_config, interval_minutes, "
            "auto_triage, auto_escalate, status, last_run_at, next_run_at, last_run_findings, total_runs, "
            "total_findings, last_error) "
            "VALUES (CAST(:tid AS uuid), :name, :mtype, '{}'::jsonb, :interval, true, false, 'active', "
            "CAST(:at AS timestamptz), CAST(:at AS timestamptz) + make_interval(mins => :interval), "
            ":new, 1, :new, :err) "
            "ON CONFLICT (tenant_id, name) DO UPDATE SET "
            "  last_run_at = CAST(:at AS timestamptz), "
            "  next_run_at = CAST(:at AS timestamptz) + make_interval(mins => scan_schedules.interval_minutes), "
            "  last_run_findings = :new, "
            "  total_runs = scan_schedules.total_runs + 1, "
            "  total_findings = scan_schedules.total_findings + :new, "
            "  last_error = :err, "
            "  updated_at = CAST(:at AS timestamptz)"
        ),
        {"tid": str(tenant), "name": name, "mtype": monitor_type, "interval": int(interval_minutes),
         "at": moment, "new": int(findings), "err": error},
    )


def schedule_name(scanner: str) -> str:
    """The canonical row name for a scanner, so two scripts reporting the same scanner land on one row."""
    return f"Estate sweep: {scanner}" if not scanner.startswith("Estate sweep:") else scanner


async def stamp_many(db, tenant: str, entries: list[dict[str, Any]], interval_minutes: int = 1440) -> None:
    for entry in entries:
        await stamp_schedule(
            db, tenant,
            name=entry["name"],
            monitor_type=entry.get("monitor_type", "estate_sweep"),
            interval_minutes=entry.get("interval_minutes", interval_minutes),
            findings=entry.get("findings", 0),
            error=entry.get("error"),
        )
