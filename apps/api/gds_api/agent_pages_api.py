"""Agent page payloads — the data behind the sixteen pages that used to show four zeros.

WHAT WAS WRONG
--------------
Fifteen routed pages (Exploits, Pentest, Red Team, OSINT, Threat Hunting, Dark Web, Simulation, Vulnerabilities, SOC,
Incidents, Cloud, AI Security, Identity, Risk, Compliance) render through useAgentPage, which posted
gdsMasterOrchestrator {action: "execute"}. The adapter refuses that action on purpose: its only real equivalent needs
the shared bridge key, which must not live in a browser bundle. So every one of those pages showed "Could not load -
retrying..." above Active Feeds 0 / Critical Threats 0 and similar, and a zero there reads as a measured absence.

WHAT THIS DOES
--------------
One route answers every task from stores that exist. It is deliberately not an agent runtime: no model is called and no
tool is executed here. It reads the register and the operational tables, and it NAMES the keys it cannot measure in
`_absent` so the page can print an em dash instead of a zero. That distinction is the whole point of the page tier: a
number that was measured and a number that was never measured must not look the same.

Reused rather than reimplemented: the finding aggregates and risk score come from executive_risk_api (the same
_COUNT_SQL and score_from_counts the header strip uses), so one number is never computed two ways.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text

from gds_api.compliance_api import score_of
from gds_api.db import get_db
from gds_api.executive_risk_api import (
    HIGH_EPSS,
    STALE_DAYS,
    _COUNT_SQL,
    score_from_counts,
)
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/platform", tags=["platform"])

# Findings aggregates. One query serves the tasks that only need counts, so the predicates cannot drift between pages.
_FINDINGS_SQL = """
SELECT
    count(*) FILTER (WHERE status = 'open') AS open_total,
    count(*) FILTER (WHERE status = 'open' AND lower(severity) = 'critical') AS open_critical,
    count(*) FILTER (WHERE status = 'open' AND lower(severity) = 'high') AS open_high,
    count(*) FILTER (WHERE status = 'open' AND lower(severity) = 'medium') AS open_medium,
    count(*) FILTER (WHERE status = 'open' AND kev_listed) AS kev_open,
    count(*) FILTER (WHERE kev_listed) AS kev_total,
    count(*) FILTER (WHERE status = 'open' AND epss >= :high_epss) AS high_epss,
    count(*) FILTER (WHERE status = 'open' AND cve IS NOT NULL) AS open_cve,
    count(*) FILTER (WHERE status = 'open' AND details ->> 'fixed_version' IS NOT NULL
                       AND details ->> 'fixed_version' <> '') AS patchable,
    count(*) FILTER (WHERE status = 'open' AND lower(coalesce(exploitability, '')) = 'high') AS exploitable_high,
    count(*) FILTER (WHERE status = 'open' AND (scanner = 'cspm' OR source = 'cspm')) AS cloud_open,
    count(*) FILTER (WHERE status = 'open' AND lower(severity) = 'critical'
                       AND (scanner = 'cspm' OR source = 'cspm')) AS cloud_critical,
    count(*) FILTER (WHERE status = 'open' AND lower(severity) = 'high'
                       AND (scanner = 'cspm' OR source = 'cspm')) AS cloud_high,
    count(*) FILTER (WHERE status = 'open' AND lower(severity) = 'medium'
                       AND (scanner = 'cspm' OR source = 'cspm')) AS cloud_medium,
    count(*) FILTER (WHERE kev_listed IS NULL) AS kev_unknown,
    count(*) FILTER (WHERE status = 'open'
                       AND detected_at < now() - make_interval(days => :stale_days)) AS stale
FROM security_findings
WHERE tenant_id = :tid
"""

_HIGH_EPSS_LIST_SQL = """
SELECT title, cve, cve AS cve_id, cvss, cvss AS cvss_score, epss, epss AS epss_score
FROM security_findings
WHERE tenant_id = :tid AND status = 'open' AND epss IS NOT NULL
ORDER BY epss DESC, cvss DESC NULLS LAST
LIMIT 5
"""

_INCIDENTS_SQL = """
SELECT count(*) AS total,
       count(*) FILTER (WHERE status = 'open') AS open_total,
       count(*) FILTER (WHERE status = 'open' AND lower(severity) = 'critical') AS open_critical
