"""A failed mission must say why it failed.

Measured 25 Nov 2026, from the mission register itself: two reasoning missions failed with the summary
"Max iterations or error: None" after 30 and 12 tool calls, and a penetration_test mission failed with
"engagement execution: 0 action(s) succeeded, 5 refused". In both cases the platform knew more than it wrote:
the loop knew no exception had been raised, and the engagement runner had a per-action reason for each refusal in
`out["refused"]` when it built the count. The operator was left with a number and no cause.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from gds_api.pentest.engagement_runner import engagement_summary  # noqa: E402
from gds_api.reasoning.agent_loop import exhausted_summary  # noqa: E402
from gds_api.reasoning.governed_tools import _bounded_detail  # noqa: E402


def test_a_budget_exhaustion_does_not_claim_an_error():
    text = exhausted_summary(10, 30, None)
    assert "budget exhausted" in text
    assert "30 tool call(s)" in text
    assert not text.lower().startswith("error")
    assert "None" not in text


def test_an_exception_is_named():
    text = exhausted_summary(10, 4, "connection reset by peer")
    assert text.startswith("error after 10 iteration(s)")
    assert "connection reset by peer" in text


def test_the_summary_is_bounded():
    assert len(exhausted_summary(10, 1, "x" * 5000)) < 400


def test_a_refusal_names_its_reasons_not_only_its_count():
    out = {
        "executed": [],
        "refused": [
            {"target": "www.example.com", "tool": "nuclei_scan", "error": "TARGET_NOT_AUTHORISED"},
            {"target": "www.example.com", "tool": "sqlmap_scan", "error": "TARGET_NOT_AUTHORISED"},
            {"target": "app.example.com", "tool": "ffuf_scan", "error": "RATE_LIMITED"},
        ],
        "awaiting_approval": [{"target": "app.example.com", "tool": "sqlmap_scan", "reason": "needs a human"}],
        "not_run": [],
    }
    text = engagement_summary(out)
    assert "0 action(s) succeeded" in text
    assert "3 refused" in text
    assert "TARGET_NOT_AUTHORISED x2" in text
    assert "RATE_LIMITED x1" in text
    assert "1 awaiting a human approval" in text


def test_a_refusal_without_a_reason_says_so_rather_than_inventing_one():
    out = {"executed": [], "refused": [{"tool": "nuclei_scan"}], "awaiting_approval": [], "not_run": []}
    assert "no reason recorded" in engagement_summary(out)


def test_detail_is_bounded_so_one_run_cannot_bloat_the_row():
    big = {"refused": [{"target": f"t{i}", "error": "E"} for i in range(50)]}
    kept = _bounded_detail(big)
    assert len(kept["refused"]) == 20
    assert kept["refused_truncated_from"] == 50

    huge = {"refused": [{"target": "t" * 900, "error": "E" * 900} for _ in range(20)]}
    assert _bounded_detail(huge).get("detail_truncated") is True


def test_detail_survives_json_round_trip():
    import json
    payload = {"refused": [{"tool": "nuclei_scan", "error": "E"}], "count": 1, "ok": False, "none": None}
    assert json.loads(json.dumps(_bounded_detail(payload))) == payload
