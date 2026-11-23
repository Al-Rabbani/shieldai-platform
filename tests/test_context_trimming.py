"""Item 43: older tool results are compacted, the conversation stays valid, and the saving is real."""
import pathlib
import re
import sys

sys.path.insert(0, "/opt/gds-os/apps/api")

from gds_api.reasoning.context_window import (  # noqa: E402
    DEFAULT_HEAD_CHARS,
    assert_pairing,
    context_chars,
    trim_tool_results,
)

LOOP = pathlib.Path("/opt/gds-os/apps/api/gds_api/reasoning/agent_loop.py")


def history(turns=6, results_per_turn=3, size=4000):
    """A transcript shaped like the real one: each turn declares tool calls and answers each with a big result."""
    messages = [
        {"role": "system", "content": "SYSTEM PROMPT " * 50},
        {"role": "user", "content": "## GOAL\nposture check\n\n## CONTEXT\nNone"},
    ]
    for turn in range(turns):
        ids = [f"call_{turn}_{n}" for n in range(results_per_turn)]
        messages.append({
            "role": "assistant",
            "content": f"thinking {turn}",
            "tool_calls": [
                {"id": cid, "type": "function", "function": {"name": "get_findings", "arguments": '{"limit": 500}'}}
                for cid in ids
            ],
        })
        for cid in ids:
            messages.append({"role": "tool", "tool_call_id": cid, "content": "K" * size})
    return messages


def test_the_conversation_stays_valid_and_pairing_survives():
    messages = history()
    trimmed, compacted = trim_tool_results(messages)
    assert_pairing(trimmed)                      # raises if a tool message lost its call or vice versa
    assert len(trimmed) == len(messages), "no message may be dropped"
    assert [m.get("role") for m in trimmed] == [m.get("role") for m in messages]
    assert compacted == len([m for m in messages if m["role"] == "tool"]) - 4


def test_the_most_recent_results_are_untouched():
    messages = history()
    trimmed, _ = trim_tool_results(messages, keep_recent=4)
    recent = [m for m in trimmed if m["role"] == "tool"][-4:]
    assert all(len(m["content"]) == 4000 for m in recent)
    assert all("trimmed to bound context" not in m["content"] for m in recent)


def test_older_results_are_shortened_and_say_how_much_was_withheld():
    messages = history()
    trimmed, _ = trim_tool_results(messages, keep_recent=4, head_chars=400)
    older = [m for m in trimmed if m["role"] == "tool"][:-4]
    assert older
    for message in older:
        assert len(message["content"]) < 4000
        assert message["content"].startswith("K" * 400)
        assert "3600 of 4000 characters withheld" in message["content"]
        assert message["tool_call_id"], "the answer must still name the call it answers"


def test_system_and_goal_are_never_touched():
    messages = history()
    trimmed, _ = trim_tool_results(messages, keep_recent=1, head_chars=10)
    assert trimmed[0] == messages[0]
    assert trimmed[1] == messages[1]


def test_trimming_twice_does_not_stack_markers():
    once, _ = trim_tool_results(history(), keep_recent=2)
    twice, compacted_again = trim_tool_results(once, keep_recent=2)
    assert compacted_again == 0
    assert [m["content"] for m in once if m["role"] == "tool"] == [m["content"] for m in twice if m["role"] == "tool"]


def test_the_saving_on_the_real_shape_is_most_of_the_context():
    messages = history(turns=7, results_per_turn=3, size=4000)
    before = context_chars(messages)
    after = context_chars(trim_tool_results(messages, keep_recent=4, head_chars=DEFAULT_HEAD_CHARS)[0])
    assert after < before * 0.45, f"expected a large cut, got {before} -> {after}"


def test_a_small_history_is_left_alone():
    messages = history(turns=1, results_per_turn=2, size=100)
    trimmed, compacted = trim_tool_results(messages)
    assert compacted == 0
    assert trimmed == messages


def test_negative_settings_are_refused():
    for kwargs in ({"keep_recent": -1}, {"head_chars": -1}):
        try:
            trim_tool_results([], **kwargs)
        except ValueError:
            continue
        raise AssertionError(f"accepted {kwargs}")


def test_the_loop_compacts_before_every_call():
    source = LOOP.read_text()
    assert "from gds_api.reasoning.context_window import assert_pairing, context_chars, trim_tool_results" in source
    body = re.sub(r"(?m)^\s*#.*$", "", source)
    assert body.count("trim_tool_results(") == 1
    # it must run before the provider call, not after it
    assert body.index("trim_tool_results(") < body.index("await self.client.chat.completions.create(")
    assert "assert_pairing(messages)" in body
    assert 'os.getenv("AGENT_CONTEXT_KEEP_RESULTS", "4")' in body
