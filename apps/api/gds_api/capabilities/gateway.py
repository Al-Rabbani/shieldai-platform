"""Phase 16 (Continuation Prompt 3), Part I: the Tool Gateway enforcement layer - the
one real place gds_api.tool_gateway.execute_tool is allowed to run for a
broker-governed capability request. Both real production entry points
(FoundationAgent.execute in gds_api.agents.manifest, and the Rabbani-direct branch in
gds_api.workflows.activities.execute_task - see docs/reviews/phase-16-capability-control
-audit.md's Entry Point A/B) call execute_capability_request() instead of
tool_gateway.execute_tool directly.

Re-evaluates the capability request immediately before executing - "never assume a
previously allowed decision remains safe indefinitely" - so a target authorization that
expired, an emergency stop engaged, or a capability disabled between proposal and
execution is caught right here, not just at proposal time. Only a fresh ALLOW may
proceed to a real tool call; anything else raises CapabilityExecutionDenied with the
decision's own safe, non-leaking message.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api import tool_gateway
from gds_api.capabilities.broker import mark_capability_execution, reevaluate_capability_request
from gds_api.models import CapabilityRequestRecord, CapabilityDecisionRecord


class CapabilityExecutionDenied(Exception):
    def __init__(self, decision: str, denial_code: str | None, safe_message: str) -> None:
        self.decision = decision
        self.denial_code = denial_code
        self.safe_message = safe_message
        super().__init__(safe_message)


def _validate_execution_binding(request, *, tenant_id, user_id, mission_id, tool_name, input_data):
    """Execution cannot substitute a new tool, actor, mission or argument set."""
    if (request is None or request.tenant_id != tenant_id or request.user_id != user_id
            or request.mission_id != mission_id or request.requested_tool_id != tool_name
            or not isinstance(input_data, dict) or request.requested_parameters_safe != input_data):
        # Raw secrets are not valid tool arguments: use brokered credential references.
        # Redacted stored parameters can never authorize a substituted raw secret.
        raise CapabilityExecutionDenied("DENY", "execution_binding_mismatch", "Execution does not match its approved request.")


async def _claim_execution(db, *, tenant_id, request_id, decision_id):
    """Serialize on the request, then durably claim before any external side effect.

    Every re-evaluation creates a new decision, so the claim must cover ALL decisions
    for this request. A crashed claim requires operator reconciliation, never replay.
    Requires PostgreSQL acceptance tests before production deployment.
    """
    request = (await db.execute(select(CapabilityRequestRecord).where(
        CapabilityRequestRecord.id == request_id,
        CapabilityRequestRecord.tenant_id == tenant_id,
    ).with_for_update())).scalar_one_or_none()
    if request is None:
        await db.rollback()
        raise CapabilityExecutionDenied("DENY", "invalid_request", "Execution request is unavailable.")
    prior = (await db.execute(select(CapabilityDecisionRecord).where(
        CapabilityDecisionRecord.request_id == request_id,
        CapabilityDecisionRecord.tenant_id == tenant_id,
        CapabilityDecisionRecord.execution_status.in_(("executing", "executed", "failed", "cancelled")),
    ))).scalars().first()
    decision = await db.get(CapabilityDecisionRecord, decision_id)
    if (prior is not None or decision is None or decision.request_id != request_id
            or decision.tenant_id != tenant_id or decision.decision != "ALLOW"):
        await db.rollback()
        raise CapabilityExecutionDenied("DENY", "execution_already_claimed", "This request cannot be executed again.")
    decision.execution_status = "executing"
    await db.commit()  # A failed durable claim must prevent dispatch.



async def execute_capability_request(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    request_id: uuid.UUID,
    tool_name: str,
    input_data: dict[str, Any],
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
) -> dict[str, Any]:
    """Raises CapabilityExecutionDenied on anything other than a fresh ALLOW. On ALLOW,
    runs the real tool and records the real outcome (executed|failed) on the decision
    that authorized it - a given decision can only ever be marked executed once
    (gds_api.capabilities.broker.CapabilityExecutionConflict guards real reuse)."""
    request_record = await db.get(CapabilityRequestRecord, request_id)
    _validate_execution_binding(request_record, tenant_id=tenant_id, user_id=user_id,
        mission_id=mission_id, tool_name=tool_name, input_data=input_data)
    result = await reevaluate_capability_request(db, tenant_id=tenant_id, request_id=request_id)
    if result.decision != "ALLOW":
        await db.commit()
        raise CapabilityExecutionDenied(result.decision, result.denial_code, result.safe_message)

    # Phase 17: real requesting_agent_id/workflow_run_id, read off the same real
    # CapabilityRequestRecord the broker already persisted - so the 10 real repository
    # tools (gds_api.tool_gateway) can resolve/create a real Workspace tied to the real
    # agent and workflow run that proposed this request, not just the mission.
    request_record = await db.get(CapabilityRequestRecord, request_id)
    requesting_agent_id = request_record.requesting_agent_id if request_record else None
    workflow_run_id = request_record.workflow_run_id if request_record else None

    await _claim_execution(db, tenant_id=tenant_id, request_id=request_id, decision_id=result.decision_id)

    try:
        output = await tool_gateway.execute_tool_governed(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            mission_id=mission_id,
            tool_name=tool_name,
            input_data=input_data,
            requesting_agent_id=requesting_agent_id,
            workflow_run_id=workflow_run_id,
            capability_decision_id=result.decision_id,
        )
    except Exception:
        await mark_capability_execution(
            db, tenant_id=tenant_id, decision_id=result.decision_id, status="failed"
        )
        await db.commit()
        raise
    await mark_capability_execution(
        db, tenant_id=tenant_id, decision_id=result.decision_id, status="failed" if not isinstance(output, dict) or output.get("success") is not True else "executed"
    )
    await db.commit()
    return output
