#!/usr/bin/env python3
"""Grant (or revoke) a standing approval for one exact scope.

A standing approval lets an authorised action run again inside a bounded window without a fresh human
approval for every mission. It is deliberately explicit: you name the approval id, the window, and the
reason, and the script prints exactly what it now authorises so nothing widens silently.

Usage:
  grant_standing.py --approval <uuid> --hours 24 --reason "Q4 external surface review"
  grant_standing.py --list
  grant_standing.py --revoke <uuid>
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

sys.path.insert(0, "/opt/gds-os/apps/api")

import asyncpg  # noqa: E402

DSN = os.environ.get("GDS_DSN") or "postgresql://gds@/gds_os?host=/var/run/postgresql"


async def connect(tenant: str | None = None) -> asyncpg.Connection:
    """Connect and bind the tenant.

    approvals and capability_requests are FORCE RLS: without a tenant binding every SELECT returns nothing,
    and "no approval <id>" is then indistinguishable from a row that exists but is invisible. Measured
    25 Nov 2026, which is why --tenant exists and why the not-found message says which case it is.
    """
    from urllib.parse import quote, urlsplit, urlunsplit

    dsn = os.environ.get("DATABASE_URL") or os.environ.get("GDS_DATABASE_URL")
    if dsn:
        parts = urlsplit(dsn)
        if parts.password:
            dsn = urlunsplit(parts._replace(
                netloc=f"{parts.username}:{quote(parts.password, safe='')}@127.0.0.1:5432"))
        conn = await asyncpg.connect(dsn)
    else:
        conn = await asyncpg.connect(user="postgres", database="gds_os", host="/var/run/postgresql")
    tid = tenant or os.environ.get("GDS_TENANT_ID")
    if tid:
        await conn.execute("SELECT set_config('gds.tenant_id', $1, false)", tid)
    else:
        print("warning: no --tenant and no GDS_TENANT_ID, so RLS will hide every row", file=sys.stderr)
    return conn


async def list_standing(conn: asyncpg.Connection) -> None:
    rows = await conn.fetch(
        """
        SELECT DISTINCT a.id, a.status, a.risk_class, a.action_description,
               a.standing, a.standing_until, cr.capability_key, cr.requested_tool_id,
               cr.target_reference, cr.requesting_agent_id
        FROM approvals a
        LEFT JOIN capability_decisions d ON d.approval_id = a.id
        LEFT JOIN capability_requests cr ON cr.id = d.request_id
        WHERE a.standing IS TRUE
        ORDER BY a.standing_until DESC NULLS LAST
        """
    )
    if not rows:
        print("No standing approval exists.")
        return
    for r in rows:
        state = "ACTIVE" if r["standing_until"] and r["status"] == "approved" else "inactive"
        print(f"{state:8} {r['id']}  until {r['standing_until']}  "
              f"{r['requested_tool_id']} on {r['target_reference']} as {r['requesting_agent_id']}")


async def grant(conn: asyncpg.Connection, approval_id: str, hours: int, reason: str, user: str | None) -> int:
    row = await conn.fetchrow(
        """
        SELECT DISTINCT a.id, a.status, a.risk_class, a.action_description, cr.capability_key,
               cr.requested_tool_id, cr.target_reference, cr.requesting_agent_id
        FROM approvals a
        LEFT JOIN capability_decisions d ON d.approval_id = a.id
        LEFT JOIN capability_requests cr ON cr.id = d.request_id
        WHERE a.id = $1::uuid
        """,
        approval_id,
    )
    if row is None:
        hint = "" if os.environ.get("GDS_TENANT_ID") else " (no tenant was bound, so RLS may be hiding it)"
        print(f"No approval {approval_id}{hint}", file=sys.stderr)
        return 2
    if row["status"] != "approved":
        print(f"Refusing: approval {approval_id} is '{row['status']}', only an approved request can stand.",
              file=sys.stderr)
        return 3
    if not row["target_reference"]:
        print("Warning: this approval names no target, so it authorises only the same (empty) target scope.")
    await conn.execute(
        """
        UPDATE approvals
           SET standing = TRUE,
               standing_until = now() + make_interval(hours => $2),
               standing_reason = $3,
               standing_granted_by_user_id = (SELECT id FROM users WHERE email = $4)
        WHERE id = $1::uuid
        """,
        approval_id, hours, reason, user,
    )
    fresh = await conn.fetchrow("SELECT standing_until FROM approvals WHERE id = $1::uuid", approval_id)
    print("Standing approval granted. It now authorises, until "
          f"{fresh['standing_until']}:")
    print(f"  tool      {row['requested_tool_id']}")
    print(f"  target    {row['target_reference'] or '(none)'}")
    print(f"  agent     {row['requesting_agent_id']}")
    print(f"  capability{row['capability_key']}  risk {row['risk_class']}")
    print(f"  reason    {reason}")
    print("Every reuse is recorded as its own capability decision.")
    return 0


async def revoke(conn: asyncpg.Connection, approval_id: str) -> int:
    n = await conn.fetchval(
        "UPDATE approvals SET standing = FALSE, standing_until = NULL WHERE id = $1::uuid RETURNING 1",
        approval_id,
    )
    if not n:
        print(f"No approval {approval_id}", file=sys.stderr)
        return 2
    print(f"Standing revoked for {approval_id}.")
    return 0


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--approval")
    ap.add_argument("--hours", type=int, default=24)
    ap.add_argument("--reason", default="")
    ap.add_argument("--user", default="president@globaldigitalstreams.com")
    ap.add_argument("--tenant", default=None)
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--revoke")
    args = ap.parse_args()
    conn = await connect(args.tenant)
    try:
        if args.list:
            await list_standing(conn)
            return 0
        if args.revoke:
            return await revoke(conn, args.revoke)
        if not args.approval:
            ap.print_help()
            return 1
        if args.hours < 1 or args.hours > 720:
            print("--hours must be between 1 and 720 (30 days)", file=sys.stderr)
            return 4
        if not args.reason.strip():
            print("--reason is required: a standing approval must say what it is for", file=sys.stderr)
            return 5
        return await grant(conn, args.approval, args.hours, args.reason.strip(), args.user)
    finally:
        await conn.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
