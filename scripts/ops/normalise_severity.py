#!/usr/bin/env python3
"""Map every open finding onto the canonical severity scale (P3 / B14).

The register carried scanner-native words that are not severities: semgrep says
"warning"/"error", osv says "unknown". A dashboard that sorts on severity cannot rank
those, and a policy that escalates on "critical" silently skips them.

Mapping, and why:
  warning -> medium   semgrep WARNING is a probable issue, not a confirmed one.
  error   -> high     semgrep ERROR is a rule that fired on real code.
  unknown -> derived  from CVSS when the finding has a score (>=9 critical, >=7 high,
                      >=4 medium, else low); when it has no score at all it becomes
                      medium and is flagged, because inventing "low" for an unscored
                      finding would understate it.

The original word is preserved in raw_data.severity_original so this is reversible.

  python3 normalise_severity.py            # dry run, prints the plan
  python3 normalise_severity.py --apply    # writes
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

sys.path.insert(0, "/opt/gds-os/apps/api")

import asyncpg  # noqa: E402

CANONICAL = {"critical", "high", "medium", "low", "info"}
FIXED_MAP = {"warning": "medium", "error": "high"}


def target_severity(severity: str, cvss) -> tuple[str, str]:
    s = (severity or "").strip().lower()
    if s in CANONICAL:
        return s, "already canonical"
    if s in FIXED_MAP:
        return FIXED_MAP[s], f"scanner word {s!r}"
    if cvss is not None:
        v = float(cvss)
        if v >= 9.0:
            return "critical", f"unmapped {s!r}, CVSS {v}"
        if v >= 7.0:
            return "high", f"unmapped {s!r}, CVSS {v}"
        if v >= 4.0:
            return "medium", f"unmapped {s!r}, CVSS {v}"
        return "low", f"unmapped {s!r}, CVSS {v}"
    return "medium", f"unmapped {s!r} with no CVSS - defaulted to medium, not low"


async def main_async(a) -> int:
    dsn = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute("SELECT set_config('gds.tenant_id', $1, false)", a.tenant)
        rows = await conn.fetch(
            "SELECT id, scanner, severity, cvss FROM security_findings "
            "WHERE tenant_id = $1 AND lower(severity) NOT IN "
            "('critical','high','medium','low','info')",
            a.tenant,
        )
        if not rows:
            print("every finding already uses a canonical severity")
            return 0
        plan = []
        for r in rows:
            new_sev, why = target_severity(r["severity"], r["cvss"])
            plan.append((r["id"], r["scanner"], r["severity"], new_sev, why))
        for _, scanner, sev, new_sev, why in plan:
            print(f"  {scanner:<14} {sev!s:<10} -> {new_sev:<8} ({why})")
        print(f"{len(plan)} findings to normalise")
        if not a.apply:
            print("dry run - pass --apply to write")
            return 0
        async with conn.transaction():
            for fid, scanner, sev, new_sev, _ in plan:
                await conn.execute(
                    "UPDATE security_findings SET severity = $1, "
                    "raw_data = coalesce(raw_data, '{}'::jsonb) || "
                    "jsonb_build_object('severity_original', $2::text, "
                    "'severity_normalised_by', 'normalise_severity.py') "
                    "WHERE id = $3 AND tenant_id = $4",
                    new_sev, sev, fid, a.tenant,
                )
        print(f"normalised {len(plan)} findings")
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
