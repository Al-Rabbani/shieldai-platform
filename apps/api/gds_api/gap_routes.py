"""Legacy gap routers: CIEM, cloud, agents, security tools, policy, approvals.

TENANT ISOLATION REWRITE (R2). Every handler here previously queried the database
with no tenant predicate at all: ciem used "SELECT * FROM ciem_findings WHERE 1=1",
cloud listed every environment and asset on the platform, and cloud environment
creation inserted using hardcoded (SELECT id FROM tenants LIMIT 1) and
(SELECT id FROM users LIMIT 1) - i.e. whichever tenant and user happened to be first
in the table. Policy evaluation also trusted a caller-supplied user_role, so any
caller could claim to be an admin.

All of that is now driven by the authenticated identity: tenant_id comes from the
verified token, never from the request body, and every statement carries an explicit
tenant predicate. Tables under FORCE RLS (ciem_findings, security_scan tables) also
get set_config so the policy engine agrees with the WHERE clause.

These routers remain behind require_verified_legacy_route until each is re-verified
against a second tenant; the gate is the release switch, not the isolation itself.

REMOVED (not fixed) rather than scoped, because they had nothing to scope:
  * GET /agents and GET /agents/{name} - a hardcoded 20-entry agent catalogue that
    returned canned "status: active" for every agent regardless of reality. The
    canonical agents_router (registered earlier) serves the real fleet; keeping a
    fabricated duplicate is a no-simulation violation.
  * The seven /security-tools/* POST endpoints - each returned a canned
    {"status": "queued"} without queueing anything. Real execution runs through the
    kernel tool gateway and run_deterministic_scan.py.
"""

import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.security import CurrentUser, get_current_user


async def require_verified_legacy_route(
    current_user: CurrentUser = Depends(get_current_user),
) -> None:
    """Quarantine legacy SQL routes until tenant and capability scopes are verified.

    Authentication is evaluated first; authenticated requests fail closed instead of
    reaching globally scoped legacy queries or unverified tool-execution handlers.
    Canonical, permission-scoped routers registered before these are unaffected.
    """
    raise HTTPException(
        status_code=503,
        detail="Legacy endpoint unavailable pending tenant isolation and capability verification.",
    )


async def _bind_tenant(session: AsyncSession, tenant_id) -> None:
    """Set the tenant context that FORCE RLS policies read.

    Transaction-local (is_local=true) so a pooled connection cannot leak one tenant's
    context into the next request.
    """
    await session.execute(
        text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": str(tenant_id)}
    )


def _tenant_id(user: CurrentUser) -> str:
    tid = getattr(user, "tenant_id", None)
    if not tid:
        # A token without a tenant must never fall back to "all rows".
        raise HTTPException(status_code=403, detail="Token carries no tenant identity")
    return str(tid)


CIEM_COLUMNS = (
    "id, cloud_account_id, provider, identity_type, identity_name, identity_arn, "
    "finding_type, title, severity, status, permissions_granted, permissions_used, "
    "unused_permissions, last_used, days_inactive, blast_radius, "
    "privilege_escalation_path, remediation, detected_at, resolved_at"
)


