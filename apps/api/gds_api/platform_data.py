"""Live, database-backed implementations for the platform-state tools in tool_gateway.

Why this module exists
----------------------
Every "internal" tool the reasoning loop could call (list_open_findings,
calculate_risk_exposure, review_compliance_posture, triage_finding, ...) used to return a
hardcoded dict. That is not a harmless stub: a mission asked "how many critical findings are
open?" and the agent answered "zero, no open findings in scope" while security_findings held
105 open rows, 2 of them critical. The LLM cannot tell fabricated output from real output, so
a fake tool result is worse than an error - it produces a confident, wrong report.

Rules enforced here
-------------------
1. Every function reads the live Postgres tables through a tenant-bound session.
2. Nothing is invented. Where a table is empty, a column is missing, or a capability is not
   wired (re-test, auto-fix, incident creation), the function returns success=False with an
   explicit code and reason. A tool that cannot answer says so.
3. Derive, never assert. Scores and priorities are computed from row counts and the formula
   is returned with the result so a caller can audit the arithmetic.
4. Tenant scoping is fail-closed. No bound tenant raises; it never falls back to a global read.

Tables that are NOT tenant-partitioned (compliance_assessments, security_incidents) are
reported with tenant_scoped=False rather than being silently mixed into tenant-scoped output.
"""

from __future__ import annotations

import hashlib
import math
import re
import uuid
from typing import Any

import httpx
from sqlalchemy import text

from gds_api.db import async_session_factory
from gds_api.tenant_binding import bind_tenant, current_context_tenant

_SEVERITY_ORDER = ("critical", "high", "medium", "low", "warning", "info", "error")

_GRADE_BANDS = ((90, "A"), (80, "B"), (70, "C"), (60, "D"))

_OPEN_INCIDENT_STATUSES = ("open", "investigating", "contained", "monitoring", "new")


def _tenant_or_raise() -> str:
    tenant = current_context_tenant()
    if not tenant:
        raise RuntimeError(
            "no tenant bound to this task: platform-state tools must run inside a "
            "tenant scope (use_tenant) so RLS cannot return another tenant's rows"
        )
    return tenant


def bounded_limit(value: Any, default: int, maximum: int = 200) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(parsed, maximum))


async def _fetch(sql: str, params: dict[str, Any], tenant: str | None = None) -> list[dict[str, Any]]:
    """Run one read on a fresh session with the current (or given) tenant bound."""
    scope = tenant or _tenant_or_raise()
    async with async_session_factory() as session:
        await bind_tenant(session, scope)
        rows = (await session.execute(text(sql), params)).mappings().all()
    return [dict(r) for r in rows]


def _not_implemented(tool: str, code: str, reason: str, **extra: Any) -> dict[str, Any]:
    return {"success": False, "tool": tool, "code": code, "error": reason, **extra}


def _grade(score: float) -> str:
    for floor, letter in _GRADE_BANDS:
        if score >= floor:
            return letter
    return "F"


# ---------------------------------------------------------------------------------
# Findings
# ---------------------------------------------------------------------------------
async def open_findings(
    *, severity: str | None = None, limit: int = 50, target: str | None = None
) -> dict[str, Any]:
    """Open rows from the authoritative security_findings table."""
    clauses = ["tenant_id = :tid", "status = 'open'"]
    params: dict[str, Any] = {"tid": _tenant_or_raise(), "lim": limit}
    if severity:
        clauses.append("lower(severity) = :sev")
        params["sev"] = severity.strip().lower()
    if target:
        clauses.append("target ILIKE :target")
        params["target"] = f"%{target.strip()}%"
    where = " AND ".join(clauses)

    counts = await _fetch(
        "SELECT lower(severity) AS severity, COUNT(*) AS n FROM security_findings "
        "WHERE tenant_id = :tid AND status = 'open' GROUP BY 1",
        {"tid": params["tid"]},
    )
    by_severity = {row["severity"]: int(row["n"]) for row in counts}
    total_open = sum(by_severity.values())

    rows = await _fetch(
        "SELECT id, scanner, title, severity, target, source, cve, cvss, epss, "
        "kev_listed, reachability, exploitability, exposure, risk_class, confidence, "
        "detected_at, remediation FROM security_findings "
        f"WHERE {where} "
        "ORDER BY CASE lower(severity) WHEN 'critical' THEN 0 WHEN 'high' THEN 1 "
        "WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, detected_at DESC NULLS LAST "
        "LIMIT :lim",
        params,
    )
    for row in rows:
        for key in ("cvss", "epss"):
            if row.get(key) is not None:
                row[key] = float(row[key])
        if row.get("detected_at") is not None:
            row["detected_at"] = row["detected_at"].isoformat()

    return {
        "success": True,
        "tool": "list_open_findings",
        "source": "security_findings (live, tenant-scoped)",
        "tenant_scoped": True,
        "total_open": total_open,
        "by_severity": by_severity,
        "critical_open": by_severity.get("critical", 0),
        "returned": len(rows),
        "filters": {"severity": severity, "target": target, "limit": limit},
        "findings": rows,
    }


