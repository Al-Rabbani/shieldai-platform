"""Item 42: the autonomous scheduler, made visible and controllable.

WHAT WAS ALREADY TRUE, AND WHAT I GOT WRONG. GET /copilot/capabilities reported "no autonomous scheduler". That was
false. A cron job has been running real missions since October:

    */30 * * * * flock -n /opt/gds-os/.mission_scheduler.lock run_autonomous_missions.py

with a registry of what to run (/opt/gds-os/mission_registry.json) and a state file of when it last ran
(mission_state.json). Its own log shows platform-posture-check completing 3/3 agents and 10-13 tool calls per run on
22-23 Nov. What was missing was not the scheduler; it was any way to see it, pause it, or read its history from the app,
because the bridge keeps missions in memory and the state file is overwritten on every run.

THIS MODULE. GET /copilot/scheduler returns the registry as it is on disk, the budget position, the last runs from a real
log table, and the limits of the thing in words. Pause and resume rewrite the registry's interval atomically, so the
running cron loop honours them without a restart. Two internal routes exist for the runner itself, authenticated with the
shared bridge key, not a user session: one asks whether a run is allowed right now (the daily cost cap lives there), the
other records what happened.

NOT CLAIMED: this does not add a second scheduler, does not run missions inside the API process, and does not let a user
author a new schedule from this build - the registry is a file on the host, and creating an entry from the UI is the next
step rather than something this route pretends to do.
"""
from __future__ import annotations

import hmac
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

logger = logging.getLogger("gds.scheduler")

router = APIRouter(prefix="/copilot/scheduler", tags=["copilot"])

REGISTRY_PATH = Path(os.getenv("COPILOT_SCHEDULER_REGISTRY", "/opt/gds-os/mission_registry.json"))
STATE_PATH = Path(os.getenv("COPILOT_SCHEDULER_STATE", "/opt/gds-os/mission_state.json"))
DAILY_CAP_USD = float(os.getenv("COPILOT_SCHEDULER_DAILY_CAP_USD", "0.50"))
DEFAULT_INTERVAL_SECONDS = 21600
PLATFORM_TENANT_SLUG = os.getenv("COPILOT_SCHEDULER_TENANT_SLUG", "gds")

LIMITS = [
    "This is a cron job on the host, not a thread inside the API. Pausing it writes interval 0 into the registry file and "
    "the next tick skips it; it does not cancel a mission already running.",
    "The runner is authenticated with the shared bridge key, so a recorded run is one the host really launched.",
    "The daily cost cap is enforced by GET /copilot/scheduler/guard before each run, not by a provider-side limit. It "
    "stops spending on this scheduler; it cannot cap a mission a person starts from the Co-Pilot.",
    "The registry holds one entry today. Creating or editing a schedule from this screen is not built; the route below "
    "pauses and resumes what the file already declares.",
    "Mission history is now kept in copilot_scheduler_log. Before this build it existed only in /var/log/gds-autonomous.log "
    "and in a state file overwritten on every run.",
]


# ----------------------------------------------------------------------------- registry


def _load_registry() -> Dict[str, Any]:
    try:
        with REGISTRY_PATH.open() as handle:
            data = json.load(handle)
    except FileNotFoundError as exc:
        raise HTTPException(503, f"Scheduler registry not found at {REGISTRY_PATH}") from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(503, f"Scheduler registry at {REGISTRY_PATH} is not valid JSON: {exc}") from exc
    if not isinstance(data.get("missions"), list):
        raise HTTPException(503, f"Scheduler registry at {REGISTRY_PATH} has no missions list")
    return data


def _save_registry(data: Dict[str, Any]) -> None:
    tmp = REGISTRY_PATH.with_suffix(REGISTRY_PATH.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2) + "\n")
    os.replace(tmp, REGISTRY_PATH)


def _entry(data: Dict[str, Any], name: str) -> Dict[str, Any]:
    for entry in data["missions"]:
        if entry.get("name") == name:
            return entry
    raise HTTPException(404, f"No schedule named {name!r} in the registry")


def _load_state() -> Dict[str, Any]:
    try:
        with STATE_PATH.open() as handle:
            return json.load(handle)
    except Exception:  # noqa: BLE001 - the state file is a cache; the log table is the record
        return {}


# ----------------------------------------------------------------------------- helpers


def _bridge_key_ok(authorization: Optional[str]) -> bool:
    expected = os.getenv("BRIDGE_API_KEY") or ""
    if not expected or not authorization:
        return False
    presented = authorization[7:] if authorization.lower().startswith("bearer ") else authorization
    return hmac.compare_digest(presented.strip(), expected)


def _require_bridge(authorization: Optional[str]) -> None:
    if not _bridge_key_ok(authorization):
        raise HTTPException(401, "This route is for the scheduler runner and needs the shared bridge key")


