"""Item 37: the three intelligence pages whose stores do not exist, served honestly.

MEASURED 23 Nov 2026 against the live estate (100 tables, none of them a ransomware, APT, dark-web or breach store):

  * /threat-intelligence/ransomware renders `base44.entities.RansomwareGroup.list(...)` over a store that does not
    exist, and on an empty or failed read it draws FALLBACK_GROUPS: four hardcoded gangs (LockBit 3.0, The Gentlemen,
    Qilin, Akira) with invented victim counts, invented average ransoms and invented leak sites. Above them sits a
    permanent red banner naming LockBit 3.0 as "#1 active ransomware threat to GDS - 47 victims this month, targeting
    EU MSPs directly". None of that came from anywhere. It is the most dangerous kind of fabrication on this platform:
    an MSSP reading it would believe live ransomware tracking was in place.
  * /threat-intelligence/apt renders "No APT actors tracked yet." over the same kind of missing store, which states an
    absence that was never measured.
  * /threat-intelligence/dark-web renders "● MONITORING" with a pulsing dot, "0 Live Alerts" and four zero tiles over
    three stores that do not exist (DarkWebAlert, CredentialLeak, BreachRecord).

WHAT IS ACTUALLY RECORDED, and what this module serves instead:

  * The CISA KEV catalogue this platform fetches every night DOES carry a per-CVE ransomware flag,
    `knownRansomwareCampaignUse` (361 of 1,790 entries "Known" in catalogVersion 2026.11.20). Item 36 stated the
    opposite and was wrong; migration 069 added security_findings.kev_ransomware_use and backfilled it, so the
    ransomware question is now answerable per CVE against this tenant's own register. That is real exposure data.
  * Nothing on this host collects leak sites, victim counts, ransom demands, gang economics, APT attribution or dark-web
    chatter. Those are refused with the reason and the exact source that would be required, never drawn as zero.

So /intel/ransomware serves the measured exposure and the catalogue context; /intel/apt and /intel/dark-web serve a
refusal that a page can render as a stated absence. A refusal is a fact about the platform; an empty list is not.
"""
import json
import pathlib
import time
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/intel", tags=["intel"])

KEV_CACHE = pathlib.Path("/var/cache/gds/kev.json")
_CACHE: dict[str, Any] = {"at": 0.0, "payload": None}

# What no source on this host records, named with the reason and what would have to exist before a page may claim it.
NOT_MEASURED = {
    "leak_site_presence": "No leak-site collector runs on this host. Nothing crawls or watches ransomware extortion "
                          "sites, so a gang's presence on one cannot be confirmed or denied from here.",
    "victim_counts": "Victim counts come from leak-site listings, which are not collected. The CISA KEV flag says a "
                     "CVE is used in ransomware campaigns; it says nothing about how many victims a gang has.",
    "ransom_demands": "No negotiation, payment or extortion data is collected, so no average or median ransom can be "
                      "reported.",
    "gang_attribution": "The KEV catalogue carries no gang name. Attribution to a named group requires a threat-intel "
                        "feed that is not configured here.",
    "negotiation_activity": "No chat, negotiation or payment-tracking source is connected.",
}

APT_NOT_MEASURED = {
    "actor_attribution": "No APT feed, actor database or attribution source is configured on this host.",
    "campaign_tracking": "No campaign store exists. Campaign activity cannot be listed, dated or scored here.",
    "ttps": "MITRE technique mapping for a named actor requires an actor feed. The platform holds no actor-to-TTP "
            "mapping.",
    "targeting": "Sector and geography targeting come from an actor feed, which is absent.",
}


