#!/usr/bin/env python3
"""Close rows that are scanner output, not vulnerabilities (P3 / B17).

The nikto importer stored its own log lines as findings: "Start Time: ...", "Target Host: ...",
"1 host(s) tested", "No CGI Directories found". They are not vulnerabilities and they inflate the
medium count, which makes the register untrustworthy in exactly the way the platform is not allowed
to be. They are CLOSED with a reason, never deleted, so the history stays honest and reversible.

  python3 close_scanner_noise.py            # dry run
  python3 close_scanner_noise.py --apply
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

import asyncpg

PATTERNS = (
    r"^Start Time:",
    r"^End Time:",
    r"^Target Host:",
    r"^Target IP:",
    r"^Target Port:",
    r"^Server:",
    r"^1 host\(s\) tested",
    r"^[0-9]+ items checked",
    r"^No CGI Directories found",
)
async def main_async(a) -> int:
    dsn = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute("SELECT set_config('gds.tenant_id', $1::text, false)", a.tenant)
        args = [a.tenant, *PATTERNS]
        predicate = " OR ".join(f"title ~* ${i}" for i in range(2, 2 + len(PATTERNS)))
        rows = await conn.fetch(
            "SELECT id, scanner, title FROM security_findings "
            f"WHERE tenant_id = $1 AND status = 'open' AND ({predicate})",
            *args,
        )
        for r in rows:
            print(f"  {r['scanner']:<10} {(r['title'] or '')[:66]}")
        print(f"{len(rows)} scanner-output rows to close")
        if not a.apply:
            print("dry run - pass --apply to write")
            return 0
        async with conn.transaction():
            for r in rows:
                await conn.execute(
                    "UPDATE security_findings SET status = 'resolved', resolved_at = now(), "
                    "raw_data = coalesce(raw_data,'{}'::jsonb) || jsonb_build_object("
                    "'closed_reason', 'scanner_metadata_not_a_finding', "
                    "'closed_by', 'close_scanner_noise.py') "
                    "WHERE id = $1 AND tenant_id = $2",
                    r["id"], a.tenant,
                )
        print(f"closed {len(rows)} scanner-output rows")
        return 0
    finally:
        await conn.close()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--tenant", default=os.environ.get("GDS_TENANT_ID"))
    a = ap.parse_args()
    if not a.tenant:
        print("GDS_TENANT_ID not set", file=sys.stderr)
        return 2
    return asyncio.run(main_async(a))


if __name__ == "__main__":
    raise SystemExit(main())
