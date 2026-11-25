"""What the Co-Pilot is allowed to remember from its own missions, and why the list is this short.

The readiness list named the gap: memory was operator-stated only, so the Co-Pilot never learned from work it
had done. Closing it needs a rule first, because a platform that remembers the wrong things is worse than one
that remembers nothing. The rule implemented here, and enforced rather than described:

REMEMBERED, and only from a governed execution receipt:
  * a CONSEQUENTIAL action that actually executed - a remediation or cloud apply - recorded as the durable
    historical fact "X ran under governance on this date". It cannot go stale, because it is history.

NEVER REMEMBERED:
  * COUNTS. "849 open findings" is true today and false tomorrow, and a later mission would quote it as
    current. Counts belong to the register, which is read live, not to memory.
  * RAW TOOL OUTPUT. Scanner rows are the register's job; memory is for what a mission concluded and did.
  * ANYTHING THE MODEL WROTE. The answer text is unverified prose. A memory has to be something that happened.
  * SECRETS OR PERSONAL DATA. A denylist refuses token shapes, key assignments, private key blocks and email
    addresses outright, so a memory can never become an exfiltration channel.
  * READS. get_findings and nuclei produce no memory: they change nothing, and remembering every scan would
    bury the few entries that matter.

WHAT IT DELIBERATELY DOES NOT CLAIM: the receipt proves the request executed under governance. The handler's
own verdict is not persisted anywhere, so a memory says "ran under governance", never "succeeded".
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any

# Only consequential actions are worth remembering. Reads are excluded by construction, not by filtering later.
REMEMBERABLE_TOOL_PREFIXES = ("remediation_apply_", "cloud_apply_")

# A memory must never carry a credential or a personal identifier. These refuse a candidate outright.
DENY_PATTERNS = (
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{16,}"),           # GitHub tokens
    re.compile(r"\bsk-[A-Za-z0-9]{16,}"),                   # provider secret keys
    re.compile(r"\bBearer\s+[A-Za-z0-9._-]{16,}", re.I),    # bearer tokens
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),      # key material
    re.compile(r"(?i)\b(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*\S+"),
    re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),  # email addresses
    re.compile(r"\b[0-9a-f]{32,}\b", re.I),                 # bare hex blobs
)

MAX_PER_MISSION = 5

# copilot_memory constrains all three of these, so they are named once and checked against the real CHECK
# constraints rather than guessed: kind IN (preference, instruction, fact), source IN (operator_stated,
# observed), confidence IN (stated, inferred). A learned entry is an OBSERVED FACT, never operator-stated.
KIND = "fact"
SOURCE = "observed"
CONFIDENCE = "inferred"


def is_rememberable(tool_name: str) -> bool:
    """A read is never remembered; only an action that changed something."""
    name = (tool_name or "").strip()
    return any(name.startswith(p) for p in REMEMBERABLE_TOOL_PREFIXES)


def refusal_reason(text: str) -> str | None:
    """None when the text is safe to store, otherwise the reason it is not."""
    for pattern in DENY_PATTERNS:
        if pattern.search(text or ""):
            return "looks like a credential or a personal identifier"
    return None


def build_candidate(*, tool_name: str, parameters: dict | None, target: str | None,
                    executed_at: Any) -> dict | None:
    """Turn one executed receipt into a memory candidate, or None when it is not worth remembering."""
    if not is_rememberable(tool_name):
        return None
    params = parameters or {}
    # The action's own discriminator (fix_key, action, bucket) is the stable part; volatile arguments are not.
    discriminator = None
    for field in ("fix_key", "action", "bucket", "resource", "target"):
        value = params.get(field)
        if isinstance(value, str) and value and value != "[REDACTED]":
            discriminator = value
            break
    when = executed_at.strftime("%Y-%m-%d") if hasattr(executed_at, "strftime") else str(executed_at)[:10]
    where = target or "the platform"
    key = f"{tool_name}" + (f":{discriminator}" if discriminator else "")
    value = f"{tool_name}" + (f" ({discriminator})" if discriminator else "") + \
            f" ran under governance against {where} on {when}"
    reason = refusal_reason(key + " " + value)
    if reason:
        return None
    return {"kind": KIND, "key": key, "value": value, "reason": reason}


async def learn_from_mission(session, *, mission_id: Any, tenant_id: Any) -> dict:
    """Record what a mission actually did. Never raises on a candidate it refuses; the caller logs the tally."""
    from sqlalchemy import text

    # The caller commits the mission outcome BEFORE learning, and a commit clears the tenant binding - under
    # FORCE RLS an unbound read returns nothing, which looks exactly like "this mission did nothing". Bind here
    # so the rule does not depend on the caller's session state.
    from gds_api.tenant_binding import bind_tenant

    await bind_tenant(session, tenant_id)

    rows = (
        await session.execute(
            text(
                "SELECT r.requested_tool_id AS tool, r.requested_parameters_safe AS params,"
                "       r.target_reference AS target, d.executed_at AS executed_at"
                "  FROM capability_decisions d"
                "  JOIN capability_requests r ON r.id = d.request_id"
                " WHERE r.tenant_id = :tid AND r.mission_id = CAST(:mid AS uuid)"
                "   AND d.executed_at IS NOT NULL"
                " ORDER BY d.executed_at ASC"
            ),
            {"tid": str(tenant_id), "mid": str(mission_id)},
        )
    ).mappings().all()

    stored, updated, refused = [], [], []
    for row in rows:
        candidate = build_candidate(
            tool_name=row["tool"], parameters=row["params"], target=row["target"],
            executed_at=row["executed_at"] or datetime.now(UTC),
        )
        if candidate is None:
            refused.append(row["tool"])
            continue
        if len(stored) + len(updated) >= MAX_PER_MISSION:
            break
        row = (
            await session.execute(
                text(
                    "INSERT INTO copilot_memory (tenant_id, kind, key, value, source, confidence, created_by)"
                    " VALUES (:tid, :k, :key, :v, :s, :conf, NULL)"
                    " ON CONFLICT (tenant_id, kind, key) DO UPDATE SET"
                    "   value = EXCLUDED.value, source = EXCLUDED.source, updated_at = now(),"
                    "   use_count = copilot_memory.use_count + 1"
                    " RETURNING (xmax = 0) AS inserted"
                ),
                {"tid": str(tenant_id), "k": candidate["kind"], "key": candidate["key"],
                 "v": candidate["value"], "s": SOURCE, "conf": CONFIDENCE},
            )
        ).mappings().first()
        (stored if row and row["inserted"] else updated).append(candidate["key"])
    return {"stored": stored, "updated": updated, "refused": refused, "considered": len(rows)}