def _catalogue() -> dict[str, Any]:
    """The cached CISA KEV catalogue, re-read when the file changes. Never raises: a missing cache is a stated absence."""
    try:
        stat = KEV_CACHE.stat()
    except OSError as exc:
        return {"available": False, "reason": f"KEV catalogue cache is not readable: {type(exc).__name__}"}
    if _CACHE["payload"] is None or _CACHE["at"] != stat.st_mtime:
        try:
            _CACHE["payload"] = json.loads(KEV_CACHE.read_text())
            _CACHE["at"] = stat.st_mtime
        except (OSError, ValueError) as exc:
            return {"available": False, "reason": f"KEV catalogue cache could not be parsed: {type(exc).__name__}"}
    payload = _CACHE["payload"] or {}
    entries = payload.get("vulnerabilities") or []
    known = [e for e in entries if str(e.get("knownRansomwareCampaignUse", "")).lower() == "known"]
    return {
        "available": True,
        "catalog_version": payload.get("catalogVersion"),
        "released": payload.get("dateReleased"),
        "entries": len(entries),
        "known_ransomware_entries": len(known),
        "cache_age_hours": round((time.time() - stat.st_mtime) / 3600, 1),
        "source": "CISA Known Exploited Vulnerabilities catalogue, cached at /var/cache/gds/kev.json",
        "entries_known": known,
    }


