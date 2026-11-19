#!/usr/bin/env python3
"""Enforce an age policy on open findings (P3 / B16).

Nothing in the register recorded that a finding had been open too long: there is no SLA column
and no escalation table, so 196 medium and 6 high findings had simply aged in silence.

Policy (hours), chosen to match the severity ladder already used by the platform:
    critical 24, high 168 (7d), medium 720 (30d), low 2160 (90d), info 4320 (180d)

For every open finding past its policy the script writes raw_data.escalation (when, the policy,
the real age, and the band it breached) and raises ONE notification for that finding and band.
Re-running does not duplicate: an escalation already recorded for the same band is skipped, and
a finding that crosses into a worse band gets a new record because that is new information.

The notification goes to a real user of the tenant, looked up after binding, so the row satisfies
the notifications RLS policy instead of being written unbound.

  python3 escalate_stale_findings.py            # dry run
  python3 escalate_stale_findings.py --apply
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

import asyncpg

POLICY_HOURS = {"critical": 24, "high": 168, "medium": 720, "low": 2160, "info": 4320}
BANDS = ("policy", "double", "triple")  # 1x, 2x, 3x the policy age


def band_for(age_hours: float, policy: int) -> str | None:
    if age_hours >= policy * 3:
        return "triple"
    if age_hours >= policy * 2:
        return "double"
    if age_hours >= policy:
        return "policy"
    return None


async def main_async(a) -> int:
    dsn = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute("SELECT set_config('gds.tenant_id', $1::text, false)", a.tenant)
        user = await conn.fetchval(
            "SELECT id FROM users WHERE tenant_id = $1 ORDER BY created_at LIMIT 1", a.tenant
        )
        if user is None:
            print("no user on this tenant to notify", file=sys.stderr)
            return 2
        rows = await conn.fetch(
            "SELECT id, severity, title, detected_at, raw_data FROM security_findings "
            "WHERE tenant_id = $1 AND status = 'open'",
            a.tenant,
        )
        plan = []
        for r in rows:
            policy = POLICY_HOURS.get((r["severity"] or "").lower())
            if not policy:
                continue
            age_h = (await conn.fetchval("SELECT extract(epoch from now() - $1)/3600", r["detected_at"]))
            band = band_for(float(age_h), policy)
            if band is None:
                continue
            raw = r["raw_data"]
            if isinstance(raw, str):
                try:
                    raw = json.loads(raw)
                except ValueError:
                    raw = {}
            prior = (raw or {}).get("escalation") or {}
            if prior.get("band") == band:
                continue  # already escalated at this level
            plan.append((r["id"], r["severity"], r["title"], float(age_h), policy, band))
        for _, sev, title, age, policy, band in plan[:12]:
            print(f"  {sev:<9} age {age:7.1f}h policy {policy:>4}h [{band}] {title[:44]}")
        if len(plan) > 12:
            print(f"  ... and {len(plan) - 12} more")
        print(f"{len(plan)} findings to escalate")
        if not a.apply:
            print("dry run - pass --apply to write")
            return 0
        async with conn.transaction():
            for fid, sev, title, age, policy, band in plan:
                await conn.execute(
                    "UPDATE security_findings SET raw_data = coalesce(raw_data,'{}'::jsonb) || "
                    "jsonb_build_object('escalation', jsonb_build_object("
                    "'at', now()::text, 'band', $1::text, 'policy_hours', $2::int, "
                    "'age_hours', round($3::numeric, 1), "
                    "'note', 'open past the age policy for its severity')) "
                    "WHERE id = $4 AND tenant_id = $5",
                    band, policy, age, fid, a.tenant,
                )
                await conn.execute(
                    "INSERT INTO notifications (id, tenant_id, user_id, type, message, created_at) "
                    "VALUES (gen_random_uuid(), $1, $2, 'sla_escalation', $3, now())",
                    a.tenant, user,
                    f"[{band.upper()}] {sev} finding open {age:.0f}h, policy {policy}h: {title[:120]}",
                )
        print(f"escalated {len(plan)} findings and raised {len(plan)} notifications")
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
