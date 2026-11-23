"""Item 36: the CVE register behind the CVE Exploitation Tracker.

MEASURED 23 Nov 2026, before a line of this was written:
  * /v2/cve-tracker renders `base44.entities.CVERecord.list(...)` over a store that does not exist. Of the 100 tables in
    this schema none is a CVE table, so the adapter returned [] and the page printed "No CVE records match this filter."
    That sentence is a claim about the estate, and it was false: the register holds 451 distinct CVEs across 899 findings,
    900 with a CVSS score and 899 with an EPSS score.
  * The page's second tab is worse than empty. ActiveExploitationView counts `cve.ransomware_use` and prints a "Used by
    ransomware" tile, and CVEImpactPanel labels `cve.exploit_maturity`. This platform fetches no exploit-maturity source,
    so that was a zero dressed as a measurement. The ransomware flag was different: the KEV catalogue DOES carry
    it, item 36 wrongly said it did not, and item 37 added kev_ransomware_use (migration 069) so it is now real.
  * What IS measured per CVE: severity, CVSS, EPSS, the KEV flag with its catalogue date, the number of findings, the
    number of distinct assets, the scanners that saw it, the package name from the finding's own evidence, and the first
    and last time it was detected. That is the whole row below.

So this route aggregates the tenant's own register by CVE and serves only what the register holds. Exploit maturity,
ransomware use and public-exploit counts are named as not measured rather than returned as zero or null-that-reads-zero.
"""
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/cve", tags=["cve"])

# Severity has seven spellings across this estate; the page colours by one scale, so the worst row decides the CVE.
_SEVERITY_RANK = """
    CASE lower(severity)
        WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0
    END
"""

# One row per CVE. bool_or keeps NULLs as NULL, so a CVE whose every row was never checked against KEV stays unknown
# rather than being reported as "not exploited".
_AGG_SQL = f"""
WITH agg AS (
    SELECT
        cve AS cve_id,
        max(cvss) AS cvss,
        max(epss) AS epss,
        bool_or(kev_listed) AS kev_listed,
        bool_or(kev_ransomware_use) AS ransomware_known,
        min(kev_date_added) AS kev_date_added,
        min(kev_due_date) AS kev_due_date,
        count(*) AS finding_count,
        count(*) FILTER (WHERE status = 'open') AS open_count,
        count(*) FILTER (WHERE status <> 'open') AS closed_count,
        count(DISTINCT target) FILTER (WHERE target IS NOT NULL) AS asset_count,
        (array_agg(DISTINCT target) FILTER (WHERE target IS NOT NULL))[1:5] AS assets,
        array_agg(DISTINCT coalesce(scanner, source)) FILTER (WHERE coalesce(scanner, source) IS NOT NULL) AS scanners,
        min(detected_at) AS first_detected,
        max(detected_at) AS last_detected,
        (array_agg(title ORDER BY cvss DESC NULLS LAST))[1] AS title,
        (array_agg(details->>'description' ORDER BY cvss DESC NULLS LAST))[1] AS description,
        (array_agg(details->>'package' ORDER BY cvss DESC NULLS LAST))[1] AS package_name,
        (array_agg(severity ORDER BY {_SEVERITY_RANK} DESC))[1] AS severity
    FROM security_findings
    WHERE tenant_id = :tid AND cve IS NOT NULL
    GROUP BY cve
)
SELECT * FROM agg
"""

_COUNT_SQL = """
SELECT
    count(DISTINCT cve) AS distinct_cves,
    count(*) AS findings_with_cve,
    count(*) FILTER (WHERE status = 'open') AS open_findings,
    count(*) FILTER (WHERE status <> 'open') AS closed_findings,
    count(DISTINCT cve) FILTER (WHERE kev_listed IS TRUE) AS kev_cves,
    count(*) FILTER (WHERE kev_listed IS FALSE) AS kev_checked_absent,
    count(*) FILTER (WHERE kev_listed IS NULL) AS kev_unknown,
    count(DISTINCT target) FILTER (WHERE target IS NOT NULL) AS assets_with_cve,
    count(DISTINCT cve) FILTER (WHERE epss >= 0.1) AS high_epss_cves,
    count(DISTINCT cve) FILTER (WHERE lower(severity) = 'critical') AS critical_cves,
    count(DISTINCT cve) FILTER (WHERE lower(severity) = 'high') AS high_cves,
    count(DISTINCT cve) FILTER (WHERE kev_ransomware_use IS TRUE) AS ransomware_cves,
    count(DISTINCT cve) FILTER (WHERE kev_ransomware_use IS NOT NULL) AS ransomware_checked_cves,
    max(enrichment_checked_at) AS last_enriched
FROM security_findings
WHERE tenant_id = :tid AND cve IS NOT NULL
"""

