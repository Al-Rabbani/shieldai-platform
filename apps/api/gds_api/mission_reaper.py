"""Mission lifecycle: no mission may be left non-terminal.

MEASURED DEFECT (17 Nov 2026). Six missions had sat in `running` for hours: four `Cloud discovery:
GDS AWS account 696616821372`, one `Cloud posture evaluation: ...`, and one `Repository browsing
session [repository-browse:8e9b5252]`.

ROOT CAUSE, PROVEN BY READING THE PATH RATHER THAN INFERRED. `start_discovery` and
`start_posture_evaluation` both create a Mission with status "running", and on a failed start they set
`mission.status = "failed"`, flush, and raise. The API route commits only after the call returns
(`await db.commit()` in cloud_api.py), and `get_db` never commits on its own, so the raised exception
rolled the session back and erased the failure. A failed cloud start therefore left a mission that
never ended. That is why these rows date from the period when discovery and evaluation were genuinely
failing, and why the successful runs left nothing behind.

The repository path is different and not a bug: `_get_or_create_browsing_mission` deliberately reuses
one open "session" per repository marker, so it is open-ended by design. It still needs an ending, and
the reaper gives it one.

TWO MECHANISMS, because they answer different questions:
  * fail_mission_durably() - used by the start paths. Writes the failure in its OWN session and commits
    it, so an outer rollback cannot undo the record of what happened.
  * reap_stale_missions() - a safety net for processes that died without any chance to write anything.
    Conservative on purpose: a mission is only touched when it is past a generous grace period AND has
    no task rows AND no workflow run, so real in-flight work is never cancelled.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import Select, select, text

from gds_api.audit import record_audit_event
from gds_api.db import async_session_factory
from gds_api.models import Mission
from gds_api.tenant_binding import bind_tenant

_logger = logging.getLogger(__name__)

TERMINAL_STATUSES: tuple[str, ...] = ("completed", "failed", "cancelled")

# A mission with no task row and no workflow run has never executed anything. Twelve hours is far
# longer than any governed start takes (discovery and evaluation complete in seconds), so the grace
# period cannot race a genuine run.
DEFAULT_GRACE_HOURS = 12


def _report_with_lifecycle(existing: str | None, payload: dict[str, Any]) -> str:
    """Mission.report is Text, not JSON.

    Assigning a dict raised asyncpg DataError "expected str, got dict" and rolled the whole sweep
    back, which is how this was found. The existing report is preserved rather than overwritten.
    """
    try:
        data = json.loads(existing) if existing else {}
        if not isinstance(data, dict):
            data = {"previous_report": existing}
    except (TypeError, ValueError):
        data = {"previous_report": existing}
    data["lifecycle"] = payload
    return json.dumps(data)


def _tenant_uuid(value: Any) -> uuid.UUID:
    """The tenant column is a UUID type; comparing it to a str silently matches nothing.

    normalise_tenant_id returns a string (correct for set_config), which is the wrong object for a
    typed comparison, so the reaper coerces here rather than relying on driver leniency.
    """
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def reap_cutoff(older_than_hours: int = DEFAULT_GRACE_HOURS, *, now: datetime | None = None) -> datetime:
    """The oldest a mission may be and still be reaped."""
    reference = now or datetime.now(UTC)
    return reference - timedelta(hours=older_than_hours)


def stale_mission_statement(tenant_id: Any, cutoff: datetime, limit: int = 200) -> Select:
    """Missions for one tenant that never started anything and are past the grace period.

    The NOT EXISTS clauses are raw SQL on purpose: mission_tasks is not FORCE-RLS while
    workflow_runs is, and spelling both out keeps the intent visible in one place instead of hiding it
    behind ORM relationship traversal that would silently read nothing when a binding is missing.
    """
    return (
        select(Mission)
        .where(
            Mission.tenant_id == _tenant_uuid(tenant_id),
            Mission.status.notin_(TERMINAL_STATUSES),
            Mission.created_at < cutoff,
            text("NOT EXISTS (SELECT 1 FROM mission_tasks t WHERE t.mission_id = missions.id)"),
            text("NOT EXISTS (SELECT 1 FROM workflow_runs r WHERE r.mission_id = missions.id)"),
        )
        .order_by(Mission.created_at)
        .limit(limit)
    )


async def fail_mission_durably(
    mission_id: uuid.UUID,
    tenant_id: uuid.UUID,
    reason: str,
    *,
    action: str = "mission.failed",
) -> bool:
    """Mark a mission failed in its own transaction, so a later rollback cannot erase it.

    Returns True when a row was actually transitioned, False when the mission was already terminal or
    not visible to this tenant - both of which are normal and must not be reported as success.
    """
    async with async_session_factory() as session:
        await bind_tenant(session, tenant_id)
        mission = await session.get(Mission, mission_id)
        if mission is None or mission.status in TERMINAL_STATUSES:
            return False
        mission.status = "failed"
        mission.completed_at = datetime.now(UTC)
        mission.report = _report_with_lifecycle(
            mission.report,
            {"outcome": "failed", "reason": reason[:1000], "recorded_by": action},
        )
        await record_audit_event(
            session,
            tenant_id=mission.tenant_id,
            user_id=getattr(mission, "requested_by_user_id", None),
            action=action,
            detail={"mission_id": str(mission_id), "reason": reason[:500]},
        )
        await session.commit()
        _logger.warning(
            "mission.failed_durably", extra={"mission_id": str(mission_id), "reason": reason[:200]}
        )
        return True


async def fail_mission_on_cancellation(
    mission_id: uuid.UUID,
    tenant_id: uuid.UUID,
    *,
    reason: str = "request cancelled before the mission finished",
    action: str = "mission.failed",
) -> None:
    """Close a mission when the request that opened it is cancelled.

    asyncio.CancelledError is a BaseException, not an Exception, so `except Exception` never sees it. A
    console-initiated cloud run is a synchronous request that takes minutes: when the client gives up or the
    gateway times out, the coroutine is cancelled and the mission it opened stayed `running` for ever. Eight
    such rows sat in the database between 10:29 and 11:16 on 20 Nov for exactly this reason.

    The durable write is created as its own task and shielded, because awaiting anything directly inside a
    cancellation handler raises again immediately. The closure therefore completes even though this request
    is already gone.
    """
    task = asyncio.create_task(
        fail_mission_durably(mission_id, tenant_id, reason, action=action)
    )

    def _swallow(done: asyncio.Task) -> None:
        # The request is already cancelled and nobody is left to read this exception; the mission write
        # itself is what matters, and fail_mission_durably already logs its own outcome.
        if not done.cancelled():
            done.exception()

    task.add_done_callback(_swallow)
    try:
        await asyncio.shield(task)
    except BaseException:
        # Expected when this coroutine is the one being cancelled. The task above keeps running.
        return


def _configured_tenants(tenants: list[Any] | None) -> list[uuid.UUID]:
    """The tenants to sweep: explicit, else GDS_TENANT_ID. Never discovered from a forced table.

    Returning an empty list is a configuration failure, not a clean sweep, so the caller says so loudly
    instead of printing "cancelled 0" and looking healthy.
    """
    candidates: list[Any] = list(tenants or [])
    if not candidates:
        env_tenant = os.environ.get("GDS_TENANT_ID", "").strip()
        if env_tenant:
            candidates.append(env_tenant)
    resolved: list[uuid.UUID] = []
    for candidate in candidates:
        try:
            resolved.append(_tenant_uuid(candidate))
        except (ValueError, TypeError, AttributeError):
            _logger.error("mission_reaper.bad_tenant", extra={"tenant": str(candidate)})
    # Preserve order, drop duplicates.
    return list(dict.fromkeys(resolved))


async def reap_stale_missions(
    *,
    older_than_hours: int = DEFAULT_GRACE_HOURS,
    dry_run: bool = False,
    limit: int = 200,
    tenants: list[Any] | None = None,
) -> list[dict[str, str]]:
    """Cancel non-terminal missions that provably never started, and say what was closed.

    TENANTS MUST BE SUPPLIED. This used to discover them with an unbound
    `SELECT DISTINCT tenant_id FROM missions WHERE status NOT IN (...)`. That worked only while `missions`
    was unforced; once it became FORCE ROW LEVEL SECURITY, the same query returned zero rows with no error,
    so the sweep reported "cancelled 0" every hour while missions piled up in `running` - 24 of them, the
    oldest 37 hours old, found on 20 Nov. An unbound read on a forced table is not an empty result, it is a
    missing binding, and the two look identical.

    Tenants now come from the caller or GDS_TENANT_ID, the same way escalate_stale_findings.py resolves
    them. Each tenant is bound before anything is read or written.
    """
    cutoff = reap_cutoff(older_than_hours)
    reaped: list[dict[str, str]] = []

    tenant_ids = _configured_tenants(tenants)
    if not tenant_ids:
        _logger.error(
            "mission_reaper.no_tenant",
            extra={"detail": "no tenants supplied and GDS_TENANT_ID is empty; nothing was swept"},
        )
        return []

    for tenant_id in tenant_ids:
        async with async_session_factory() as session:
            await bind_tenant(session, tenant_id)
            stale = (await session.execute(stale_mission_statement(tenant_id, cutoff, limit))).scalars().all()
            if not stale:
                continue
            if dry_run:
                reaped.extend(
                    {
                        "id": str(m.id),
                        "tenant_id": str(m.tenant_id),
                        "status": m.status,
                        "objective": (m.objective or "")[:120],
                        "action": "would_cancel",
                    }
                    for m in stale
                )
                continue
            for mission in stale:
                mission.status = "cancelled"
                mission.cancelled_at = datetime.now(UTC)
                mission.report = _report_with_lifecycle(
                    mission.report,
                    {
                        "outcome": "cancelled",
                        "reason": (
                            "Reaped: still non-terminal with no task rows and no workflow run after "
                            f"{older_than_hours}h. Either it never started, or its work was never recorded; "
                            "both leave nothing to resume."
                        ),
                        "recorded_by": "reap_stale_missions",
                    },
                )
                await record_audit_event(
                    session,
                    tenant_id=mission.tenant_id,
                    user_id=getattr(mission, "requested_by_user_id", None),
                    action="mission.reaped",
                    detail={
                        "mission_id": str(mission.id),
                        "objective": (mission.objective or "")[:200],
                        "age_hours": older_than_hours,
                    },
                )
                reaped.append(
                    {
                        "id": str(mission.id),
                        "tenant_id": str(mission.tenant_id),
                        "status": "cancelled",
                        "objective": (mission.objective or "")[:120],
                        "action": "cancelled",
                    }
                )
            await session.commit()

    if reaped:
        _logger.warning("mission.reaped_stale", extra={"count": len(reaped)})
    return reaped
