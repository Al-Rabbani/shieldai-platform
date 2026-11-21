#!/usr/bin/env python3
"""Enrich package findings that carry no CVE (P3 / B13).

Trivy and OSV identify advisories by GHSA, PYSEC or GO ids when no CVE has been assigned.
EPSS and the CISA KEV catalogue are keyed by CVE, so those two columns CANNOT be filled for
such a finding - the honest outcome is to record that no CVE exists rather than to leave a
blank that reads like a failed lookup.

For each open package finding with no cve:
  * ask OSV for the advisory,
  * if it has a CVE alias, record the CVE and leave EPSS/KEV to the existing enricher,
  * if it does not, record raw_data.no_cve = {aliases, vector, vendor_severity} and set
    severity from the vendor's own rating,
  * compute a CVSS v3.1 base score from a CVSS_V3 vector (the published formula, not an
    invented number); a CVSS v4.0 vector is recorded verbatim because v4 scoring is a
    macrovector lookup and guessing it would be worse than leaving it unset.

  python3 enrich_package_findings.py            # dry run
  python3 enrich_package_findings.py --apply
"""
from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import sys
import urllib.request

import re

import asyncpg

ADVISORY_RE = re.compile(r"(GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}|PYSEC-\d{4}-\d+|GO-\d{4}-\d+|CVE-\d{4}-\d+)")

VENDOR_SEV = {"CRITICAL": "critical", "HIGH": "high", "MODERATE": "medium", "MEDIUM": "medium", "LOW": "low"}
AV = {"N": 0.85, "A": 0.62, "L": 0.55, "P": 0.20}
AC = {"L": 0.77, "H": 0.44}
UI = {"N": 0.85, "R": 0.62}
CIA = {"H": 0.56, "L": 0.22, "N": 0.0}


def cvss_v3_base(vector: str) -> float | None:
    """CVSS v3.1 base score from a vector string, using the specification's formula."""
    try:
        parts = dict(p.split(":") for p in vector.split("/") if ":" in p)
        scope_changed = parts["S"] == "C"
        pr = {"N": 0.85, "L": 0.68 if scope_changed else 0.62, "H": 0.50 if scope_changed else 0.27}[parts["PR"]]
        iss = 1 - ((1 - CIA[parts["C"]]) * (1 - CIA[parts["I"]]) * (1 - CIA[parts["A"]]))
        if scope_changed:
            impact = 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15
        else:
            impact = 6.42 * iss
        exploitability = 8.22 * AV[parts["AV"]] * AC[parts["AC"]] * pr * UI[parts["UI"]]
        if impact <= 0:
            return 0.0
        raw = min((1.08 if scope_changed else 1.0) * (impact + exploitability), 10.0)
        return math.ceil(raw * 10) / 10
    except (KeyError, ValueError):
        return None


def write_action(entry: dict) -> str:
    """Pure helper, unit tested: what to do with one planned finding.

    "cve" means the advisory resolves to a CVE, so the CVE must be written for EPSS and KEV to have anything to look
    up. "no_cve" means no CVE is assigned anywhere and the finding must say so rather than look unenriched.
    """
    return "cve" if entry.get("cves") else "no_cve"


def osv(advisory_id: str) -> dict | None:
    try:
        with urllib.request.urlopen(f"https://api.osv.dev/v1/vulns/{advisory_id}", timeout=25) as r:
            return json.load(r)
    except Exception as exc:  # noqa: BLE001 - any failure means "not enriched", never a guess
        print(f"  ! OSV lookup failed for {advisory_id}: {exc}")
        return None