# Dimensions the page renders that no source on this host measures. Named, so a tile can say why it is blank.
NOT_MEASURED = {
    "exploit_maturity": "No exploit-maturity source is collected on this host: no ExploitDB, Metasploit module index, "
    "Nuclei template count or public-exploit feed. The register holds no maturity value, so the tracker cannot rank "
    "a CVE as proof-of-concept or weaponized.",
    "ransomware_leak_sites": "The ransomware FLAG is measured: the CISA KEV catalogue's knownRansomwareCampaignUse "
    "field is stored per finding as kev_ransomware_use and carried here as ransomware_known. What no source on this "
    "host collects is everything past the flag: leak-site presence, victim counts, ransom demands and gang names. "
    "The catalogue names no gang, so a CVE here can be called ransomware-used but never attributed.",
    "public_exploit_count": "No public-exploit count is stored. Nothing on this host enumerates exploit references "
    "against a CVE.",
    "affected_versions": "No affected-version range is stored. The finding's evidence carries the version installed at "
    "scan time, which is what this platform measured; the upstream range was never recorded.",
}


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _item(row: Any) -> dict[str, Any]:
    cve_id = row["cve_id"]
    return {
        # The CVE id is the stable identity of an aggregated row; the page keys its list and its selection on it.
        "id": cve_id,
        "cve_id": cve_id,
        "title": row["title"],
        "description": row["description"],
        "severity": (row["severity"] or "").lower() or None,
        "cvss_score": float(row["cvss"]) if row["cvss"] is not None else None,
        "epss_score": float(row["epss"]) if row["epss"] is not None else None,
        # NULL here means no row of this CVE was ever checked against the catalogue - unknown, not clean.
        "kev_listed": row["kev_listed"],
        "kev_date_added": _iso(row["kev_date_added"]),
        "kev_due_date": _iso(row["kev_due_date"]),
        # Three states again: true = the catalogue flags known ransomware use, false = checked and not flagged,
        # None = the catalogue was never consulted for any row of this CVE.
        "ransomware_known": row["ransomware_known"],
        "finding_count": int(row["finding_count"] or 0),
        "open_count": int(row["open_count"] or 0),
        "closed_count": int(row["closed_count"] or 0),
        "asset_count": int(row["asset_count"] or 0),
        "assets": list(row["assets"] or []),
        "scanners": [s for s in (row["scanners"] or []) if s],
        "package_name": row["package_name"],
        "first_detected": _iso(row["first_detected"]),
        "last_detected": _iso(row["last_detected"]),
        # The page sorts on last_updated; the register's newest detection is the honest source for it.
        "last_updated": _iso(row["last_detected"]),
        # A link, not a measurement: constructed from the id, so it is named as such in basis.
        "nvd_url": f"https://nvd.nist.gov/vuln/detail/{cve_id}" if cve_id else None,
        # Present but empty so a page reading them cannot mistake absence for a stored false.
        "exploit_maturity": None,
        # The legacy key now carries the measured flag. It used to be None so an absent field could not read as a
        # stored false; the field is real since item 37, so None here would be the lie.
        "ransomware_use": row["ransomware_known"],
        "public_exploit_count": None,
    }


