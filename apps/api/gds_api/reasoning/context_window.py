"""Item 43: the agent loop paid to re-read its own transcript.

MEASURED, not assumed. The 23 Nov platform-posture-check run (mission-87a2f2f282de) made 15 gpt-4.1 calls, 107,218 input
tokens and 3,823 output tokens for $0.24502. One agent's seven calls grew like this, input tokens per call:

    4,385 -> 7,712 -> 10,965 -> 14,212 -> 17,495 -> 19,177 -> 22,417

That single agent was about $0.207 of the $0.245, 85% of the run, and the growth is structural: every iteration appends
its tool results and re-sends the entire conversation, with up to three results per iteration at a 4,000-character cap
each. Nothing was ever compacted, so the same catalogue dump and the same nmap output were paid for again on every
subsequent call.

TRIMMING. No message is dropped: an assistant message carrying tool_calls must keep the tool message that answers it, or
the provider rejects the conversation. Only the CONTENT of older tool results is shortened to a head plus a marker naming
exactly how many characters were withheld. The most recent results stay verbatim, because those are what the next step
reasons about; older ones are context, not evidence.

WHAT THIS IS NOT: a summariser. Nothing is rewritten or paraphrased by a model, so no fact can be invented by the
compaction itself, and the marker makes the withholding visible to the model and to anyone reading a transcript.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

DEFAULT_KEEP_RECENT = 4
DEFAULT_HEAD_CHARS = 400

MARKER = "\n...[trimmed to bound context: {omitted} of {total} characters withheld; the tool ran and returned the full result]"


def _compact(content: str, head_chars: int) -> str:
    total = len(content)
    head = content[:head_chars]
    return head + MARKER.format(omitted=total - head_chars, total=total)


def trim_tool_results(
    messages: List[Dict[str, Any]],
    keep_recent: int = DEFAULT_KEEP_RECENT,
    head_chars: int = DEFAULT_HEAD_CHARS,
) -> Tuple[List[Dict[str, Any]], int]:
    """Return a copy of `messages` with older tool results compacted, and how many were compacted.

    Order, roles, tool_call_id and tool_calls are untouched, so the conversation stays valid. A result already carrying
    the marker is left alone, which keeps repeated calls idempotent instead of stacking markers.
    """
    if keep_recent < 0 or head_chars < 0:
        raise ValueError("keep_recent and head_chars must not be negative")

    trimmed: List[Dict[str, Any]] = []
    tool_positions = [i for i, message in enumerate(messages) if message.get("role") == "tool"]
    cutoff = max(0, len(tool_positions) - keep_recent)
    older = set(tool_positions[:cutoff])

    compacted = 0
    for index, message in enumerate(messages):
        if index not in older:
            trimmed.append(message)
            continue
        content = message.get("content") or ""
        if not isinstance(content, str) or len(content) <= head_chars or "trimmed to bound context" in content:
            trimmed.append(message)
            continue
        copy = dict(message)
        copy["content"] = _compact(content, head_chars)
        trimmed.append(copy)
        compacted += 1

    return trimmed, compacted


def context_chars(messages: List[Dict[str, Any]]) -> int:
    """Characters the next call will send. Used by tests and by the loop's own log line."""
    total = 0
    for message in messages:
        content = message.get("content")
        if isinstance(content, str):
            total += len(content)
        for call in message.get("tool_calls") or []:
            total += len(call.get("function", {}).get("arguments") or "")
    return total


def assert_pairing(messages: List[Dict[str, Any]]) -> None:
    """Every tool message must answer a declared tool_call, and every tool_call must be answered.

    The provider enforces this; a compaction that dropped a message would break the next call rather than the test, so the
    loop asserts it in development and the tests assert it always.
    """
    declared: List[str] = []
    answered: List[str] = []
    for message in messages:
        for call in message.get("tool_calls") or []:
            declared.append(call.get("id"))
        if message.get("role") == "tool":
            answered.append(message.get("tool_call_id"))
    missing_answer = [call_id for call_id in declared if call_id not in answered]
    orphan_answer = [call_id for call_id in answered if call_id not in declared]
    if missing_answer or orphan_answer:
        raise ValueError(f"broken tool pairing: unanswered={missing_answer} orphaned={orphan_answer}")
