#!/usr/bin/env python3
"""Expire approvals whose window has closed, so the queue cannot lie about waiting for a human.

Measured 20 Nov 2026: four approvals sat pending, every one of them a six-hourly scheduled exposure scan from a
path that was replaced at 17:38 that day (the scan now uses an R2 capability that needs no per-run approval). The
18:00 run afterwards produced none. Nothing expires an approval, so an obsolete request keeps looking like a
decision the platform is waiting for, which is the opposite of an autonomous platform.

Expiring is not approving and not rejecting. It records that the window closed and nobody acted, tells the
requester, and keeps the row: the audit trail of a request that was never decided is itself information.

    ./expire_stale_approvals.py --dry-run
    ./expire_stale_approvals.py --max-age-hours 24
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
import uuid
from datetime import UTC, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402

from gds_api.approval_window import APPROVAL_WINDOW_HOURS
from gds_api.audit import record_audit_event  # noqa: E402
from gds_api.db import async_session_factory  # noqa: E402
from gds_api.models import Approval, Notification  # noqa: E402
from gds_api.tenant_binding import bind_tenant  # noqa: E402

DEFAULT_MAX_AGE_HOURS = APPROVAL_WINDOW_HOURS


def configured_tenants(explicit: list[str] | None) -> list[uuid.UUID]:
    """Tenants come from the environment, never from an unbound read of a forced table.

    The mission reaper learned this the expensive way: an unbound SELECT against a FORCE-RLS table returns
    zero rows and raises nothing, so the job reported success while doing nothing for two days.
    """
    raw = list(explicit or [])
    if not raw:
        env_tenant = os.environ.get("GDS_TENANT_ID", "").strip()
        if env_tenant:
            raw = [env_tenant]
    return [uuid.UUID(value) for value in raw if value]


async def expire_tenant(tenant_id: uuid.UUID, max_age_hours: int, dry_run: bool) -> int:
    cutoff = datetime.now(UTC) - timedelta(hours=max_age_hours)
    expired = 0
    async with async_session_factory() as session:
        await bind_tenant(session, tenant_id)
        stale = (
            await session.execute(
                select(Approval).where(
                    Approval.tenant_id == tenant_id,
                    Approval.status == "pending",
                    Approval.created_at < cutoff,
                )
            )
        ).scalars().all()

        for approval in stale:
            age_hours = round((datetime.now(UTC) - approval.created_at).total_seconds() / 3600, 1)
            print(
                f"  {'would expire' if dry_run else 'expiring'} {str(approval.id)[:8]} "
                f"{approval.risk_class:10s} {age_hours:6.1f}h  {approval.action_description[:60]}"
            )
            if dry_run:
                expired += 1
                continue
            approval.status = "expired"
            approval.decided_at = datetime.now(UTC)
            session.add(
                Notification(
                    tenant_id=tenant_id,
                    user_id=approval.requested_by_user_id,
                    type="approval.expired",
                    message=(
                        f"Approval request '{approval.action_description}' expired after "
                        f"{age_hours:.0f}h without a decision. The action did not run."
                    ),
                )
            )
            await record_audit_event(
                session,
                tenant_id=tenant_id,
                user_id=approval.requested_by_user_id,
                action="approval.expired",
                detail={
                    "approval_id": str(approval.id),
                    "risk_class": approval.risk_class,
                    "age_hours": age_hours,
                    "max_age_hours": max_age_hours,
                },
            )
            expired += 1
        if not dry_run:
            await session.commit()
    return expired


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tenant", action="append", help="tenant id (repeatable); else GDS_TENANT_ID")
    parser.add_argument("--max-age-hours", type=int, default=DEFAULT_MAX_AGE_HOURS)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    tenants = configured_tenants(args.tenant)
    if not tenants:
        print("no tenant configured: pass --tenant or set GDS_TENANT_ID", file=sys.stderr)
        return 2

    total = 0
    for tenant_id in tenants:
        print(f"tenant {tenant_id}")
        total += await expire_tenant(tenant_id, args.max_age_hours, args.dry_run)
    verb = "would expire" if args.dry_run else "expired"
    print(f"{verb} {total} approval(s) older than {args.max_age_hours}h")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
