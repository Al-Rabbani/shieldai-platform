"""Tests for the mission lifecycle guards.

Offline: they assert the SQL the reaper will run and the grace period it uses, because a reaper that
silently matches nothing is worse than no reaper - it would report a clean platform while missions
accumulate.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from gds_api.mission_reaper import (
    DEFAULT_GRACE_HOURS,
    TERMINAL_STATUSES,
    reap_cutoff,
    stale_mission_statement,
)


def _compiled() -> str:
    statement = stale_mission_statement(uuid.uuid4(), datetime.now(UTC))
    return str(statement.compile(compile_kwargs={"literal_binds": True}))


def test_terminal_statuses_cover_every_finished_outcome():
    assert set(TERMINAL_STATUSES) == {"completed", "failed", "cancelled"}


def test_cutoff_is_the_grace_period_before_now():
    now = datetime(2026, 11, 17, 12, 0, tzinfo=UTC)
    assert reap_cutoff(12, now=now) == now - timedelta(hours=12)
    assert reap_cutoff(now=now) == now - timedelta(hours=DEFAULT_GRACE_HOURS)


def test_statement_only_matches_non_terminal_missions():
    sql = _compiled()
    assert "missions.status NOT IN" in sql
    for status in TERMINAL_STATUSES:
        assert f"'{status}'" in sql


def test_statement_refuses_missions_that_have_tasks_or_a_run():
    """The two conditions that keep real in-flight work safe."""
    sql = _compiled()
    assert "NOT EXISTS (SELECT 1 FROM mission_tasks t WHERE t.mission_id = missions.id)" in sql
    assert "NOT EXISTS (SELECT 1 FROM workflow_runs r WHERE r.mission_id = missions.id)" in sql


def test_statement_is_tenant_scoped():
    tenant = uuid.uuid4()
    sql = str(
        stale_mission_statement(tenant, datetime.now(UTC)).compile(
            compile_kwargs={"literal_binds": True}
        )
    )
    # The CHAR(32) UUID type renders as 32 hex characters with no dashes, so the dashed form is not
    # what reaches SQL. Either form proves scoping; the hex form is what this dialect emits.
    assert str(tenant) in sql or tenant.hex in sql
