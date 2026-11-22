"""The escalation route must run the cron script's policy, not a copy of it, and must not write by default.

Measured 22 Nov 2026: the engine existed only as scripts/ops/escalate_stale_findings.py, the UI's button asked a
refused function, and the page described the policy as a flat three-day limit when it is per severity. These tests
pin the three things that would let it drift back: a duplicated policy, an unconditional write, and an ungated write.
"""
import ast
from pathlib import Path

import pytest

MODULE = Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "findings_escalation_api.py"


@pytest.fixture(scope="module")
def source() -> str:
    return MODULE.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def tree(source) -> ast.Module:
    return ast.parse(source)


def test_the_policy_is_imported_not_retyped(source):
    # A second copy of the ladder would silently diverge from the cron job the executive score already reports on.
    assert "POLICY_HOURS =" not in source, "the ladder must come from the script, not be redefined here"
    assert "band_for = " not in source
    assert "escalate_stale_findings.py" in source
    assert "importlib.util.spec_from_file_location" in source


def test_every_statement_is_tenant_scoped(source):
    for name in ("_OPEN_SQL", "_RECORD_SQL"):
        start = source.index(f"{name} =")
        end = source.index('"""', source.index('"""', start) + 3)
        assert "tenant_id = :tenant_id" in source[start:end], f"{name} is not tenant-scoped"


def test_it_does_not_write_by_default(tree):
    models = [n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == "EscalationRequest"]
    assert models, "EscalationRequest missing"
    field = next(
        n for n in models[0].body
        if isinstance(n, ast.AnnAssign) and getattr(n.target, "id", None) == "apply"
    )
    assert isinstance(field.value, ast.Constant) and field.value.value is False, "apply must default to False"


def test_the_write_half_is_gated_by_its_own_permission(source):
    assert 'WRITE_PERMISSION = "findings:escalate"' in source
    # The read gate alone must not be enough to mutate the estate.
    start = source.index("async def escalate_stale")
    block = source[start:start + 900]
    assert "require_permission(\"findings:read\")" in block
    assert "_require_write(current_user)" in block
    assert "if apply:" in block


def test_an_already_recorded_band_is_skipped(source):
    # Same dedupe as the script: re-running must not raise a second notification for the same band.
    assert 'm["prior_band"] == band' in source
    assert "raw_data -> 'escalation' ->> 'band'" in source


def test_no_slack_send_is_claimed(source):
    assert '"slack_delivered": False' in source
    assert "sends no Slack message" in source
