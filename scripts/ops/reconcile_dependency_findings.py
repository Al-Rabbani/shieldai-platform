#!/usr/bin/env python3
"""Close dependency findings that the installed environment already disproves (P3 / B18).

A dependency finding says "version X of package P is vulnerable". That claim is only true while X is
actually installed. This script reads the real venv, asks OSV for the advisory's fixed version, and
closes a finding only when the evidence is unambiguous:

  * the package is NOT installed            -> closed, reason package_not_installed
  * installed version >= the fixed version  -> closed, reason installed_version_is_past_the_fix
  * installed version <  the fixed version  -> LEFT OPEN (a real finding, and the point of the exercise)
  * OSV names no fixed version              -> LEFT OPEN (cannot be disproved)

The installed version is recorded on the finding, so the closure can be re-checked later.

  python3 reconcile_dependency_findings.py            # dry run
  python3 reconcile_dependency_findings.py --apply
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
import urllib.request

import asyncpg

VENV_PIP = "/opt/gds-os/apps/api/venv/bin/pip"
VENV_PY = "/opt/gds-os/apps/api/venv/bin/python"


def installed_versions() -> dict[str, str]:
    out = subprocess.run([VENV_PIP, "list", "--format=json"], capture_output=True, text=True, timeout=120)
    if out.returncode != 0:
        raise SystemExit(f"pip list failed: {out.stderr[:200]}")
    return {p["name"].lower(): p["version"] for p in json.loads(out.stdout)}


def version_key(v: str) -> tuple:
    parts = []
    for chunk in v.replace("-", ".").split("."):
        digits = "".join(ch for ch in chunk if ch.isdigit())
        parts.append(int(digits) if digits else 0)
    return tuple(parts)


def osv_fixed(package: str, cve: str | None, advisory: str | None) -> str | None:
    queries = []
    if cve:
        queries.append({"package": {"name": package, "ecosystem": "PyPI"}, "version": None})
    body = json.dumps({"package": {"name": package, "ecosystem": "PyPI"}}).encode()
    try:
        req = urllib.request.Request("https://api.osv.dev/v1/query", data=body,
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=25) as r:
            data = json.load(r)
    except Exception:  # noqa: BLE001
        return None
    for v in data.get("vulns", []):
        ids = {v.get("id"), *(v.get("aliases") or [])}
        if (cve and cve in ids) or (advisory and advisory in ids):
            for a in v.get("affected", []):
                for rng in a.get("ranges", []):
                    for ev in rng.get("events", []):
                        if ev.get("fixed"):
                            return ev["fixed"]
    return None


async def main_async(a) -> int:
    dsn = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    have = installed_versions()
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute("SELECT set_config('gds.tenant_id', $1::text, false)", a.tenant)
        rows = await conn.fetch(
            "SELECT id, scanner, target, cve, severity, title, external_id FROM security_findings "
            "WHERE tenant_id = $1 AND status = 'open' AND scanner = 'osv'",
            a.tenant,
        )
        plan = []
        for r in rows:
            # A target may carry a version ("ecdsa==0.19.2", "mcp==1.23.3"). Comparing that
            # whole string to the installed set says "not installed" for a package that IS
            # installed, which would close a real finding on a bad reason. Strip to the name.
            pkg = (r["target"] or "").strip().lower()
            for sep in ("==", ">=", "<=", "~=", ">", "<", " "):
                if sep in pkg:
                    pkg = pkg.split(sep, 1)[0]
            pkg = pkg.strip()
            if not pkg:
                continue
            installed = have.get(pkg)
            if installed is None:
                plan.append((r["id"], pkg, None, "package_not_installed",
                             f"{pkg} is not installed in the API venv"))
                continue
            fixed = osv_fixed(pkg, r["cve"], r["external_id"])
            if fixed and version_key(installed) >= version_key(fixed):
                plan.append((r["id"], pkg, installed, "installed_version_is_past_the_fix",
                             f"installed {installed} >= fixed {fixed}"))
            else:
                print(f"  KEEP OPEN {pkg:<16} installed={installed} fixed={fixed}")
        for _, pkg, inst, reason, why in plan:
            print(f"  close {pkg:<16} {reason:<32} {why}")
        print(f"{len(plan)} of {len(rows)} open osv findings disproved by the installed environment")
        if not a.apply:
            print("dry run - pass --apply to write")
            return 0
        async with conn.transaction():
            for fid, pkg, inst, reason, why in plan:
                await conn.execute(
                    "UPDATE security_findings SET status='resolved', resolved_at=now(), "
                    "raw_data = coalesce(raw_data,'{}'::jsonb) || jsonb_build_object("
                    "'closed_reason', $1::text, 'installed_version', $2::text, "
                    "'evidence', $3::text, 'closed_by', 'reconcile_dependency_findings.py') "
                    "WHERE id = $4 AND tenant_id = $5",
                    reason, inst, why, fid, a.tenant,
                )
        print(f"closed {len(plan)} findings")
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
