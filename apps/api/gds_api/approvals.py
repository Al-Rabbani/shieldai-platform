import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.approval_window import expires_at, hours_remaining
from gds_api.audit import record_audit_event
from gds_api.db import get_db
from gds_api.models import Approval, Notification
from gds_api.schemas import ApprovalDecisionRequest, ApprovalOut
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/approvals", tags=["approvals"])


def _out(approval: Approval) -> ApprovalOut:
    """The row plus the two fields that make its urgency readable.

    A decided or expired row keeps the deadline it had: what a request's window was is part of its record, not
    something to recompute later against a different constant.
    """
    return ApprovalOut(
        id=approval.id,
        risk_class=approval.risk_class,
        action_description=approval.action_description,
        status=approval.status,
        requested_by_user_id=approval.requested_by_user_id,
        decided_by_user_id=approval.decided_by_user_id,
        created_at=approval.created_at,
        decided_at=approval.decided_at,
        expires_at=expires_at(approval.created_at),
        hours_remaining=hours_remaining(approval.created_at),
    )


@router.get("", response_model=list[ApprovalOut])
async def list_approvals(
    status_filter: str | None = None,
    current_user: CurrentUser = Depends(require_permission("approvals:read")),
    db: AsyncSession = Depends(get_db),
) -> list[Approval]:
    query = select(Approval).where(Approval.tenant_id == current_user.tenant_id)
    if status_filter:
        query = query.where(Approval.status == status_filter)
    result = await db.execute(query.order_by(Approval.created_at.desc()))
    return [_out(row) for row in result.scalars().all()]


@router.get("/standing", response_model=list[dict])
async def list_standing_approvals(
    current_user: CurrentUser = Depends(require_permission("approvals:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Approvals that authorise repeated use of an action until a stated time.

    MEASURED 26 Nov 2026: six standing approvals were granted for the Q4 external surface review, giving named tools
    authority to run against two hosts for seven days with no further human decision, and nothing in the platform
    listed them. Standing authority is the most consequential state an approval can hold - it is the difference
    between "someone said yes once" and "this runs unattended for a week" - so it must be readable without querying
    the database by hand.

    Reads the columns the migration added rather than the ORM model, which predates them.
    """
    from sqlalchemy import text

    await db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": str(current_user.tenant_id)})
    rows = (await db.execute(text(
        """
        SELECT a.id, a.risk_class, a.action_description, a.decided_at, a.standing_until,
               a.standing_reason, a.decided_by_user_id,
               (SELECT count(*) FROM capability_decisions d WHERE d.approval_id = a.id) AS uses,
               (SELECT max(d.executed_at) FROM capability_decisions d WHERE d.approval_id = a.id) AS last_used
          FROM approvals a
         WHERE a.tenant_id = :t
           AND a.status = 'approved'
           AND a.standing
           AND a.standing_until > now()
         ORDER BY a.standing_until
        """
    ), {"t": str(current_user.tenant_id)})).mappings().all()

    now = datetime.now(UTC)
    return [
        {
            "id": str(row["id"]),
            "risk_class": row["risk_class"],
            "action_description": row["action_description"],
            "granted_by_user_id": str(row["decided_by_user_id"]) if row["decided_by_user_id"] else None,
            "standing_until": row["standing_until"].isoformat() if row["standing_until"] else None,
            "hours_remaining": round((row["standing_until"] - now).total_seconds() / 3600.0, 1)
            if row["standing_until"] else None,
            "reason": row["standing_reason"],
            "uses": row["uses"],
            "last_used": row["last_used"].isoformat() if row["last_used"] else None,
        }
        for row in rows
    ]


@router.post("/{approval_id}/decide", response_model=ApprovalOut)
async def decide_approval(
    approval_id: uuid.UUID,
    body: ApprovalDecisionRequest,
    current_user: CurrentUser = Depends(require_permission("approvals:decide")),
    db: AsyncSession = Depends(get_db),
) -> Approval:
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "decision must be 'approved' or 'rejected'"
        )

    approval = await db.get(Approval, approval_id)
    if approval is None or approval.tenant_id != current_user.tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Approval not found")
    if approval.status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Approval already {approval.status}")

    approval.status = body.decision
    approval.decided_by_user_id = current_user.user_id
    approval.decided_at = datetime.now(UTC)

    db.add(
        Notification(
            tenant_id=approval.tenant_id,
            user_id=approval.requested_by_user_id,
            type="approval.decided",
            action_url="/operations/approvals",
            message=f"Your request '{approval.action_description}' was {body.decision}",
        )
    )
    await record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        action="approval.decide",
        detail={"approval_id": str(approval.id), "decision": body.decision},
    )
    # Refresh BEFORE the commit: these tables are FORCE RLS, so a commit can drop the tenant context
    # from the connection and db.refresh() then raises InvalidRequestError "Could not refresh
    # instance" - measured 25 Nov 2026, POST /red-team/targets returned 500 after the row was written.
    await db.flush()
    await db.refresh(approval)
    await db.commit()
    return approval
