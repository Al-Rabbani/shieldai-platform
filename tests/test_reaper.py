"""A mission must never be left running - measured, not assumed.

25 Nov 2026: 73 missions sat in status 'running', every one created that day, none carrying a report, so none
had ever completed. Nothing swept them. These guards pin the sweep's contract and the two defects it exposed:
a tenant-bound role cannot even enumerate tenants, and a dry run must never mutate.
"""
import pytest


def test_the_sweep_is_a_definer_function_and_not_publicly_executable():
    """The app role is tenant-bound under FORCE RLS, so the sweep has to be definer-owned. It must not be
    executable by PUBLIC, because it closes missions across every tenant."""
    import asyncio

    from sqlalchemy import text

    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    async def probe():
        async with async_session_factory() as s:
            await bind_tenant(s, "00000000-0000-0000-0000-000000000000")
            row = (await s.execute(text(
                "SELECT p.prosecdef AS is_definer,"
                "       has_function_privilege('public', p.oid, 'EXECUTE') AS public_can_execute,"
                "       has_function_privilege(current_user, p.oid, 'EXECUTE') AS app_can_execute"
                "  FROM pg_proc p WHERE p.proname = 'gds_reap_stale_missions'"))).mappings().first()
            await s.commit()
            return row

    row = asyncio.run(probe())
    assert row is not None, "the sweep function is missing"
    assert row["is_definer"] is True
    assert row["public_can_execute"] is False
    assert row["app_can_execute"] is True


def test_a_dry_run_never_closes_anything():
    import asyncio

    from gds_api.reasoning.mission_reaper import reap_stale_missions

    out = asyncio.run(reap_stale_missions(older_than_minutes=60, dry_run=True))
    assert out["dry_run"] is True
    assert out["closed"] == 0
    assert out["candidates"] >= 0


def test_the_threshold_leaves_recent_missions_alone():
    """A mission opened minutes ago may still be running. The default must be hours, not minutes."""
    from gds_api.reasoning.mission_reaper import DEFAULT_STALE_MINUTES

    assert DEFAULT_STALE_MINUTES >= 60


def test_the_cron_source_of_truth_schedules_the_reaper():
    """The repo has been bitten before by a crontab that was overwritten: assert the source of truth carries it."""
    import pathlib

    cron = pathlib.Path("/opt/gds-os/config/cron/root.crontab").read_text()
    assert "mission_reaper" in cron
    assert "*/30" in cron
