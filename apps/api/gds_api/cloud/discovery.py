"""EDP-009 Part 1, Sections 6 and 20: starting and tracking a real
CloudDiscoveryJob. Reuses the exact same Capability Broker pipeline every other
real capability in this platform uses (`evaluate_capability_request` ->
`execute_capability_request`) via the real `cloud.discover_environment`
capability/`discover_cloud_environment` tool - never a second execution path.

The container Mission this creates is deliberately lightweight, mirroring
`repository_api.py`'s own real "browsing Mission" precedent (a direct capability
call, not the full Temporal MissionWorkflow reasoning loop) - a discovery run is a
deterministic, human-triggered inventory operation, not something needing the
assess/plan LLM steps a real autonomous mission uses. `mission_type` is still set
and still runs through `validate_mission_type_eligibility` for real, so an
unauthorised/disabled environment fails closed exactly the same way a real
autonomous mission would.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.audit import record_audit_event
from gds_api.capabilities.broker import evaluate_capability_request
from gds_api.capabilities.gateway import CapabilityExecutionDenied, execute_capability_request
from gds_api.cloud.environments import CloudEnvironmentNotFound
from gds_api.cloud.environments import get_environment as get_environment_service
from gds_api.events import publish_mission_event
from gds_api.mission_reaper import fail_mission_durably
from gds_api.logging_config import get_logger
from gds_api.metrics import cloud_discovery_jobs_total
from gds_api.mission_taxonomy import (
    MissionType,
    MissionTypeIneligible,
    validate_mission_type_eligibility,
)
from gds_api.models import CloudDiscoveryJob, CloudEnvironment, Mission
from gds_api.tenant_binding import bind_tenant

_logger = get_logger("gds_api.cloud.discovery")


class CloudDiscoveryJobNotFound(Exception):
    pass


class CloudDiscoveryStartError(Exception):
    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)


async def start_discovery(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    environment_id: uuid.UUID,
    discovery_categories: list[str] | None = None,
) -> CloudDiscoveryJob:
    try:
        environment = await get_environment_service(
            db, tenant_id=tenant_id, environment_id=environment_id
        )
    except CloudEnvironmentNotFound as exc:
        raise CloudDiscoveryStartError(str(exc)) from exc

    # Section 38/40's own real "duplicate discovery execution"/"duplicate request"
    # concern: without this check, a double-submitted request (a double-click, a
    # retried client) could start two overlapping discovery runs against the same
    # environment, racing each other's upserts/absence-detection sweeps. Real,
    # queried fresh on every call - never trusted from a cached/stale in-memory flag.
    active = (
        await db.execute(
            select(CloudDiscoveryJob).where(
                CloudDiscoveryJob.tenant_id == tenant_id,
                CloudDiscoveryJob.environment_id == environment_id,
                CloudDiscoveryJob.status.in_(("queued", "starting", "running")),
            )
        )
    ).scalars().first()
    if active is not None:
        raise CloudDiscoveryStartError(
            f"A discovery job ({active.id}) is already {active.status} for this "
            "environment - wait for it to finish or cancel it before starting another."
        )

    try:
        await validate_mission_type_eligibility(
            db, tenant_id=tenant_id, mission_type=MissionType.CLOUD_SECURITY_ASSESSMENT.value
        )
    except MissionTypeIneligible as exc:
        raise CloudDiscoveryStartError(str(exc)) from exc

    mission = Mission(
        tenant_id=tenant_id,
        requested_by_user_id=user_id,
        objective=f"Cloud discovery: {environment.name} [cloud-discovery:{environment.id}]",
        status="running",
        mission_type=MissionType.CLOUD_SECURITY_ASSESSMENT.value,
    )
    db.add(mission)
    await db.flush()
    # Snapshot before any commit boundary: execute_capability_request commits internally, and under
    # NullPool that discards the connection, the tenant bind and every expired ORM attribute with it.
    mission_id = mission.id

    try:
        eval_result = await evaluate_capability_request(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            mission_id=mission_id,
            # cloud.discover_environment is granted only to the security_architecture agent, so a
            # console-initiated run must be attributed to it. The human initiator is still recorded as
            # user_id, so the audit trail names both the person and the agent that holds the grant.
            requesting_agent_id="security_architecture",
            supervising_agent_id="security_architecture",
            capability_key="cloud.discover_environment",
            requested_tool_id="discover_cloud_environment",
            target_type=None,
            target_reference=None,
            target_scope=None,
            purpose=f"Discover cloud environment {environment.name}",
            requested_parameters={
                "environment_id": str(environment_id),
                "discovery_categories": discovery_categories or [],
            },
        )
        if eval_result.decision != "ALLOW":
            # Deliberately no mission write here. Writing mission.status on this session holds an uncommitted
            # row lock, and the failure handler below writes the same row from its own session - which would
            # deadlock instead of reporting the denial. The except path records the failure once.
            raise CloudDiscoveryStartError(
                eval_result.safe_message or f"Capability request was {eval_result.decision}"
            )
        await execute_capability_request(
            db,
            tenant_id=tenant_id,
            request_id=eval_result.request_id,
            tool_name="discover_cloud_environment",
            input_data={
                "environment_id": str(environment_id),
                "discovery_categories": discovery_categories or [],
            },
            user_id=user_id,
            mission_id=mission.id,
        )
    except Exception as exc:
        # A failed start must not leave a running mission behind. The route commits only after this
        # returns and get_db never commits, so raising here rolls this session back - the durable
        # write below is the only record of the failure that survives.
        # Roll back BEFORE that write: this session may still hold an uncommitted lock on the mission
        # row, and fail_mission_durably updates the same row from a different connection. Holding the
        # lock across that call deadlocks both sessions rather than reporting the failure.
        await db.rollback()
        await fail_mission_durably(mission_id, tenant_id, f"{type(exc).__name__}: {exc}")
        if isinstance(exc, CloudDiscoveryStartError):
            raise
        raise CloudDiscoveryStartError(str(exc)) from exc

    # The capability call committed, so the tenant GUC is gone and this instance is expired. Re-bind first,
    # then reload: without the bind the UPDATE is filtered by RLS and matches 0 rows.
    await bind_tenant(db, tenant_id)
    mission = await db.get(Mission, mission_id)
    if mission is None:
        raise CloudDiscoveryStartError(
            f"mission {mission_id} was not found after the discovery capability ran"
        )
    mission.status = "completed"
    mission.completed_at = datetime.now(UTC)
    await db.flush()

    job = (
        (
            await db.execute(
                select(CloudDiscoveryJob)
                .where(CloudDiscoveryJob.mission_id == mission_id)
                .order_by(CloudDiscoveryJob.created_at.desc())
            )
        )
        .scalars()
        .first()
    )
    if job is None:
        # The capability ran but left no job behind: close the mission honestly rather than reporting
        # a start that produced nothing.
        await fail_mission_durably(mission_id, tenant_id, "discovery produced no job record")
        raise CloudDiscoveryStartError(
            "Capability executed but no CloudDiscoveryJob record was created - this is a "
            "real, unexpected internal inconsistency, not a normal discovery failure."
        )
    # Snapshot before committing: the commit expires every ORM attribute, and reading them afterwards
    # needs a live bind anyway.
    job_id = job.id
    job_status = job.status
    # Committed after the read, never before: a commit here would leave the job lookup above running
    # on an unbound connection, where a forced table silently returns nothing.
    await db.commit()
    # The commit dropped the connection and the tenant GUC. Re-bind before writing audit_events, which is
    # FORCE-RLS: an unbound insert is rejected outright, not silently ignored.
    await bind_tenant(db, tenant_id)

    await record_audit_event(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="cloud.discovery_started",
        detail={
            "discovery_job_id": str(job_id),
            "environment_id": str(environment_id),
            "status": job_status,
        },
    )
    return job


async def get_discovery_job(
    db: AsyncSession, *, tenant_id: uuid.UUID, discovery_job_id: uuid.UUID
) -> CloudDiscoveryJob:
    job = await db.get(CloudDiscoveryJob, discovery_job_id)
    if job is None or job.tenant_id != tenant_id:
        raise CloudDiscoveryJobNotFound("Cloud discovery job not found")
    return job


async def list_discovery_jobs(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    environment_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[CloudDiscoveryJob]:
    limit = max(1, min(limit, 200))
    query = select(CloudDiscoveryJob).where(CloudDiscoveryJob.tenant_id == tenant_id)
    if environment_id:
        query = query.where(CloudDiscoveryJob.environment_id == environment_id)
    if status_filter:
        query = query.where(CloudDiscoveryJob.status == status_filter)
    query = query.order_by(CloudDiscoveryJob.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return list(result.scalars().all())


# Section 40's own "worker restart"/"API restart"/"stale discovery job" failure
# modes: discovery in this architecture runs synchronously within one HTTP
# request (no background worker to restart mid-job - see ADR 0050's sub-phase 8
# addendum), so the only real way a job gets stuck non-terminal is the API
# process itself dying mid-request (crash, OOM-kill, forced restart) after
# CloudDiscoveryJob was flushed but before a terminal status was ever committed.
# A real, disclosed fixed threshold - no per-provider SLA config exists to make
# this adaptive, and real discovery runs in this environment complete in low
# single-digit seconds, so anything still non-terminal after an hour is honestly
# stale, not just slow.
_STALE_JOB_THRESHOLD = timedelta(hours=1)


async def reconcile_stale_discovery_jobs(db: AsyncSession) -> int:
    """Called once at API startup (gds_api.main's lifespan hook) - marks any
    real discovery job left non-terminal by a previous process's unclean exit
    as honestly `failed`, never left silently stuck forever nor guessed as
    successful. Returns the real number of jobs reconciled."""
    cutoff = datetime.now(UTC) - _STALE_JOB_THRESHOLD
    stale_jobs = (
        (
            await db.execute(
                select(CloudDiscoveryJob).where(
                    CloudDiscoveryJob.status.in_(("queued", "starting", "running")),
                    CloudDiscoveryJob.started_at < cutoff,
                )
            )
        )
        .scalars()
        .all()
    )
    for job in stale_jobs:
        job.status = "failed"
        job.completed_at = datetime.now(UTC)
        job.errors = [
            *job.errors,
            "Reconciled as failed at API startup - this job was left non-terminal by "
            "a previous process instance (a real crash or unclean restart, not a "
            "normal outcome), not because it genuinely failed mid-run.",
        ]
        environment = await db.get(CloudEnvironment, job.environment_id)
        if environment is not None and environment.discovery_status == "running":
            environment.discovery_status = "failed"
            environment.last_failure_detail = job.errors[-1]
        cloud_discovery_jobs_total.labels(provider=job.provider, status="failed").inc()
    if stale_jobs:
        await db.commit()
        _logger.warning("cloud.stale_discovery_jobs_reconciled", count=len(stale_jobs))
    return len(stale_jobs)


async def cancel_discovery_job(
    db: AsyncSession, *, tenant_id: uuid.UUID, discovery_job_id: uuid.UUID, user_id: uuid.UUID
) -> CloudDiscoveryJob:
    job = await get_discovery_job(db, tenant_id=tenant_id, discovery_job_id=discovery_job_id)
    if job.status not in ("queued", "starting", "running"):
        raise CloudDiscoveryStartError(
            f"Cannot cancel a discovery job in status '{job.status}' - only "
            "queued/starting/running jobs can be cancelled."
        )
    job.status = "cancelled"
    job.completed_at = datetime.now(UTC)
    await db.flush()
    cloud_discovery_jobs_total.labels(provider=job.provider, status="cancelled").inc()

    await record_audit_event(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="cloud.discovery_cancelled",
        detail={"discovery_job_id": str(job.id), "environment_id": str(job.environment_id)},
    )
    if job.mission_id is not None:
        await publish_mission_event(
            str(job.mission_id),
            "CloudDiscoveryCancelled",
            discovery_job_id=str(job.id),
            environment_id=str(job.environment_id),
        )
    return job
