import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.audit import record_audit_event
from gds_api.db import get_db
from gds_api.findings_risk_acceptance import (
    AcceptanceConflict,
    AcceptanceNotFound,
    InvalidAcceptance,
    accept_risk,
    list_acceptances,
    revoke_acceptance,
)
from gds_api.memory import get_finding_correlation
from gds_api.models import Finding
from gds_api.schemas import (
    FindingCorrelationOut,
    FindingOut,
    RiskAcceptanceRequest,
    RiskAcceptanceRevokeRequest,
    SecurityFindingOut,
)
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("", response_model=list[SecurityFindingOut])
async def list_findings(
    status_filter: str | None = Query(None, alias="status"),
    severity: str | None = None,
    limit: int = 500,
    offset: int = 0,
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """The canonical findings read, over the table that actually holds them.

    This used to read the legacy `findings` table through the ORM, which holds stale rows with an `observed`
    status that nothing writes any more. The console's Findings page therefore showed 317 rows while 873
    findings were open in `security_findings` - the page was reading the wrong table and the `status` filter
    was silently ignored. Both are fixed here: one authoritative table, real filters, and explicit paging so a
    truncated page can never be mistaken for the whole set.
    """
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": str(current_user.tenant_id)})
    where = ["tenant_id = :tid"]
    params: dict = {"tid": str(current_user.tenant_id), "limit": min(max(limit, 1), 1000), "offset": max(offset, 0)}
    if status_filter:
        where.append("status = :status")
        params["status"] = status_filter
    if severity:
        where.append("severity = :severity")
        params["severity"] = severity
    rows = (await db.execute(text(
        "SELECT id, coalesce(source, scanner) AS source, external_id, title, coalesce(details::text, '') AS description, "
        "       severity, risk_class, status, detected_at AS created_at, confidence, business_impact, cve, "
        "       target, cvss, epss, kev_listed, reachability, exploitability "
        "FROM security_findings WHERE " + " AND ".join(where) +
        " ORDER BY detected_at DESC NULLS LAST LIMIT :limit OFFSET :offset"), params)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/summary", response_model=dict)
async def findings_summary(
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Counts over the whole set, so a chart can never be built from a truncated page.

    Aggregated in SQL rather than by counting returned rows: the console previously derived its severity bars
    from whatever list it had fetched, which is wrong the moment the list is paged.
    """
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": str(current_user.tenant_id)})
    row = (await db.execute(text("""
        SELECT count(*) AS total,
               count(*) FILTER (WHERE status = 'open') AS open,
               count(*) FILTER (WHERE status = 'resolved') AS resolved,
               count(*) FILTER (WHERE status = 'open' AND severity = 'critical') AS critical,
               count(*) FILTER (WHERE status = 'open' AND severity = 'high') AS high,
               count(*) FILTER (WHERE status = 'open' AND severity = 'medium') AS medium,
               count(*) FILTER (WHERE status = 'open' AND severity = 'low') AS low,
               count(*) FILTER (WHERE status = 'open' AND kev_listed) AS kev,
               count(*) FILTER (WHERE status = 'accepted_risk') AS accepted,
               count(*) FILTER (WHERE status = 'accepted_risk' AND severity = 'critical') AS accepted_critical,
               count(*) FILTER (WHERE status = 'accepted_risk' AND severity = 'high') AS accepted_high
        FROM security_findings WHERE tenant_id = :tid
    """), {"tid": str(current_user.tenant_id)})).mappings().first()
    return dict(row)


@router.get("/security", response_model=list[dict])
async def list_security_findings(
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Canonical findings read path.

    The ORM Finding model maps to the legacy `findings` table, which is empty.
    Live scanner output is written to `security_findings` (RLS FORCE-enabled,
    tenant-scoped). This reads that authoritative table, scoped explicitly.
    """
    await db.execute(
        text("SELECT set_config('gds.tenant_id', :tid, true)"),
        {"tid": str(current_user.tenant_id)},
    )
    rows = (
        await db.execute(
            text(
                "SELECT id, scanner, title, severity, status, target, "
                "source, external_id, cve, cvss, epss, kev_listed, reachability, "
                "exploitability, exposure, risk_class, confidence, business_impact, " 
                "remediation, detected_at, resolved_at " 
                "FROM security_findings WHERE tenant_id = :tid " 
                "ORDER BY detected_at DESC NULLS LAST LIMIT 500"
            ),
            {"tid": str(current_user.tenant_id)},
        )
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/risk-acceptances", response_model=list[dict])
async def list_finding_risk_acceptances(
    include_history: bool = False,
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Live accepted-risk decisions, with the option to include withdrawn and expired history.

    Reading reconciles expiry first, so an acceptance that has run out reopens its finding instead of
    suppressing it indefinitely just because nobody looked.
    """
    acceptances = await list_acceptances(
        db, tenant_id=current_user.tenant_id, include_history=include_history
    )
    await db.commit()
    return acceptances


@router.post("/risk-acceptances/{acceptance_id}/revoke", response_model=dict)
async def revoke_finding_risk_acceptance(
    acceptance_id: uuid.UUID,
    body: RiskAcceptanceRevokeRequest,
    current_user: CurrentUser = Depends(require_permission("findings:accept_risk")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Withdraw an acceptance. The finding reopens and the row keeps the reason it was withdrawn."""
    try:
        record = await revoke_acceptance(
            db,
            tenant_id=current_user.tenant_id,
            user_id=current_user.user_id,
            acceptance_id=acceptance_id,
            revoke_reason=body.revoke_reason,
        )
    except InvalidAcceptance as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except AcceptanceNotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except AcceptanceConflict as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    await record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        action="findings.risk_acceptance_revoked",
        detail={"acceptance_id": str(acceptance_id), "finding_id": record["finding_id"]},
    )
    await db.commit()
    return record


@router.post("/{finding_id}/risk-acceptance", response_model=dict, status_code=status.HTTP_201_CREATED)
async def accept_finding_risk(
    finding_id: int,
    body: RiskAcceptanceRequest,
    current_user: CurrentUser = Depends(require_permission("findings:accept_risk")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Accept the risk of a finding that cannot be fixed, with a named acceptor, reason, controls and expiry.

    This is not "resolve". The finding keeps its severity and stays in the set; findings_summary reports the
    accepted count separately so acceptance can never be mistaken for a fix.
    """
    try:
        record = await accept_risk(
            db,
            tenant_id=current_user.tenant_id,
            user_id=current_user.user_id,
            user_email=current_user.email,
            finding_id=finding_id,
            reason=body.reason,
            compensating_controls=body.compensating_controls,
            expires_at=body.expires_at,
            review_date=body.review_date,
        )
    except InvalidAcceptance as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except AcceptanceNotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except AcceptanceConflict as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    await record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        action="findings.risk_accepted",
        detail={
            "finding_id": finding_id,
            "acceptance_id": str(record["id"]),
            "severity_at_acceptance": record["severity_at_acceptance"],
            "expires_at": record["expires_at"].isoformat(),
        },
    )
    await db.commit()
    return record


@router.get("/{finding_id}/correlation", response_model=FindingCorrelationOut)
async def get_finding_correlation_chain(
    finding_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> FindingCorrelationOut:
    """Phase 20 (Continuation Prompt 7 / EDP-007), Part 12: the real correlation
    chain for one Finding - attack path/detection (real Postgres text fields),
    remediation MissionPlan, commit, and retest status, traced through the real
    Neo4j edges gds_api.tool_gateway._auto_fix_finding and
    gds_api.engineering.merge_coordinator.commit_mission actually write. Tenant
    ownership is checked against the authoritative Postgres row first - Neo4j is
    never the source of truth for who owns a finding."""
    finding = await db.get(Finding, finding_id)
    if finding is None or finding.tenant_id != current_user.tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Finding not found")

    correlation = await get_finding_correlation(finding_id, current_user.tenant_id)
    if correlation is None:
        # Real, honest fallback: this finding has never been routed into a real
        # remediation MissionPlan, so no correlation graph node exists yet - not
        # an error, just nothing further to report beyond Postgres's own data.
        return FindingCorrelationOut(
            finding_id=finding.id,
            finding_title=finding.title,
            finding_status=finding.status,
            attack_path=finding.attack_path,
            detection_coverage=finding.detection_coverage,
            mission_plan_id=None,
            remediation_objective=None,
            commit_hash=None,
            retest_requested=False,
        )

    commit_hash = correlation.get("commit_hash")
    mission_plan_id_str = correlation.get("mission_plan_id")
    return FindingCorrelationOut(
        finding_id=finding.id,
        finding_title=str(correlation.get("finding_title") or finding.title),
        finding_status=str(correlation.get("finding_status") or finding.status),
        attack_path=correlation.get("attack_path"),
        detection_coverage=correlation.get("detection_coverage"),
        mission_plan_id=uuid.UUID(str(mission_plan_id_str)) if mission_plan_id_str else None,
        remediation_objective=correlation.get("remediation_objective"),
        commit_hash=str(commit_hash) if commit_hash else None,
        retest_requested=commit_hash is not None,
    )
