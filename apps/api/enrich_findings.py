"""Populate the enrichment columns on security_findings with real feed data.

The 13 enrichment columns have existed since migration 003 and stayed NULL because no writer
existed. Two of them are derivable without guessing:

  cve          already present inside details (the dependency scan stores the OSV alias list)
  cvss         same, when OSV supplied a score
  epss         FIRST.org EPSS API, per CVE
  kev_listed   CISA Known Exploited Vulnerabilities catalogue (cached 24h)

Nothing is invented: a finding whose details carry no CVE keeps cve NULL, and a CVE that the
feeds do not know keeps epss/kev_listed NULL rather than defaulting to 0/false.

Run:  python enrich_findings.py [--tenant-id UUID] [--limit N] [--dry-run]
Cron: every 12 hours.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import pathlib
import sys
import time

import httpx
from sqlalchemy import text

KEV_URL = ("https://www.cisa.gov/sites/default/files/feeds/"
           "known_exploited_vulnerabilities.json")
EPSS_URL = "https://api.first.org/data/v1/epss"
CACHE = pathlib.Path("/var/cache/gds/kev.json")
CACHE_TTL = 24 * 3600


def extract_cve(details: dict) -> str | None:
    """Pure helper, unit tested: the CVE this finding refers to, if the scanner recorded one."""
    if not isinstance(details, dict):
        return None
    direct = details.get("cve")
    if isinstance(direct, str) and direct.upper().startswith("CVE-"):
        return direct.upper()
    for alias in details.get("aliases") or []:
        if isinstance(alias, str) and alias.upper().startswith("CVE-"):
            return alias.upper()
    return None


def kev_ids(payload: dict) -> set[str]:
    return {v["cveID"].upper() for v in payload.get("vulnerabilities", []) if v.get("cveID")}


def load_kev() -> tuple[set[str], str]:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    fresh = CACHE.exists() and (time.time() - CACHE.stat().st_mtime) < CACHE_TTL
    if fresh:
        return kev_ids(json.loads(CACHE.read_text())), "cache"
    try:
        with httpx.Client(timeout=60) as c:
            r = c.get(KEV_URL)
            r.raise_for_status()
        CACHE.write_text(r.text)
        return kev_ids(r.json()), "download"
    except Exception as exc:  # network failure must not silently look like "not exploited"
        if CACHE.exists():
            return kev_ids(json.loads(CACHE.read_text())), f"stale-cache ({type(exc).__name__})"
        raise


def fetch_epss(cves: list[str]) -> dict[str, float]:
    out: dict[str, float] = {}
    with httpx.Client(timeout=30) as c:
        for i in range(0, len(cves), 100):
            batch = cves[i:i + 100]
            try:
                r = c.get(EPSS_URL, params={"cve": ",".join(batch)})
                r.raise_for_status()
                for row in r.json().get("data", []):
                    out[row["cve"].upper()] = float(row["epss"])
            except Exception as exc:
                print(f"  EPSS batch failed ({type(exc).__name__}); {len(batch)} CVEs left unknown")
    return out


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tenant-id", default=os.environ.get("GDS_TENANT_ID"))
    ap.add_argument("--limit", type=int, default=500)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if not args.tenant_id:
        print("no tenant id (pass --tenant-id or set GDS_TENANT_ID)", file=sys.stderr)
        return 2

    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    tenant = args.tenant_id
    async with async_session_factory() as s:
        await bind_tenant(s, tenant)
        rows = (await s.execute(text(
            "SELECT id, details FROM security_findings "
            "WHERE tenant_id = :t AND status = 'open' "
            "AND (cve IS NULL OR epss IS NULL OR kev_listed IS NULL) "
            "ORDER BY detected_at DESC LIMIT :n"), {"t": tenant, "n": args.limit})).mappings().all()

    candidates = []
    for row in rows:
        cve = extract_cve(row["details"] or {})
        if cve:
            candidates.append((row["id"], cve, row["details"] or {}))
    cves = sorted({c for _, c, _ in candidates})
    print(f"rows_needing_enrichment={len(rows)} rows_with_cve={len(candidates)} distinct_cves={len(cves)}")
    if not cves:
        return 0

    kev, kev_source = load_kev()
    epss = fetch_epss(cves)
    print(f"kev_source={kev_source} kev_size={len(kev)} epss_known={len(epss)}")

    updates = []
    for fid, cve, details in candidates:
        cvss = details.get("cvss") if isinstance(details.get("cvss"), (int, float)) else None
        updates.append({
            "id": fid, "cve": cve, "cvss": cvss,
            "epss": epss.get(cve), "kev": cve in kev,
            "raw": json.dumps({"kev_source": kev_source, "epss_known": cve in epss}),
        })

    if args.dry_run:
        print(f"dry run: would update {len(updates)} rows; sample={updates[:2]}")
        return 0

    async with async_session_factory() as s:
        await bind_tenant(s, tenant)
        for u in updates:
            await s.execute(text(
                "UPDATE security_findings SET cve = :cve, "
                "cvss = COALESCE(:cvss, cvss), epss = COALESCE(:epss, epss), "
                "kev_listed = :kev, raw_data = COALESCE(raw_data, CAST(:raw AS jsonb)) "
                "WHERE id = :id AND tenant_id = :t"), {**u, "t": tenant})
        await s.commit()
        # NullPool: the commit returned the physical connection to the pool, so this read starts
        # unbound and FORCE RLS would show zero rows - which reads as "all enriched". Re-bind.
        await bind_tenant(s, tenant)
        still = (await s.execute(text(
            "SELECT COUNT(*) FILTER (WHERE cve IS NULL) AS cve_null, "
            "COUNT(*) FILTER (WHERE kev_listed IS NULL) AS kev_null, "
            "COUNT(*) FILTER (WHERE epss IS NULL) AS epss_null "
            "FROM security_findings WHERE tenant_id = :t AND status = 'open'"),
            {"t": tenant})).mappings().one()
    print(f"updated={len(updates)} remaining_open cve_null={still['cve_null']} "
          f"kev_null={still['kev_null']} epss_null={still['epss_null']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