async def open_incidents(*, limit: int = 50) -> dict[str, Any]:
    """Open incidents from the tenant-scoped incidents table."""
    placeholders = ", ".join(f":s{i}" for i in range(len(_OPEN_INCIDENT_STATUSES)))
    params: dict[str, Any] = {"tid": _tenant_or_raise(), "lim": limit}
    params.update({f"s{i}": s for i, s in enumerate(_OPEN_INCIDENT_STATUSES)})
    rows = await _fetch(
        "SELECT id, title, severity, status, created_at FROM incidents "
        f"WHERE tenant_id = :tid AND lower(status) IN ({placeholders}) "
        "ORDER BY created_at DESC LIMIT :lim",
        params,
    )
    for row in rows:
        row["id"] = str(row["id"])
        if row.get("created_at") is not None:
            row["created_at"] = row["created_at"].isoformat()
    return {
        "success": True,
        "tool": "list_open_incidents",
        "source": "incidents (live, tenant-scoped)",
        "tenant_scoped": True,
        "count": len(rows),
        "incidents": rows,
        "schema_gap": (
            "the legacy security_incidents table has no tenant_id column, so it is excluded "
            "from tenant-scoped reads until it is migrated; its rows are not counted here"
        ),
    }


async def finding_detail(finding_id: Any) -> dict[str, Any]:
    """One finding by id, tenant-scoped, with a derived priority."""
    tid = _tenant_or_raise()
    try:
        fid = int(str(finding_id).strip())
    except (TypeError, ValueError):
        return _not_implemented(
            "finding_detail", "INVALID_FINDING_ID", "finding_id must be the integer id from list_open_findings"
        )
    rows = await _fetch(
        "SELECT id, scanner, title, severity, target, source, external_id, cve, cvss, epss, "
        "kev_listed, reachability, exploitability, exposure, risk_class, confidence, "
        "business_impact, status, detected_at, resolved_at, remediation FROM security_findings "
        "WHERE tenant_id = :tid AND id = :fid",
        {"tid": tid, "fid": fid},
    )
    if not rows:
        return {
            "success": False,
            "tool": "finding_detail",
            "code": "FINDING_NOT_FOUND",
            "error": f"no finding id {fid} for this tenant",
        }
    row = rows[0]
    for key in ("cvss", "epss"):
        if row.get(key) is not None:
            row[key] = float(row[key])
    for key in ("detected_at", "resolved_at"):
        if row.get(key) is not None:
            row[key] = row[key].isoformat()
    return {"success": True, "source": "security_findings (live, tenant-scoped)", "finding": row}


def derive_priority(finding: dict[str, Any]) -> dict[str, Any]:
    """Deterministic priority from stored fields. Not an LLM opinion, and labelled as such."""
    severity = str(finding.get("severity") or "info").lower()
    cvss = float(finding.get("cvss") or 0.0)
    epss = float(finding.get("epss") or 0.0)
    kev = bool(finding.get("kev_listed"))
    score = {"critical": 40, "high": 25, "medium": 12, "low": 4}.get(severity, 1)
    score += 30 if kev else 0
    score += 15 if cvss >= 9 else 8 if cvss >= 7 else 0
    score += 10 if epss >= 0.5 else 5 if epss >= 0.1 else 0
    band = "P1" if score >= 60 else "P2" if score >= 40 else "P3" if score >= 20 else "P4"
    return {
        "priority": band,
        "score": score,
        "method": "deterministic_severity_cvss_epss_kev",
        "inputs": {"severity": severity, "cvss": cvss, "epss": epss, "kev_listed": kev},
        "formula": "severity base (critical 40/high 25/medium 12/low 4) + KEV 30 + "
        "CVSS>=9 15 or CVSS>=7 8 + EPSS>=0.5 10 or EPSS>=0.1 5",
    }