@router.get("/records")
async def cve_records(
    limit: int = Query(default=300, ge=1, le=1000),
    q: str | None = None,
    kev: bool | None = None,
    min_epss: float | None = Query(default=None, ge=0.0, le=1.0),
    severity: str | None = None,
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db=Depends(get_db),
) -> dict[str, Any]:
    """One row per CVE in this tenant's register, ranked by what is measured: KEV, then EPSS, then CVSS."""
    tenant_id = str(current_user.tenant_id)
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": tenant_id})

    where: list[str] = []
    params: dict[str, Any] = {"tid": tenant_id, "lim": limit}
    if q:
        where.append("(cve_id ILIKE :q OR title ILIKE :q OR description ILIKE :q)")
        params["q"] = f"%{q}%"
    if kev is True:
        where.append("kev_listed IS TRUE")
    if kev is False:
        # Explicitly "checked and not listed", so an unchecked CVE cannot hide in this filter.
        where.append("kev_listed IS FALSE")
    if min_epss is not None:
        where.append("epss >= :min_epss")
        params["min_epss"] = min_epss
    if severity:
        where.append("lower(severity) = :severity")
        params["severity"] = severity.lower()

    sql = _AGG_SQL + ("WHERE " + " AND ".join(where) + "\n" if where else "")
    sql += "ORDER BY kev_listed DESC NULLS LAST, epss DESC NULLS LAST, cvss DESC NULLS LAST, cve_id LIMIT :lim"

    rows = (await db.execute(text(sql), params)).mappings().all()
    counts = (await db.execute(text(_COUNT_SQL), {"tid": tenant_id})).mappings().one()

    # A filtered page must not print the register totals beside a filtered list.
    matched_sql = "SELECT count(*) FROM (" + sql.replace("LIMIT :lim", "") + ") AS filtered"
    matched = int(
        (await db.execute(text(matched_sql), {k: v for k, v in params.items() if k != "lim"})).scalar() or 0
    )

    last_enriched = counts["last_enriched"]
    kev_cves = int(counts["kev_cves"] or 0)
    kev_absent = int(counts["kev_checked_absent"] or 0)
    kev_unknown = int(counts["kev_unknown"] or 0)

    return {
        "items": [_item(row) for row in rows],
        "counts": {
            "distinct_cves": int(counts["distinct_cves"] or 0),
            "findings_with_cve": int(counts["findings_with_cve"] or 0),
            "open_findings": int(counts["open_findings"] or 0),
            "closed_findings": int(counts["closed_findings"] or 0),
            "kev_cves": kev_cves,
            "kev_checked_absent": kev_absent,
            "kev_unknown": kev_unknown,
            "assets_with_cve": int(counts["assets_with_cve"] or 0),
            "high_epss_cves": int(counts["high_epss_cves"] or 0),
            "critical_cves": int(counts["critical_cves"] or 0),
            "high_cves": int(counts["high_cves"] or 0),
            "ransomware_cves": int(counts["ransomware_cves"] or 0),
            "ransomware_checked_cves": int(counts["ransomware_checked_cves"] or 0),
            "returned": len(rows),
            "matched": matched,
        },
        "not_measured": NOT_MEASURED,
        "basis": {
            "ransomware_flag": "ransomware_known comes from CISA KEV knownRansomwareCampaignUse. true = the catalogue "
            "flags this CVE as used in ransomware campaigns, false = the catalogue was consulted and does not flag it, "
            "null = no row of this CVE was ever checked. It is a flag about the CVE, not evidence that this estate was "
            "attacked, and it names no gang.",
            "source": "Aggregated from this tenant's security_findings, one row per CVE. There is no CVE store on this "
            "platform; the register is the only source of a CVE's presence here.",
            "ranking": "CISA KEV first, then EPSS, then CVSS. Exploit maturity is not used because it is not measured.",
            "kev": f"KEV flags come from the CISA Known Exploited Vulnerabilities catalogue fetched by enrich_findings.py. "
            f"{kev_cves} CVE(s) listed, {kev_absent} finding row(s) checked and absent, {kev_unknown} never checked "
            f"(NULL means unknown, not clean).",
            "last_enriched": last_enriched.isoformat() if last_enriched else None,
            "assets": "asset_count is the number of distinct finding targets carrying the CVE; assets lists at most five.",
            "nvd_url": "Constructed from the CVE id as a convenience link. It is not a stored reference and does not "
            "imply this platform fetched the NVD record.",
        },
    }
