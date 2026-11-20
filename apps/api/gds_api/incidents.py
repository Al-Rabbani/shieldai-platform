from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.audit import record_audit_event
from gds_api.db import get_db
from gds_api.models import Incident, IncidentFinding
from gds_api.schemas import IncidentOut, IncidentResolveRequest
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/incidents", tags=["incidents"])

async def _finding_composition(
    db: AsyncSession, tenant_id: uuid.UUID, incident_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[str, object]]:
    """How many linked findings are still open, accepted as risk, or resolved - per incident.

    This replaces counting IncidentFinding.finding_id, which is NULL on every row because the links live in
    security_finding_id. A count over an empty column returns 0 and looks like an answer, which is how two
    incidents came to be displayed as open critical incidents with no findings behind them.
    """
    if not incident_ids:
        return {}

    rows = (
        await db.execute(
            text(
                """
                SELECT inf.incident_id,
                       count(*) AS total,
                       count(*) FILTER (WHERE sf.status = 'open') AS open_findings,
                       count(*) FILTER (WHERE sf.status = 'accepted_risk') AS accepted_risk_findings,
                       count(*) FILTER (WHERE sf.status = 'resolved') AS resolved_findings,
                       max(fra.expires_at) AS accepted_until
                FROM incident_findings inf
                LEFT JOIN security_findings sf ON sf.id = inf.security_finding_id
                LEFT JOIN finding_risk_acceptances fra
                       ON fra.finding_id = inf.security_finding_id
                      AND fra.revoked_at IS NULL
                      AND fra.expired_at IS NULL
                WHERE inf.incident_id = ANY(:incident_ids)
                GROUP BY inf.incident_id
                """
            ),
            {"incident_ids": incident_ids},
        )
    ).mappings().all()

    composition: dict[uuid.UUID, dict[str, object]] = {}
    for row in rows:
        composition[row["incident_id"]] = {
            "finding_count": int(row["total"] or 0),
            "open_findings": int(row["open_findings"] or 0),
            "accepted_risk_findings": int(row["accepted_risk_findings"] or 0),
            "resolved_findings": int(row["resolved_findings"] or 0),
            "accepted_until": row["accepted_until"],
        }
    return composition


@router.get("", response_model=list[IncidentOut])
async def list_incidents(
    current_user: CurrentUser = Depends(require_permission("incidents:read")),
    db: AsyncSession = Depends(get_db),
) -> list[IncidentOut]:
    rows = (
        await db.execute(
            select(Incident)
            .where(Incident.tenant_id == current_user.tenant_id)
            .order_by(Incident.created_at.desc())
        )
    ).scalars().all()

    composition = await _finding_composition(
        db, current_user.tenant_id, [incident.id for incident in rows]
    )
    return [
        IncidentOut(
            id=incident.id,
            title=incident.title,
            summary=incident.summary,
            severity=incident.severity,
            status=incident.status,
            report=incident.report,
            created_at=incident.created_at,
            resolved_at=incident.resolved_at,
            finding_count=int(composition.get(incident.id, {}).get("finding_count", 0)),
            open_findings=int(composition.get(incident.id, {}).get("open_findings", 0)),
            accepted_risk_findings=int(
                composition.get(incident.id, {}).get("accepted_risk_findings", 0)
            ),
            resolved_findings=int(composition.get(incident.id, {}).get("resolved_findings", 0)),
            accepted_until=composition.get(incident.id, {}).get("accepted_until"),
        )
        for incident in rows
    ]


@router.post("/{incident_id}/resolve", response_model=IncidentOut)
async def resolve_incident(
    incident_id: uuid.UUID,
    body: IncidentResolveRequest,
    current_user: CurrentUser = Depends(require_permission("incidents:write")),
    db: AsyncSession = Depends(get_db),
) -> IncidentOut:
    """Close an incident with a recorded reason.

    Before this route an incident could never be closed: GET was the only route on the resource, so an incident
    stayed "open" for the life of the platform no matter what happened to the findings behind it. Closure does not
    touch the findings - they keep their own status in their own register - but the incident records how many were
    still open at the moment it closed, so closing an incident can never be mistaken for remediating it.
    """
    incident = (
        await db.execute(
            select(Incident).where(
                Incident.id == incident_id, Incident.tenant_id == current_user.tenant_id
            )
        )
    ).scalars().first()
    if incident is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "incident not found for this tenant")
    if incident.status == "resolved":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"incident is already resolved (resolved_at {incident.resolved_at})",
        )

    composition = (
        await _finding_composition(db, current_user.tenant_id, [incident.id])
    ).get(incident.id, {})
    still_open = int(composition.get("open_findings", 0))
    accepted = int(composition.get("accepted_risk_findings", 0))
    resolved = int(composition.get("resolved_findings", 0))

    closed_at = datetime.now(UTC)
    state = (
        f"[closed {closed_at.isoformat()} by {current_user.email}] {body.reason.strip()}\n"
        f"[finding state at closure] open {still_open}, accepted_risk {accepted}, resolved {resolved}"
    )
    incident.status = "resolved"
    incident.resolved_at = closed_at
    incident.report = f"{incident.report}\n\n{state}" if incident.report else state
    await db.flush()

    await record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        action="incident.resolved",
        detail={
            "incident_id": str(incident.id),
            "reason": body.reason.strip(),
            "open_findings_at_closure": still_open,
            "accepted_risk_findings_at_closure": accepted,
            "resolved_findings_at_closure": resolved,
            "actor_email": current_user.email,
        },
    )
    await db.commit()

    return IncidentOut(
        id=incident.id,
        title=incident.title,
        summary=incident.summary,
        severity=incident.severity,
        status=incident.status,
        report=incident.report,
        created_at=incident.created_at,
        resolved_at=incident.resolved_at,
        finding_count=int(composition.get("finding_count", 0)),
        open_findings=still_open,
        accepted_risk_findings=accepted,
        resolved_findings=resolved,
        accepted_until=composition.get("accepted_until"),
    )
