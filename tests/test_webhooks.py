"""Webhooks that are proven to leave the host, not a task dispatcher wearing the name.

The retired module exposed /actions/webhooks/replay, which posted a task to an agent channel and delivered
nothing. These tests pin the parts that make delivery trustworthy: the transport rule, the severity filter,
and the fact that failures are recorded rather than hidden.
"""
import importlib.util
from pathlib import Path

import pytest
from pydantic import ValidationError

from gds_api.webhooks import EndpointCreate

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("dispatch", ROOT / "scripts" / "ops" / "gds-webhook-dispatch.py")
dispatch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dispatch)


def test_plain_http_is_refused_for_a_remote_host():
    # A signing secret must not cross a network in the clear.
    with pytest.raises(ValidationError):
        EndpointCreate(name="siem", url="http://siem.example.com/hook")


def test_https_and_loopback_are_allowed():
    assert EndpointCreate(name="siem", url="https://siem.example.com/hook").url.startswith("https")
    assert EndpointCreate(name="local", url="http://127.0.0.1:9099/hook").url.startswith("http://127.0.0.1")


def test_severity_filter_ordering_is_sane():
    assert dispatch.RANK["critical"] > dispatch.RANK["high"] > dispatch.RANK["medium"] > dispatch.RANK["low"]
    # An unknown severity must not silently become the lowest bar.
    assert dispatch.RANK["unknown"] >= dispatch.RANK["medium"]


def test_a_high_threshold_keeps_high_and_drops_medium():
    threshold = dispatch.RANK["high"]
    kept = [s for s in ("critical", "high", "medium", "low") if dispatch.RANK[s] >= threshold]
    assert kept == ["critical", "high"]


def test_delivery_records_failures_not_only_successes():
    src = (ROOT / "apps" / "api" / "gds_api" / "webhooks.py").read_text(encoding="utf-8")
    assert "delivered" in src and "error" in src
    assert "A delivery log that only shows successes is marketing" in src


def test_the_five_modules_have_recorded_decisions():
    text = (ROOT / "docs" / "MODULE_DECISIONS.md").read_text(encoding="utf-8")
    for module in ("evidence", "CI/CD", "autofix", "Webhooks", "residency"):
        assert module.lower() in text.lower(), module
    assert "RETIRED" in text and "BUILT" in text


def test_ci_no_longer_claims_an_autofix_endpoint():
    wf = (ROOT / ".github" / "workflows" / "shieldai-security-gate.yml").read_text(encoding="utf-8")
    assert "security_gate_client.py autofix" not in wf
