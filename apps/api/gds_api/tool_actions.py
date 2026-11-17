"""Real implementations for the governed tool actions that used to be fiction.

Each function here either does the real thing or refuses with an explicit code and the exact
missing piece. Nothing in this module fabricates an identifier, a verdict or a count: the six
tools it backs previously returned INC-AUTO-001, PENTEST-001, "still_present: false",
"fixed: true" and "purged: true" without touching anything.

Every write binds the tenant first, because these tables are FORCE RLS and an unbound write
fails while an unbound read silently returns nothing.
"""

from __future__ import annotations

import ipaddress
import json
import os
import re
import subprocess
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy import text

from gds_api.db import async_session_factory
from gds_api.tenant_binding import bind_tenant, current_context_tenant

SEVERITY_RANK = {"info": 0, "low": 1, "warning": 2, "medium": 3, "high": 4, "error": 5, "critical": 6}
SEVERITY_FROM_RANK = {v: k for k, v in SEVERITY_RANK.items() if k != "warning"}


def _refuse(tool: str, code: str, reason: str, **extra: Any) -> dict[str, Any]:
    return {"success": False, "tool": tool, "code": code, "error": reason, **extra}


def _tenant() -> str:
    tenant = current_context_tenant()
    if not tenant:
        raise RuntimeError("no tenant bound to this tool execution")
    return str(tenant)


def _actor(actor_id: Any) -> str | None:
    try:
        return str(uuid.UUID(str(actor_id))) if actor_id else None
    except (ValueError, AttributeError, TypeError):
        return None


# --------------------------------------------------------------------------------------
# Re-test an existing finding against the thing that produced it
# --------------------------------------------------------------------------------------

_PINNED = re.compile(r"^(?P<name>[A-Za-z0-9_.\-]+)==(?P<version>[A-Za-z0-9_.\-+]+)$")


