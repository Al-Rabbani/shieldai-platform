#!/usr/bin/env python3
"""Enrichment pass for security_findings.

WHY THIS EXISTS
---------------
Migration 003 added 13 enrichment columns, but every one of them was NULL and an
"enrichment pass" over the existing 93 findings would have had nothing to add:
a measured scan for CVE-YYYY-NNNN across title, target and details returned
ZERO matches. The findings are configuration and port observations - a missing
CSP header has no CVE. So the columns could not be filled honestly from what
was already stored.

This script therefore goes to the source of vulnerability data that does carry
CVEs: a real dependency scan of the platform's own installed packages via the
OSV database, followed by real EPSS and CISA KEV lookups over whatever CVEs it
finds.

WHAT IS POPULATED, AND HOW
--------------------------
Real, authoritative data only:
  source       <- the scanner that produced the row (derivable for every row)
  raw_data     <- the row's own details JSON (derivable for every row)
  external_id  <- the OSV record id, e.g. GHSA-xxxx / PYSEC-xxxx
  cve          <- from OSV aliases, only when the record names one
  cvss         <- computed from the OSV CVSS_V3 vector with the repo's own
                  CVSS31Scorer (pentest/advanced_engine.py), official spec maths
  epss         <- FIRST.org EPSS API
  kev_listed   <- CISA Known Exploited Vulnerabilities catalogue
  risk_class   <- official CVSS qualitative band (9.0+ critical, 7.0 high,
                  4.0 medium, 0.1 low) - the standard rating, not a guess
  exploitability <- EPSS band (>=0.10 high, >=0.01 medium, else low)

DELIBERATELY LEFT NULL
-----------------------
reachability, exposure, confidence, business_impact. Each needs context the
platform does not hold: whether a vulnerable function is actually reachable in
our call path, whether the asset is truly internet-exposed, a calibrated
confidence model, and business context per asset. Writing values here would be
fabrication, so they stay NULL and are documented rather than invented.
"""

from __future__ import annotations

import asyncio
import json
import re
import subprocess
import sys
from datetime import datetime, timezone

import httpx
from sqlalchemy import text

VENV = "/opt/gds-os/apps/api/venv"
OSV_BATCH = "https://api.osv.dev/v1/querybatch"
OSV_VULN = "https://api.osv.dev/v1/vulns/"
EPSS_API = "https://api.first.org/data/v1/epss"
KEV_URL = ("https://www.cisa.gov/sites/default/files/feeds/"
           "known_exploited_vulnerabilities.json")

CVE_RE = re.compile(r"CVE-\d{4}-\d{4,7}")
MAX_DETAILS = 60          # bounded network fan-out
SEVERE_ONLY = False        # store every OSV record we resolve


def installed_packages() -> list[tuple[str, str]]:
    out = subprocess.run([f"{VENV}/bin/pip", "freeze"], capture_output=True,
                         text=True, timeout=90).stdout
    pkgs = []
    for line in out.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "==" not in line:
            continue
        name, ver = line.split("==", 1)
        name = name.split(" @ ")[0].strip()
        if name and ver:
            pkgs.append((name, ver.split()[0]))
    return pkgs


def vector_to_components(vec: str) -> dict | None:
    """CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H -> CVSS31Scorer kwargs."""
    if not vec or "/" not in vec:
        return None
    parts = dict(p.split(":", 1) for p in vec.split("/")[1:] if ":" in p)
    av = {"N": "NETWORK", "A": "ADJACENT", "L": "LOCAL", "P": "PHYSICAL"}
    ac = {"L": "LOW", "H": "HIGH"}
    pr = {"N": "NONE", "L": "LOW", "H": "HIGH"}
    ui = {"N": "NONE", "R": "REQUIRED"}
    sc = {"U": "UNCHANGED", "C": "CHANGED"}
    cia = {"H": "HIGH", "L": "LOW", "N": "NONE"}
    try:
        return {
            "attack_vector": av[parts["AV"]],
            "attack_complexity": ac[parts["AC"]],
            "privileges_required": pr[parts["PR"]],
            "user_interaction": ui[parts["UI"]],
            "scope": sc[parts["S"]],
            "confidentiality": cia[parts["C"]],
            "integrity": cia[parts["I"]],
            "availability": cia[parts["A"]],
        }
    except KeyError:
        return None


