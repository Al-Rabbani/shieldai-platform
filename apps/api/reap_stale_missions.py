"""CLI: cancel missions that never started executing anything.

Runs from cron. Exit code 0 when the sweep completed (whether or not it found anything), 1 on error,
so a cron failure is visible rather than silent.

    python reap_stale_missions.py --older-than-hours 12 [--dry-run]
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys

from gds_api.mission_reaper import DEFAULT_GRACE_HOURS, reap_stale_missions


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--older-than-hours",
        type=int,
        default=DEFAULT_GRACE_HOURS,
        help=f"grace period before a non-terminal mission is reaped (default {DEFAULT_GRACE_HOURS})",
    )
    parser.add_argument("--dry-run", action="store_true", help="report what would be cancelled")
    parser.add_argument("--limit", type=int, default=200, help="maximum missions per tenant")
    return parser.parse_args(argv)


async def _run(args: argparse.Namespace) -> int:
    if args.older_than_hours < 1:
        print("--older-than-hours must be at least 1", file=sys.stderr)
        return 2
    reaped = await reap_stale_missions(
        older_than_hours=args.older_than_hours, dry_run=args.dry_run, limit=args.limit
    )
    verb = "would cancel" if args.dry_run else "cancelled"
    print(f"{verb} {len(reaped)} mission(s)")
    for row in reaped:
        print(json.dumps(row))
    return 0


def main(argv: list[str] | None = None) -> int:
    return asyncio.run(_run(_parse_args(argv)))


if __name__ == "__main__":
    raise SystemExit(main())
