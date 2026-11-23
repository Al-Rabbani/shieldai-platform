"""Item 31: the threat-intel feed behind ThreatIntelFeed, derived from what this platform actually measures.

Measured 23 Nov 2026 before writing this:
  * No threat-intel store exists. Of the 100 tables in this schema none is for threat intel, IOCs, KEV, dark web or
    feeds, so ThreatIntelFeed had nothing behind it and every page rendered an empty list - which reads as "no threats".
  * /platform/intel is served, but it is the header strip (risk score, finding counts, compliance pass rate), not a feed.
  * The register does hold real intel: 899 of 1,002 security_findings carry a CVE, 899 carry an EPSS score and 900 a
    CVSS score. enrich_findings.py fetches the CISA KEV catalogue and FIRST EPSS daily; the cache holds 1,790 KEV
    entries (catalogVersion 2026.11.20), so kev_listed=false is a measurement against a real catalogue, not an empty set.
    Currently kev_listed is true on 0 rows, false on 901 and NULL (never checked) on 101.
  * What does not exist: any external intel subscription (advisory, malware, ransomware, APT) and any dark-web collector.
    Those feed types are named as absent rather than returned as zero.

So this route serves a feed of CVE intel derived from the tenant's own register, states the KEV position with its
catalogue provenance, and names the feed types that have no source. It does not invent items.
"""
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/threat-intel", tags=["threat-intel"])

# The columns the pages read. A finding row already carries every one of them except the derived labels below.
_ITEM_SQL = """
SELECT
    id,
    title,
    severity,
    cve,
    cvss,
    epss,
    kev_listed,
    kev_date_added,
    kev_due_date,
    status,
    target,
    details->>'description' AS description_text,
    details->>'package' AS package_name,
    details->>'evidence' AS installed_evidence,
    remediation,
    coalesce(scanner, source) AS feed_source,
    detected_at,
    CASE WHEN kev_listed IS TRUE THEN 'KEV' ELSE 'CVE' END AS feed_type
FROM security_findings
WHERE tenant_id = :tid
  AND cve IS NOT NULL
"""

_COUNT_SQL = """
SELECT
    count(*) AS total,
    count(*) FILTER (WHERE status = 'open') AS open_total,
    count(*) FILTER (WHERE kev_listed IS TRUE) AS kev_listed,
    count(*) FILTER (WHERE kev_listed IS FALSE) AS kev_checked_absent,
    count(*) FILTER (WHERE kev_listed IS NULL) AS kev_unknown,
    count(*) FILTER (WHERE detected_at >= date_trunc('day', now())) AS new_today,
    max(enrichment_checked_at) AS last_enriched
FROM security_findings
WHERE tenant_id = :tid
  AND cve IS NOT NULL
"""

# Feed types a page can select that this platform has no source for. Stated, never rendered as an empty result.
UNAVAILABLE_FEEDS = {
    "Advisory": "No advisory subscription is configured and no collector exists on this host.",
    "Malware": "No malware feed subscription or sandbox collector exists on this host.",
    "Ransomware": "No ransomware leak-site or tracking collector exists on this host.",
    "APT": "No APT actor tracking source exists on this host, so no actor, campaign or attribution is recorded.",
    "DarkWeb": "No dark-web collector exists on this host. The dark-web routes serve on-demand email and domain "
    "lookups only, not a continuous feed.",
}

# Columns the pages render that no store on this platform fills.
NOT_RECORDED = {
    "affected_versions": "No affected-version range is stored. The evidence string carries the version installed at "
    "scan time, which is what this platform measured; the upstream range was never recorded.",
    "registry": "No package registry is recorded against a finding, so the ecosystem column cannot be filled.",
}


