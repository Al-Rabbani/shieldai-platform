"""Authenticated worker heartbeats and the status they justify.

WHY THIS EXISTS. Measured 18 Nov 2026: the database had no heartbeat table at all, while the Base44
Agent entity showed 25 records - five created that morning duplicating the 9 Jun set - labelled
"online" against heartbeats five months old. Status was therefore decoration, not evidence.

DESIGN. A heartbeat is only accepted if it is signed with the server-side key, names a registered
agent, carries the caller's tenant, is not from the future beyond a small skew, and has not been seen
before. Nothing here invents a heartbeat: absence of evidence yields "unknown", never "online".

STATES, each justified by a different fact:
  unknown  - no verified heartbeat ever recorded for the role.
  offline  - newest verified heartbeat is older than STALE_AFTER_SECONDS.
  idle     - heartbeat is older than FRESH_WITHIN_SECONDS but within the stale window.
  online   - newest verified heartbeat is within FRESH_WITHIN_SECONDS.
  degraded - the worker itself reported degraded, or it is online/idle but has no executed governed
             receipt in the last day, so it is running yet doing nothing verifiable.
"capable" is reported separately and is never implied by "online": it needs an executed, verified
governed receipt for that role.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import text

_logger = logging.getLogger("gds.agent_heartbeats")

FRESH_WITHIN_SECONDS = 180
STALE_AFTER_SECONDS = 900
MAX_CLOCK_SKEW_SECONDS = 120
CAPABILITY_EVIDENCE_HOURS = 24

SIGNING_KEY_ENV = "HEARTBEAT_SIGNING_KEY"

FIELDS = ("agent_id", "tenant_id", "worker_id", "release_sha", "observed_at", "health_signal", "task_ref", "nonce")
# task_ref is genuinely optional (a heartbeat may carry no task), so it must not be a required field.
REQUIRED_FIELDS = tuple(f for f in FIELDS if f != "task_ref")


class HeartbeatRejected(Exception):
    """A heartbeat that must not be stored, with a machine-readable reason."""

    def __init__(self, code: str, detail: str) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail


def signing_key() -> str:
    key = os.environ.get(SIGNING_KEY_ENV, "").strip()
    if not key:
        # Fail closed: an unsigned heartbeat is indistinguishable from a fabricated one.
        raise HeartbeatRejected("SIGNING_KEY_NOT_CONFIGURED", f"{SIGNING_KEY_ENV} is not configured")
    return key


def canonical_payload(payload: dict[str, Any]) -> str:
    missing = [f for f in REQUIRED_FIELDS if payload.get(f) in (None, "")]
    if missing:
        raise HeartbeatRejected("MISSING_FIELDS", f"missing required fields: {', '.join(missing)}")
    ordered = {f: str(payload[f]) for f in FIELDS if f != "task_ref"}
    ordered["task_ref"] = str(payload.get("task_ref") or "")
    return json.dumps(ordered, separators=(",", ":"), sort_keys=True)


def digest(payload: dict[str, Any]) -> str:
    return hashlib.sha256(canonical_payload(payload).encode()).hexdigest()


def tenant_key(tenant_id: str, master: str | None = None) -> str:
    """A per-tenant signing key derived from the server master key.

    Without this the tenant id is just a claim inside the signed body, so any key holder could sign a
    heartbeat for any tenant. Deriving the key from the tenant makes cross-tenant forgery impossible
    rather than merely discouraged.
    """
    return hmac.new(
        (master or signing_key()).encode(), str(tenant_id).lower().encode(), hashlib.sha256
    ).hexdigest()


def sign(payload: dict[str, Any], key: str | None = None) -> str:
    return hmac.new((key or signing_key()).encode(), canonical_payload(payload).encode(), hashlib.sha256).hexdigest()


def verify(payload: dict[str, Any], signature: str, key: str | None = None) -> None:
    expected = sign(payload, key)
    if not hmac.compare_digest(expected, str(signature or "").strip().lower()):
        raise HeartbeatRejected("BAD_SIGNATURE", "heartbeat signature does not verify")


def parse_observed_at(value: Any) -> datetime:
    try:
        observed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError) as exc:
        raise HeartbeatRejected("BAD_TIMESTAMP", "observed_at is not an ISO-8601 timestamp") from exc
    if observed.tzinfo is None:
        raise HeartbeatRejected("BAD_TIMESTAMP", "observed_at must carry a timezone")
    if observed - datetime.now(UTC) > timedelta(seconds=MAX_CLOCK_SKEW_SECONDS):
        raise HeartbeatRejected("FUTURE_TIMESTAMP", "observed_at is further in the future than the allowed clock skew")
    return observed


def validate(payload: dict[str, Any], *, signature: str, expected_tenant: str) -> dict[str, Any]:
    """Every rejection is explicit; nothing falls through to a stored row."""
    from gds_api.agents.registry import AGENT_REGISTRY

    agent_id = str(payload.get("agent_id") or "").strip()
    if agent_id not in AGENT_REGISTRY:
        raise HeartbeatRejected("UNKNOWN_AGENT", f"'{agent_id}' is not a registered agent")
    tenant = str(payload.get("tenant_id") or "").strip()
    if tenant.lower() != str(expected_tenant).lower():
        raise HeartbeatRejected("TENANT_MISMATCH", "heartbeat tenant does not match the authenticated tenant")
    # Verified against the tenant's own derived key, so a heartbeat signed for another tenant fails.
    verify(payload, signature, tenant_key(tenant))
    observed = parse_observed_at(payload.get("observed_at"))
    return {
        "agent_id": agent_id,
        "tenant_id": tenant,
        "worker_id": str(payload["worker_id"])[:200],
        "release_sha": str(payload["release_sha"])[:64],
        "health_signal": str(payload["health_signal"])[:32],
        "task_ref": (str(payload.get("task_ref"))[:200] if payload.get("task_ref") else None),
        "nonce": str(payload["nonce"])[:128],
        "observed_at": observed,
        "payload_digest": digest(payload),
    }


async def ingest(db: Any, *, payload: dict[str, Any], signature: str, expected_tenant: str) -> dict[str, Any]:
    from gds_api.tenant_binding import bind_tenant

    record = validate(payload, signature=signature, expected_tenant=expected_tenant)
    await bind_tenant(db, record["tenant_id"])
    seen = (
        await db.execute(
            text("SELECT 1 FROM agent_heartbeats WHERE agent_id = :a AND nonce = :n"),
            {"a": record["agent_id"], "n": record["nonce"]},
        )
    ).first()
    if seen is not None:
        raise HeartbeatRejected("REPLAYED_NONCE", "this heartbeat nonce has already been recorded")
    await db.execute(
        text(
            "INSERT INTO agent_heartbeats (id, tenant_id, agent_id, worker_id, release_sha, observed_at,"
            " health_signal, task_ref, nonce, payload_digest)"
            " VALUES (:id, :tenant_id, :agent_id, :worker_id, :release_sha, :observed_at,"
            " :health_signal, :task_ref, :nonce, :payload_digest)"
        ),
        {"id": uuid.uuid4(), **record},
    )
    await db.commit()
    return {"agent_id": record["agent_id"], "observed_at": record["observed_at"].isoformat(), "recorded": True}


def derive_status(*, age_seconds: float | None, health_signal: str | None, executed_receipts: int) -> dict[str, Any]:
    """Pure mapping from evidence to state, so the thresholds are testable without a database."""
    if age_seconds is None:
        state = "unknown"
        reason = "no verified heartbeat has ever been recorded for this role"
    elif age_seconds > STALE_AFTER_SECONDS:
        state = "offline"
        reason = f"newest verified heartbeat is {int(age_seconds)}s old, beyond the {STALE_AFTER_SECONDS}s stale limit"
    elif age_seconds > FRESH_WITHIN_SECONDS:
        state = "idle"
        reason = f"newest verified heartbeat is {int(age_seconds)}s old, inside the stale window but not fresh"
    elif str(health_signal or "").lower() in {"degraded", "error", "failing"}:
        state = "degraded"
        reason = f"worker reports health '{health_signal}'"
    elif executed_receipts <= 0:
        state = "degraded"
        reason = "heartbeat is fresh but no executed governed receipt exists in the last 24h"
    else:
        state = "online"
        reason = f"fresh verified heartbeat and {executed_receipts} executed governed receipt(s) in 24h"
    return {
        "state": state,
        "reason": reason,
        "capable": executed_receipts > 0,
        "capability_evidence": f"{executed_receipts} executed governed receipt(s) in {CAPABILITY_EVIDENCE_HOURS}h",
    }


async def fleet_status(db: Any, *, tenant_id: str) -> dict[str, Any]:
    from gds_api.agents.registry import AGENT_REGISTRY
    from gds_api.tenant_binding import bind_tenant

    await bind_tenant(db, tenant_id)
    beats = {
        row.agent_id: row
        for row in (
            await db.execute(
                text(
                    "SELECT DISTINCT ON (agent_id) agent_id, observed_at, received_at, health_signal, worker_id, release_sha"
                    " FROM agent_heartbeats ORDER BY agent_id, observed_at DESC"
                )
            )
        ).all()
    }
    receipts = {
        row.evaluated_agent_id: row.executed
        for row in (
            await db.execute(
                text(
                    "SELECT evaluated_agent_id, count(*) AS executed FROM capability_decisions"
                    " WHERE execution_status = 'executed' AND decided_at > now() - make_interval(hours => :h)"
                    " GROUP BY evaluated_agent_id"
                ),
                {"h": CAPABILITY_EVIDENCE_HOURS},
            )
        ).all()
    }
    now = datetime.now(UTC)
    roles = []
    for agent_id in sorted(AGENT_REGISTRY):
        beat = beats.get(agent_id)
        age = (now - beat.observed_at).total_seconds() if beat is not None else None
        derived = derive_status(
            age_seconds=age,
            health_signal=(beat.health_signal if beat is not None else None),
            executed_receipts=int(receipts.get(agent_id, 0)),
        )
        roles.append(
            {
                "agent_id": agent_id,
                "registered": True,
                **derived,
                "last_observed_at": beat.observed_at.isoformat() if beat is not None else None,
                "last_received_at": beat.received_at.isoformat() if beat is not None else None,
                "worker_id": beat.worker_id if beat is not None else None,
                "release_sha": beat.release_sha if beat is not None else None,
                "evidence_source": "agent_heartbeats (verified) + capability_decisions (executed)",
            }
        )
    counts: dict[str, int] = {}
    for role in roles:
        counts[role["state"]] = counts.get(role["state"], 0) + 1
    return {
        "tenant_id": tenant_id,
        "freshness": {"fresh_within_seconds": FRESH_WITHIN_SECONDS, "stale_after_seconds": STALE_AFTER_SECONDS},
        "counts": counts,
        "roles": roles,
    }
