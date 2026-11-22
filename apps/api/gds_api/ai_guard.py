"""A real prompt-injection guard for the platform's own AI routes.

Before this module, five /reasoning routes accepted free text and passed it straight into an OpenAI reasoning loop with no
inspection at all, and nothing anywhere recorded an attempt. This is not a claim of comprehensive AI defence: it is a
named set of patterns, each with a stated severity, applied to the goal and context a caller submits, with the decision
and the reason written to prompt_attacks.

Blocking policy is explicit rather than emergent:
  high   -> the request is refused with 422 and the attempt is recorded
  medium -> the request proceeds and the attempt is recorded
The split exists because a security platform legitimately reasons about dangerous strings. A goal such as "scan for SQL
injection using DROP TABLE payloads" must not be refused, while "ignore all previous instructions" has no legitimate
place in a mission goal.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
import uuid

from sqlalchemy import text

from .db import async_session_factory
from .tenant_binding import bind_tenant

logger = logging.getLogger(__name__)

# name -> (pattern, severity, what it indicates)
RULES: dict[str, tuple[str, str, str]] = {
    "instruction_override": (
        r"(?i)\b(ignore|disregard|forget)\s+(all\s+)?(of\s+)?(the\s+)?(previous|prior|above|earlier)\s+"
        r"(instructions|prompts|rules|directions)\b",
        "high",
        "Attempt to discard the system's own instructions.",
    ),
    "system_prompt_exfiltration": (
        r"(?i)\b(reveal|print|show|repeat|output|leak)\s+(me\s+)?(your|the)\s+(full\s+|entire\s+)?"
        r"(system\s+prompt|instructions|configuration|api\s+key|secrets?)\b",
        "high",
        "Attempt to extract the system prompt or credentials.",
    ),
    "jailbreak_roleplay": (
        r"(?i)\b(you\s+are\s+now|act\s+as)\s+(an?\s+)?(unrestricted|unfiltered|jailbroken|dan\b)|"
        r"\b(developer\s+mode|jailbreak\s+mode|do\s+anything\s+now)\b",
        "high",
        "Role-play frame used to remove the model's guardrails.",
    ),
    "delimiter_injection": (
        r"<\|im_(start|end)\|>|\[/?INST\]|###\s*(system|assistant)\s*:",
        "high",
        "Forged chat delimiters, attempting to inject a new system turn.",
    ),
    "destructive_command": (
        r"(?i)\b(rm\s+-rf\s+/|drop\s+table|truncate\s+table|delete\s+from\s+\w+\s*;)",
        "medium",
        "Destructive command text. Recorded, not refused: security work legitimately reasons about these strings.",
    ),
    "exfiltration_url": (
        r"(?i)\b(send|post|upload|exfiltrate)\b.{0,40}\bhttps?://",
        "medium",
        "Instruction to ship data to an external URL.",
    ),
}

BLOCKING_SEVERITIES = {"high"}


class GuardVerdict:
    """The decision for one submitted goal, with the rule names that produced it."""

    def __init__(self, attack_type: str | None, severity: str | None, matched: list[str], blocked: bool):
        self.attack_type = attack_type
        self.severity = severity
        self.matched = matched
        self.blocked = blocked

    @property
    def triggered(self) -> bool:
        return bool(self.matched)

    def as_dict(self) -> dict:
        return {"attack_type": self.attack_type, "severity": self.severity,
                "matched_rules": self.matched, "blocked": self.blocked}


def scan(*parts: str | None) -> GuardVerdict:
    """Inspect the text a caller submitted. Returns the highest-severity rule found, plus every rule that matched."""
    haystack = "\n".join(p for p in parts if p)
    if not haystack.strip():
        return GuardVerdict(None, None, [], False)
    matched: list[str] = []
    severities: list[str] = []
    for name, (pattern, severity, _why) in RULES.items():
        if re.search(pattern, haystack):
            matched.append(name)
            severities.append(severity)
    if not matched:
        return GuardVerdict(None, None, [], False)
    severity = "high" if "high" in severities else "medium"
    return GuardVerdict(attack_type=matched[0], severity=severity, matched=matched,
                        blocked=severity in BLOCKING_SEVERITIES)


def context_text(context: dict | None) -> str:
    return json.dumps(context, sort_keys=True) if context else ""


async def record_attack(tenant_id, verdict: GuardVerdict, payload: str, route: str,
                        actor_id: str | None = None, source_ip: str | None = None) -> bool:
    """Write the attempt. Returns False when it could not be recorded, so no caller can claim it was."""
    try:
        async with async_session_factory() as db:
            await bind_tenant(db, uuid.UUID(str(tenant_id)))
            await db.execute(text(
                "INSERT INTO prompt_attacks (tenant_id, attack_type, severity, target_route, matched_rules, "
                "payload_hash, payload_preview, blocked, actor_id, source_ip) "
                "VALUES (:t, :atype, :sev, :route, CAST(:rules AS text[]), :hash, :preview, :blocked, :actor, :ip)"
            ), {"t": uuid.UUID(str(tenant_id)), "atype": verdict.attack_type or "unclassified",
                "sev": verdict.severity or "medium", "route": route,
                "rules": verdict.matched, "hash": hashlib.sha256(payload.encode()).hexdigest(),
                "preview": payload[:120], "blocked": verdict.blocked,
                "actor": actor_id, "ip": source_ip})
            await db.commit()
        return True
    except Exception:  # noqa: BLE001 - a guard that crashes must not take the route down with it
        logger.exception("could not record prompt attack on %s", route)
        return False
