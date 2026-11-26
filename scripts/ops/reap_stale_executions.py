#!/usr/bin/env python3
"""Close capability decisions that were claimed for execution and never resolved.

Measured 26 Nov 2026: nine decisions sat in execution_status='executing', the oldest for 247 hours. A decision is
claimed before the tool runs and resolved after it returns, so a process that dies mid-call - a restart, a deploy,
a killed worker - leaves the claim standing. Nothing closed them, so the ledger reported work in progress that had
stopped ten days earlier, and the audit trail said the same.

'failed' is the honest status because the vocabulary is executed|failed and the outcome is genuinely unknown: the
tool may have run. The error text says exactly that, rather than inventing a cause, so the row reads "no execution
outcome was ever recorded" and names how long the claim stood.

    ./reap_stale_executions.py --dry-run
    ./reap_stale_executions.py --max-age-minutes 60
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
import uuid
from datetime import UTC, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text  # noqa: E402

from gds_api.capabilities.broker import mark_capability_execution  # noqa: E402
from gds_api.db import async_session_factory  # noqa: E402
from gds_api.tenant_binding import bind_tenant  # noqa: E402

DEFAULT_MAX_AGE_MINUTES = 60

# Stated once so the same sentence is used in the register, the trace and the audit row.
UNKNOWN_OUTCOME = (
    "no execution outcome was ever recorded: the process that claimed this execution stopped while it was "
    "running, so whether the tool ran is unknown (claim stood {hours:.1f}h)"
)


def configured_tenants(explicit: list[str] | None) -> list[str]:
    if explicit:
        return explicit
    from_env = os.getenv("GDS_TENANT_ID")
    if from_env:
        return [from_env]
    raise SystemExit("No tenant to work on: pass --tenant or set GDS_TENANT_ID")


async def reap(tenant_id: str, max_age_minutes: int, dry_run: bool) -> int:
    # The broker compares decision.tenant_id (a UUID) against this argument by value, so a str never matches.
    tenant_uuid = uuid.UUID(str(tenant_id))
    cutoff = datetime.now(UTC) - timedelta(minutes=max_age_minutes)
    async with async_session_factory() as session:
        await bind_tenant(session, tenant_uuid)
        rows = (await session.execute(
            text("SELECT id, capability_key, decided_at FROM capability_decisions"
                 " WHERE execution_status = 'executing' AND decided_at < :cutoff"
                 " ORDER BY decided_at"),
            {"cutoff": cutoff},
        )).mappings().all()
        if not rows:
            print(f"tenant {tenant_id}: no execution claimed for more than {max_age_minutes} minutes")
            return 0

        closed = 0
        for row in rows:
            hours = (datetime.now(UTC) - row["decided_at"]).total_seconds() / 3600
            print(f"  {'would close' if dry_run else 'closing'} {str(row['id'])[:8]} "
                  f"{row['capability_key']:32s} claimed {hours:6.1f}h ago")
            if dry_run:
                closed += 1
                continue
            await mark_capability_execution(
                session, tenant_id=tenant_uuid, decision_id=row["id"], status="failed",
                error=UNKNOWN_OUTCOME.format(hours=hours),
            )
            await session.commit()
            # A commit drops the transaction-local tenant setting these FORCE-RLS tables read.
            await bind_tenant(session, tenant_uuid)
            closed += 1
        print(f"tenant {tenant_id}: {closed} stale execution(s) "
              f"{'would be closed' if dry_run else 'closed'}")
        return closed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant", action="append", dest="tenants")
    parser.add_argument("--max-age-minutes", type=int, default=DEFAULT_MAX_AGE_MINUTES)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.max_age_minutes < 1:
        raise SystemExit("--max-age-minutes must be at least 1; a shorter window would close live executions")

    total = 0
    for tenant in configured_tenants(args.tenants):
        print(f"tenant {tenant}")
        total += asyncio.run(reap(tenant, args.max_age_minutes, args.dry_run))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