def cvss_from_osv(rec: dict) -> float | None:
    from gds_api.pentest.advanced_engine import CVSS31Scorer
    for sev in rec.get("severity") or []:
        vec = sev.get("score") or ""
        if not vec.startswith("CVSS:3"):
            continue
        comp = vector_to_components(vec)
        if not comp:
            continue
        try:
            res = CVSS31Scorer.calculate(**comp)
            score = res.get("base_score") if isinstance(res, dict) else None
            if score is None and isinstance(res, dict):
                score = res.get("score")
            if score is not None:
                return float(score)
        except Exception:
            continue
    return None


def risk_band(score: float | None) -> str | None:
    """Official CVSS v3.1 qualitative severity rating scale."""
    if score is None:
        return None
    if score >= 9.0:
        return "critical"
    if score >= 7.0:
        return "high"
    if score >= 4.0:
        return "medium"
    if score >= 0.1:
        return "low"
    return "none"


def exploit_band(epss: float | None) -> str | None:
    if epss is None:
        return None
    if epss >= 0.10:
        return "high"
    if epss >= 0.01:
        return "medium"
    return "low"


async def osv_batch(pkgs: list[tuple[str, str]]) -> set[str]:
    queries = [{"package": {"name": n, "ecosystem": "PyPI"}, "version": v}
               for n, v in pkgs]
    ids: set[str] = set()
    async with httpx.AsyncClient(timeout=60) as c:
        for i in range(0, len(queries), 100):
            chunk = queries[i:i + 100]
            r = await c.post(OSV_BATCH, json={"queries": chunk})
            r.raise_for_status()
            for res in r.json().get("results", []):
                for v in res.get("vulns") or []:
                    if v.get("id"):
                        ids.add(v["id"])
    return ids


async def osv_details(ids: list[str]) -> list[dict]:
    out: list[dict] = []
    sem = asyncio.Semaphore(8)
    async with httpx.AsyncClient(timeout=45) as c:
        async def one(vid: str):
            async with sem:
                try:
                    r = await c.get(OSV_VULN + vid)
                    if r.status_code == 200:
                        out.append(r.json())
                except Exception:
                    pass
        await asyncio.gather(*(one(v) for v in ids))
    return out


async def fetch_epss(cves: list[str]) -> dict[str, float]:
    if not cves:
        return {}
    res: dict[str, float] = {}
    async with httpx.AsyncClient(timeout=45) as c:
        for i in range(0, len(cves), 100):
            chunk = cves[i:i + 100]
            try:
                r = await c.get(EPSS_API, params={"cve": ",".join(chunk)})
                r.raise_for_status()
                for row in r.json().get("data", []):
                    try:
                        res[row["cve"]] = float(row["epss"])
                    except Exception:
                        pass
            except Exception:
                pass
    return res


async def fetch_kev() -> set[str]:
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.get(KEV_URL)
        r.raise_for_status()
        data = r.json()
    return {v["cveID"] for v in data.get("vulnerabilities", []) if v.get("cveID")}