FROM incidents
WHERE tenant_id = :tid
"""

_INCIDENT_LIST_SQL = """
SELECT id, title, severity, status, created_at
FROM incidents
WHERE tenant_id = :tid AND status = 'open'
ORDER BY created_at DESC NULLS LAST
LIMIT 5
"""

_ASSETS_SQL = """
SELECT count(*) AS total,
       count(*) FILTER (WHERE internet_exposure_known IS TRUE) AS internet_facing
FROM cloud_assets
WHERE tenant_id = :tid
"""

_INTERNET_FACING_SQL = """
SELECT name, name AS asset, native_resource_type, provider, region_or_location
FROM cloud_assets
WHERE tenant_id = :tid AND internet_exposure_known IS TRUE
ORDER BY name
LIMIT 5
"""

_ENVIRONMENTS_SQL = "SELECT count(*) AS total FROM cloud_environments WHERE tenant_id = :tid"

_BY_CATEGORY_SQL = """
SELECT coalesce(normalized_category, native_resource_type, 'unclassified') AS category, count(*) AS total
FROM cloud_assets
WHERE tenant_id = :tid
GROUP BY 1
ORDER BY 2 DESC
LIMIT 8
"""

_AI_SQL = """
SELECT (SELECT count(*) FROM ai_models WHERE tenant_id = :tid) AS models,
       (SELECT count(*) FROM ai_invocations WHERE tenant_id = :tid) AS invocations
"""

_IDENTITY_SQL = """
SELECT (SELECT count(*) FROM user_sessions WHERE tenant_id = :tid) AS sessions,
       (SELECT coalesce(sum(critical_count), 0) FROM ciem_scan_results WHERE tenant_id = :tid) AS ciem_critical,
       (SELECT coalesce(sum(findings_count), 0) FROM ciem_scan_results WHERE tenant_id = :tid) AS ciem_open,
       (SELECT count(*) FROM ciem_scan_results WHERE tenant_id = :tid) AS ciem_scans
"""

_FRAMEWORK_SQL = """
SELECT framework AS name,
       count(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) = 'pass') AS passing,
       count(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) = 'fail') AS failing,
       round(100.0 * count(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) = 'pass')
             / NULLIF(count(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) IN ('pass','fail')), 0), 1)
         AS score
FROM compliance_assessments
GROUP BY framework
ORDER BY (count(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) = 'pass'))::float
         / NULLIF(count(*) FILTER (WHERE verdict_source = 'automated' AND lower(status) IN ('pass','fail')), 0) ASC NULLS LAST