BRIDGE_LIMIT_KEY = "ratelimit:bridge_mission:127.0.0.1"   # per-host, shared with every interactive mission
BRIDGE_LIMIT_MAX = 20


async def _bridge_mission_pressure() -> Dict[str, Any]:
    """Read the bridge's launch counter without incrementing it. Unreadable is reported, never assumed clear."""
    try:
        from gds_api.rate_limit import _get_redis

        async with _get_redis() as redis:
            count = int(await redis.get(BRIDGE_LIMIT_KEY) or 0)
            ttl = int(await redis.ttl(BRIDGE_LIMIT_KEY) or 0)
        return {"measured": True, "count": count, "limit": BRIDGE_LIMIT_MAX,
                "reset_in_seconds": max(ttl, 0), "exhausted": count >= BRIDGE_LIMIT_MAX}
    except Exception as exc:  # noqa: BLE001 - a limiter that cannot be read must say so
        return {"measured": False, "error": f"{type(exc).__name__}: {exc}", "exhausted": False}


async def _platform_tenant(db: AsyncSession) -> str:
    """Resolve the tenant scheduler runs are attributed to.

    tenants carries a row-level policy keyed on its own id, so an unbound session reads ZERO rows from it - looking the
    tenant up by slug first is impossible by construction and failed live as a 503. The id is already in the environment,
    so bind to it and use the slug only as a check that the binding is the platform tenant.
    """
    candidate = (os.getenv("GDS_TENANT_ID") or os.getenv("COPILOT_SCHEDULER_TENANT_ID") or "").strip()
    if not candidate:
        raise HTTPException(
            503,
            "GDS_TENANT_ID is not set in this process, and the tenants table cannot be searched by slug before a tenant "
            "is bound, so scheduler runs have nowhere to be attributed.",
        )
    await _set_tenant(db, candidate)
    row = (
        await db.execute(
            text("SELECT id, slug FROM tenants WHERE id = CAST(:i AS uuid)"), {"i": candidate}
        )
    ).first()
    if not row:
        raise HTTPException(503, f"GDS_TENANT_ID {candidate!r} is not a tenant in this database")
    if PLATFORM_TENANT_SLUG and row[1] != PLATFORM_TENANT_SLUG:
        raise HTTPException(
            503, f"GDS_TENANT_ID points at tenant slug {row[1]!r}, not {PLATFORM_TENANT_SLUG!r}"
        )
    return str(row[0])


async def _spent_today(db: AsyncSession, tenant_id: str) -> float:
    value = (
        await db.execute(
            text(
                "SELECT coalesce(sum(cost_usd), 0) FROM cost_records"
                " WHERE tenant_id = :t AND created_at >= date_trunc('day', now())"
            ),
            {"t": tenant_id},
        )
    ).scalar()
    return float(value or 0)


async def _set_tenant(db: AsyncSession, tenant_id: str) -> None:
    await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"), {"t": str(tenant_id)})


# ----------------------------------------------------------------------------- read


