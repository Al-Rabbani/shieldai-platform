"""Guard the rule that makes the compliance numbers mean anything: no verdict without evidence.

These are the invariants that stop a future edit from quietly turning an unassessed control into a
passing one. They are cheap and they run on the catalog itself, so they fail in CI rather than in an
audit.
"""
import importlib.util
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "ops" / "assess_compliance.py"


def load_assessor():
    spec = importlib.util.spec_from_file_location("assess_compliance", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def assessor():
    return load_assessor()


def test_every_check_key_has_a_collector(assessor):
    missing = {c[4] for c in assessor.CATALOG if c[4]} - set(assessor.COLLECTORS)
    assert not missing, f"catalog references checks with no collector: {sorted(missing)}"


def test_every_mapped_control_states_why_the_check_is_evidence(assessor):
    # A mapping without a stated basis is an assertion, not evidence. This is what keeps the catalog
    # from drifting into "control X is covered by something vaguely nearby".
    unstated = [(c[0], c[1]) for c in assessor.CATALOG if c[4] and not c[6]]
    assert not unstated, f"controls mapped to a check with no mapping_basis: {unstated}"


def test_no_duplicate_control_refs_within_a_framework(assessor):
    seen, dupes = set(), []
    for fw, ref, *_ in assessor.CATALOG:
        if (fw, ref) in seen:
            dupes.append((fw, ref))
        seen.add((fw, ref))
    assert not dupes, f"duplicate control refs: {dupes}"


def test_ai_rmf_is_evidenced_only_by_ai_specific_collectors(assessor):
    # The AI RMF was catalogued with no coverage at all. Four controls are now evidenced from what this
    # platform's own agents did, and mapping any of them must stay a deliberate act: an AI-governance
    # control may only be evidenced by a collector written to measure AI operations. Reusing a generic
    # host check (tls_hsts, monitoring, patch_currency) would inflate a framework without evidencing it.
    ai_collectors = {
        "ai_tool_governance",
        "ai_post_deployment_monitoring",
        "ai_risk_response_decisions",
        "ai_action_accountability",
    }
    mapped = [(c[1], c[4], c[6]) for c in assessor.CATALOG if c[0] == "nist_ai_rmf" and c[4]]
    assert mapped, "no AI RMF control is evidenced at all; the framework reads 0% again"
    for ref, check, basis in mapped:
        assert check in ai_collectors, f"{ref} is evidenced by {check}, which is not an AI-operations collector"
        assert basis and len(basis) > 30, f"{ref} is mapped to {check} with no stated basis"


def test_collectors_only_return_real_verdicts(assessor):
    allowed = {"pass", "fail", "not_tested"}
    for name, fn in assessor.COLLECTORS.items():
        r = fn()
        assert r["verdict"] in allowed, f"{name} returned {r['verdict']}"
        assert isinstance(r["observed"], dict), f"{name} did not record observed facts"
        assert r["detail"], f"{name} gave no detail for its verdict"


def test_unknown_is_the_default_shape(assessor):
    r = assessor.unknown("no evidence available")
    assert r["verdict"] == "not_tested"
    assert r["observed"] == {}


def test_every_catalog_control_is_either_checked_or_explicitly_unchecked(assessor):
    # Not a style rule: it forces a decision per control. A control silently dropped from the catalog
    # would otherwise vanish from coverage reporting without anyone noticing.
    assert len(assessor.CATALOG) >= 80
    assert all(len(c) == 7 for c in assessor.CATALOG)