# ---------------------------------------------------------------------------------
# Missions and approvals
# ---------------------------------------------------------------------------------
async def recent_missions(*, limit: int = 10) -> dict[str, Any]:
    rows = await _fetch(
        "SELECT m.id, m.objective, m.status, m.mission_type, m.created_at, m.completed_at, "
        "COUNT(t.id) AS tasks, "
        "COUNT(t.id) FILTER (WHERE t.status = 'completed') AS tasks_completed, "
        "COUNT(t.id) FILTER (WHERE t.status = 'failed') AS tasks_failed, "
        "COUNT(t.id) FILTER (WHERE t.status IN ('pending', 'running')) AS tasks_outstanding "
        "FROM missions m LEFT JOIN mission_tasks t ON t.mission_id = m.id "
        "WHERE m.tenant_id = :tid GROUP BY m.id, m.objective, m.status, m.mission_type, "
        "m.created_at, m.completed_at ORDER BY m.created_at DESC LIMIT :lim",
        {"tid": _tenant_or_raise(), "lim": limit},
    )
    for row in rows:
        row["id"] = str(row["id"])
        for key in ("created_at", "completed_at"):
            if row.get(key) is not None:
                row[key] = row[key].isoformat()
        for key in ("tasks", "tasks_completed", "tasks_failed", "tasks_outstanding"):
            row[key] = int(row[key])
    return {
        "success": True,
        "tool": "list_recent_missions",
        "source": "missions + mission_tasks (live, tenant-scoped)",
        "count": len(rows),
        "missions": rows,
    }


async def pending_approvals(*, limit: int = 50) -> dict[str, Any]:
    rows = await _fetch(
        "SELECT id, risk_class, action_description, status, created_at FROM approvals "
        "WHERE tenant_id = :tid AND lower(status) = 'pending' "
        "ORDER BY created_at DESC LIMIT :lim",
        {"tid": _tenant_or_raise(), "lim": limit},
    )
    for row in rows:
        row["id"] = str(row["id"])
        if row.get("created_at") is not None:
            row["created_at"] = row["created_at"].isoformat()
    return {
        "success": True,
        "tool": "list_pending_approvals",
        "source": "approvals (live, tenant-scoped)",
        "count": len(rows),
        "approvals": rows,
    }


# ---------------------------------------------------------------------------------
# Derived posture
# ---------------------------------------------------------------------------------
async def risk_exposure() -> dict[str, Any]:
    """Exposure score computed from open findings. Returns the formula with the score."""
    tid = _tenant_or_raise()
    rows = await _fetch(
        "SELECT COUNT(*) AS open_all, "
        "COUNT(*) FILTER (WHERE lower(severity) = 'critical') AS critical, "
        "COUNT(*) FILTER (WHERE lower(severity) = 'high') AS high, "
        "COUNT(*) FILTER (WHERE lower(severity) = 'medium') AS medium, "
        "COUNT(*) FILTER (WHERE lower(severity) = 'low') AS low, "
        "COUNT(*) FILTER (WHERE kev_listed) AS kev_open, "
        "COUNT(*) FILTER (WHERE COALESCE(cvss, 0) >= 9) AS cvss9_open "
        "FROM security_findings WHERE tenant_id = :tid AND status = 'open'",
        {"tid": tid},
    )
    c = {k: int(v or 0) for k, v in rows[0].items()}
    # Severity points, then exponential decay. A linear 100-minus-penalty formula saturated
    # at zero for any realistic backlog (this tenant: 2 critical + 22 high + 74 medium), which
    # makes the number useless for tracking improvement. Decay keeps it monotonic: fixing a
    # high finding always moves the score up, and a clean tenant scores 100.
    points = (
        8.0 * c["critical"] + 4.0 * c["high"] + 1.5 * c["medium"] + 0.5 * c["low"] + 6.0 * c["kev_open"]
    )
    decay_constant = 200.0
    score = 100.0 * math.exp(-points / decay_constant)
    return {
        "success": True,
        "tool": "calculate_risk_exposure",
        "source": "security_findings (live, tenant-scoped)",
        "tenant_scoped": True,
        "exposure_score": round(score, 1),
        "grade": _grade(score),
        "direction": "higher is better",
        "model": "GDS exposure score (defined here), not a vendor or NIST score",
        "inputs": {
            "open_findings": c["open_all"],
            "critical": c["critical"],
            "high": c["high"],
            "medium": c["medium"],
            "low": c["low"],
            "kev_listed_open": c["kev_open"],
            "cvss_at_least_9_open": c["cvss9_open"],
        },
        "formula": "100 * exp(-P/200) where P = 8*critical + 4*high + 1.5*medium + 0.5*low + 6*kev_listed_open",
        "severity_points": round(points, 1),
        "financial_exposure_usd": None,
        "financial_exposure_note": (
            "no loss model is configured, so no currency figure is reported rather than a "
            "placeholder zero"
        ),
    }


