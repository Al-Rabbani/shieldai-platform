#!/usr/bin/env python3
"""Tell the people who can decide that an approval is waiting, before it expires.

MEASURED BEFORE THIS (25 Nov 2026): the approval-timeliness objective read 94.37% and four approvals had expired
undecided, all four critical scheduled exposure scans that then did not run. The only thing that ever told a human
about an approval was `expire_stale_approvals.py`, and it fires at 24 hours - after the window has closed and the
action has already failed - and it notifies the REQUESTER, not the people holding `approvals:decide`. So an approval
waited for a human who was never asked, and the platform's own record of that is a notification about a failure that
is already irreversible.

This closes the gap in the only place it can be closed: a reminder while the decision is still possible. It runs every
15 minutes beside the expiry job, finds pending approvals that have crossed a threshold of their window, and notifies
every active user in the tenant whose role actually holds `approvals:decide` - the set the decision route itself
requires. If nobody holds it, the requester is told that instead, because an approval nobody is able to decide is a
governance defect rather than a waiting request.

Two deliberate choices:
  * The message is stable for a given approval and threshold, because the pager dedupes on exact text. It names the
    approval and the threshold, never the current age, so the 12h reminder is one notification and not one per tick.
  * `requires_ack` is true. A reminder nobody has to acknowledge is the same silence this exists to break, and the
    pager already re-delivers an unacknowledged notification on its 5/15/60 ladder.

    ./approval_reminders.py --dry-run
    ./approval_reminders.py --window-hours 24 --threshold 12 --threshold 20
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
import uuid
from datetime import UTC, datetime, timedelta

sys.path.insert(0, os.environ.get("GDS_API_PATH", "/opt/gds-os/apps/api"))

from sqlalchemy import text

from gds_api.approval_window import APPROVAL_WINDOW_HOURS  # noqa: E402

from gds_api.audit import record_audit_event  # noqa: E402
from gds_api.db import async_session_factory  # noqa: E402
from gds_api.tenant_binding import bind_tenant  # noqa: E402

# The window an approval lives for, matching expire_stale_approvals.DEFAULT_MAX_AGE_HOURS so a reminder can never be
# computed against a different deadline than the one that expires the row.
DEFAULT_WINDOW_HOURS = APPROVAL_WINDOW_HOURS
# Where a decider goes to act. The queue page exists since 26 Nov 2026.
APPROVALS_PAGE = "/operations/approvals"
DEFAULT_THRESHOLDS = (12, 20)
NOTIFICATION_TYPE = "approval.awaiting_decision"
DEDUPE_DAYS = 7


def threshold_crossed(age_hours: float, thresholds: tuple[int, ...]) -> int | None:
    """The highest threshold an approval has crossed, or None.

    Highest, not first: a job that first sees an approval at 21 hours must not open with "12 hours" and then
    immediately open a second reminder for 20.
    """
    crossed = [t for t in thresholds if age_hours >= t]
    return max(crossed) if crossed else None


def reminder_message(
    approval_id: str,
    risk_class: str,
    action: str,
    threshold: int,
    window_hours: int,
    deciders_exist: bool,
) -> str:
    """A message that is identical on every run for the same approval and threshold.

    The pager dedupes on exact text, so the current age must not appear: "13h" would become "14h" on the next tick and
    page again for the same request. Measured on the SLO alerts, 25 Nov 2026, where a moving value did exactly that.
    """
    short = str(approval_id)[:8]
    head = (
        f"Approval {short} is still awaiting a decision {threshold}h after it was raised "
        f"({risk_class}): '{action}'."
    )
    if deciders_exist:
        return (
            f"{head} It expires at {window_hours}h, after which the action does not run. "
            f"Deciding needs approvals:decide."
        )
    return (
        f"{head} It expires at {window_hours}h. NOBODY in this tenant holds approvals:decide, so it cannot be "
        f"decided at all - a governance defect, not a queue."
    )


def configured_tenants(explicit: list[str] | None) -> list[uuid.UUID]:
    """Tenants come from the environment, never from an unbound read of a forced table."""
    raw = list(explicit or [])
    if not raw:
        env_tenant = os.environ.get("GDS_TENANT_ID", "").strip()
        if env_tenant:
            raw = [env_tenant]
    return [uuid.UUID(value) for value in raw if value]


async def deciders(session, tenant_id: uuid.UUID) -> list[tuple[uuid.UUID, str]]:
    """Active users whose role holds approvals:decide - the same permission the decision route requires."""
    rows = (
        await session.execute(
            text(
                "SELECT u.id, u.email FROM users u JOIN roles r ON r.id = u.role_id "
                "WHERE u.tenant_id = :t AND u.is_active "
                "AND (r.permissions::jsonb ? 'approvals:decide') "
                "ORDER BY u.created_at"
            ),
            {"t": str(tenant_id)},
        )
    ).mappings().all()
    return [(row["id"], row["email"]) for row in rows]


async def remind_tenant(
    tenant_id: uuid.UUID, window_hours: int, thresholds: tuple[int, ...], dry_run: bool
) -> tuple[int, int]:
    """Returns (reminders raised, approvals examined)."""
    now = datetime.now(UTC)
    raised = 0
    examined = 0
    async with async_session_factory() as session:
        await bind_tenant(session, tenant_id)
        holders = await deciders(session, tenant_id)
        pending = (
            await session.execute(
                text(
                    "SELECT id, requested_by_user_id, risk_class, action_description, created_at "
                    "FROM approvals WHERE tenant_id = :t AND status = 'pending' "
                    "AND created_at > :since ORDER BY created_at"
                ),
                {"t": str(tenant_id), "since": now - timedelta(hours=window_hours)},
            )
        ).mappings().all()
        examined = len(pending)

        for approval in pending:
            age_hours = (now - approval["created_at"]).total_seconds() / 3600.0
            threshold = threshold_crossed(age_hours, thresholds)
            if threshold is None:
                continue
            remaining = window_hours - age_hours
            action = (approval["action_description"] or "(no description)")[:120]
            short = str(approval["id"])[:8]
            message = reminder_message(
                str(approval["id"]), approval["risk_class"], action, threshold, window_hours, bool(holders)
            )
            recipients = holders or [(approval["requested_by_user_id"], "requester")]

            already = (
                await session.execute(
                    text(
                        "SELECT 1 FROM notifications WHERE tenant_id = :t AND type = :ty AND message = :m "
                        "AND created_at > :since LIMIT 1"
                    ),
                    {
                        "t": str(tenant_id),
                        "ty": NOTIFICATION_TYPE,
                        "m": message,
                        "since": now - timedelta(days=DEDUPE_DAYS),
                    },
                )
            ).first()
            print(
                f"  {'would remind' if dry_run else 'reminding'} {short} {approval['risk_class']:9s} "
                f"{age_hours:5.1f}h ({threshold}h threshold, {remaining:4.1f}h left) -> "
                f"{len(recipients)} decider(s)"
                + (" [already sent]" if already else "")
            )
            if dry_run or already:
                continue

            for user_id, _email in recipients:
                await session.execute(
                    text(
                        "INSERT INTO notifications (id, tenant_id, user_id, type, message, severity, requires_ack, "
                        "escalation_level, created_at, action_url) VALUES (gen_random_uuid(), :t, :u, :ty, :m, 'high', "
                        "TRUE, 0, now(), :a)"
                    ),
                    {
                        "t": str(tenant_id),
                        "u": str(user_id),
                        "ty": NOTIFICATION_TYPE,
                        "m": message,
                        # The queue page is where a decider acts; a reminder without it sends them hunting.
                        "a": APPROVALS_PAGE,
                    },
                )
            await record_audit_event(
                session,
                tenant_id=tenant_id,
                user_id=None,
                action="approval.reminder",
                detail={
                    "approval_id": str(approval["id"]),
                    "threshold_hours": threshold,
                    "window_hours": window_hours,
                    "age_hours": round(age_hours, 2),
                    "recipients": [str(user_id) for user_id, _ in recipients],
                    "deciders_exist": bool(holders),
                },
            )
            raised += 1
        if not dry_run:
            await session.commit()
    return raised, examined


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tenant", action="append", help="tenant id (repeatable); else GDS_TENANT_ID")
    parser.add_argument("--window-hours", type=int, default=DEFAULT_WINDOW_HOURS)
    parser.add_argument(
        "--threshold", type=int, action="append",
        help="hours of age at which to remind (repeatable); default 12 and 20",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    tenants = configured_tenants(args.tenant)
    if not tenants:
        print("no tenant configured: pass --tenant or set GDS_TENANT_ID", file=sys.stderr)
        return 2
    thresholds = tuple(sorted(args.threshold or DEFAULT_THRESHOLDS))
    if any(t <= 0 or t >= args.window_hours for t in thresholds):
        print(f"every threshold must fall inside the {args.window_hours}h window", file=sys.stderr)
        return 2

    total = 0
    for tenant_id in tenants:
        print(f"tenant {tenant_id}")
        raised, examined = await remind_tenant(tenant_id, args.window_hours, thresholds, args.dry_run)
        print(f"  {examined} pending approval(s) examined, {raised} reminder(s)")
        total += raised
    print(f"{'would raise' if args.dry_run else 'raised'} {total} reminder(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
