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
import re
import sys
import time

import httpx
from sqlalchemy import text

KEV_URL = ("https://www.cisa.gov/sites/default/files/feeds/"
           "known_exploited_vulnerabilities.json")
EPSS_URL = "https://api.first.org/data/v1/epss"
NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
NVD_CACHE = pathlib.Path("/var/cache/gds/nvd")
NVD_CACHE_TTL = 7 * 24 * 3600
# Prefer a v3.1 score, then v3.0, then v4.0, then v2. Whichever is used is recorded alongside the
# number, because a v4 base score and a v3.1 base score are different measurements of the same CVE.
NVD_PRIORITY = ("cvssMetricV31", "cvssMetricV30", "cvssMetricV40", "cvssMetricV2")
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


CVE_TEXT = re.compile(r"CVE-\d{4}-\d{4,}", re.IGNORECASE)


def extract_cve_from_text(*parts: object) -> str | None:
    """A CVE named in the finding's own text, when the scanner did not record it structurally.

    Only answers when exactly one distinct CVE appears anywhere in the supplied text. Two
    different ids is ambiguous, and picking either would be a guess.
    """
    found: set[str] = set()
    for part in parts:
        if not isinstance(part, str):
            continue
        found.update(match.upper() for match in CVE_TEXT.findall(part))
    return found.pop() if len(found) == 1 else None


def pick_nvd_metric(payload: dict) -> dict | None:
    """The base score NVD published for this CVE, with the version it was measured under.

    This reads a published number; it never computes one. That matters here because OSV publishes
    CVSS v4 vectors for these advisories while the platform's own scorer only implements v3.1 -
    deriving a v3.1 number from a v4 vector would be fabricating a measurement.
    """
    if not isinstance(payload, dict):
        return None
    vulns = payload.get("vulnerabilities") or []
    if not vulns:
        return None
    metrics = (vulns[0].get("cve") or {}).get("metrics") or {}
    for key in NVD_PRIORITY:
        for entry in metrics.get(key) or []:
            data = entry.get("cvssData") or {}
            score = data.get("baseScore")
            if isinstance(score, (int, float)):
                return {
                    "score": float(score),
                    "version": data.get("version"),
                    "vector": data.get("vectorString"),
                    "metric": key,
                }
    return None


def _nvd_cache_path(cve: str) -> pathlib.Path:
    return NVD_CACHE / f"{cve}.json"


def load_cached_nvd(cve: str) -> dict | None:
    path = _nvd_cache_path(cve)
    if path.exists() and (time.time() - path.stat().st_mtime) < NVD_CACHE_TTL:
        try:
            return json.loads(path.read_text())
        except ValueError:
            return None
    return None


def store_cached_nvd(cve: str, payload: dict) -> None:
    NVD_CACHE.mkdir(parents=True, exist_ok=True)
    _nvd_cache_path(cve).write_text(json.dumps(payload))


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