async def _osv_vuln_for(package: str, version: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(
            "https://api.osv.dev/v1/query",
            json={"package": {"name": package, "ecosystem": "PyPI"}, "version": version},
        )
    if resp.status_code != 200:
        raise RuntimeError(f"OSV returned HTTP {resp.status_code}")
    return resp.json().get("vulns") or []


async def retest_finding(finding_id: Any) -> dict[str, Any]:
    """Re-run a deterministic check for one finding and record the verdict on the row.

    Only checks that can answer definitively are attempted. Anything else returns
    RE_TEST_UNSUPPORTED with the reason, which is the whole point: a fabricated "clean"
    result is how a still-exploitable finding gets quietly closed.
    """
    tool = "validate_finding"
    try:
        fid = int(str(finding_id))
    except (ValueError, TypeError):
        return _refuse(tool, "MISSING_ARGUMENT", "finding_id must be an integer security_findings id")
    tenant = _tenant()
    async with async_session_factory() as session:
        await bind_tenant(session, tenant)
        row = (
            await session.execute(
                text(
                    "SELECT id, scanner, title, severity, target, status, details, external_id, cve, "
                    "raw_data, remediation FROM security_findings WHERE id = :id AND tenant_id = :t"
                ),
                {"id": fid, "t": tenant},
            )
        ).mappings().first()
        if not row:
            return _refuse(tool, "FINDING_NOT_FOUND", f"no finding {fid} in this tenant")

        target = (row["target"] or "").strip()
        evidence: dict[str, Any] = {"checked_at": datetime.now(UTC).isoformat()}
        verdict: str | None = None
        still_present: bool | None = None

        pinned = _PINNED.match(target)
        if pinned:
            package, version = pinned.group("name"), pinned.group("version")
            try:
                vulns = await _osv_vuln_for(package, version)
            except Exception as exc:  # noqa: BLE001 - no answer is not a clean answer
                return _refuse(tool, "RETEST_SOURCE_UNAVAILABLE", f"OSV query failed: {exc}", finding_id=fid)
            stored_id = (row["external_id"] or "").split(":", 1)[0]
            still = [
                v for v in vulns
                if v.get("id") == stored_id or stored_id in (v.get("aliases") or [])
                or (row["cve"] and v.get("aliases") and row["cve"] in v.get("aliases"))
            ]
            still_present = bool(still)
            verdict = "still_present" if still_present else "no_longer_listed"
            evidence.update(
                {
                    "method": "osv_query",
                    "package": package,
                    "version": version,
                    "advisory_sought": stored_id or row["cve"],
                    "advisories_for_version": [v.get("id") for v in vulns][:20],
                    "matched_advisory": still[0].get("id") if still else None,
                }
            )
        elif row["scanner"] == "security_headers" and target.startswith(("http://", "https://")):
            header = None
            for candidate in (
                "content-security-policy", "strict-transport-security", "x-frame-options",
                "x-content-type-options", "referrer-policy", "permissions-policy",
            ):
                if candidate.replace("-", " ") in (row["title"] or "").lower() or candidate in (row["title"] or "").lower():
                    header = candidate
                    break
            if not header:
                return _refuse(
                    tool, "RE_TEST_UNSUPPORTED",
                    "header finding does not name a header this check can verify",
                    finding_id=fid, title=row["title"],
                )
            try:
                async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                    resp = await client.get(target)
            except Exception as exc:  # noqa: BLE001
                return _refuse(tool, "RETEST_SOURCE_UNAVAILABLE", f"HTTP check failed: {exc}", finding_id=fid)
            present = resp.headers.get(header)
            still_present = not present
            verdict = "still_present" if still_present else "fixed"
            evidence.update(
                {"method": "http_header_check", "url": target, "header": header,
                 "observed": present, "status_code": resp.status_code}
            )
        else:
            return _refuse(
                tool,
                "RE_TEST_UNSUPPORTED",
                "no deterministic re-test exists for this finding type: it is neither a pinned "
                "dependency advisory nor a named security-header finding",
                finding_id=fid, scanner=row["scanner"], target=target,
            )

        reverification = {
            "verdict": verdict,
            "still_present": still_present,
            "checked_at": evidence["checked_at"],
            "evidence": evidence,
        }
        await session.execute(
            text(
                "UPDATE security_findings SET details = jsonb_set(coalesce(details, '{}'::jsonb), "
                "'{reverification}', CAST(:v AS jsonb), true) WHERE id = :id AND tenant_id = :t"
            ),
            {"v": json.dumps(reverification), "id": fid, "t": tenant},
        )
        await session.commit()
    return {
        "success": True,
        "tool": tool,
        "finding_id": fid,
        "source": "live re-test, verdict written to the finding",
        "verdict": verdict,
        "still_present": still_present,
        "evidence": evidence,
        "note": "finding status was not changed; closing it stays a human decision",
    }


# --------------------------------------------------------------------------------------
# Automated dependency fix on a real branch
# --------------------------------------------------------------------------------------


def _git(cwd: str, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, timeout=120)


async def autofix_finding(finding_id: Any) -> dict[str, Any]:
    """Raise the pinned version of a vulnerable dependency on a throwaway branch.

    Deliberately does NOT push or merge: it produces a real, reviewable commit and reports the
    branch. A dependency fix that lands itself is an outage waiting for a reviewer to blink.
    """
    tool = "auto_fix_finding"
    try:
        fid = int(str(finding_id))
    except (ValueError, TypeError):
        return _refuse(tool, "MISSING_ARGUMENT", "finding_id must be an integer security_findings id")
    tenant = _tenant()
    async with async_session_factory() as session:
        await bind_tenant(session, tenant)
        finding = (
            await session.execute(
                text(
                    "SELECT id, title, target, status, external_id, raw_data, remediation "
                    "FROM security_findings WHERE id = :id AND tenant_id = :t"
                ),
                {"id": fid, "t": tenant},
            )
        ).mappings().first()
        if not finding:
            return _refuse(tool, "FINDING_NOT_FOUND", f"no finding {fid} in this tenant")
        repo = (
            await session.execute(
                text(
                    "SELECT id, display_name, working_directory, default_branch FROM repositories "
                    "WHERE tenant_id = :t AND status = 'active' ORDER BY created_at LIMIT 1"
                ),
                {"t": tenant},
            )
        ).mappings().first()

    pinned = _PINNED.match((finding["target"] or "").strip())
    if finding["status"] in ("resolved", "false_positive"):
        return _refuse(tool, "FINDING_CLOSED", f"finding {fid} is already {finding['status']}")
    if not pinned:
        return _refuse(
            tool, "AUTOFIX_UNSUPPORTED",
            "only pinned dependency findings can be fixed automatically; this finding's target is not "
            "a package==version pin",
            finding_id=fid, target=finding["target"],
        )
    raw = finding["raw_data"] or {}
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            raw = {}
    fixed_version = raw.get("fixed_version")
    if not fixed_version:
        return _refuse(
            tool, "NO_FIXED_VERSION",
            "the advisory records no fixed version, so there is nothing deterministic to upgrade to",
            finding_id=fid,
        )
    if not repo:
        return _refuse(
            tool, "REPOSITORY_NOT_REGISTERED",
            "no repository is registered for this tenant, so there is no codebase to patch",
            finding_id=fid,
        )
    workdir = repo["working_directory"]
    if not workdir or not os.path.isdir(workdir):
        return _refuse(
            tool, "REPOSITORY_WORKDIR_MISSING",
            f"registered working_directory {workdir!r} is not present on this host",
            repository=repo["display_name"],
        )

    dirty = _git(workdir, "status", "--porcelain").stdout.strip()
    if dirty:
        return _refuse(
            tool, "WORKTREE_DIRTY",
            "the autofix workspace has uncommitted changes; refusing to build a branch on top of them",
            repository=repo["display_name"], changed_files=len(dirty.splitlines()),
        )

    package, installed = pinned.group("name"), pinned.group("version")
    base = repo["default_branch"] or "main"
    branch = f"gds/autofix/{fid}-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}"
    co = _git(workdir, "checkout", "-q", base)
    if co.returncode != 0:
        return _refuse(tool, "GIT_CHECKOUT_FAILED", co.stderr.strip()[:400], repository=repo["display_name"])
    br = _git(workdir, "checkout", "-q", "-b", branch)
    if br.returncode != 0:
        return _refuse(tool, "GIT_BRANCH_FAILED", br.stderr.strip()[:400], repository=repo["display_name"])

    requirements = os.path.join(workdir, "apps", "api", "requirements.txt")
    if not os.path.isfile(requirements):
        _git(workdir, "checkout", "-q", base)
        _git(workdir, "branch", "-D", branch)
        return _refuse(tool, "REQUIREMENTS_NOT_FOUND", f"{requirements} does not exist", repository=repo["display_name"])

    lines = open(requirements, encoding="utf-8").read().splitlines()
    changed_line = None
    for index, line in enumerate(lines):
        stripped = line.split("#", 1)[0].strip()
        match = _PINNED.match(stripped)
        if match and match.group("name").lower() == package.lower():
            changed_line = f"{package}=={fixed_version}"
            lines[index] = changed_line
            break
    if changed_line is None:
        _git(workdir, "checkout", "-q", base)
        _git(workdir, "branch", "-D", branch)
        return _refuse(
            tool, "PACKAGE_NOT_PINNED",
            f"{package} is not pinned in apps/api/requirements.txt, so the fix needs a human decision",
            repository=repo["display_name"],
        )

    open(requirements, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    _git(workdir, "add", "apps/api/requirements.txt")
    commit = _git(
        workdir, "commit", "-q", "-m",
        f"security: raise {package} {installed} -> {fixed_version} for finding {fid}",
    )
    if commit.returncode != 0:
        _git(workdir, "checkout", "-q", base)
        _git(workdir, "branch", "-D", branch)
        return _refuse(tool, "GIT_COMMIT_FAILED", commit.stderr.strip()[:400], repository=repo["display_name"])
    sha = _git(workdir, "rev-parse", "HEAD").stdout.strip()
    diff = _git(workdir, "show", "--stat", "--format=", "HEAD").stdout.strip()
    _git(workdir, "checkout", "-q", base)

    async with async_session_factory() as session:
        await bind_tenant(session, tenant)
        await session.execute(
            text(
                "UPDATE security_findings SET details = jsonb_set(coalesce(details, '{}'::jsonb), "
                "'{autofix}', CAST(:v AS jsonb), true) WHERE id = :id AND tenant_id = :t"
            ),
            {
                "v": json.dumps({"branch": branch, "commit": sha, "to_version": fixed_version,
                                 "at": datetime.now(UTC).isoformat(), "pushed": False}),
                "id": fid,
                "t": tenant,
            },
        )
        await session.commit()

    return {
        "success": True,
        "tool": tool,
        "finding_id": fid,
        "source": "real git commit in the registered repository",
        "repository": repo["display_name"],
        "branch": branch,
        "commit": sha,
        "package": package,
        "from_version": installed,
        "to_version": fixed_version,
        "diff": diff,
        "pushed": False,
        "note": "branch is local and unpushed; open a PR when the change is reviewed",
    }


# --------------------------------------------------------------------------------------
# Incident creation from findings
# --------------------------------------------------------------------------------------


async def create_incident_from_findings(
    finding_ids: Any, title: str | None = None, *, actor_id: Any = None
) -> dict[str, Any]:
    """Create a real incident row and link the findings that justify it."""
    tool = "create_incident_from_findings"
    if isinstance(finding_ids, (int, str)):
        finding_ids = [finding_ids]
    if not finding_ids:
        return _refuse(tool, "MISSING_ARGUMENT", "finding_ids must contain at least one finding id")
    ids: list[int] = []
    for value in finding_ids:
        try:
            ids.append(int(str(value)))
        except (ValueError, TypeError):
            return _refuse(tool, "INVALID_ARGUMENT", f"{value!r} is not an integer finding id")
    tenant = _tenant()
    async with async_session_factory() as session:
        await bind_tenant(session, tenant)
        rows = (
            await session.execute(
                text(
                    "SELECT id, title, severity, status, target FROM security_findings "
                    "WHERE tenant_id = :t AND id = ANY(:ids)"
                ),
                {"t": tenant, "ids": ids},
            )
        ).mappings().all()
        found = {row["id"] for row in rows}
        missing = [i for i in ids if i not in found]
        if not rows:
            return _refuse(tool, "FINDING_NOT_FOUND", "none of the supplied findings exist in this tenant",
                           requested=ids, missing=missing)
        top_severity = max((row["severity"] or "info" for row in rows), key=lambda s: SEVERITY_RANK.get(s, 0))
        incident_title = title or f"Incident: {len(rows)} finding(s) — {rows[0]['title'][:120]}"
        summary = "\n".join(
            f"- [{row['severity']}] #{row['id']} {row['title']} (target: {row['target']})" for row in rows
        )
        incident_id = (
            await session.execute(
                text(
                    "INSERT INTO incidents (id, tenant_id, title, summary, severity, status) "
                    "VALUES (gen_random_uuid(), :t, :title, :summary, :sev, 'open') RETURNING id"
                ),
                {"t": tenant, "title": incident_title[:200], "summary": summary, "sev": top_severity},
            )
        ).scalar_one()
        for row in rows:
            await session.execute(
                text(
                    "INSERT INTO incident_findings (id, incident_id, security_finding_id) "
                    "VALUES (gen_random_uuid(), :i, :f) ON CONFLICT DO NOTHING"
                ),
                {"i": incident_id, "f": row["id"]},
            )
        await session.commit()
    return {
        "success": True,
        "tool": tool,
        "source": "incidents + incident_findings (live write)",
        "incident_id": str(incident_id),
        "title": incident_title,
        "severity": top_severity,
        "linked_findings": sorted(found),
        "missing_findings": missing,
    }


# --------------------------------------------------------------------------------------
# Pentest engagement against an authorised target only
# --------------------------------------------------------------------------------------


async def coordinate_pentest_engagement(
    name: Any,
    targets: Any,
    *,
    rules_of_engagement: str | None = None,
    allowed_techniques: Any = None,
    prohibited_techniques: Any = None,
    mission_id: Any = None,
    actor_id: Any = None,
) -> dict[str, Any]:
    """Open an engagement, but only for targets that already carry a live authorisation.

    The authorisation gate is the whole safety property here. Without it this tool is a way to
    point a scanner at anything a language model happens to name.
    """
    tool = "coordinate_pentest_engagement"
    if isinstance(targets, str):
        targets = [targets]
    targets = [str(t).strip().lower() for t in (targets or []) if str(t).strip()]
    if not name:
        return _refuse(tool, "MISSING_ARGUMENT", "an engagement needs a name")
    if not targets:
        return _refuse(tool, "MISSING_ARGUMENT", "an engagement needs at least one target")
    if not mission_id:
        return _refuse(
            tool, "MISSION_REQUIRED",
            "engagements are mission-scoped in this schema (engagements.mission_id is NOT NULL), so the "
            "mission the engagement belongs to must be supplied; nothing is created without it",
        )
    tenant = _tenant()
    async with async_session_factory() as session:
        await bind_tenant(session, tenant)
        scope_mission = (
            await session.execute(
                text("SELECT id FROM missions WHERE id = :m AND tenant_id = :t"),
                {"m": str(mission_id), "t": tenant},
            )
        ).scalar_one_or_none()
        if not scope_mission:
            return _refuse(tool, "MISSION_NOT_FOUND", f"no mission {mission_id} in this tenant")
        authorised = (
            await session.execute(
                text(
                    "SELECT id, target, target_type, scope_description, authorized_by_user_id, valid_until "
                    "FROM authorized_targets WHERE tenant_id = :t AND status = 'active' "
                    "AND lower(target) = ANY(:targets) "
                    "AND (valid_until IS NULL OR valid_until > now())"
                ),
                {"t": tenant, "targets": targets},
            )
        ).mappings().all()
        covered = {row["target"].lower() for row in authorised}
        unauthorised = [t for t in targets if t not in covered]
        if unauthorised:
            available = (
                await session.execute(
                    text(
                        "SELECT target FROM authorized_targets WHERE tenant_id = :t AND status = 'active' "
                        "AND (valid_until IS NULL OR valid_until > now()) ORDER BY target"
                    ),
                    {"t": tenant},
                )
            ).scalars().all()
            return _refuse(
                tool,
                "ENGAGEMENT_TARGET_NOT_AUTHORIZED",
                "refusing to open an engagement on a target with no live authorisation record",
                unauthorised_targets=unauthorised,
                authorised_targets_available=list(available),
            )
        actor = _actor(actor_id) or str(authorised[0]["authorized_by_user_id"])
        engagement_id = (
            await session.execute(
                text(
                    "INSERT INTO engagements (id, tenant_id, mission_id, name, rules_of_engagement, "
                    "allowed_techniques, prohibited_techniques, exclusion_list, status, "
                    "authorized_by_user_id) VALUES (gen_random_uuid(), :t, :m, :name, :roe, "
                    "CAST(:allowed AS jsonb), CAST(:prohibited AS jsonb), '[]'::jsonb, 'draft', :auth) "
                    "RETURNING id"
                ),
                {
                    "t": tenant,
                    "m": str(mission_id) if mission_id else None,
                    "name": str(name)[:200],
                    "roe": rules_of_engagement or "Standard rules of engagement; scope limited to the authorised targets listed.",
                    "allowed": json.dumps(allowed_techniques or ["recon", "vulnerability_scan"]),
                    "prohibited": json.dumps(prohibited_techniques or ["dos", "data_exfiltration", "social_engineering"]),
                    "auth": actor,
                },
            )
        ).scalar_one()
        for row in authorised:
            await session.execute(
                text(
                    "INSERT INTO engagement_targets (engagement_id, authorized_target_id) VALUES (:e, :a) "
                    "ON CONFLICT DO NOTHING"
                ),
                {"e": engagement_id, "a": row["id"]},
            )
        await session.commit()
    return {
        "success": True,
        "tool": tool,
        "source": "engagements + engagement_targets (live write)",
        "engagement_id": str(engagement_id),
        "name": name,
        "status": "draft",
        "targets": [
            {"target": row["target"], "authorization_id": str(row["id"]),
             "valid_until": row["valid_until"].isoformat() if row["valid_until"] else None}
            for row in authorised
        ],
        "note": "draft only; starting execution stays a separate authorised step",
    }


# --------------------------------------------------------------------------------------
# Mission memory purge behind an approval
# --------------------------------------------------------------------------------------


# table/predicate pairs, so a count and a delete can never drift apart
_PURGE_TARGETS = (
    ("knowledge_documents", "knowledge_documents",
     "tenant_id = :t AND source_mission_id = :m"),
    ("mission_messages", "mission_messages",
     "tenant_id = :t AND mission_plan_id IN (SELECT id FROM mission_plans WHERE mission_id = :m)"),
    ("mission_results", "mission_results",
     "tenant_id = :t AND mission_id = :m"),
)


async def purge_mission_memory(mission_id: Any, *, actor_id: Any = None) -> dict[str, Any]:
    """Delete a mission's memory, but only with an approved approval record for that mission.

    First call creates the pending approval and previews exactly what would be deleted. A later
    call with the approval in 'approved' performs the delete and reports real counts.
    """
    tool = "purge_mission_memory"
    try:
        mid = str(uuid.UUID(str(mission_id)))
    except (ValueError, AttributeError, TypeError):
        return _refuse(tool, "MISSING_ARGUMENT", "mission_id must be a mission UUID")
    tenant = _tenant()
    action = f"purge_mission_memory:{mid}"
    async with async_session_factory() as session:
        await bind_tenant(session, tenant)
        mission = (
            await session.execute(
                text("SELECT id, objective, status FROM missions WHERE id = :m AND tenant_id = :t"),
                {"m": mid, "t": tenant},
            )
        ).mappings().first()
        if not mission:
            return _refuse(tool, "MISSION_NOT_FOUND", f"no mission {mid} in this tenant")
        # Schema reality: knowledge_documents links through source_mission_id, mission_messages has
        # no mission column at all (it hangs off mission_plans), and mission_results carries
        # mission_id directly. A predicate invented from the table name deletes nothing silently.
        counts = {}
        for label, table, predicate in _PURGE_TARGETS:
            try:
                counts[label] = (
                    await session.execute(
                        text(f"SELECT count(*) FROM {table} WHERE {predicate}"), {"t": tenant, "m": mid}
                    )
                ).scalar_one()
            except Exception:  # noqa: BLE001 - a missing table is reported as unknown, never as zero
                counts[label] = "unavailable"
        approval = (
            await session.execute(
                text(
                    "SELECT id, status FROM approvals WHERE tenant_id = :t AND action_description = :a "
                    "ORDER BY created_at DESC LIMIT 1"
                ),
                {"t": tenant, "a": action},
            )
        ).mappings().first()
        total = sum(v for v in counts.values() if isinstance(v, int))
        if not approval or approval["status"] != "approved":
            if not approval:
                approval_id = (
                    await session.execute(
                        text(
                            "INSERT INTO approvals (id, tenant_id, requested_by_user_id, risk_class, "
                            "action_description, status) VALUES (gen_random_uuid(), :t, :u, 'destructive', :a, 'pending') RETURNING id"
                        ),
                        {"t": tenant, "u": _actor(actor_id), "a": action},
                    )
                ).scalar_one()
                await session.commit()
            else:
                approval_id = approval["id"]
            return {
                "success": False,
                "tool": tool,
                "code": "APPROVAL_REQUIRED",
                "error": "purging mission memory is destructive and needs an approved approval record",
                "mission_id": mid,
                "approval_id": str(approval_id),
                "would_delete": counts,
                "total_records": total,
            }
        deleted = {}
        for label, table, predicate in _PURGE_TARGETS:
            try:
                result = await session.execute(text(f"DELETE FROM {table} WHERE {predicate}"), {"t": tenant, "m": mid})
                deleted[label] = result.rowcount
            except Exception as exc:  # noqa: BLE001
                deleted[label] = f"failed: {exc}"[:160]
        await session.execute(
            text("UPDATE approvals SET status = 'executed', decided_at = now() WHERE id = :i"),
            {"i": approval["id"]},
        )
        await session.commit()
    return {
        "success": True,
        "tool": tool,
        "source": "real deletes against mission-scoped memory tables",
        "mission_id": mid,
        "approval_id": str(approval["id"]),
        "deleted": deleted,
        "total_deleted": sum(v for v in deleted.values() if isinstance(v, int)),
    }


# --------------------------------------------------------------------------------------
# Indicator lookup against sources that actually answer
# --------------------------------------------------------------------------------------

_CVE = re.compile(r"^CVE-\d{4}-\d{4,}$", re.IGNORECASE)
_HASH = re.compile(r"^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$", re.IGNORECASE)
_DOMAIN = re.compile(r"^(?=.{4,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$", re.IGNORECASE)


def classify_indicator(value: str) -> str:
    value = value.strip()
    if _CVE.match(value):
        return "cve"
    if value.lower().startswith(("http://", "https://")):
        return "url"
    if _HASH.match(value):
        return "hash"
    try:
        ipaddress.ip_address(value)
        return "ip"
    except ValueError:
        pass
    if _DOMAIN.match(value):
        return "domain"
    if "/" in value and " " not in value:
        return "package"
    return "unknown"


def _urlhaus_headers() -> dict[str, str]:
    key = os.environ.get("URLHAUS_AUTH_KEY") or os.environ.get("ABUSE_CH_AUTH_KEY")
    return {"Auth-Key": key} if key else {}


async def threat_indicator(indicator: Any, indicator_type: str = "unknown") -> dict[str, Any]:
    """Look the indicator up in every source that can answer, and say which ones were consulted."""
    tool = "check_threat_indicator"
    value = str(indicator or "").strip()
    if not value:
        return _refuse(tool, "MISSING_ARGUMENT", "indicator is required")
    kind = indicator_type if indicator_type not in ("unknown", "", None) else classify_indicator(value)
    tenant = _tenant()
    results: dict[str, Any] = {}
    consulted: list[str] = []
    verdict = "unknown"

    async with async_session_factory() as session:
        await bind_tenant(session, tenant)
        watch = (
            await session.execute(
                text("SELECT kind, value, ecosystem, created_at FROM watchlist_entries "
                     "WHERE tenant_id = :t AND lower(value) = lower(:v)"),
                {"t": tenant, "v": value},
            )
        ).mappings().all()
    if watch:
        results["tenant_watchlist"] = {"match": True, "entries": [dict(w) for w in watch]}
        verdict = "watched"
    else:
        results["tenant_watchlist"] = {"match": False, "entries": 0}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            if kind == "cve":
                consulted.append("cisa_kev")
                kev = await client.get(
                    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
                )
                if kev.status_code == 200:
                    hits = [v for v in kev.json().get("vulnerabilities", [])
                            if v.get("cveID", "").upper() == value.upper()]
                    results["cisa_kev"] = {"match": bool(hits), "record": hits[0] if hits else None}
                    if hits:
                        verdict = "known_exploited"
                else:
                    results["cisa_kev"] = {"error": f"HTTP {kev.status_code}"}
                consulted.append("epss")
                epss = await client.get(f"https://api.first.org/data/v1/epss?cve={value.upper()}")
                if epss.status_code == 200:
                    data = epss.json().get("data") or []
                    results["epss"] = {"score": data[0].get("epss") if data else None,
                                       "percentile": data[0].get("percentile") if data else None,
                                       "found": bool(data)}
                else:
                    results["epss"] = {"error": f"HTTP {epss.status_code}"}
            elif kind in ("url", "domain", "ip"):
                consulted.append("urlhaus")
                if kind == "url":
                    resp = await client.post("https://urlhaus-api.abuse.ch/v1/url/", data={"url": value},
                                             headers=_urlhaus_headers())
                elif kind == "ip":
                    resp = await client.post("https://urlhaus-api.abuse.ch/v1/host/", data={"host": value},
                                             headers=_urlhaus_headers())
                else:
                    resp = await client.post("https://urlhaus-api.abuse.ch/v1/host/", data={"host": value},
                                             headers=_urlhaus_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    status = str(data.get("query_status", "")).lower()
                    results["urlhaus"] = {"query_status": status,
                                          "listed": status in ("is_host", "ok", "found"),
                                          "urls_online": data.get("urls_online")}
                    if results["urlhaus"]["listed"]:
                        verdict = "malicious"
                else:
                    results["urlhaus"] = {"error": f"HTTP {resp.status_code}"}
            elif kind == "hash":
                consulted.append("urlhaus")
                resp = await client.post("https://urlhaus-api.abuse.ch/v1/payload/", data={"sha256_hash": value},
                                             headers=_urlhaus_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    listed = str(data.get("query_status", "")).lower() in ("ok", "found")
                    results["urlhaus"] = {"listed": listed, "signature": data.get("signature"),
                                          "query_status": data.get("query_status")}
                    if listed:
                        verdict = "malicious"
                else:
                    results["urlhaus"] = {"error": f"HTTP {resp.status_code}"}
            elif kind == "package":
                consulted.append("osv")
                resp = await client.post(
                    "https://api.osv.dev/v1/query",
                    json={"package": {"name": value.split("==")[0], "ecosystem": "PyPI"}},
                )
                if resp.status_code == 200:
                    vulns = resp.json().get("vulns") or []
                    results["osv"] = {"advisory_count": len(vulns), "ids": [v.get("id") for v in vulns][:20]}
                    if vulns:
                        verdict = "vulnerable"
                else:
                    results["osv"] = {"error": f"HTTP {resp.status_code}"}
            else:
                return _refuse(
                    tool, "INSUFFICIENT_THREAT_INTEL",
                    "the indicator type could not be determined, so no source can give a defensible answer",
                    indicator=value, configured_feeds=["CISA KEV (CVEs)", "EPSS (CVEs)", "OSV (packages)",
                                                       "URLhaus (urls, hosts, hashes)", "tenant watchlist"],
                )
    except Exception as exc:  # noqa: BLE001 - an unreachable source is not a clean answer
        return _refuse(tool, "SOURCE_UNAVAILABLE", f"indicator sources unreachable: {exc}",
                       indicator=value, indicator_type=kind)

    answered = [
        name for name in consulted
        if isinstance(results.get(name), dict) and "error" not in results[name]
    ]
    if verdict == "unknown":
        if answered:
            verdict = "no_match"
        else:
            return _refuse(
                tool,
                "SOURCE_UNAVAILABLE",
                "every source that applies to this indicator was unavailable or rejected the request, "
                "so no verdict can be given. A missing answer is not a clean one.",
                indicator=value,
                indicator_type=kind,
                tried=consulted,
                results=results,
                hint="URLhaus requires an Auth-Key since 2025; set URLHAUS_AUTH_KEY to enable it",
            )
    return {
        "success": True,
        "tool": tool,
        "indicator": value,
        "indicator_type": kind,
        "verdict": verdict,
        "sources_consulted": consulted + ["tenant_watchlist"],
        "results": results,
        "note": "no_match means the consulted sources had no record; it is not a guarantee of safety",
    }