def _iso(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


@router.get("/ransomware")
async def ransomware_exposure(
    limit: int = Query(100, ge=1, le=500),
    db=Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
):
    """This tenant's real ransomware exposure: CVEs the KEV catalogue flags as used in ransomware campaigns."""
    tid = current_user.tenant_id
    # security_findings is FORCE RLS: an unbound read returns nothing, which would read as "no exposure".
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": tid})

    counts = (
        await db.execute(
            text(
                """
                SELECT
                    count(*) FILTER (WHERE kev_ransomware_use IS NOT NULL) AS findings_checked,
                    count(*) FILTER (WHERE kev_ransomware_use IS TRUE) AS flagged_findings,
                    count(DISTINCT cve) FILTER (WHERE kev_ransomware_use IS TRUE) AS flagged_cves,
                    count(*) FILTER (WHERE kev_ransomware_use IS NULL) AS unchecked_findings,
                    count(DISTINCT cve) FILTER (WHERE cve IS NOT NULL) AS distinct_cves
                FROM security_findings
                WHERE tenant_id = :tid
                """
            ),
            {"tid": tid},
        )
    ).mappings().one()

    rows = (
        await db.execute(
            text(
                """
                SELECT cve AS cve_id,
                       (array_agg(title ORDER BY cvss DESC NULLS LAST))[1] AS title,
                       (array_agg(severity ORDER BY cvss DESC NULLS LAST))[1] AS severity,
                       max(cvss) AS cvss_score,
                       max(epss) AS epss_score,
                       min(kev_date_added) AS kev_date_added,
                       min(kev_due_date) AS kev_due_date,
                       count(*) AS finding_count,
                       count(DISTINCT target) FILTER (WHERE target IS NOT NULL) AS asset_count,
                       (array_agg(DISTINCT target) FILTER (WHERE target IS NOT NULL))[1:5] AS assets
                FROM security_findings
                WHERE tenant_id = :tid AND kev_ransomware_use IS TRUE
                GROUP BY cve
                ORDER BY max(epss) DESC NULLS LAST, max(cvss) DESC NULLS LAST
                LIMIT :lim
                """
            ),
            {"tid": tid, "lim": limit},
        )
    ).mappings().all()

    catalogue = _catalogue()
    known_entries = catalogue.pop("entries_known", [])
    # Catalogue context, not exposure: the newest flagged entries, clearly labelled as not on this estate.
    examples = sorted(known_entries, key=lambda e: e.get("dateAdded") or "", reverse=True)[:10]

    items = [
        {
            "id": row["cve_id"],
            "cve_id": row["cve_id"],
            "group_name": row["cve_id"],
            "title": row["title"],
            "severity": row["severity"],
            "cvss_score": row["cvss_score"],
            "epss_score": row["epss_score"],
            "kev_date_added": _iso(row["kev_date_added"]),
            "kev_due_date": _iso(row["kev_due_date"]),
            "finding_count": row["finding_count"],
            "asset_count": row["asset_count"],
            "assets": list(row["assets"] or []),
            "status": "exposed" if row["finding_count"] else "not_on_estate",
            "source": "CISA KEV knownRansomwareCampaignUse",
        }
        for row in rows
    ]

    return {
        "available": True,
        "counts": {
            "findings_checked": counts["findings_checked"],
            "flagged_findings": counts["flagged_findings"],
            "flagged_cves": counts["flagged_cves"],
            "unchecked_findings": counts["unchecked_findings"],
            "distinct_cves": counts["distinct_cves"],
            "returned": len(items),
        },
        "items": items,
        "catalogue": {key: value for key, value in catalogue.items() if key != "available"},
        "catalogue_examples": [
            {
                "cve_id": entry.get("cveID"),
                "vendor": entry.get("vendorProject"),
                "product": entry.get("product"),
                "name": entry.get("vulnerabilityName"),
                "date_added": entry.get("dateAdded"),
                "due_date": entry.get("dueDate"),
            }
            for entry in examples
        ],
        "not_measured": NOT_MEASURED,
        "basis": {
            "exposure": "A CVE is reported as exposure when this tenant holds at least one finding carrying it AND the "
                        "CISA KEV catalogue flags that CVE knownRansomwareCampaignUse = Known.",
            "unknown": "kev_ransomware_use is NULL where the catalogue was never consulted for that finding; those rows "
                       "are counted as unchecked, never as clean.",
            "catalogue_examples": "Catalogue entries are published CVEs, not findings on this estate. They are listed "
                                  "as context and are never counted as exposure.",
        },
    }


@router.get("/apt")
async def apt_coverage(
    db=Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
):
    """No APT source exists here. This endpoint says so in a form a page can render, instead of an empty list."""
    tid = current_user.tenant_id
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": tid})
    recorded = (
        await db.execute(
            text(
                """
                SELECT count(DISTINCT cve) AS distinct_cves,
                       count(*) FILTER (WHERE kev_listed IS TRUE) AS kev_listed_findings
                FROM security_findings WHERE tenant_id = :tid
                """
            ),
            {"tid": tid},
        )
    ).mappings().one()
    return {
        "available": False,
        "reason": "No APT actor source is configured on this platform. There is no actor table, no attribution feed and "
                  "no campaign store, so no actor, campaign or TTP mapping can be listed here.",
        "absent": APT_NOT_MEASURED,
        "what_is_recorded": {
            "distinct_cves_in_register": recorded["distinct_cves"],
            "kev_listed_findings": recorded["kev_listed_findings"],
            "note": "The register records CVEs against assets. It records no actor, campaign or motive, so it cannot be "
                    "used to attribute anything to an APT group.",
        },
        "would_need": [
            "A threat-intel feed carrying actor attribution (for example a commercial APT feed, or MITRE ATT&CK group "
            "data joined to observed indicators).",
            "A campaign store to hold campaigns, their dates and their targeted sectors.",
            "An indicator store to hold the IOCs an actor feed publishes, and a matcher to test them against telemetry.",
        ],
        "items": [],
        "counts": {"returned": 0},
    }


@router.get("/dark-web")
async def dark_web_coverage(
    db=Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
):
    """No dark-web collector exists here. Refused in a renderable form rather than as four zero tiles."""
    tid = current_user.tenant_id
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": tid})
    return {
        "available": False,
        "reason": "No dark-web collector, credential-leak feed or breach-record source is configured on this platform. "
                  "Nothing crawls leak sites, paste sites or breach corpora, and there is no alert store to hold what a "
                  "collector would find.",
        "absent": {
            "alert_feed": "No alert store exists, so there is no feed to page through and no severity to count.",
            "credential_leaks": "No credential-leak source is connected. A '0 leaks' tile would be a claim about the "
                                "estate that nothing measured.",
            "breach_records": "No breach-record source is connected. Breach history for this estate is unknown, not "
                              "empty.",
            "monitoring": "Nothing runs continuously. Any 'MONITORING' indicator would describe a process that does not "
                          "exist.",
        },
        "what_is_recorded": {
            "note": "Credential hygiene that IS measured is served at GET /secrets/posture: which credential names are "
                    "configured in the API environment and which API keys this tenant has issued. That is a different "
                    "question from whether those credentials appear in a breach corpus.",
        },
        "would_need": [
            "A breach-corpus lookup (for example a keyed HIBP or equivalent API) for the tenant's own domains.",
            "A leak-site or paste-site collector, with a store to hold findings and an alerting path.",
        ],
        "items": [],
        "counts": {"returned": 0},
    }
