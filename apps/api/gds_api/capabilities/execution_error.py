"""Why a governed execution failed, kept on the decision that authorised it.

Measured 26 Nov 2026 from the platform's own register: over seven days, 124 capability decisions were ALLOWed and
then recorded execution_status='failed', and not one of them carried a reason. The decision trace held every
governance check - resolve_user, risk_ceiling, target_authorisation, policy_evaluation - all "ok" and ending in
"allow", so an operator reading the row could see that permission was granted and nothing about what went wrong.
The exception, or the tool's own success=False output, was in the caller's hand when mark_capability_execution was
called and was simply not passed.

The reason is kept, not discarded, and redacted rather than refused: an error message that names a token or an
address is still the most useful thing on the row, so the matched part is replaced and the rest survives.
"""
from __future__ import annotations

import json

from gds_api.reasoning.mission_memory import DENY_PATTERNS

REDACTED = "[redacted]"
MAX_ERROR_CHARS = 500
MAX_STEPS = 40


def sanitise_execution_error(error: object | None, limit: int = MAX_ERROR_CHARS) -> str | None:
    """The failure reason, with credentials and identifiers redacted. None when there is no reason."""
    if error is None:
        return None
    text = str(error).strip()
    if not text:
        return None
    for pattern in DENY_PATTERNS:
        text = pattern.sub(REDACTED, text)
    return text[:limit]


def append_execution_step(trace_json: str | None, status: str, error: str | None) -> str:
    """Append the execution outcome to the decision trace, keeping every governance check already there.

    The trace is a real JSON document the API returns, so a malformed one is replaced rather than crashed on,
    and the step list is bounded so a retry loop cannot grow the row without limit.
    """
    trace: dict = {}
    if trace_json:
        try:
            loaded = json.loads(trace_json)
            if isinstance(loaded, dict):
                trace = loaded
        except (TypeError, ValueError):
            trace = {}
    steps = trace.get("steps")
    if not isinstance(steps, list):
        steps = []
    step = {"check": "execution", "result": status}
    if error:
        step["error"] = error
    steps.append(step)
    trace["steps"] = steps[-MAX_STEPS:]
    return json.dumps(trace)