@router.get("")
async def scheduler_status(
    current_user: CurrentUser = Depends(require_permission("scheduler:read")),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """What the autonomous loop is doing right now, read from the registry file and the real run log."""
    registry = _load_registry()
    state = _load_state()
    tenant_id = await _platform_tenant(db)
    await _set_tenant(db, tenant_id)
    spent = await _spent_today(db, tenant_id)

    runs = (
        await db.execute(
            text(
                "SELECT schedule_name, kind, status, mission_id, agents, agents_succeeded, tool_calls, duration_ms,"
                " cost_usd, detail, actor_email, started_at, completed_at"
                " FROM copilot_scheduler_log WHERE tenant_id = :t ORDER BY started_at DESC LIMIT 25"
            ),
            {"t": tenant_id},
        )
    ).mappings().all()

    now = datetime.now(timezone.utc)
    entries: List[Dict[str, Any]] = []
    for entry in registry["missions"]:
        name = entry.get("name")
        interval = int(entry.get("interval_seconds", DEFAULT_INTERVAL_SECONDS))
        last = next((r for r in runs if r["schedule_name"] == name and r["kind"] == "run"), None)
        last_ts = last["started_at"] if last else None
        next_due = (last_ts + timedelta(seconds=interval)) if (last_ts and interval > 0) else None
        entries.append(
            {
                "name": name,
                "goal_preview": (entry.get("goal") or "")[:280],
                "goal_chars": len(entry.get("goal") or ""),
                "agents": entry.get("agents", []),
                "interval_seconds": interval,
                "interval_human": "paused" if interval <= 0 else f"every {interval // 3600}h" if interval % 3600 == 0 else f"every {interval // 60}m",
                "paused": interval <= 0,
                "resume_interval_seconds": entry.get("enabled_interval_seconds", DEFAULT_INTERVAL_SECONDS),
                "due_now": interval > 0 and (next_due is None or next_due <= now),
                "next_due_at": next_due.isoformat() if next_due else None,
                "state_file_last_run": (state.get(name) or {}).get("last_run_iso"),
                "last_run": (
                    {
                        "status": last["status"],
                        "mission_id": last["mission_id"],
                        "agents": last["agents"],
                        "agents_succeeded": last["agents_succeeded"],
                        "tool_calls": last["tool_calls"],
                        "duration_ms": last["duration_ms"],
                        "cost_usd": float(last["cost_usd"]) if last["cost_usd"] is not None else None,
                        "started_at": last["started_at"].isoformat() if last["started_at"] else None,
                        "detail": last["detail"],
                    }
                    if last
                    else None
                ),
            }
        )

    return {
        "scheduler": {
            "exists": True,
            "in_process": False,
            "how": "cron */30 * * * * flock -n /opt/gds-os/.mission_scheduler.lock run_autonomous_missions.py",
            "registry": str(REGISTRY_PATH),
            "state_file": str(STATE_PATH),
            "tenant_attributed": tenant_id,
            "note": "A cron job on this host has been running missions since October. This route reports it; it does not "
                    "start a second scheduler.",
        },
        "bridge_limiter": await _bridge_mission_pressure(),
        "budget": {
            "daily_cap_usd": DAILY_CAP_USD,
            "spent_today_usd": round(spent, 6),
            "remaining_usd": round(max(0.0, DAILY_CAP_USD - spent), 6),
            "held": spent >= DAILY_CAP_USD,
            "enforced_by": "GET /copilot/scheduler/guard is called by the runner before every run",
        },
        "entries": entries,
        "runs": [
            {
                "schedule_name": r["schedule_name"],
                "kind": r["kind"],
                "status": r["status"],
                "mission_id": r["mission_id"],
                "agents": r["agents"],
                "agents_succeeded": r["agents_succeeded"],
                "tool_calls": r["tool_calls"],
                "duration_ms": r["duration_ms"],
                "cost_usd": float(r["cost_usd"]) if r["cost_usd"] is not None else None,
                "detail": r["detail"],
                "actor_email": r["actor_email"],
                "started_at": r["started_at"].isoformat() if r["started_at"] else None,
                "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
            }
            for r in runs
        ],
        "limits": LIMITS,
    }


# ----------------------------------------------------------------------------- control


async def _record_control(db: AsyncSession, tenant_id: str, name: str, status: str, actor: str, detail: str) -> None:
    await _set_tenant(db, tenant_id)
    await db.execute(
        text(
            "INSERT INTO copilot_scheduler_log"
            " (tenant_id, schedule_name, kind, status, detail, actor_email, completed_at)"
            " VALUES (:t, :n, 'control', :s, :d, :a, now())"
        ),
        {"t": tenant_id, "n": name, "s": status, "d": detail, "a": actor},
    )
    await db.commit()


@router.post("/{name}/pause")
async def pause_schedule(
    name: str,
    current_user: CurrentUser = Depends(require_permission("scheduler:write")),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Stop the cron loop from running this schedule. Writes interval 0 and remembers what to restore on resume."""
    registry = _load_registry()
    entry = _entry(registry, name)
    interval = int(entry.get("interval_seconds", DEFAULT_INTERVAL_SECONDS))
    if interval <= 0:
        return {"name": name, "paused": True, "already": True, "interval_seconds": 0}

    entry["enabled_interval_seconds"] = interval
    entry["interval_seconds"] = 0
    _save_registry(registry)

    tenant_id = await _platform_tenant(db)
    actor = getattr(current_user, "email", None) or "unknown"
    await _record_control(
        db, tenant_id, name, "paused", actor, f"interval {interval}s -> 0 by {actor}; the next cron tick skips it"
    )
    return {"name": name, "paused": True, "already": False, "interval_seconds": 0, "resume_interval_seconds": interval}


@router.post("/{name}/resume")
async def resume_schedule(
    name: str,
    current_user: CurrentUser = Depends(require_permission("scheduler:write")),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Restore the interval the schedule had before it was paused. A schedule that was never paused is left alone."""
    registry = _load_registry()
    entry = _entry(registry, name)
    interval = int(entry.get("interval_seconds", DEFAULT_INTERVAL_SECONDS))
    if interval > 0:
        return {"name": name, "paused": False, "already": True, "interval_seconds": interval}

    restored = int(entry.get("enabled_interval_seconds") or DEFAULT_INTERVAL_SECONDS)
    entry["interval_seconds"] = restored
    entry.pop("enabled_interval_seconds", None)
    _save_registry(registry)

    tenant_id = await _platform_tenant(db)
    actor = getattr(current_user, "email", None) or "unknown"
    await _record_control(
        db, tenant_id, name, "resumed", actor, f"interval 0 -> {restored}s by {actor}; due at the next tick after that"
    )
    return {"name": name, "paused": False, "already": False, "interval_seconds": restored}


# ----------------------------------------------------------------------------- runner (bridge key)


@router.get("/guard")
async def guard(
    name: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """The runner asks this before every run. The daily cost cap and the pause flag are both enforced here.

    name is optional in the signature so the bridge key is checked before FastAPI validates anything: an anonymous caller
    must get 401, not a 422 that confirms the route exists and names the parameter it wants.
    """
    _require_bridge(authorization)
    if not name:
        raise HTTPException(400, "name is required: which schedule is asking for a verdict")
    registry = _load_registry()
    entry = _entry(registry, name)
    interval = int(entry.get("interval_seconds", DEFAULT_INTERVAL_SECONDS))
    tenant_id = await _platform_tenant(db)
    spent = await _spent_today(db, tenant_id)

    pressure = await _bridge_mission_pressure()
    if interval <= 0:
        allow, reason = False, "paused: interval_seconds is 0 in the registry"
    elif spent >= DAILY_CAP_USD:
        allow, reason = False, f"daily cost cap reached: ${spent:.4f} spent of ${DAILY_CAP_USD:.2f}"
    elif pressure.get("exhausted"):
        allow, reason = False, (
            f"bridge mission limiter at {pressure['count']}/{pressure['limit']} launches this hour, resets in "
            f"{pressure['reset_in_seconds']}s - the scheduler shares that budget with every interactive mission"
        )
    else:
        allow, reason = True, "due, within the daily cost cap and under the bridge launch limit"

    return {
        "allow": allow,
        "reason": reason,
        "tenant_id": tenant_id,
        "interval_seconds": interval,
        "daily_cap_usd": DAILY_CAP_USD,
        "spent_today_usd": round(spent, 6),
        "bridge_mission_limiter": pressure,
    }


class RunRecord(BaseModel):
    schedule_name: str = Field(min_length=1, max_length=200)
    tenant_id: str
    status: str = Field(pattern="^(running|completed|failed|skipped)$")
    mission_id: Optional[str] = None
    agents: Optional[int] = None
    agents_succeeded: Optional[int] = None
    tool_calls: Optional[int] = None
    duration_ms: Optional[int] = None
    detail: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@router.post("/runs")
async def record_run(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Record what the runner did. The cost is summed from cost_records by mission, not supplied by the runner.

    The body is read inside the function, after the bridge key is checked, because a declared model would be validated
    before this code runs and an anonymous caller would get a 422 that confirms the route and its fields.
    """
    _require_bridge(authorization)
    try:
        raw = await request.json()
    except Exception as exc:  # noqa: BLE001 - a malformed body is the caller's problem, reported plainly
        raise HTTPException(400, "a JSON run record is required") from exc
    try:
        body = RunRecord(**raw)
    except ValidationError as exc:
        raise HTTPException(422, detail=exc.errors()) from exc
    tenant_id = await _platform_tenant(db)
    if str(body.tenant_id) != tenant_id:
        raise HTTPException(400, "tenant_id does not match the tenant this scheduler is attributed to")

    await _set_tenant(db, tenant_id)
    cost = None
    if body.mission_id:
        cost = (
            await db.execute(
                text(
                    "SELECT sum(cost_usd) FROM cost_records WHERE tenant_id = :t AND mission_id::text = :m"
                ),
                {"t": tenant_id, "m": body.mission_id},
            )
        ).scalar()
    row = (
        await db.execute(
            text(
                "INSERT INTO copilot_scheduler_log"
                " (tenant_id, schedule_name, kind, status, mission_id, agents, agents_succeeded, tool_calls,"
                "  duration_ms, cost_usd, detail, started_at, completed_at)"
                " VALUES (:t, :n, 'run', :s, :m, :a, :as_, :tc, :d, :c, :det, coalesce(:st, now()), :ct)"
                " RETURNING id"
            ),
            {
                "t": tenant_id,
                "n": body.schedule_name,
                "s": body.status,
                "m": body.mission_id,
                "a": body.agents,
                "as_": body.agents_succeeded,
                "tc": body.tool_calls,
                "d": body.duration_ms,
                "c": float(cost) if cost is not None else None,
                "det": body.detail,
                "st": body.started_at,
                "ct": body.completed_at,
            },
        )
    ).first()
    await db.commit()
    return {"recorded": True, "id": str(row[0]), "cost_usd": float(cost) if cost is not None else None}
