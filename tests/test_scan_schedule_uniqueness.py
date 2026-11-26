"""One schedule row per scanner, and a nightly scan whose silence can actually be seen.

MEASURED 26 Nov 2026: scan_schedules held 46 rows for 17 scanners - "Estate sweep: nikto" had eight. run_estate_sweep.py
wrote `INSERT ... ON CONFLICT DO NOTHING` with NO conflict target against a table with no unique constraint, so the
clause never fired: every run inserted a row, and the UPDATE after it matched by name and bumped total_runs on all of
them. The counters were split and inflated, and because the "scanner silent" alert reads this table, a stale duplicate
could report a live scanner as dead. Separately the new gitleaks scan had NO schedule row at all, so a night that did
not run was invisible - the same class of gap the alert exists to close.
"""
import datetime as dt
import pathlib
import re

import pytest
from sqlalchemy import text

REPO = pathlib.Path("/opt/gds-os")


def _tenant() -> str:
    import os
    return os.environ["GDS_TENANT_ID"]


def test_the_database_refuses_a_second_row_for_the_same_scanner():
    import asyncio
    from gds_api.db import async_session_factory

    async def go():
        async with async_session_factory() as db:
            await db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": _tenant()})
            rows = await db.execute(text(
                "SELECT indexname FROM pg_indexes WHERE tablename='scan_schedules' AND indexdef ILIKE '%UNIQUE%'"))
            names = [r[0] for r in rows]
        return names

    names = asyncio.run(go())
    assert any("uq_scan_schedules_tenant_name" in n for n in names), \
        f"no unique index on (tenant_id, name), so ON CONFLICT has nothing to conflict with: {names}"


def test_stamping_twice_leaves_one_row_and_counts_both_runs():
    import asyncio
    from gds_api.db import async_session_factory
    from gds_api.scan_schedules import stamp_schedule

    name = "TEST scanner uniqueness probe"

    async def go():
        async with async_session_factory() as db:
            await db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": _tenant()})
            await db.execute(text("DELETE FROM scan_schedules WHERE name = :n"), {"n": name})
            await stamp_schedule(db, _tenant(), name, "probe", 60, findings=2)
            await stamp_schedule(db, _tenant(), name, "probe", 60, findings=3)
            rows = await db.execute(text(
                "SELECT count(*), max(total_runs), max(total_findings) FROM scan_schedules WHERE name = :n"),
                {"n": name})
            count, runs, findings = rows.first()
            await db.execute(text("DELETE FROM scan_schedules WHERE name = :n"), {"n": name})
            await db.commit()
        return count, runs, findings

    count, runs, findings = asyncio.run(go())
    assert count == 1, f"two stamps produced {count} rows"
    assert runs == 2, f"two stamps counted {runs} runs"
    assert findings == 5, f"findings did not accumulate: {findings}"


def test_no_scanner_has_duplicate_rows_right_now():
    import asyncio
    from gds_api.db import async_session_factory

    async def go():
        async with async_session_factory() as db:
            await db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": _tenant()})
            rows = await db.execute(text(
                "SELECT name, count(*) FROM scan_schedules GROUP BY name HAVING count(*) > 1"))
            return list(rows)

    assert asyncio.run(go()) == [], "duplicate schedule rows are back"


def _code_only(src: str) -> str:
    """Drop comment lines, so an explanation of the old bug is not read as the bug itself."""
    return "\n".join(ln for ln in src.splitlines() if not ln.lstrip().startswith("#"))


def test_the_sweep_uses_the_shared_upsert():
    src = _code_only((REPO / "apps/api/run_estate_sweep.py").read_text())
    assert "from gds_api.scan_schedules import stamp_schedule" in src
    assert "INSERT INTO scan_schedules" not in src, \
        "the sweep must not write the schedule table itself; ON CONFLICT DO NOTHING with no conflict target is " \
        "exactly what inserted a row per run"


def test_the_secrets_scan_registers_its_schedule():
    src = (REPO / "scripts/ops/secrets_scan.py").read_text()
    assert "stamp_schedule" in src, "a nightly scan with no schedule row is silent and invisible"
    assert '"secrets_scan"' in src
    cron = (REPO / "config/cron/root.crontab").read_text()
    assert "secrets_scan.py" in cron


def test_every_scheduled_ops_script_that_scans_registers_a_schedule():
    """The gap that keeps recurring: a script runs nightly and nothing can tell whether it ran."""
    cron = (REPO / "config/cron/root.crontab").read_text()
    scanners = ["secrets_scan.py", "run_estate_sweep.py", "run_deterministic_scan.py", "osv_check.py"]
    for script in scanners:
        assert script in cron, f"{script} is not scheduled"
    assert "stamp_schedule" in (REPO / "scripts/ops/secrets_scan.py").read_text()
    assert "scan_schedules" in (REPO / "apps/api/run_deterministic_scan.py").read_text()
    # the shell-driven watches delegate to one recorder; it must SAY when there is no row to stamp rather than
    # updating nothing and letting the scanner look covered
    assert "scan_schedule_record.py" in (REPO / "scripts/ops/osv_check.py").read_text()
    recorder = (REPO / "scripts/ops/scan_schedule_record.py").read_text()
    assert "no schedule row named" in recorder, "a recorder that matches zero rows must say so"


def test_the_migration_collapsed_totals_from_the_run_history():
    sql = (REPO / "migrations/security_isolation/m086.sql").read_text()
    assert "scan_runs" in sql, "totals must be recomputed from the run history, not summed across duplicates"
    assert "uq_scan_schedules_tenant_name" in sql
