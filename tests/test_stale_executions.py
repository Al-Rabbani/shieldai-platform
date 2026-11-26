"""A claim that was never resolved must be closed, and the closing must not invent a cause.

Measured 26 Nov 2026: nine capability decisions sat in execution_status='executing', the oldest for 247 hours,
because a decision is claimed before the tool runs and resolved after it returns, and nothing closed the claim when
the process stopped in between. The ledger therefore reported work in progress that had ended ten days earlier.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

spec = importlib.util.spec_from_file_location(
    "reap_stale_executions", ROOT / "scripts" / "ops" / "reap_stale_executions.py")
reaper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reaper)


def test_the_reason_says_the_outcome_is_unknown_and_names_the_age():
    text = reaper.UNKNOWN_OUTCOME.format(hours=247.7)
    assert "unknown" in text
    assert "247.7h" in text
    assert "no execution outcome was ever recorded" in text


def test_the_reason_does_not_claim_the_tool_failed():
    text = reaper.UNKNOWN_OUTCOME.format(hours=7.2).lower()
    # The tool may well have run; the honest statement is that nobody recorded whether it did.
    for word in ("crashed", "error", "exception", "failed to"):
        assert word not in text


def test_a_one_minute_window_is_refused():
    assert reaper.DEFAULT_MAX_AGE_MINUTES >= 60, "a window shorter than the longest tool would close live executions"