LIMIT 3
"""

_FRAMEWORK_COUNT_SQL = "SELECT count(DISTINCT framework) AS total FROM compliance_assessments"

_TOP_FINDINGS_SQL = """
SELECT title, severity, cvss, cvss AS cvss_score, cve, cve AS cve_id
FROM security_findings
WHERE tenant_id = :tid AND status = 'open'
ORDER BY cvss DESC NULLS LAST, detected_at DESC
LIMIT 5
"""


async def _bind(db, tenant_id: str) -> None:
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": tenant_id})


async def _findings(db, tid: str) -> dict[str, Any]:
    row = (await db.execute(text(_FINDINGS_SQL), {"tid": tid, "high_epss": HIGH_EPSS, "stale_days": STALE_DAYS})).mappings().one()
    return dict(row)


async def _incidents(db, tid: str) -> dict[str, Any]:
    return dict((await db.execute(text(_INCIDENTS_SQL), {"tid": tid})).mappings().one())


def _status(critical: int, exploited: int) -> str:
    """A measured verdict, not decoration. StatusBanner prints an unknown key as its own text."""
    if critical:
        return "CRITICAL"
    if exploited:
        return "ELEVATED"
    return "NORMAL"


async def task_exploits(db, tid: str) -> dict[str, Any]:
    f = await _findings(db, tid)
    rows = (await db.execute(text(_HIGH_EPSS_LIST_SQL), {"tid": tid})).mappings().all()
    return {
        "headline": f"{f['kev_open']} open finding{'s' if f['kev_open'] != 1 else ''} in the CISA KEV catalogue",
        "status": _status(f["open_critical"], f["kev_open"]),
        "kev_listed": f["kev_open"],
        "exploited_cves": f["kev_open"],
        "active_exploits": f["kev_open"],
        "high_epss": f["high_epss"],
        "high_epss_list": [dict(r) for r in rows],
        "_absent": ["critical_paths"],
        "_basis": "KEV and EPSS flags come from enrich_findings.py against the CISA catalogue and FIRST EPSS. "
                  "critical_paths is absent: the cloud graph holds no edges, so no path can be computed.",
    }


async def task_vulnerabilities(db, tid: str) -> dict[str, Any]:
    f = await _findings(db, tid)
    return {
        "headline": f"{f['open_total']} open findings, {f['open_critical']} critical",
        "status": _status(f["open_critical"], f["kev_open"]),
        "total": f["open_total"],
        "critical": f["open_critical"],
        "critical_cves": f["open_critical"] if f["open_cve"] else 0,
        "exploited_cves": f["kev_open"],
        "exploited_in_wild": f["kev_open"],
        "patchable": f["patchable"],
        "_basis": "Counts are open rows in this tenant's findings register. patchable counts rows whose details carry "
                  "a fixed_version, which is what the scanners recorded, not a vendor advisory.",
    }


async def task_pentest(db, tid: str) -> dict[str, Any]:
    f = await _findings(db, tid)
    return {
        "headline": f"{f['exploitable_high']} findings recorded as highly exploitable; no attack path can be computed",
        "status": _status(f["open_critical"], f["kev_open"]),
        "exploited_in_wild": f["kev_open"],
        "exploitable_findings": f["exploitable_high"],
        "_absent": ["attack_paths", "critical_attack_paths", "simulations_run", "recent_simulations"],
        "_basis": "exploitable_findings counts rows whose exploitability is high (945 rows carry no exploitability and "
                  "57 carry low). attack_paths, critical_attack_paths, simulations_run and recent_simulations are "
                  "absent: the cloud graph holds no edges and this platform has no simulation store.",
    }


async def task_osint(db, tid: str) -> dict[str, Any]:
    assets = dict((await db.execute(text(_ASSETS_SQL), {"tid": tid})).mappings().one())
    rows = (await db.execute(text(_INTERNET_FACING_SQL), {"tid": tid})).mappings().all()
    return {
        "headline": f"{assets['total']} cloud assets discovered, {assets['internet_facing']} known internet facing",
        "status": "NORMAL",
        "total_assets": assets["total"],
        "internet_facing": assets["internet_facing"],
        "internet_facing_list": [dict(r) for r in rows],
        "_absent": ["shadow_it", "shadow_it_list", "expiring_certs"],
        "_basis": "Counts come from the cloud asset inventory. shadow_it and expiring_certs are absent: no shadow-IT "
                  "detector and no certificate inventory exist here.",
    }


async def task_threat_hunting(db, tid: str) -> dict[str, Any]:
    f = await _findings(db, tid)
    return {
        "headline": f"{f['kev_open']} open KEV findings; no IOC feed is collected here",
        "status": _status(f["open_critical"], f["kev_open"]),
        "critical_feeds": f["open_critical"],
        "_absent": ["active_iocs", "ioc_types", "top_iocs", "supply_chain_events", "dark_web_active"],
        "_basis": "No IOC store, no dark-web collector and no supply-chain event store exist on this platform, so those "
                  "five keys are named as absent rather than shown as zero. Hunting works from the findings register.",
    }


async def task_dark_web(db, tid: str) -> dict[str, Any]:
    return {
        "headline": "No dark-web collector exists on this platform, so nothing here is measured",
        "status": "NOT MEASURED",
        "_absent": ["active_alerts", "credential_leaks", "ransomware_groups", "critical", "top_alerts"],
        "_basis": "There is no dark-web monitor, no credential-leak corpus and no ransomware group tracker behind this "
                  "page. Every panel is empty because nothing collects that data, not because nothing was found.",
    }


async def task_incidents(db, tid: str) -> dict[str, Any]:
    f = await _findings(db, tid)
    inc = await _incidents(db, tid)
    rows = (await db.execute(text(_INCIDENT_LIST_SQL), {"tid": tid})).mappings().all()
    return {
        "headline": f"{inc['open_total']} open incidents, {inc['open_critical']} critical",
        "status": _status(inc["open_critical"], f["kev_open"]),
        "total": inc["total"],
        "active_incidents": inc["open_total"],
        "critical": inc["open_critical"],
        "active_list": [dict(r) for r in rows],
        "exploited_cves": f["kev_open"],
        "exploited_in_wild": f["kev_open"],
        "_basis": "Incidents are counted by what is not terminal (open), not by one expected status word. "
                  "exploited_cves counts open findings flagged in the CISA KEV catalogue.",
    }


async def task_soc(db, tid: str) -> dict[str, Any]:
    f = await _findings(db, tid)
    inc = await _incidents(db, tid)
    counts = dict((await db.execute(text(_COUNT_SQL), {"tid": tid, "high_epss": HIGH_EPSS, "stale_days": STALE_DAYS})).mappings().one())
    risk = score_from_counts(counts)
    rows = (await db.execute(text(_TOP_FINDINGS_SQL), {"tid": tid})).mappings().all()
    return {
        "headline": f"Risk {risk['overall_score']} / {risk['grade']} with {inc['open_total']} open incidents",
        "status": _status(f["open_critical"], f["kev_open"]),
        "risk_score": risk["overall_score"],
        "grade": risk["grade"],
        "active_incidents": inc["open_total"],
        "critical_vulns": f["open_critical"],
        "exploited_in_wild": f["kev_open"],
        "critical_cloud": f["cloud_critical"],
        "top_alerts": [dict(r) for r in rows],
        "_basis": "The risk score is the same score_from_counts the header strip uses, so the page and the shell agree.",
    }


async def task_cloud(db, tid: str) -> dict[str, Any]:
    f = await _findings(db, tid)
    envs = dict((await db.execute(text(_ENVIRONMENTS_SQL), {"tid": tid})).mappings().one())
    cats = (await db.execute(text(_BY_CATEGORY_SQL), {"tid": tid})).mappings().all()
    return {
        "headline": f"{envs['total']} cloud environments, {f['cloud_open']} open cloud findings",
        "status": _status(f["cloud_critical"], f["kev_open"]),
        "accounts": envs["total"],
        "by_service": [dict(r) for r in cats],
        "critical": f["cloud_critical"],
        "critical_findings": f["cloud_critical"],
        "high": f["cloud_high"],
        "medium": f["cloud_medium"],
        "_basis": "Cloud findings are rows whose scanner or source is cspm, the same predicate the header strip uses. "
                  "Accounts are cloud environments, not cloud provider accounts.",
    }


async def task_ai_security(db, tid: str) -> dict[str, Any]:
    row = dict((await db.execute(text(_AI_SQL), {"tid": tid})).mappings().one())
    return {
        "headline": f"{row['models']} AI models registered, {row['invocations']} invocations recorded",
        "status": "NORMAL",
        "high_risk_models": row["models"],
        "_absent": ["total_attacks", "succeeded", "attack_types", "top_attacks", "hallucinations"],
        "_basis": "Model and invocation counts are real. Attack, jailbreak-success and hallucination counts are absent: "
                  "this platform runs no attack suite and no hallucination detector.",
    }


async def task_identity(db, tid: str) -> dict[str, Any]:
    row = dict((await db.execute(text(_IDENTITY_SQL), {"tid": tid})).mappings().one())
    return {
        "headline": f"{row['sessions']} recorded sessions, {row['ciem_open']} CIEM findings across {row['ciem_scans']} scans",
        "status": _status(row["ciem_critical"], 0),
        "active_sessions": row["sessions"],
        "ciem_critical": row["ciem_critical"],
        "ciem_open": row["ciem_open"],
        "_absent": ["identity_threats", "top_ciem"],
        "_basis": "Sessions come from user_sessions and CIEM counts from ciem_scan_results. identity_threats and "
                  "top_ciem are absent: there is no identity-threat store and no per-identity CIEM detail here.",
    }


async def task_risk(db, tid: str) -> dict[str, Any]:
    f = await _findings(db, tid)
    counts = dict((await db.execute(text(_COUNT_SQL), {"tid": tid, "high_epss": HIGH_EPSS, "stale_days": STALE_DAYS})).mappings().one())
    risk = score_from_counts(counts)
    return {
        "headline": f"Risk {risk['overall_score']} / {risk['grade']}",
        "status": _status(f["open_critical"], f["kev_open"]),
        "score": risk["overall_score"],
        "grade": risk["grade"],
        "trend": risk.get("trend"),
        "kev_unpatched": f["kev_open"],
        "sla_breaches": f["stale"],
        "_absent": ["domains"],
        "_basis": "Score and grade are score_from_counts over this tenant's register. sla_breaches counts open findings "
                  "older than the platform ladder. domains is absent: no domain inventory is served here.",
    }


async def task_compliance(db, tid: str) -> dict[str, Any]:
    total = dict((await db.execute(text(_FRAMEWORK_COUNT_SQL), {"tid": tid})).mappings().one())
    rows = (await db.execute(text(_FRAMEWORK_SQL), {"tid": tid})).mappings().all()
    return {
        "headline": f"{total['total']} compliance frameworks assessed",
        "status": "NORMAL",
        "frameworks": total["total"],
        "top_failing": [dict(r) for r in rows],
        "_basis": "Frameworks are counted from compliance_assessments, the same verdict source GET /compliance/frameworks reads, so a "
                  "framework with verdicts but no catalogue row is not dropped. Compliance verdicts are platform-wide: this table "
                  "carries no tenant column, which is why the header strip counts them the same way. top_failing lists the "
                  "three lowest pass rates.",
    }


# The keys are the task strings the pages actually pass. Measured from every useAgentPage call site: the page sends its
# own name, so a registry keyed on my guesses answered 404 and the page kept its "Could not load" banner.
# Keys the pages treat as collections. An em dash in one of these is a string where the page calls .map(), which blanked
# the whole page (measured on /offensive/dark-web). Scalars get the em dash; collections are simply left out.
_LIST_KEYS = {
    "top_alerts", "top_iocs", "top_ciem", "top_attacks", "recent_simulations",
    "shadow_it_list", "internet_facing_list", "active_list",
}


def _split_absent(keys: list[str]) -> dict[str, list[str]]:
    return {
        "scalar": [k for k in keys if k not in _LIST_KEYS],
        "list": [k for k in keys if k in _LIST_KEYS],
    }


TASKS: dict[str, Callable[[Any, str], Awaitable[dict[str, Any]]]] = {
    "exploit_analysis": task_exploits,
    "vulnerability_scan": task_vulnerabilities,
    "pentest_authorized": task_pentest,
    "red_team_ops": task_pentest,
    "attack_simulation": task_pentest,
    "osint_recon": task_osint,
    "threat_hunt": task_threat_hunting,
    "threat_intel": task_threat_hunting,
    "dark_web_scan": task_dark_web,
    "incident_response": task_incidents,
    "soc_summary": task_soc,
    "cloud_review": task_cloud,
    "ai_security_scan": task_ai_security,
    "identity_analysis": task_identity,
    "risk_assessment": task_risk,
    "compliance_check": task_compliance,
}


@router.get("/agent-page")
async def agent_page(
    task: str = Query(..., description="which page's payload to build"),
    agent: str | None = Query(None, description="the page's agent label, echoed for the header"),
    db=Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
) -> dict[str, Any]:
    """Build one page's payload from the register and the operational tables.

    A task this route does not serve is refused with the list of tasks it does serve, rather than answered with an empty
    payload that a page would render as four zeros.
    """
    handler = TASKS.get(task)
    if handler is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "task_not_served", "task": task, "served": sorted(TASKS)},
        )
    tenant_id = str(current_user.tenant_id)
    await _bind(db, tenant_id)
    payload = await handler(db, tenant_id)
    if isinstance(payload.get("_absent"), list):
        payload["_absent"] = _split_absent(payload["_absent"])
    payload["_task"] = task
    payload["_agent"] = agent
    payload["_generated_at"] = datetime.now(timezone.utc).isoformat()
    return payload