async def main_async(a) -> int:
    dsn = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute("SELECT set_config('gds.tenant_id', $1::text, false)", a.tenant)
        rows = await conn.fetch(
            "SELECT id, scanner, external_id, title, cve, cvss FROM security_findings "
            "WHERE tenant_id = $1 AND status = 'open' AND cve IS NULL "
            "AND scanner IN ('trivy','osv')",
            a.tenant,
        )
        print(f"{len(rows)} open package findings without a CVE")
        plan = []
        for r in rows:
            # Some rows carry the advisory id only inside the title ("GHSA-... in <package>"),
            # so read it from there rather than treating the row as unenrichable.
            advisory = r["external_id"]
            if not advisory:
                m = ADVISORY_RE.search(r["title"] or "")
                advisory = m.group(0) if m else None
            if not advisory:
                print(f"  skip (no advisory id anywhere): {(r['title'] or '')[:56]}")
                continue
            rec = osv(advisory)
            if rec is None:
                continue
            aliases = rec.get("aliases") or []
            cves = [x for x in aliases if x.startswith("CVE-")]
            vendor = (rec.get("database_specific") or {}).get("severity")
            sev = VENDOR_SEV.get((vendor or "").upper())
            vectors = [s.get("score") for s in rec.get("severity") or [] if s.get("type") in ("CVSS_V3", "CVSS_V4")]
            score = None
            v3 = [v for v in vectors if v and v.startswith("CVSS:3")]
            if v3 and r["cvss"] is None:
                score = cvss_v3_base(v3[0])
            plan.append({
                "id": r["id"], "advisory": advisory, "cves": cves,
                "aliases": aliases, "vendor": vendor, "severity": sev,
                "vector": vectors[0] if vectors else None, "cvss": score,
            })
        for p in plan:
            if p["cves"]:
                print(f"  {p['advisory']:<26} resolves to CVE {p['cves'][0]} - write it so EPSS and KEV can apply")
            else:
                print(f"  {p['advisory']:<26} no CVE; vendor={p['vendor']} cvss={p['cvss']} "
                      f"vector={str(p['vector'])[:44]}")
        if not a.apply:
            print("dry run - pass --apply to write")
            return 0
        async with conn.transaction():
            for p in plan:
                if write_action(p) == "cve":
                    # The alias resolver is the only component that knows this CVE: it is absent from details,
                    # from the title and from the cve column, so the CVE-keyed enricher cannot discover it. Until
                    # 21 Nov 2026 this branch did `continue`, reasoning that the CVE enricher owned EPSS and KEV -
                    # which was true, but only for CVEs somebody had already written down. Three findings sat with
                    # cve NULL and no EPSS or KEV answer while the answer had been fetched and discarded.
                    # enrichment_checked_at is cleared so the next pass enriches EPSS and KEV for the new CVE
                    # instead of waiting for the staleness window.
                    await conn.execute(
                        "UPDATE security_findings SET "
                        "cve = $1::text, "
                        "raw_data = coalesce(raw_data,'{}'::jsonb) || jsonb_build_object("
                        "'cve_alias', jsonb_build_object('advisory', $2::text, 'cve', $1::text, "
                        "'aliases', $3::text, "
                        "'note', 'CVE resolved from the advisory alias list by enrich_package_findings.py'), "
                        "'enriched_by', 'enrich_package_findings.py'), "
                        "enrichment_checked_at = NULL "
                        "WHERE id = $4 AND tenant_id = $5",
                        p["cves"][0], p["advisory"], json.dumps(p["aliases"]), p["id"], a.tenant,
                    )
                    continue
                await conn.execute(
                    "UPDATE security_findings SET "
                    "severity = coalesce($1::text, severity), "
                    "cvss = coalesce($2::numeric, cvss), "
                    "raw_data = coalesce(raw_data,'{}'::jsonb) || jsonb_build_object("
                    "'no_cve', jsonb_build_object('advisory', $3::text, 'aliases', $4::text, "
                    "'vendor_severity', $5::text, 'vector', $6::text, "
                    "'note', 'no CVE assigned, so EPSS and CISA KEV do not apply'), "
                    "'enriched_by', 'enrich_package_findings.py') "
                    "WHERE id = $7 AND tenant_id = $8",
                    p["severity"], p["cvss"], p["advisory"],
                    json.dumps(p["aliases"]), p["vendor"], p["vector"],
                    p["id"], a.tenant,
                )
        print(f"enriched {sum(1 for p in plan if not p['cves'])} findings with no CVE, "
              f"resolved {sum(1 for p in plan if p['cves'])} to a CVE")
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