async def compliance_posture() -> dict[str, Any]:
    """Per-framework pass/fail from compliance_assessments. This table is not tenant-partitioned."""
    rows = await _fetch(
        "SELECT framework, COUNT(*) AS controls, "
        "COUNT(*) FILTER (WHERE lower(status) = 'pass') AS passing, "
        "COUNT(*) FILTER (WHERE lower(status) = 'fail') AS failing, "
        "MAX(assessment_date) AS last_assessed "
        "FROM compliance_assessments GROUP BY framework ORDER BY framework",
        {},
        tenant=_tenant_or_raise(),
    )
    frameworks = []
    total_controls = total_passing = 0
    for row in rows:
        controls = int(row["controls"])
        passing = int(row["passing"])
        total_controls += controls
        total_passing += passing
        frameworks.append(
            {
                "framework": row["framework"],
                "controls": controls,
                "passing": passing,
                "failing": int(row["failing"]),
                "score_pct": round(passing / controls * 100, 1) if controls else 0.0,
                "last_assessed": row["last_assessed"].isoformat() if row["last_assessed"] else None,
            }
        )
    overall = round(total_passing / total_controls * 100, 1) if total_controls else None
    return {
        "success": True,
        "tool": "review_compliance_posture",
        "source": "compliance_assessments (live)",
        "tenant_scoped": False,
        "tenant_scoped_note": (
            "compliance_assessments has no tenant_id column; these are the platform-wide control "
            "records, not a per-tenant view"
        ),
        "total_controls": total_controls,
        "total_passing": total_passing,
        "overall_score_pct": overall,
        "grade": _grade(overall) if overall is not None else None,
        "frameworks": frameworks,
    }


async def identity_posture() -> dict[str, Any]:
    """Identity posture from real tables, or an explicit statement of what is missing."""
    tid = _tenant_or_raise()
    counts = (
        await _fetch(
            "SELECT (SELECT COUNT(*) FROM users WHERE tenant_id = :tid) AS users, "
            "(SELECT COUNT(*) FROM roles) AS roles, "
            "(SELECT COUNT(*) FROM ciem_findings WHERE tenant_id = :tid) AS ciem_findings, "
            "(SELECT COUNT(*) FROM user_sessions WHERE tenant_id = :tid) AS sessions",
            {"tid": tid},
        )
    )[0]
    counts = {k: int(v or 0) for k, v in counts.items()}
    columns = await _fetch(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = 'users'",
        {"tid": tid},
    )
    has_mfa_column = any(str(c["column_name"]).lower().startswith("mfa") for c in columns)
    if not has_mfa_column and counts["ciem_findings"] == 0:
        return _not_implemented(
            "review_identity_posture",
            "INSUFFICIENT_IDENTITY_DATA",
            "identity posture cannot be graded: the users table has no MFA or privilege "
            "column and ciem_findings is empty, so any grade would be invented",
            observed=counts,
            missing=["users.mfa_enabled", "ciem_findings rows"],
        )
    return {
        "success": True,
        "tool": "review_identity_posture",
        "source": "users + roles + ciem_findings + user_sessions (live, tenant-scoped)",
        "tenant_scoped": True,
        "observed": counts,
        "has_mfa_column": has_mfa_column,
    }


