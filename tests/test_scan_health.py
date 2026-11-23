"""Item 46: scanner liveness, pinned against the defect that made a live scanner look dead.

MEASURED BEFORE THIS: the 6-hourly scan ran at 00:00, 06:00 and 12:00 on 23 Nov and wrote
`new=0 duplicate=0 failed=0 register 1002 -> 1002` every time, but that fact lived only in
/var/log/gds-deterministic-scan.log. The register had not moved since 19 Nov, so from inside the product a dead
scanner and an unchanged estate were the same picture, and the deterministic scan had no scan_schedules row, so the
"Scanner silent" alert could not fire for it either.

Two further defects were found only by running the thing: migration 076 created a schedule row for every tenant
(four of which no runner serves, so those tenants would have been told their scan was silent), and asyncpg refused a
single timestamp bound both as timestamptz and inside an interval expression, rolling the whole record back.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from gds_api.scan_health_api import _verdict, scan_health

NOW = datetime(2026, 11, 23, 15, 0, tzinfo=timezone.utc)


# ------------------------------------------------------------------ the verdict, which is the whole point
def test_a_fresh_run_is_alive():
    assert _verdict(30.0, 360) == "alive"


def test_one_missed_run_is_overdue_not_silent():
    assert _verdict(400.0, 360) == "overdue"


def test_two_missed_runs_is_silent():
    assert _verdict(800.0, 360) == "silent"


def test_no_recorded_run_is_never_run_and_never_alive():
    """The defect this replaces: a scanner with no history must not read as healthy."""
    assert _verdict(None, 360) == "never_run"


def test_an_unknown_interval_is_stated_rather_than_guessed():
    assert _verdict(10.0, None) == "unknown_interval"


# ------------------------------------------------------------------ the route
class _Result:
    def __init__(self, rows=None, scalar=None):
        self._rows = rows or []
        self._scalar = scalar

    def mappings(self):
        return self

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None

    def scalar(self):
        return self._scalar


class _FakeDB:
    def __init__(self, schedules, runs, register, newest):
        self._schedules, self._runs, self._register, self._newest = schedules, runs, register, newest
        self.seen: list[str] = []

    async def execute(self, statement, params=None):
        sql = str(statement)
        self.seen.append(sql)
        if "FROM scan_schedules" in sql:
            return _Result(self._schedules)
        if "FROM scan_runs" in sql:
            return _Result(self._runs)
        if "AS total" in sql:
            return _Result([self._register])
        if "max(detected_at)" in sql:
            return _Result(scalar=self._newest)
        return _Result()


class _User:
    tenant_id = "2ec10dd0-e48e-4043-8c88-5998ba5e23b0"
    user_id = "u"


def _schedule(**kw):
    base = {
        "name": "Deterministic estate scan (headers + ports)",
        "monitor_type": "deterministic",
        "interval_minutes": 360,
        "last_run_at": NOW - timedelta(minutes=12),
        "next_run_at": NOW + timedelta(minutes=348),
        "last_run_findings": 0,
        "total_runs": 7,
        "total_findings": 0,
        "last_error": None,
        "status": "active",
    }
    base.update(kw)
    return base


def _run(**kw):
    base = {
        "scanner": "Deterministic estate scan (headers + ports)",
        "started_at": NOW - timedelta(minutes=12),
        "finished_at": NOW - timedelta(minutes=12) + timedelta(seconds=15),
        "duration_ms": 15127,
        "targets": 3,
        "new_findings": 0,
        "duplicates": 0,
        "failed": 0,
        "register_before": 1002,
        "register_after": 1002,
        "outcome": "ok",
    }
    base.update(kw)
    return base


def _call(schedules, runs, register=None, newest=NOW - timedelta(days=4)):
    db = _FakeDB(schedules, runs, register or {"total": 1002, "open": 849}, newest)
    out = asyncio.run(scan_health(current_user=_User(), db=db))
    return out, db


def test_a_live_scanner_reports_alive_with_its_evidence():
    out, db = _call([_schedule()], [_run()])
    assert out["verdict"] == "alive"
    assert out["silent"] == []
    scanner = out["scanners"][0]
    assert scanner["verdict"] == "alive"
    assert scanner["run_history"]["runs_recorded"] == 1
    assert scanner["run_history"]["last_new_findings"] == 0
    assert out["register"] == {
        "total": 1002, "open": 849, "newest_finding": (NOW - timedelta(days=4)).isoformat()
    }
    # the tenant must be bound before any RLS-protected read
    assert any("set_config" in s for s in db.seen)


def test_a_stale_schedule_is_named_in_silent():
    out, _ = _call([_schedule(last_run_at=NOW - timedelta(minutes=900))], [])
    assert out["verdict"] == "silent"
    assert out["silent"] == ["Deterministic estate scan (headers + ports)"]
    scanner = out["scanners"][0]
    assert scanner["verdict"] == "silent"
    # The route measures age against the wall clock, not against this test's NOW, so assert the relationship it
    # promises rather than a number that would drift: overdue_by = age - interval.
    assert scanner["overdue_by_minutes"] == round(scanner["age_minutes"] - 360, 1)
    assert scanner["overdue_by_minutes"] > 500


def test_never_run_is_silent_at_the_top_level_too():
    out, _ = _call([_schedule(last_run_at=None, total_runs=0)], [])
    assert out["verdict"] == "silent"
    assert out["scanners"][0]["verdict"] == "never_run"


def test_an_overdue_scanner_does_not_raise_the_alarm_to_silent():
    out, _ = _call([_schedule(last_run_at=NOW - timedelta(minutes=400))], [])
    assert out["verdict"] == "overdue"
    assert out["silent"] == []
    assert out["overdue"] == ["Deterministic estate scan (headers + ports)"]


def test_no_schedules_is_stated_not_green():
    out, _ = _call([], [])
    assert out["verdict"] == "no_schedules"


def test_a_naive_timestamp_from_postgres_is_read_as_utc():
    out, _ = _call([_schedule(last_run_at=(NOW - timedelta(minutes=12)).replace(tzinfo=None))], [])
    assert out["scanners"][0]["verdict"] == "alive"


def test_the_note_names_what_the_run_history_cannot_cover():
    out, _ = _call([_schedule()], [_run()])
    assert "never_run" in out["note"]
    assert "migration 076" in out["note"]
    assert out["thresholds"]["silent_at"] == "2.0x the interval"