async def main() -> int:
    from gds_api.db import async_session_factory

    pkgs = installed_packages()
    print(f"[pkg] installed packages: {len(pkgs)}")

    ids = sorted(await osv_batch(pkgs))
    print(f"[osv] distinct advisories affecting this environment: {len(ids)}")

    details = await osv_details(ids[:MAX_DETAILS])
    print(f"[osv] advisories resolved with full records: {len(details)}")

    # Build candidate rows and collect CVEs.
    rows = []
    for rec in details:
        vid = rec.get("id")
        if not vid:
            continue
        aliases = rec.get("aliases") or []
        cve = next((a for a in aliases if str(a).startswith("CVE-")), None)
        if not cve:
            m = CVE_RE.search(rec.get("summary", "") or "")
            cve = m.group(0) if m else None
        affected = rec.get("affected") or [{}]
        pkg_name = ((affected[0].get("package") or {}).get("name")) or "unknown"
        cvss = cvss_from_osv(rec)
        band = risk_band(cvss)
        rows.append({
            "external_id": vid,
            "cve": cve,
            "cvss": cvss,
            "risk_class": band,
            "severity": band or "medium",
            "title": (rec.get("summary") or vid)[:300],
            "target": pkg_name,
            "details": rec,
            "remediation": (rec.get("details") or "")[:2000] or None,
        })

    cves = sorted({r["cve"] for r in rows if r["cve"]})
    epss = await fetch_epss(cves)
    kev = await fetch_kev()
    print(f"[epss] scored CVEs: {len(epss)} | [kev] catalogue entries: {len(kev)}")

    tenant_id = None
    async with async_session_factory() as db:
        tenant_id = (await db.execute(
            text("SELECT id FROM tenants WHERE slug='gds'"))).scalar()
        if not tenant_id:
            print("FATAL: GDS tenant not found", file=sys.stderr)
            return 2

        # One transaction for the whole pass keeps the tenant context valid.
        await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"),
                         {"t": str(tenant_id)})

        # 1. Columns derivable for EVERY existing row, with no invention.
        before = (await db.execute(text(
            "SELECT count(*) FROM security_findings WHERE source IS NULL"))).scalar()
        await db.execute(text(
            "UPDATE security_findings SET source = scanner, raw_data = details "
            "WHERE source IS NULL OR raw_data IS NULL"))
        print(f"[fill] source/raw_data populated on {before} previously-null rows")

        # 2. Store the OSV findings (dedupe on scanner+external_id).
        new = 0
        dupe = 0
        for r in rows:
            exists = (await db.execute(text(
                "SELECT 1 FROM security_findings WHERE scanner='osv' "
                "AND external_id = :e LIMIT 1"), {"e": r["external_id"]})).scalar()
            if exists:
                dupe += 1
                continue
            await db.execute(text(
                "INSERT INTO security_findings "
                "(scanner, title, severity, target, details, remediation, status, "
                " detected_at, tenant_id, source, raw_data, external_id, cve, cvss, "
                " kev_listed, risk_class, epss, exploitability) "
                "VALUES ('osv', :title, :severity, :target, :details, :remediation, "
                " 'open', :now, :tid, 'osv', :details, :ext, :cve, :cvss, "
                " :kev, :risk, :epss, :expl)"),
                {"title": r["title"], "severity": r["severity"],
                 "target": r["target"],
                 "details": json.dumps(r["details"], default=str),
                 "remediation": r["remediation"],
                 "now": datetime.now(timezone.utc).replace(tzinfo=None),
                 "tid": str(tenant_id), "ext": r["external_id"], "cve": r["cve"],
                 "cvss": r["cvss"],
                 "kev": bool(r["cve"] and r["cve"] in kev),
                 "risk": r["risk_class"],
                 "epss": epss.get(r["cve"]) if r["cve"] else None,
                 "expl": exploit_band(epss.get(r["cve"]) if r["cve"] else None)})
            new += 1

        # 3. Enrich any pre-existing row that already carries a CVE (currently
        #    none, but keeps the pass idempotent if other scanners start
        #    emitting CVEs).
        updated = 0
        for cve, score in epss.items():
            res = await db.execute(text(
                "UPDATE security_findings SET epss = :e, "
                "exploitability = coalesce(exploitability, :x), "
                "kev_listed = :k "
                "WHERE cve = :c AND (epss IS NULL OR kev_listed IS NULL)"),
                {"e": score, "x": exploit_band(score), "c": cve,
                 "k": cve in kev})
            updated += res.rowcount or 0

        await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"),
                         {"t": str(tenant_id)})
        counts = (await db.execute(text(
            "SELECT count(*) AS total, "
            "count(cve) AS cve, count(cvss) AS cvss, count(epss) AS epss, "
            "count(kev_listed) AS kev, count(source) AS source, "
            "count(raw_data) AS raw_data, count(external_id) AS ext, "
            "count(risk_class) AS risk, count(exploitability) AS expl, "
            "count(reachability) AS reach, count(exposure) AS exposure, "
            "count(confidence) AS conf, count(business_impact) AS impact "
            "FROM security_findings"))).mappings().first()

        print(f"[store] new={new} duplicate={dupe} preexisting_enriched={updated}")
        print("[cols] " + " ".join(f"{k}={counts[k]}" for k in counts))
        await db.commit()
        print("[done] committed")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