@router.get("/feed")
async def threat_intel_feed(
    limit: int = Query(default=100, ge=1, le=500),
    feed_type: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    q: str | None = None,
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db=Depends(get_db),
) -> dict[str, Any]:
    """CVE intel derived from this tenant's register, newest first, with the KEV position and its provenance."""
    tenant_id = str(current_user.tenant_id)
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": tenant_id})

    if feed_type and feed_type not in ("CVE", "KEV"):
        reason = UNAVAILABLE_FEEDS.get(feed_type)
        if reason:
            # An honest refusal beats an empty list that reads as "nothing is happening".
            return {
                "items": [],
                "counts": {},
                "feed_type_requested": feed_type,
                "unavailable": {feed_type: reason},
                "basis": "The requested feed type has no source on this platform, so no items are returned for it.",
            }

    where = []
    params: dict[str, Any] = {"tid": tenant_id, "lim": limit}
    if feed_type:
        where.append("feed_type = :feed_type")
        params["feed_type"] = feed_type
    if severity:
        where.append("lower(severity) = :severity")
        params["severity"] = severity.lower()
    if status:
        where.append("status = :status")
        params["status"] = status
    if q:
        where.append("(cve ILIKE :q OR title ILIKE :q)")
        params["q"] = f"%{q}%"

    sql = _ITEM_SQL + ("  AND " + " AND ".join(where) + "\n" if where else "")
    sql += "ORDER BY kev_listed DESC NULLS LAST, epss DESC NULLS LAST, cvss DESC NULLS LAST, detected_at DESC LIMIT :lim"

    rows = (await db.execute(text(sql), params)).mappings().all()
    counts = (await db.execute(text(_COUNT_SQL), {"tid": tenant_id})).mappings().one()

    # The register-wide totals above answer "how big is my intel", but a filtered page must not print them beside a
    # filtered list. matched counts exactly what the filters selected.
    matched_sql = "SELECT count(*) FROM (" + sql.replace("LIMIT :lim", "") + ") AS filtered"
    matched = int((await db.execute(text(matched_sql), {k: v for k, v in params.items() if k != "lim"})).scalar() or 0)

    items = [
        {
            "id": str(row["id"]),
            "title": row["title"],
            "feed_type": row["feed_type"],
            "severity": row["severity"],
            "cve_id": row["cve"],
            "description": row["description_text"],
            "source": row["feed_source"],
            "detected_at": row["detected_at"].isoformat() if row["detected_at"] else None,
            "published_at": row["kev_date_added"].isoformat() if row["kev_date_added"] else None,
            "cvss_score": float(row["cvss"]) if row["cvss"] is not None else None,
            "epss_score": float(row["epss"]) if row["epss"] is not None else None,
            "exploited_in_wild": row["kev_listed"],
            "kev_due_date": row["kev_due_date"].isoformat() if row["kev_due_date"] else None,
            "affects_you": True,
            "affected_asset": row["target"],
            "action_required": row["remediation"],
            "status": row["status"],
            "package_name": row["package_name"],
            # The evidence string carries the version installed at scan time, not the affected range.
            "installed_evidence": row["installed_evidence"],
            # Rendered as "not recorded" by the pages rather than as a blank that reads like an empty value.
            "affected_versions": None,
            "registry": None,
        }
        for row in rows
    ]

    last_enriched = counts["last_enriched"]
    return {
        "items": items,
        "counts": {
            "total": int(counts["total"] or 0),
            "open": int(counts["open_total"] or 0),
            "kev_listed": int(counts["kev_listed"] or 0),
            "kev_checked_absent": int(counts["kev_checked_absent"] or 0),
            "kev_unknown": int(counts["kev_unknown"] or 0),
            "new_today": int(counts["new_today"] or 0),
            "returned": len(items),
            "matched": matched,
        },
        "not_recorded": NOT_RECORDED,
        "unavailable": UNAVAILABLE_FEEDS,
        "basis": {
            "source": "Derived from this tenant's security_findings: every row carrying a CVE, with its CVSS, EPSS and "
            "KEV flag. There is no external intel subscription and no feed store on this platform.",
            "affects_you": "True for every item, because the row is a finding against an asset in this tenant's register.",
            "feed_type": "KEV when kev_listed is true, otherwise CVE. No other feed type has a source here.",
            "kev": f"KEV flags come from the CISA Known Exploited Vulnerabilities catalogue fetched by enrich_findings.py. "
            f"{int(counts['kev_listed'] or 0)} listed, {int(counts['kev_checked_absent'] or 0)} checked and absent, "
            f"{int(counts['kev_unknown'] or 0)} never checked (NULL means unknown, not clean).",
            "last_enriched": last_enriched.isoformat() if last_enriched else None,
            "ordering": "KEV first, then EPSS, then CVSS, then most recently detected.",
        },
        "calculated_at": datetime.now(timezone.utc).isoformat(),
    }
