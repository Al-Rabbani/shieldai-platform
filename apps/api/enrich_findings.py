"""Populate the enrichment columns on security_findings with real feed data.

The 13 enrichment columns have existed since migration 003 and stayed NULL because no writer
existed. Two of them are derivable without guessing:

  cve          already present inside details (the dependency scan stores the OSV alias list)
  cvss         same, when OSV supplied a score
  epss         FIRST.org EPSS API, per CVE
  kev_listed   CISA Known Exploited Vulnerabilities catalogue (cached 24h)

Nothing is invented: a finding whose details carry no CVE keeps cve NULL, and a CVE that the
feeds do not know keeps epss/kev_listed NULL rather than defaulting to 0/false.

WHY IT RE-CHECKS RATHER THAN FILLING ONCE. Until 21 Nov 2026 the selection was
`AND (cve IS NULL OR epss IS NULL OR kev_listed IS NULL)`. The first run wrote false into every
row, so from then on that predicate matched nothing it had already touched and the job converged
to a no-op that still exited 0: the log ran 500 rows, then 161, then 38, then 38 examined with 0
carrying a CVE. Both feeds move daily - KEV is republished every day and EPSS is rescored - so a
frozen answer is a wrong answer waiting to happen, and `false` is indistinguishable from `nobody
looked`. Every row is now re-examined once its enrichment_checked_at is older than --max-age-hours,
and kev_listed = false only means something because a timestamp says when it was established.

Run:  python enrich_findings.py [--tenant-id UUID] [--limit N] [--max-age-hours H] [--dry-run]
Cron: every 12 hours, which is why the default staleness window is 12 hours.
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
from datetime import date, datetime, timezone
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


def kev_index(payload: dict) -> dict[str, dict]:
    """Pure helper, unit tested: the catalogue keyed by CVE, keeping the dates the feed publishes.

    The previous loader kept a set of ids and threw dateAdded and dueDate away, so the remediation
    deadline CISA publishes for every listed CVE was lost at load time and could not be recovered
    without re-downloading the feed.
    """
    out: dict[str, dict] = {}
    for v in payload.get("vulnerabilities", []):
        cve = (v.get("cveID") or "").upper()
        if not cve:
            continue
        out[cve] = {
            "date_added": v.get("dateAdded"),
            "due_date": v.get("dueDate"),
            "vendor": v.get("vendorProject"),
            "product": v.get("product"),
            "name": v.get("vulnerabilityName"),
            # Item 37: the catalogue states, per CVE, whether it is known to be used in ransomware campaigns
            # ("Known"/"Unknown"). Discarding it at load time is why item 36 could say no such flag existed.
            "ransomware": str(v.get("knownRansomwareCampaignUse", "")).lower() == "known",
        }
    return out


def kev_ids(payload: dict) -> set[str]:
    """The listed CVE ids alone, kept because callers and tests only need membership."""
    return set(kev_index(payload))


def load_kev() -> tuple[dict[str, dict], str]:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    fresh = CACHE.exists() and (time.time() - CACHE.stat().st_mtime) < CACHE_TTL
    if fresh:
        return kev_index(json.loads(CACHE.read_text())), "cache"
    try:
        with httpx.Client(timeout=60) as c:
            r = c.get(KEV_URL)
            r.raise_for_status()
        CACHE.write_text(r.text)
        return kev_index(r.json()), "download"
    except Exception as exc:  # network failure must not silently look like "not exploited"
        if CACHE.exists():
            return kev_index(json.loads(CACHE.read_text())), f"stale-cache ({type(exc).__name__})"
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


def resolve_cve(row) -> str | None:
    """Pure helper, unit tested: the CVE for one examined row, from the best available evidence.

    details first, because that is what the scanner wrote; then the cve column, because an earlier run
    may have resolved an alias that details does not spell out; then a pattern match over the title and
    a bounded slice of details, for scanners that put the id only in prose.
    """
    details = row["details"] or {}
    return (
        extract_cve(details)
        or (row["cve"].upper() if row.get("cve") else None)
        or extract_cve_from_text(row["title"], json.dumps(details)[:4000])
    )


def as_date(value) -> date | None:
    """Pure helper, unit tested: the KEV feed publishes dates as ISO strings.

    asyncpg refuses a string for a `date` column - "str object has no attribute toordinal" - which is a
    failure a unit test on the mapping alone would not catch, because the mapping looks correct. Caught
    by running the job against the real database with a real KEV CVE.
    """
    if isinstance(value, date):
        return value
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def build_updates(rows, kev: dict[str, dict], epss: dict[str, float], now: str, kev_source: str):
    """Pure helper, unit tested: turn examined rows into the two kinds of write this job performs.

    Returns (cve_updates, no_cve_updates). Splitting them matters: a row with no CVE cannot be looked
    up at all, so it must be stamped as examined without claiming anything about KEV, while a row with
    a CVE gets a real answer and the timestamp that makes that answer evidence.
    """
    cve_updates, no_cve_updates = [], []
    for row in rows:
        cve = resolve_cve(row)
        if not cve:
            no_cve_updates.append({
                "id": row["id"],
                "raw": json.dumps({"at": now, "result": "no_cve_in_finding", "kev_source": kev_source}),
            })
            continue
        entry = kev.get(cve) or {}
        details = row["details"] or {}
        cvss = details.get("cvss") if isinstance(details.get("cvss"), (int, float)) else None
        if cvss is None and isinstance(row.get("cvss"), (int, float)):
            cvss = row["cvss"]
        cve_updates.append({
            "id": row["id"],
            "cve": cve,
            "cvss": cvss,
            "epss": epss.get(cve),
            "kev": cve in kev,
            "kev_date_added": as_date(entry.get("date_added")),
            "kev_due_date": as_date(entry.get("due_date")),
            "kev_ransomware": bool(entry.get("ransomware")) if cve in kev else False,
            "raw": json.dumps({
                "at": now,
                "kev_source": kev_source,
                "kev_size": len(kev),
                "kev_listed": cve in kev,
                "epss_known": cve in epss,
            }),
        })
    return cve_updates, no_cve_updates


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tenant-id", default=os.environ.get("GDS_TENANT_ID"))
    ap.add_argument("--limit", type=int, default=500)
    ap.add_argument(
        "--max-age-hours",
        type=int,
        default=12,
        help="re-examine any open finding whose last enrichment check is older than this (default 12, the cron cadence)",
    )
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
    # Staleness, not emptiness. Selecting only NULLs is what let this job converge to a no-op: the
    # first pass wrote false, and false is not NULL, so nothing it had touched was ever looked at again.
    async with async_session_factory() as s:
        await bind_tenant(s, tenant)
        rows = (await s.execute(text(
            "SELECT id, title, details, cve, cvss FROM security_findings "
            "WHERE tenant_id = :t AND status = 'open' "
            "AND (enrichment_checked_at IS NULL "
            "     OR enrichment_checked_at < now() - make_interval(hours => :age)) "
            "ORDER BY enrichment_checked_at NULLS FIRST, detected_at DESC LIMIT :n"),
            {"t": tenant, "n": args.limit, "age": args.max_age_hours})).mappings().all()

    if not rows:
        print(f"nothing to re-check: no open finding is older than {args.max_age_hours}h in enrichment_checked_at")
        return 0

    cves = sorted({c for c in (resolve_cve(r) for r in rows) if c})
    kev, kev_source = load_kev()
    epss = fetch_epss(cves) if cves else {}
    now = datetime.now(timezone.utc).isoformat()
    cve_updates, no_cve_updates = build_updates(rows, kev, epss, now, kev_source)
    kev_hits = [u for u in cve_updates if u["kev"]]
    print(f"rows_rechecked={len(rows)} with_cve={len(cve_updates)} without_cve={len(no_cve_updates)} "
          f"distinct_cves={len(cves)} kev_hits={len(kev_hits)} epss_known={len(epss)}")
    print(f"kev_source={kev_source} kev_size={len(kev)}")
    print(f"kev_ransomware_flagged={sum(1 for u in cve_updates if u['kev_ransomware'])}")
    for u in kev_hits:
        print(f"  KEV {u['cve']} added={u['kev_date_added']} due={u['kev_due_date']}")

    if args.dry_run:
        print(f"dry run: would stamp {len(cve_updates)} CVE rows and {len(no_cve_updates)} no-CVE rows; "
              f"sample={cve_updates[:2]}")
        return 0

    async with async_session_factory() as s:
        await bind_tenant(s, tenant)
        for u in cve_updates:
            await s.execute(text(
                "UPDATE security_findings SET cve = :cve, "
                "cvss = COALESCE(:cvss, cvss), epss = COALESCE(:epss, epss), "
                "kev_listed = :kev, kev_date_added = :kev_date_added, kev_due_date = :kev_due_date, "
                "kev_ransomware_use = :kev_ransomware, "
                "enrichment_checked_at = now(), "
                "raw_data = jsonb_set(COALESCE(raw_data, '{}'::jsonb), '{enrichment}', CAST(:raw AS jsonb), true) "
                "WHERE id = :id AND tenant_id = :t"), {**u, "t": tenant})
        # A finding with no CVE is examined and stamped, but makes no claim about KEV. Its existing
        # no_cve note (written by enrich_package_findings.py with the alias list and vector) is kept.
        for u in no_cve_updates:
            await s.execute(text(
                "UPDATE security_findings SET enrichment_checked_at = now(), "
                "raw_data = CASE WHEN COALESCE(raw_data, '{}'::jsonb) ? 'no_cve' THEN raw_data "
                "ELSE jsonb_set(COALESCE(raw_data, '{}'::jsonb), '{no_cve}', CAST(:raw AS jsonb), true) END "
                "WHERE id = :id AND tenant_id = :t"), {**u, "t": tenant})
        await s.commit()
        # NullPool: the commit returned the physical connection to the pool, so this read starts
        # unbound and FORCE RLS would show zero rows - which reads as "all enriched". Re-bind.
        await bind_tenant(s, tenant)
        still = (await s.execute(text(
            "SELECT COUNT(*) FILTER (WHERE cve IS NULL) AS cve_null, "
            "COUNT(*) FILTER (WHERE kev_listed IS NULL) AS kev_null, "
            "COUNT(*) FILTER (WHERE epss IS NULL) AS epss_null, "
            "COUNT(*) FILTER (WHERE enrichment_checked_at IS NULL) AS unchecked, "
            "COUNT(*) FILTER (WHERE enrichment_checked_at > now() - make_interval(hours => :age)) AS fresh "
            "FROM security_findings WHERE tenant_id = :t AND status = 'open'"),
            {"t": tenant, "age": args.max_age_hours})).mappings().one()
    print(f"stamped={len(cve_updates) + len(no_cve_updates)} "
          f"remaining_open cve_null={still['cve_null']} kev_null={still['kev_null']} "
          f"epss_null={still['epss_null']} unchecked={still['unchecked']} fresh_within_window={still['fresh']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