async def architecture_review() -> dict[str, Any]:
    """Real RLS/tenancy posture of the schema, as a factual list of gaps."""
    rows = await _fetch(
        "SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, "
        "c.relforcerowsecurity AS rls_forced, "
        "EXISTS (SELECT 1 FROM information_schema.columns col WHERE col.table_schema = 'public' "
        "AND col.table_name = c.relname AND col.column_name = 'tenant_id') AS has_tenant_id "
        "FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
        "WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname",
        {},
        tenant=_tenant_or_raise(),
    )
    tenant_tables = [r for r in rows if r["has_tenant_id"]]
    forced = [r["table_name"] for r in tenant_tables if r["rls_forced"]]
    enabled_not_forced = [r["table_name"] for r in tenant_tables if r["rls_enabled"] and not r["rls_forced"]]
    no_policy = [r["table_name"] for r in tenant_tables if not r["rls_enabled"]]
    return {
        "success": True,
        "tool": "review_platform_architecture",
        "source": "pg_class + information_schema (live)",
        "tables_total": len(rows),
        "tables_with_tenant_id": len(tenant_tables),
        "rls_forced": len(forced),
        "rls_enabled_not_forced": len(enabled_not_forced),
        "tenant_tables_without_rls": len(no_policy),
        "tenant_tables_without_rls_list": no_policy,
        "note": "a tenant table without FORCE RLS is not enforced for the owning role",
    }


# ---------------------------------------------------------------------------------
# Evidence, knowledge, dependencies
# ---------------------------------------------------------------------------------
async def evidence_integrity(evidence_id: Any) -> dict[str, Any]:
    if not evidence_id:
        return _not_implemented(
            "verify_evidence_integrity", "MISSING_ARGUMENT", "evidence_id is required"
        )
    try:
        eid = uuid.UUID(str(evidence_id))
    except ValueError:
        return _not_implemented(
            "verify_evidence_integrity", "INVALID_EVIDENCE_ID", "evidence_id must be a UUID"
        )
    rows = await _fetch(
        "SELECT id, subject_type, subject_id, storage_key, sha256, content_type, size_bytes, "
        "created_at FROM evidence WHERE tenant_id = :tid AND id = :eid",
        {"tid": _tenant_or_raise(), "eid": eid},
    )
    if not rows:
        return {
            "success": False,
            "tool": "verify_evidence_integrity",
            "code": "EVIDENCE_NOT_FOUND",
            "error": f"no evidence record {eid} for this tenant",
        }
    row = rows[0]
    row["id"] = str(row["id"])
    if row.get("created_at") is not None:
        row["created_at"] = row["created_at"].isoformat()
    return {
        "success": True,
        "tool": "verify_evidence_integrity",
        "source": "evidence (live, tenant-scoped)",
        "verdict": "stored_hash_only",
        "stored_sha256": row.get("sha256"),
        "note": (
            "the recorded hash is returned; re-hashing the object requires a storage read "
            "that is not wired into this tool, so no intact/tampered verdict is claimed"
        ),
        "evidence": row,
    }


async def knowledge_search(*, query: str, limit: int = 5) -> dict[str, Any]:
    from gds_api import memory

    if not query or not str(query).strip():
        return _not_implemented("search_knowledge", "MISSING_ARGUMENT", "query is required")
    tid = uuid.UUID(_tenant_or_raise())
    async with async_session_factory() as session:
        hits = await memory.search_knowledge(
            session, tenant_id=tid, query=str(query), limit=bounded_limit(limit, 5, 20)
        )
    return {
        "success": True,
        "tool": "search_knowledge",
        "source": "knowledge_documents + qdrant (live, tenant-scoped)",
        "query": query,
        "count": len(hits),
        "results": hits,
    }


async def knowledge_add(
    *, title: str, content: str, document_type: str = "manual", mission_id: Any = None
) -> dict[str, Any]:
    from gds_api import memory

    if not content or not str(content).strip():
        return _not_implemented("add_knowledge", "MISSING_ARGUMENT", "content is required")
    tid = uuid.UUID(_tenant_or_raise())
    # created_by_user_id is NOT NULL with an FK to users(id), so a real author is required.
    # No silent substitution of the tenant id here: that would fail the FK.
    authors = await _fetch(
        "SELECT id FROM users WHERE tenant_id = :tid ORDER BY created_at LIMIT 1", {"tid": tid}
    )
    if not authors:
        return _not_implemented(
            "add_knowledge",
            "NO_TENANT_AUTHOR",
            "knowledge_documents.created_by_user_id is NOT NULL and this tenant has no user row "
            "to attribute the document to",
        )
    author_id = uuid.UUID(str(authors[0]["id"]))
    async with async_session_factory() as session:
        doc = await memory.add_knowledge_document(
            session,
            tenant_id=tid,
            user_id=author_id,
            title=(title or str(content)[:80]).strip(),
            content=str(content),
            document_type=document_type,
            source_mission_id=uuid.UUID(str(mission_id)) if mission_id else None,
        )
        await session.commit()
        doc_id = str(doc.id)
    return {
        "success": True,
        "tool": "add_knowledge",
        "source": "knowledge_documents + qdrant (live, tenant-scoped)",
        "document_id": doc_id,
        "title": title,
        "document_type": document_type,
    }


