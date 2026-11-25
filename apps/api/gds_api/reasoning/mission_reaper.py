"""Close missions that were opened and never finished.

set_mission_outcome's own docstring says a mission must never be left running. Measured 25 Nov 2026: 73 missions
sat in status 'running', every one created that day, NONE carrying a report, so none had ever completed. The
route that opens a mission has no counterpart that closes it if the caller dies, the process restarts mid-run,
or a proof script executes a tool without closing the mission it opened. Nothing swept them up.

This reaper closes only what is provably abandoned: status 'running', older than the threshold, and with no
report (a mission that recorded an outcome but stayed running is a different, narrower bug and is left alone so
it can be seen). It records why it closed each one, so a reaped mission is distinguishable from a real failure.
"""

from __future__ import annotations

from datetime import UTC, datetime

DEFAULT_STALE_MINUTES = 120
REAP_SUMMARY = "closed by the mission reaper: no outcome was ever recorded"


async def reap_stale_missions(*, older_than_minutes: int = DEFAULT_STALE_MINUTES, dry_run: bool = False) -> dict:
    """Close abandoned missions across every tenant. Returns what was found and what was closed.

    The sweep lives in the SECURITY DEFINER function gds_reap_stale_missions: the app role is tenant-bound under
    FORCE RLS, so it cannot even enumerate tenants, and my first version silently swept zero of them. The
    function returns counts only, never tenant data.
    """
    from sqlalchemy import text

    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    async with async_session_factory() as session:
        # The function is not tenant-scoped, but the session still needs a tenant set for any RLS-guarded
        # statement in the same transaction; the call itself is what does the work.
        await bind_tenant(session, "00000000-0000-0000-0000-000000000000")
        row = (
            await session.execute(
                text("SELECT candidates, closed FROM gds_reap_stale_missions(:mins, :dry)"),
                {"mins": older_than_minutes, "dry": dry_run},
            )
        ).mappings().first()
        await session.commit()
    return {
        "threshold_minutes": older_than_minutes,
        "dry_run": dry_run,
        "candidates": int(row["candidates"]) if row else 0,
        "closed": int(row["closed"]) if row else 0,
    }
