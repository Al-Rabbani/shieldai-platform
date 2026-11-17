"""Governed tool execution for reasoning agents.

WHY THIS EXISTS. The legacy agent loop returned GOVERNED_CAPABILITY_REQUIRED for every tool call,
because it held no authenticated broker context ("Legacy loop cannot manufacture an authenticated
broker execution context"). Measured 17 Nov 2026: with the /reasoning gate removed, POST /reasoning/auto
answered 200 and then told the caller it could not retrieve open findings - a worse outcome than the
503 the quarantine gave.

This module supplies the missing context through exactly the two calls the mission engine already uses
successfully: evaluate_capability_request (the governance decision) then execute_capability_request (the
real handler). Nothing here re-implements governance or bypasses it.

The capability key is never inferred. The catalogue rule is "a tool must map to exactly one capability",
so the key is resolved by scanning the declared registry for the single OPERATIONAL capability whose
required_tool_ids contains the tool. Zero matches or an ambiguous match fail loudly as
CAPABILITY_NOT_MAPPED rather than guessing a key that might authorize more than was declared.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

_logger = logging.getLogger(__name__)


class GovernedContextError(RuntimeError):
    """A reasoning call arrived without the identity a governed execution requires."""


def _as_uuid(value: Any, field: str) -> uuid.UUID:
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError) as exc:
        raise GovernedContextError(f"{field} is not a UUID: {value!r}") from exc


def resolve_capability_for_tool(tool_name: str) -> str | None:
    """The single operational capability that declares this tool, or None.

    A declared mapping only: no inference, and no fallback key.
    """
    from gds_api.capabilities.catalog import CAPABILITY_REGISTRY
    from gds_api.capabilities.definitions import CapabilityStatus

    matches = [
        key
        for key, capability in CAPABILITY_REGISTRY.items()
        if getattr(capability, "status", None) == CapabilityStatus.OPERATIONAL
        and tool_name in (getattr(capability, "required_tool_ids", None) or [])
    ]
    return matches[0] if len(matches) == 1 else None


async def execute_governed_tool(
    *,
    tenant_id: Any,
    user_id: Any,
    mission_id: Any,
    agent_id: str | None,
    tool_name: str,
    args: dict[str, Any] | None,
    purpose: str | None = None,
) -> dict[str, Any]:
    """Run one tool through the capability broker. Never raises: returns a failure dict instead.

    Returning a dict keeps the agent loop's own contract (it renders tool results to the model), while
    a missing identity or an unmapped tool is reported explicitly and never executed.
    """
    from gds_api.capabilities.broker import evaluate_capability_request
    from gds_api.capabilities.gateway import execute_capability_request
    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    try:
        tid = _as_uuid(tenant_id, "tenant_id")
        uid = _as_uuid(user_id, "user_id")
        mid = _as_uuid(mission_id, "mission_id")
    except GovernedContextError as exc:
        return {
            "success": False,
            "error": str(exc),
            "code": "GOVERNED_CONTEXT_MISSING",
            "execution_mode": "not_executed",
        }

    capability_key = resolve_capability_for_tool(tool_name)
    if capability_key is None:
        return {
            "success": False,
            "error": (
                f"No single operational capability declares tool '{tool_name}', so it cannot be "
                "executed under governance"
            ),
            "code": "CAPABILITY_NOT_MAPPED",
            "tool": tool_name,
            "execution_mode": "not_executed",
        }

    payload = dict(args or {})
    async with async_session_factory() as session:
        await bind_tenant(session, tid)
        evaluation = await evaluate_capability_request(
            session,
            tenant_id=tid,
            user_id=uid,
            mission_id=mid,
            # The reasoning fleet (ai-vuln-director and the other 22) lives in the prompt registry, not
            # in the agents table, so passing its name made the broker refuse with "The requesting agent
            # could not be resolved" (DENY). The human who called /reasoning/mission is the real actor
            # here, and the agent that acted is recorded in the purpose and the mission objective, so
            # attribution survives without pretending an unregistered agent exists.
            requesting_agent_id=None,
            supervising_agent_id=None,
            capability_key=capability_key,
            requested_tool_id=tool_name,
            target_type=None,
            target_reference=None,
            target_scope=None,
            purpose=(purpose or f"reasoning agent {agent_id} requested {tool_name}")[:200],
            requested_parameters=payload,
        )
        if evaluation.decision != "ALLOW":
            return {
                "success": False,
                "error": getattr(evaluation, "safe_message", None)
                or f"Capability request was {evaluation.decision}",
                "code": evaluation.decision,
                "capability_key": capability_key,
                "tool": tool_name,
                "execution_mode": "not_executed",
            }
        try:
            return await execute_capability_request(
                session,
                tenant_id=tid,
                request_id=evaluation.request_id,
                tool_name=tool_name,
                input_data=payload,
                user_id=uid,
                mission_id=mid,
            )
        except Exception as exc:  # noqa: BLE001 - the loop must render a failure, not die
            _logger.exception("governed tool execution failed: %s", tool_name)
            return {
                "success": False,
                "error": f"{type(exc).__name__}: {exc}",
                "code": "EXECUTION_FAILED",
                "capability_key": capability_key,
                "tool": tool_name,
            }


async def open_reasoning_mission(*, tenant_id: Any, user_id: Any, goal: str, agent_id: str) -> uuid.UUID:
    """Create the real missions row a governed execution needs.

    capability_requests.mission_id is a foreign key, so an in-memory mission string cannot authorize a
    tool call. The row is also the audit trail for what the reasoning agent did and why.
    """
    from gds_api.db import async_session_factory
    from gds_api.models import Mission
    from gds_api.tenant_binding import bind_tenant

    tid = _as_uuid(tenant_id, "tenant_id")
    uid = _as_uuid(user_id, "user_id")
    async with async_session_factory() as session:
        await bind_tenant(session, tid)
        mission = Mission(
            tenant_id=tid,
            requested_by_user_id=uid,
            objective=f"Reasoning mission: {agent_id} - {str(goal)[:180]}",
            status="running",
        )
        session.add(mission)
        await session.commit()
        return mission.id


async def set_mission_outcome(*, mission_id: Any, tenant_id: Any, success: bool, summary: str) -> bool:
    """Close a reasoning mission. A mission must never be left running."""
    from gds_api.db import async_session_factory
    from gds_api.models import Mission
    from gds_api.tenant_binding import bind_tenant

    tid = _as_uuid(tenant_id, "tenant_id")
    mid = _as_uuid(mission_id, "mission_id")
    async with async_session_factory() as session:
        await bind_tenant(session, tid)
        mission = await session.get(Mission, mid)
        if mission is None or mission.status in ("completed", "failed", "cancelled"):
            return False
        try:
            report = json.loads(mission.report) if mission.report else {}
            if not isinstance(report, dict):
                report = {}
        except (TypeError, ValueError):
            report = {}
        report["reasoning"] = {
            "outcome": "completed" if success else "failed",
            "summary": (summary or "")[:2000],
        }
        mission.status = "completed" if success else "failed"
        mission.completed_at = datetime.now(UTC)
        mission.report = json.dumps(report)
        await session.commit()
        return True
