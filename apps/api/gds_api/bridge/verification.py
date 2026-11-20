"""Verification flags derived from recorded evidence, never asserted.

Why this module exists: /bridge/health and /bridge/diagnostics returned hardcoded False for workers, tool
execution, database isolation and recovery. That was wrong in both directions. It told an operator the
platform could not do things it had demonstrably done - 57 missions completed in the previous seven days -
and because the value could never change it also could not warn anyone if those things stopped happening.
A flag that is always False carries no information at all.

Every flag here is computed from a record and returned alongside that record, so a reader can see what made
it true. A flag with no evidence stays False and says why.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta, timezone

WINDOW_DAYS = 7
RESTORE_WINDOW_DAYS = 30
RESTORE_JSON = "/var/lib/gds-restore-drill.json"
RESTORE_LOG = "/var/log/gds-restore-drill.log"


def _parse_stamp(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError, AttributeError):
        return None


def restore_evidence(json_path: str = RESTORE_JSON, log_path: str = RESTORE_LOG,
                     now: datetime | None = None) -> dict:
    """A restore counts only when a drill restored a dump and the row counts matched.

    The log is the fallback because the JSON marker is only rewritten by the drill's own summary path, and
    a drill that passed but left no marker would otherwise read as 'never verified'.
    """
    newest = None
    if os.path.isfile(json_path):
        try:
            with open(json_path, encoding="utf-8") as fh:
                data = json.load(fh)
            for key in ("drilled_at", "completed_at", "at", "timestamp", "last_drill"):
                if isinstance(data.get(key), str):
                    newest = _parse_stamp(data[key])
                    if newest:
                        break
        except (OSError, ValueError, TypeError, AttributeError):
            newest = None
    if newest is None and os.path.isfile(log_path):
        try:
            with open(log_path, encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    if " PASS " not in line:
                        continue
                    match = re.match(r"\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\]", line)
                    if match:
                        newest = _parse_stamp(match.group(1))
        except OSError:
            newest = None
    if newest is None:
        return {"verified": False, "reason": "no restore drill record found", "last_drill": None}
    if newest.tzinfo is None:
        newest = newest.replace(tzinfo=timezone.utc)
    reference = now or datetime.now(timezone.utc)
    age_days = (reference - newest).days
    if age_days > RESTORE_WINDOW_DAYS:
        return {"verified": False, "last_drill": newest.isoformat(), "age_days": age_days,
                "reason": f"last successful drill was {age_days} days ago"}
    return {"verified": True, "last_drill": newest.isoformat(), "age_days": age_days, "reason": None}


async def collect_verification() -> dict:
    """Read the evidence for each flag and return the flags with it."""
    from sqlalchemy import text as _text

    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    evidence: dict = {}
    reasons: dict = {}
    tenant = os.environ.get("GDS_TENANT_ID", "").strip()
    missions = tasks = isolation = reasoning = None
    try:
        async with async_session_factory() as session:
            if tenant:
                await bind_tenant(session, tenant)
            missions = (await session.execute(
                _text("SELECT count(*), max(completed_at) FROM missions "
                      "WHERE status = 'completed' "
                      "AND completed_at > now() - CAST(:d AS integer) * interval '1 day'"),
                {"d": WINDOW_DAYS})).first()
            tasks = (await session.execute(
                _text("SELECT count(*), max(created_at) FROM mission_tasks "
                      "WHERE status = 'completed' AND tool_name IS NOT NULL "
                      "AND created_at > now() - CAST(:d AS integer) * interval '1 day'"),
                {"d": WINDOW_DAYS})).first()
            reasoning = (await session.execute(
                _text("SELECT count(*) FILTER (WHERE t.tool_name IS NOT NULL), "
                      "       max(m.completed_at), "
                      "       count(DISTINCT t.agent_name), "
                      "       count(DISTINCT t.tool_name) "
                      "FROM missions m JOIN mission_tasks t ON t.mission_id = m.id "
                      "WHERE m.status = 'completed' AND t.status = 'completed' "
                      "AND m.completed_at > now() - CAST(:d AS integer) * interval '1 day'"),
                {"d": WINDOW_DAYS})).first()
            # pg_attribute, not information_schema.columns. information_schema only shows columns the connected
            # role holds a privilege on, so the same question answered through it is filtered by grants: measured
            # 20 Nov 2026 as gds_runtime it saw 11 of the 73 tenant tables and as gds it saw 71. The verdict
            # ("0 unforced") was therefore true of a subset, and a tenant table without FORCE RLS would have been
            # invisible to the check that exists to catch exactly that.
            isolation = (await session.execute(
                _text("SELECT count(*) FILTER (WHERE NOT c.relforcerowsecurity), count(*) "
                      "FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
                      "WHERE n.nspname = 'public' AND c.relkind = 'r' "
                      "AND EXISTS (SELECT 1 FROM pg_attribute a "
                      "            WHERE a.attrelid = c.oid AND a.attname = 'tenant_id' "
                      "            AND NOT a.attisdropped)"))).first()
    except Exception as exc:  # evidence unavailable is not evidence of failure
        reasons["database"] = f"evidence could not be read: {type(exc).__name__}"
        missions = tasks = isolation = reasoning = None

    workers_verified = bool(missions and missions[0])
    tool_canary_verified = bool(tasks and tasks[0])
    # A reasoning mission counts only when the model's chosen tool actually ran and its result was stored. A
    # mission row on its own proves a goal was submitted - templated work writes rows too - so the tool task is
    # the only part that a function-calling loop produces and a template does not.
    reasoning_verified = bool(reasoning and reasoning[0])
    unforced, tenant_tables = (isolation[0], isolation[1]) if isolation else (None, None)
    database_isolation_verified = unforced == 0 and bool(tenant_tables)

    evidence["workers"] = {"completed_missions_7d": missions[0] if missions else None,
                           "newest_completed": missions[1].isoformat() if missions and missions[1] else None}
    evidence["tools"] = {"completed_tool_tasks_7d": tasks[0] if tasks else None,
                         "newest_task": tasks[1].isoformat() if tasks and tasks[1] else None}
    evidence["isolation"] = {"tenant_tables": tenant_tables, "not_forced": unforced}
    evidence["reasoning"] = {
        "reasoned_tool_calls_7d": reasoning[0] if reasoning else None,
        "newest_reasoning_mission": reasoning[1].isoformat() if reasoning and reasoning[1] else None,
        "agents_reasoned": reasoning[2] if reasoning else None,
        "distinct_tools_chosen": reasoning[3] if reasoning else None,
    }
    recovery = restore_evidence()
    evidence["recovery"] = recovery

    if not workers_verified:
        reasons["workers"] = (f"no mission completed in the last {WINDOW_DAYS} days"
                              if missions else reasons.get("database", "no mission record"))
    if not tool_canary_verified:
        reasons["tools"] = (f"no tool-bearing task completed in the last {WINDOW_DAYS} days"
                            if tasks else reasons.get("database", "no task record"))
    if not database_isolation_verified:
        reasons["isolation"] = (f"{unforced} tenant tables are not FORCE RLS"
                                if unforced not in (None, 0) else reasons.get("database", "isolation unreadable"))
    if not reasoning_verified:
        reasons["reasoning"] = (
            f"no reasoning mission stored a tool call in the last {WINDOW_DAYS} days"
            if reasoning else reasons.get("database", "no reasoning record"))
    if not recovery["verified"]:
        reasons["recovery"] = recovery.get("reason")

    flags = {"workers_verified": workers_verified, "tool_canary_verified": tool_canary_verified,
             "database_isolation_verified": database_isolation_verified,
             "reasoning_verified": reasoning_verified,
             "recovery_verified": recovery["verified"]}
    all_true = all(flags.values())
    return {**flags,
            "production_ready": all_true,
            "verification_status": "verified" if all_true else ("partially_verified" if any(flags.values()) else "unverified"),
            "evidence": evidence,
            "unverified_reasons": reasons}
