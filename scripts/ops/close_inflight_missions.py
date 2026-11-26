"""Close missions that are about to be killed by a platform restart, naming the reason.

MEASURED 26 Nov 2026: six remediation missions on 25 Nov ran from 16:16 and were closed by the mission reaper at
18:30 with "no outcome was ever recorded", recorded as failures - and the work in them had in fact been applied (the
SSH SHA-1 MACs were removed and those findings are closed). They were killed by a deploy restarting the API while they
ran: the bridge closes a mission on success and on an exception, but nothing survives the process being replaced, so
the row sat in 'running' for two hours and then read as a capability failure.

The platform is restarted on every deploy. Closing what the restart is about to kill, at the moment it happens, is
honest and immediate: the mission did not complete, and the reason says why rather than leaving a two-hour silence that
looks like a hang nobody can explain.
"""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys

REASON = ("interrupted by a platform restart at {when}; the runner process was replaced before it recorded an outcome, "
          "so the outcome of its actions is unknown - verify before retrying")


def _psql(sql: str) -> str:
    out = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", "gds_os", "-tAc", sql],
        capture_output=True, text=True, timeout=60,
    )
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip()[:400])
    return out.stdout.strip()


async def main() -> int:
    from datetime import datetime, timezone

    when = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    reason = REASON.format(when=when)
    # One statement, so a mission cannot be half-closed: only rows still running are touched.
    # ONE scalar out. The first version returned the INSERT's row plus the count, so psql printed "0\nINSERT 0 1" and
    # int() raised - the closer failed on every deploy while the deploy carried on, which is how a step that does
    # nothing looks identical to a step that had nothing to do. The audit row is written inside the CTE and only the
    # count is selected.
    sql = f"""
        WITH closed AS (
            UPDATE missions
               SET status = 'failed',
                   completed_at = now(),
                   report = COALESCE(report, '') ||
                     CASE WHEN COALESCE(report, '') = '' THEN '' ELSE E'\\n' END ||
                     jsonb_build_object(
                        'interrupted', jsonb_build_object('at', now(), 'reason', '{reason}')
                     )::text
             WHERE status = 'running'
         RETURNING id
        ), logged AS (
            INSERT INTO audit_events (id, tenant_id, action, detail)
            SELECT gen_random_uuid(), NULL, 'mission.interrupted_by_restart',
                   jsonb_build_object('closed', (SELECT count(*) FROM closed), 'reason', '{reason}')
            RETURNING 1
        )
        SELECT count(*) FROM closed;
    """
    try:
        closed = int(_psql(sql) or 0)
    except Exception as exc:  # noqa: BLE001 - a deploy must not fail because bookkeeping could not run
        print(f"    in-flight missions: could not close ({type(exc).__name__}: {exc})")
        return 0
    if closed:
        print(f"    in-flight missions: closed {closed} as interrupted by this restart (they could not survive it)")
    else:
        print("    in-flight missions: none running")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
