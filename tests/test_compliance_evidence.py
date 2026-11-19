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


def test_ai_rmf_claims_nothing_automated(assessor):
    # There is no AI governance evidence in this platform. If someone later maps an AI RMF control to
    # a check, that must be a deliberate act with a stated basis, not a drive-by edit.
    mapped = [(c[1], c[4]) for c in assessor.CATALOG if c[0] == "nist_ai_rmf" and c[4]]
    assert not mapped, f"AI RMF controls must not claim automated coverage yet: {mapped}"


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