async def cvss_backfill(args) -> int:
    """Fill CVSS from the score NVD published, for CVE-bearing findings that have none.

    Measured before writing this: 237 open findings carried a CVE with cvss NULL while every one of
    them already had EPSS and a KEV answer. The old selection never revisited a row that was missing
    only CVSS, and it accepted a score only if the scanner had already put a number in details.
    Rows NVD has no metric for are marked with a timestamp and left NULL, retried after seven days
    rather than being written as 0.
    """
    from datetime import datetime, timezone

    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    tenant = args.tenant_id
    select_sql = text(
        "SELECT id, cve FROM security_findings "
        "WHERE tenant_id = :t AND status = 'open' AND cve IS NOT NULL AND cvss IS NULL "
        "AND (raw_data->'cvss_lookup'->>'at' IS NULL "
        "     OR (raw_data->'cvss_lookup'->>'at')::timestamptz < now() - interval '7 days') "
        "ORDER BY id LIMIT :n"
    )
    async with async_session_factory() as s:
        await bind_tenant(s, tenant)
        rows = (await s.execute(select_sql, {"t": tenant, "n": args.limit})).mappings().all()
    print(f"cvss_backfill candidates={len(rows)}")
    if not rows:
        return 0

    api_key = os.environ.get("NVD_API_KEY", "").strip()
    # NVD allows 5 requests per 30s without a key, 50 with one.
    delay = 0.8 if api_key else 6.5
    headers = {"apiKey": api_key} if api_key else {}

    scored: list[tuple[int, dict]] = []
    unanswered: list[int] = []
    with httpx.Client(timeout=45, headers=headers) as client:
        for index, row in enumerate(rows, start=1):
            cve = row["cve"]
            payload = load_cached_nvd(cve)
            if payload is None:
                try:
                    response = client.get(NVD_URL, params={"cveId": cve})
                    payload = response.json() if response.status_code == 200 else {"_status": response.status_code}
                except Exception as exc:  # noqa: BLE001 - a feed outage is recorded, never guessed around
                    payload = {"_error": f"{type(exc).__name__}: {exc}"[:200]}
                store_cached_nvd(cve, payload)
                time.sleep(delay)
            metric = pick_nvd_metric(payload)
            if metric:
                scored.append((row["id"], metric))
            else:
                unanswered.append(row["id"])
            if index % 25 == 0:
                print(f"  looked_up={index} scored={len(scored)} no_metric={len(unanswered)}")

    now = datetime.now(timezone.utc).isoformat()
    async with async_session_factory() as s:
        await bind_tenant(s, tenant)
        for finding_id, metric in scored:
            patch = json.dumps({"cvss_lookup": {
                "at": now, "result": "scored", "source": "nvd",
                "metric": metric["metric"], "version": metric["version"], "vector": metric["vector"],
            }})
            await s.execute(text(
                "UPDATE security_findings SET cvss = :score, "
                "raw_data = COALESCE(raw_data, '{}'::jsonb) || CAST(:patch AS jsonb) "
                "WHERE id = :id AND tenant_id = :t"),
                {"score": metric["score"], "patch": patch, "id": finding_id, "t": tenant})
        for finding_id in unanswered:
            patch = json.dumps({"cvss_lookup": {"at": now, "result": "no_metric_published", "source": "nvd"}})
            await s.execute(text(
                "UPDATE security_findings SET "
                "raw_data = COALESCE(raw_data, '{}'::jsonb) || CAST(:patch AS jsonb) "
                "WHERE id = :id AND tenant_id = :t"),
                {"patch": patch, "id": finding_id, "t": tenant})
        await s.commit()
        # NullPool: rebind before reading, or FORCE RLS shows zero rows and it reads as "all done".
        await bind_tenant(s, tenant)
        still = (await s.execute(text(
            "SELECT COUNT(*) FILTER (WHERE cvss IS NULL AND cve IS NOT NULL) AS cvss_gap "
            "FROM security_findings WHERE tenant_id = :t AND status = 'open'"),
            {"t": tenant})).mappings().one()
    print(f"cvss_backfill scored={len(scored)} no_metric_published={len(unanswered)} "
          f"remaining_cvss_gap={still['cvss_gap']}")
    return 0


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tenant-id", default=os.environ.get("GDS_TENANT_ID"))
    ap.add_argument("--limit", type=int, default=500)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--cvss-backfill",
        action="store_true",
        help="fill CVSS for CVE-bearing findings from the score NVD published, then exit",
    )
    args = ap.parse_args()
    if not args.tenant_id:
        print("no tenant id (pass --tenant-id or set GDS_TENANT_ID)", file=sys.stderr)
        return 2

    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    if args.cvss_backfill:
        return await cvss_backfill(args)

    tenant = args.tenant_id
    async with async_session_factory() as s:
        await bind_tenant(s, tenant)
        rows = (await s.execute(text(
            "SELECT id, title, details FROM security_findings "
            "WHERE tenant_id = :t AND status = 'open' "
            "AND (cve IS NULL OR epss IS NULL OR kev_listed IS NULL) "
            "ORDER BY detected_at DESC LIMIT :n"), {"t": tenant, "n": args.limit})).mappings().all()

    candidates = []
    for row in rows:
        details = row["details"] or {}
        cve = extract_cve(details) or extract_cve_from_text(
            row["title"], json.dumps(details)[:4000]
        )
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
