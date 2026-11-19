#!/usr/bin/env python3
"""Record WHY a finding is accepted rather than silently leaving it open (P3 / B17).

Every remaining OSV advisory was traced to a real blocker, measured rather than assumed:

  mcp                 fixed only in 2.2.0, and 2.2.0 renames FastMCP to MCPServer, which breaks
                      semgrep 1.172.0 with "No module named 'mcp.server.fastmcp'". Verified by
                      installing 2.2.0, watching semgrep fail, and rolling back to 1.30.0, where
                      semgrep scans cleanly. Blocked until semgrep supports mcp 2.x.
  opentelemetry-api   fixed in 1.45.x, but semgrep's otlp exporter is built against 1.37.0 and the
                      whole otel family must move together or semgrep's import breaks - the failure
                      that silently disabled SAST in November. Blocked on a coordinated family move.
  pyjwt               OSV names NO fixed version for this advisory, so no upgrade can close it.

These are ACCEPTED RISK with a stated reason, not closed and not forgotten. Each row keeps its
open status so it still counts against posture, and carries raw_data.triage explaining the decision.

  python3 triage_accepted_risk.py            # dry run
  python3 triage_accepted_risk.py --apply
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

import asyncpg

REASONS = {
    "mcp": ("accept", "fixed only in mcp 2.2.0, which renames FastMCP to MCPServer and breaks "
                      "semgrep 1.172.0 (verified: install 2.2.0 -> semgrep ImportError -> rolled "
                      "back to 1.30.0, semgrep scans cleanly). Blocked on semgrep supporting mcp 2.x."),
    "opentelemetry-api": ("accept", "fixed in 1.45.x but semgrep's otlp exporter is built against "
                                    "1.37.0 and the otel family must move together or semgrep's import "
                                    "breaks, which silently disabled SAST in November. Blocked on a "
                                    "coordinated family upgrade."),
    "pyjwt": ("accept", "OSV publishes no fixed version for this advisory, so no upgrade can close it."),
}

# Container-image findings: the fix exists upstream but this host cannot fetch it.
IMAGE_REASONS = {
    "minio/minio:latest": (
        "accept",
        "the running image (RELEASE.2025-09-07, go1.24.6) is past its build date but cannot be "
        "replaced from this host: docker pull minio/minio:latest returns pull access denied "
        "(MinIO no longer serves public images on Docker Hub) and quay.io/minio/minio returns 401 "
        "UNAUTHORIZED. Blocked on registry credentials from the owner. Exposure was reduced instead: "
        "the container was rebound to 127.0.0.1 so the API and console are no longer reachable from "
        "the internet, which UFW alone was not achieving because Docker publishes past it.",
    ),
}


async def main_async(a) -> int:
    dsn = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute("SELECT set_config('gds.tenant_id', $1::text, false)", a.tenant)
        rows = await conn.fetch(
            "SELECT id, target, severity FROM security_findings WHERE tenant_id = $1 AND status = 'open' "
            "AND (scanner = 'osv' OR (scanner = 'trivy' AND severity = 'critical'))",
            a.tenant,
        )
        plan = []
        for r in rows:
            pkg = (r["target"] or "").strip().lower()
            for sep in ("==", ">=", "<=", "~=", ">", "<", " "):
                if sep in pkg:
                    pkg = pkg.split(sep, 1)[0]
            entry = REASONS.get(pkg.strip())
            if entry is None and (r["severity"] or "").lower() == "critical":
                for image, image_entry in IMAGE_REASONS.items():
                    if (r["target"] or "").strip() == image:
                        entry = image_entry
                        pkg = image
                        break
            if entry:
                plan.append((r["id"], pkg.strip(), *entry))
            else:
                print(f"  NO REASON RECORDED for {pkg} - left untouched")
        for _, pkg, decision, why in plan:
            print(f"  {decision:<7} {pkg:<20} {why[:70]}...")
        print(f"{len(plan)} findings to mark as accepted risk")
        if not a.apply:
            print("dry run - pass --apply to write")
            return 0
        async with conn.transaction():
            for fid, pkg, decision, why in plan:
                await conn.execute(
                    "UPDATE security_findings SET raw_data = coalesce(raw_data,'{}'::jsonb) || "
                    "jsonb_build_object('triage', jsonb_build_object("
                    "'decision', $1::text, 'reason', $2::text, 'package', $3::text, "
                    "'triaged_by', 'triage_accepted_risk.py', 'triaged_at', now()::text)) "
                    "WHERE id = $4 AND tenant_id = $5",
                    decision, why, pkg, fid, a.tenant,
                )
        print(f"triaged {len(plan)} findings")
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
