"""A decision that was allowed and then failed must say why.

Measured 26 Nov 2026 from capability_decisions: over seven days 124 decisions ended execution_status='failed' and
not one carried a reason. The decision trace held every governance check as "ok" and ended "allow", so the row read
as permission granted with nothing about what went wrong, and the exception or the tool's own success=False output
was in the caller's hand at the moment the status was written.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from gds_api.capabilities.execution_error import (  # noqa: E402
    MAX_STEPS,
    append_execution_step,
    sanitise_execution_error,
)


def test_the_reason_is_kept():
    assert sanitise_execution_error("ConnectionError: registry unreachable") == "ConnectionError: registry unreachable"


def test_a_credential_is_redacted_and_the_rest_survives():
    text = sanitise_execution_error("auth failed with ghp_abcdefghijklmnopqrstuvwxyz0123456789 for the request")
    assert "ghp_" not in text
    assert "[redacted]" in text
    assert "auth failed with" in text


def test_an_address_and_a_hex_blob_are_redacted():
    text = sanitise_execution_error("failed for president@globaldigitalstreams.com key 0123456789abcdef0123456789abcdef")
    assert "president@" not in text
    assert "0123456789abcdef" not in text


def test_no_reason_is_none_not_a_string():
    assert sanitise_execution_error(None) is None
    assert sanitise_execution_error("   ") is None


def test_the_reason_is_bounded():
    assert len(sanitise_execution_error("x" * 5000)) == 500


def test_the_step_is_appended_after_every_governance_check():
    trace = json.dumps({"steps": [{"check": "resolve_user", "result": "ok"},
                                  {"check": "policy_evaluation", "result": "allow"}]})
    out = json.loads(append_execution_step(trace, "failed", "boom"))
    assert [s["check"] for s in out["steps"]] == ["resolve_user", "policy_evaluation", "execution"]
    assert out["steps"][-1] == {"check": "execution", "result": "failed", "error": "boom"}


def test_a_successful_execution_adds_no_error_field():
    out = json.loads(append_execution_step(None, "executed", None))
    assert out["steps"] == [{"check": "execution", "result": "executed"}]


def test_a_malformed_trace_is_replaced_not_crashed_on():
    out = json.loads(append_execution_step("{not json", "failed", "boom"))
    assert out["steps"][-1]["error"] == "boom"


def test_the_step_list_is_bounded():
    trace = json.dumps({"steps": [{"check": "c", "result": "ok"} for _ in range(MAX_STEPS + 10)]})
    out = json.loads(append_execution_step(trace, "failed", "boom"))
    assert len(out["steps"]) == MAX_STEPS
    assert out["steps"][-1]["check"] == "execution"
