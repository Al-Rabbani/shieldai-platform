"""Capability tool: run a real cloud posture evaluation for one environment.

The evaluator itself already existed and already worked (evaluation.run_environment_evaluation
iterates every applicable policy/target pair and persists a real CloudPolicyEvaluation row).
What did not exist was the tool the capability broker asks for: capabilities/broker.py looks up
`evaluate_cloud_posture` in tool_gateway.TOOL_REGISTRY for the cloud.read_posture capability, and
because it was never registered, POST /cloud/posture/evaluations raised KeyError and returned 500.

This module is that tool. Like the discovery runner it creates the run row itself, because
start_evaluation reads the row back afterwards.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.cloud.posture.evaluation import run_environment_evaluation
from gds_api.cloud.posture.evaluator import EVALUATOR_VERSION
from gds_api.cloud.posture.registry import policy_registry_fingerprint
from gds_api.models import CloudEnvironment, CloudPostureEvaluationRun, Mission


async def run_evaluation(
    db: AsyncSession, *, tenant_id: uuid.UUID, run_id: uuid.UUID
) -> dict[str, object]:
    run = (
        await db.execute(
            select(CloudPostureEvaluationRun).where(
                CloudPostureEvaluationRun.id == run_id,
                CloudPostureEvaluationRun.tenant_id == tenant_id,
            )
        )
    ).scalars().first()
    if run is None:
        return {"success": False, "code": "EVALUATION_RUN_NOT_FOUND",
                "detail": f"evaluation run {run_id} not found for this tenant"}

    environment = (
        await db.execute(
            select(CloudEnvironment).where(
                CloudEnvironment.id == run.environment_id,
                CloudEnvironment.tenant_id == tenant_id,
            )
        )
    ).scalars().first()
    if environment is None:
        run.status = "failed"
        run.completed_at = datetime.now(timezone.utc)
        run.errors = [f"environment {run.environment_id} not found for this tenant"]
        return {"success": False, "code": "ENVIRONMENT_NOT_FOUND"}

    run.status = "running"
    run.started_at = datetime.now(timezone.utc)
    try:
        await run_environment_evaluation(db, tenant_id=tenant_id, environment=environment, run=run)
    except Exception as exc:  # a real evaluation failure is recorded, never hidden
        reason = f"{type(exc).__name__}: {exc}"[:500]
        run.status = "failed"
        run.completed_at = datetime.now(timezone.utc)
        run.errors = [reason]
        return {"success": False, "code": "EVALUATION_FAILED", "detail": reason}

    run.status = "completed"
    run.completed_at = datetime.now(timezone.utc)
    return {
        "success": True,
        "status": "completed",
        "run_id": str(run.id),
        "assets_considered": run.assets_considered,
        "policies_considered": run.policies_considered,
        "passed": run.passed_count,
        "failed": run.failed_count,
        "not_applicable": run.not_applicable_count,
        "unsupported": run.unsupported_count,
        "indeterminate": run.indeterminate_count,
        "findings_created": run.findings_created,
        "findings_updated": run.findings_updated,
    }


def _uuid_or_none(value: object):
    """Parse a UUID, or None when the value is absent or is a non-UUID reference."""
    import uuid as _uuid
    if not value:
        return None
    try:
        return _uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        return None


async def evaluate_cloud_posture(payload: dict | None = None, **kwargs: object) -> dict:
    """Create a posture evaluation run for an environment, execute it, report real counts."""
    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    payload = payload or {}
    tenant_raw = payload.get("_tenant_id") or payload.get("tenant_id") or kwargs.get("tenant_id")
    env_raw = payload.get("environment_id")
    provider_raw = str(payload.get("provider") or kwargs.get("provider") or "").strip().lower()
    raw_mission = (payload.get("_mission_id") or payload.get("mission_id")
                   or kwargs.get("mission_id"))
    raw_user = (payload.get("initiated_by_user_id") or payload.get("user_id")
                or payload.get("_actor_id") or kwargs.get("user_id"))
    if not tenant_raw:
        return {"success": False, "code": "MISSING_ARGUMENT",
                "detail": "tenant_id is required to evaluate posture"}
    if not env_raw and not provider_raw:
        return {"success": False, "code": "MISSING_ARGUMENT",
                "detail": "environment_id or provider is required to evaluate posture"}

    tenant_id = _uuid_or_none(tenant_raw)
    if tenant_id is None:
        return {"success": False, "code": "INVALID_TENANT",
                "detail": "tenant_id is not a UUID"}
    env_id = _uuid_or_none(env_raw)
    # 19 Nov 2026: _actor_id is the agent name, and a kernel-style mission reference is not a
    # UUID. Both raised "badly formed hexadecimal UUID string" before any posture work ran, so
    # every agent-driven evaluation failed. Non-UUID values are treated as absent and the
    # mission's real initiator is used instead.
    mission_id = _uuid_or_none(raw_mission)

    async with async_session_factory() as session:
        await bind_tenant(session, tenant_id)
        if env_id is not None:
            environment = (
                await session.execute(
                    select(CloudEnvironment).where(
                        CloudEnvironment.id == env_id, CloudEnvironment.tenant_id == tenant_id
                    )
                )
            ).scalars().first()
        else:
            candidates = (
                await session.execute(
                    select(CloudEnvironment).where(
                        CloudEnvironment.tenant_id == tenant_id,
                        CloudEnvironment.provider == provider_raw,
                    )
                )
            ).scalars().all()
            if not candidates:
                return {"success": False, "code": "PROVIDER_NOT_CONNECTED",
                        "provider": provider_raw,
                        "detail": f"no {provider_raw} environment is registered for this tenant"}
            if len(candidates) > 1:
                return {"success": False, "code": "AMBIGUOUS_ENVIRONMENT",
                        "provider": provider_raw,
                        "environments": [{"environment_id": str(c.id), "native_id": c.native_id}
                                         for c in candidates],
                        "detail": f"this tenant has {len(candidates)} {provider_raw} environments; "
                                  "name one with environment_id"}
            environment = candidates[0]
        if environment is None:
            return {"success": False, "code": "ENVIRONMENT_NOT_FOUND",
                    "detail": f"no cloud environment {env_id} for this tenant"}
        env_id = environment.id

        user_id = _uuid_or_none(raw_user)
        if user_id is None and mission_id is not None:
            mission = (
                await session.execute(
                    select(Mission).where(Mission.id == mission_id,
                                          Mission.tenant_id == tenant_id)
                )
            ).scalars().first()
            user_id = getattr(mission, "requested_by_user_id", None) if mission else None
        if user_id is None:
            return {"success": False, "code": "UNKNOWN_INITIATOR",
                    "detail": "cannot determine who initiated this evaluation"}

        run = CloudPostureEvaluationRun(
            tenant_id=tenant_id,
            environment_id=env_id,
            provider=environment.provider,
            mission_id=mission_id,
            initiated_by_user_id=user_id,
            requested_policy_ids=list(payload.get("policy_ids") or []),
            # Both columns are NOT NULL with no server default: the run records which
            # evaluator produced it and which policy-pack state it was judged against, so a
            # result can never be re-attributed to a different ruleset later.
            evaluator_version=EVALUATOR_VERSION,
            policy_registry_fingerprint=policy_registry_fingerprint(),
            status="queued",
        )
        session.add(run)
        await session.flush()

        result = await run_evaluation(session, tenant_id=tenant_id, run_id=run.id)
        await session.commit()
        result["run_id"] = str(run.id)
        return result