def create_gap_routers(get_db):
    """Create all missing routers. Call this from main.py."""

    # ===== 1. CIEM Routes =====
    ciem_router = APIRouter(prefix="/ciem", tags=["CIEM"], dependencies=[Depends(require_verified_legacy_route)])

    @ciem_router.get("/findings")
    async def list_ciem_findings(
        cloud_account_id: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = Query(50, le=500),
        user: CurrentUser = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        tid = _tenant_id(user)
        await _bind_tenant(session, tid)
        query = f"SELECT {CIEM_COLUMNS} FROM ciem_findings WHERE tenant_id = :tenant_id"
        params = {"tenant_id": tid, "limit": limit}
        if cloud_account_id:
            query += " AND cloud_account_id = :account_id"
            params["account_id"] = cloud_account_id
        if severity:
            query += " AND severity = :severity"
            params["severity"] = severity
        query += " ORDER BY detected_at DESC LIMIT :limit"
        result = await session.execute(text(query), params)
        rows = result.fetchall()
        return [
            {
                "id": r[0], "cloud_account_id": r[1], "provider": r[2],
                "identity_type": r[3], "identity_name": r[4], "identity_arn": r[5],
                "finding_type": r[6], "title": r[7], "severity": r[8],
                "status": r[9], "permissions_granted": r[10], "permissions_used": r[11],
                "unused_permissions": r[12], "last_used": str(r[13]) if r[13] else None,
                "days_inactive": r[14], "blast_radius": r[15],
                "privilege_escalation_path": r[16], "remediation": r[17],
                "detected_at": str(r[18]) if r[18] else None,
                "resolved_at": str(r[19]) if r[19] else None,
            }
            for r in rows
        ]

    @ciem_router.get("/scan-results")
    async def list_ciem_scans(
        user: CurrentUser = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        tid = _tenant_id(user)
        result = await session.execute(text(
            "SELECT id, cloud_account_id, provider, identities_analyzed, findings_count, "
            "critical_count, high_count, medium_count, low_count, risk_score, started_at, "
            "completed_at, status, summary FROM ciem_scan_results "
            "WHERE tenant_id = :tenant_id ORDER BY started_at DESC LIMIT 20"
        ), {"tenant_id": tid})
        rows = result.fetchall()
        return [
            {
                "id": r[0], "cloud_account_id": r[1], "provider": r[2],
                "identities_analyzed": r[3], "findings_count": r[4],
                "critical_count": r[5], "high_count": r[6],
                "medium_count": r[7], "low_count": r[8],
                "risk_score": r[9], "started_at": str(r[10]) if r[10] else None,
                "completed_at": str(r[11]) if r[11] else None,
                "status": r[12], "summary": r[13],
            }
            for r in rows
        ]

    @ciem_router.post("/scan")
    async def trigger_ciem_scan(
        cloud_account_id: str,
        provider: str = "aws",
        user: CurrentUser = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        tid = _tenant_id(user)
        await _bind_tenant(session, tid)
        # The account must belong to this tenant before a scan can be queued for it.
        owned = await session.execute(text(
            "SELECT 1 FROM ciem_findings WHERE tenant_id = :tenant_id "
            "AND cloud_account_id = :account_id LIMIT 1"
        ), {"tenant_id": tid, "account_id": cloud_account_id})
        if owned.fetchone() is None:
            exists = await session.execute(text(
                "SELECT 1 FROM cloud_environments WHERE tenant_id = :tenant_id "
                "AND native_id = :account_id LIMIT 1"
            ), {"tenant_id": tid, "account_id": cloud_account_id})
            if exists.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="Cloud account not found in this tenant",
                )
        scan_id = f"ciem_{uuid.uuid4().hex[:12]}"
        await session.execute(text(
            "INSERT INTO ciem_scan_results (id, tenant_id, cloud_account_id, provider, "
            "identities_analyzed, findings_count, critical_count, high_count, medium_count, "
            "low_count, risk_score, started_at, status, summary) VALUES "
            "(:id, :tenant_id, :account_id, :provider, 0, 0, 0, 0, 0, 0, 0.0, now(), "
            "'queued', 'CIEM scan queued')"
        ), {"id": scan_id, "tenant_id": tid, "account_id": cloud_account_id, "provider": provider})
        await session.commit()
        return {"scan_id": scan_id, "status": "queued", "message": "CIEM scan queued for execution"}

    # ===== 2. Cloud Environment Routes =====
    cloud_router = APIRouter(prefix="/cloud", tags=["Cloud Security"], dependencies=[Depends(require_verified_legacy_route)])

    @cloud_router.get("/environments")
    async def list_environments(
        user: CurrentUser = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        tid = _tenant_id(user)
        result = await session.execute(text(
            "SELECT * FROM cloud_environments WHERE tenant_id = :tenant_id "
            "ORDER BY created_at DESC LIMIT 50"
        ), {"tenant_id": tid})
        rows = result.fetchall()
        cols = result.keys()
        return [dict(zip(cols, row)) for row in rows]

    @cloud_router.post("/environments")
    async def create_environment(
        provider: str,
        name: str,
        native_id: str,
        environment_type: str = "account",
        user: CurrentUser = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        tid = _tenant_id(user)
        user_id = getattr(user, "user_id", None) or getattr(user, "id", None)
        if not user_id:
            raise HTTPException(status_code=403, detail="Token carries no user identity")
        env_id = str(uuid.uuid4())
        await session.execute(text(
            "INSERT INTO cloud_environments (id, tenant_id, provider, name, native_id, environment_type, "
            "status, discovery_status, asset_count, region_count, graph_sync_status, "
            "created_by_user_id, tags, enabled, created_at, updated_at) VALUES "
            "(:id, :tenant_id, :provider, :name, :native_id, :env_type, "
            "'active', 'not_started', 0, 0, 'not_synced', "
            ":user_id, '{}'::jsonb, true, now(), now())"
        ), {
            "id": env_id, "tenant_id": tid, "provider": provider, "name": name,
            "native_id": native_id, "env_type": environment_type, "user_id": str(user_id),
        })
        await session.commit()
        return {"id": env_id, "status": "created", "message": f"Cloud environment {name} registered"}

    @cloud_router.get("/assets")
    async def list_assets(
        environment_id: Optional[str] = None,
        limit: int = Query(50, le=500),
        user: CurrentUser = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        tid = _tenant_id(user)
        query = "SELECT * FROM cloud_assets WHERE tenant_id = :tenant_id"
        params = {"tenant_id": tid, "limit": limit}
        if environment_id:
            query += " AND environment_id = :env_id"
            params["env_id"] = environment_id
        query += " ORDER BY last_seen_at DESC LIMIT :limit"
        result = await session.execute(text(query), params)
        rows = result.fetchall()
        cols = result.keys()
        return [dict(zip(cols, row)) for row in rows]

    # ===== 3. Agent Routes (fabricated catalogue removed; only real data remains) =====
    agents_router = APIRouter(prefix="/agents", tags=["Agents"], dependencies=[Depends(require_verified_legacy_route)])

    @agents_router.get("/activity/recent")
    async def agent_activity(
        user: CurrentUser = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        tid = _tenant_id(user)
        result = await session.execute(text(
            "SELECT action, created_at, detail FROM audit_events "
            "WHERE tenant_id = :tenant_id AND action LIKE 'agent_%' "
            "ORDER BY created_at DESC LIMIT 20"
        ), {"tenant_id": tid})
        rows = result.fetchall()
        return [
            {"action": r[0], "timestamp": str(r[1]),
             "detail": r[2] if isinstance(r[2], dict) else json.loads(r[2]) if r[2] else {}}
            for r in rows
        ]

    # ===== 4. Security Tool Endpoints =====
    # The seven canned POST endpoints were removed: each returned {"status": "queued"}
    # without queueing anything. Real tool execution belongs to the kernel gateway.
    security_tools_router = APIRouter(
        prefix="/security-tools", tags=["Security Tools"],
        dependencies=[Depends(require_verified_legacy_route)],
    )

    # ===== 5. Policy Routes =====
    policy_router = APIRouter(prefix="/policy", tags=["Policy"], dependencies=[Depends(require_verified_legacy_route)])

    @policy_router.get("/rules")
    async def list_policy_rules(
        user: CurrentUser = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        tid = _tenant_id(user)
        result = await session.execute(text(
            "SELECT id, risk_class, requires_approval, min_role, created_at FROM policies "
            "WHERE tenant_id = :tenant_id ORDER BY created_at"
        ), {"tenant_id": tid})
        rows = result.fetchall()
        return [
            {
                "id": str(r[0]), "risk_class": r[1], "requires_approval": r[2],
                "min_role": r[3], "created_at": str(r[4]),
            }
            for r in rows
        ]

    @policy_router.post("/evaluate")
    async def evaluate_policy(
        risk_class: str,
        user: CurrentUser = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        """Evaluate a risk class against this tenant's policy.

        The caller's role is taken from the authenticated identity. It previously came
        from a request parameter, so any caller could assert user_role=admin.
        """
        tid = _tenant_id(user)
        result = await session.execute(text(
            "SELECT requires_approval, min_role FROM policies "
            "WHERE tenant_id = :tenant_id AND risk_class = :rc"
        ), {"tenant_id": tid, "rc": risk_class})
        row = result.fetchone()
        if not row:
            return {"risk_class": risk_class, "verdict": "deny",
                    "reason": "No policy defined for this risk class"}

        requires_approval, min_role = row
        role_hierarchy = {"analyst": 1, "admin": 2}
        actual_role = getattr(user, "role", None) or ""
        user_level = role_hierarchy.get(str(actual_role), 0)
        min_level = role_hierarchy.get(min_role, 0)

        if user_level < min_level:
            return {"risk_class": risk_class, "verdict": "deny",
                    "reason": f"Requires {min_role} role"}

        return {
            "risk_class": risk_class,
            "verdict": "allow",
            "requires_approval": requires_approval,
            "min_role": min_role,
        }

    # ===== 6. Approvals =====
    approvals_router = APIRouter(prefix="/approvals", tags=["Approvals"], dependencies=[Depends(require_verified_legacy_route)])

    @approvals_router.get("")
    async def list_approvals(
        status: Optional[str] = None,
        user: CurrentUser = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        tid = _tenant_id(user)
        query = "SELECT * FROM approvals WHERE tenant_id = :tenant_id"
        params = {"tenant_id": tid}
        if status:
            query += " AND status = :status"
            params["status"] = status
        query += " ORDER BY created_at DESC LIMIT 50"
        result = await session.execute(text(query), params)
        rows = result.fetchall()
        cols = result.keys()
        return [dict(zip(cols, row)) for row in rows]

    @approvals_router.post("/{approval_id}/decide")
    async def decide_approval(
        approval_id: str,
        decision: str,
        user: CurrentUser = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ):
        if decision not in ("approved", "rejected"):
            raise HTTPException(status_code=400, detail="Decision must be 'approved' or 'rejected'")

        tid = _tenant_id(user)
        # Both the existence check and the update are tenant-scoped, so an approval id
        # from another tenant can neither be read nor decided.
        result = await session.execute(text(
            "SELECT id FROM approvals WHERE id = :aid AND tenant_id = :tenant_id "
            "AND status = 'pending'"
        ), {"aid": approval_id, "tenant_id": tid})
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Approval not found or already decided")

        await session.execute(text(
            "UPDATE approvals SET status = :decision, decided_at = now() "
            "WHERE id = :aid AND tenant_id = :tenant_id"
        ), {"decision": decision, "aid": approval_id, "tenant_id": tid})
        await session.commit()
        return {"approval_id": approval_id, "status": decision, "message": f"Approval {decision}"}

    return (ciem_router, cloud_router, agents_router, security_tools_router,
            policy_router, approvals_router)