async def record_mission_lesson(*, mission_id: Any, lesson: str) -> dict[str, Any]:
    if not lesson or not str(lesson).strip():
        return _not_implemented("record_mission_lesson", "MISSING_ARGUMENT", "lesson is required")
    return await knowledge_add(
        title=f"Mission lesson {mission_id}" if mission_id else "Mission lesson",
        content=str(lesson),
        document_type="mission_lesson",
        mission_id=mission_id,
    )


async def scan_dependencies(*, requirements_path: str = "/opt/gds-os/apps/api/requirements.txt") -> dict[str, Any]:
    """Real OSV batch query over the API's own pinned requirements."""
    try:
        raw = open(requirements_path, encoding="utf-8").read()
    except OSError as exc:
        return _not_implemented(
            "scan_own_dependencies", "REQUIREMENTS_UNAVAILABLE", f"cannot read {requirements_path}: {exc}"
        )
    packages: list[dict[str, str]] = []
    for line in raw.splitlines():
        line = line.split("#", 1)[0].strip()
        if not line or line.startswith("-"):
            continue
        match = re.match(r"^([A-Za-z0-9_.\-]+)\s*(?:\[[^\]]+\])?\s*==\s*([A-Za-z0-9_.\-+]+)", line)
        if match:
            packages.append({"name": match.group(1), "version": match.group(2)})
    if not packages:
        return _not_implemented(
            "scan_own_dependencies",
            "NO_PINNED_PACKAGES",
            f"{requirements_path} has no name==version pins to scan",
        )
    queries = [{"package": {"name": p["name"], "ecosystem": "PyPI"}, "version": p["version"]} for p in packages]
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.post("https://api.osv.dev/v1/querybatch", json={"queries": queries})
        if resp.status_code != 200:
            return _not_implemented(
                "scan_own_dependencies", "OSV_UNAVAILABLE", f"OSV returned HTTP {resp.status_code}"
            )
        results = resp.json().get("results", [])
    except Exception as exc:  # noqa: BLE001 - surface the reason, never a fabricated clean result
        return _not_implemented("scan_own_dependencies", "OSV_UNAVAILABLE", f"OSV query failed: {exc}")

    vulnerable: list[dict[str, Any]] = []
    for pkg, result in zip(packages, results):
        vulns = result.get("vulns") or []
        if vulns:
            vulnerable.append(
                {
                    "package": pkg["name"],
                    "version": pkg["version"],
                    "advisory_count": len(vulns),
                    "advisory_ids": [v.get("id") for v in vulns][:20],
                }
            )
    return {
        "success": True,
        "tool": "scan_own_dependencies",
        "source": f"OSV.dev querybatch over {requirements_path}",
        "packages_scanned": len(packages),
        "vulnerable_packages": len(vulnerable),
        "advisories_total": sum(v["advisory_count"] for v in vulnerable),
        "vulnerable": vulnerable,
    }


async def threat_indicator(*, indicator: str, indicator_type: str = "unknown") -> dict[str, Any]:
    """No local indicator feed exists; refuse rather than return a false 'no match'."""
    if not indicator:
        return _not_implemented("check_threat_indicator", "MISSING_ARGUMENT", "indicator is required")
    return _not_implemented(
        "check_threat_indicator",
        "INSUFFICIENT_THREAT_INTEL",
        "no indicator feed is loaded on this host (no IOC/domain/IP reputation table), so a "
        "'no match' answer would be a fabricated negative",
        indicator=indicator,
        indicator_type=indicator_type,
        configured_feeds=["OSV.dev (packages)", "CISA KEV (CVEs)"],
    )


def sha256_of(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()
