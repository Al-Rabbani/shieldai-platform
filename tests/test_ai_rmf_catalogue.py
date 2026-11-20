"""Invariants for the NIST AI RMF catalogue and the four AI-governance collectors.

The framework was catalogued with no collector at all, so it read 0 of 72 and a reader could not tell "not
applicable to us" from "nobody looked". Four controls are now evidenced from what this platform's own agents
actually did, and the other fifteen say in writing which organisational artefact is missing. The invariants below
keep it that way: a control may not name a collector that does not exist, and it may not leave the basis blank.

The four collectors are also checked for the property that makes them evidence rather than decoration: each must be
able to FAIL. A collector that only ever returns pass would turn an unassessed control into a claimed one.
"""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location(
    "assess_compliance", ROOT / "scripts" / "ops" / "assess_compliance.py"
)
assess = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(assess)

AI_RMF = [c for c in assess.CATALOG if c[0] == "nist_ai_rmf"]
AI_COLLECTORS = {
    "ai_tool_governance",
    "ai_post_deployment_monitoring",
    "ai_risk_response_decisions",
    "ai_action_accountability",
}


def test_the_catalogue_holds_the_controls_it_claims():
    assert len(AI_RMF) == 19, f"catalogue drifted: {len(AI_RMF)} controls"
    refs = [c[1] for c in AI_RMF]
    assert len(set(refs)) == len(refs), "duplicate control refs"
    for ref in refs:
        assert ref.split("-")[0] in {"GOVERN", "MAP", "MEASURE", "MANAGE"}, f"{ref} is outside the four functions"


def test_every_control_is_evidenced_or_explains_why_not():
    collectors = set(assess.COLLECTORS)
    for framework, ref, title, _cat, check, _sev, basis in AI_RMF:
        if check:
            assert check in collectors, f"{ref} names collector {check}, which does not exist"
        else:
            assert basis and len(basis) > 30, f"{ref} ({title}) is neither evidenced nor explained"


def test_only_the_four_ai_collectors_are_attached():
    attached = {c[4] for c in AI_RMF if c[4]}
    assert attached == AI_COLLECTORS, f"unexpected collector set: {sorted(attached)}"


def test_each_ai_control_says_it_measures_this_platform():
    """Every evidenced control must scope its claim to the platform's own AI, not a customer's estate."""
    for _fw, ref, _title, _cat, check, _sev, basis in AI_RMF:
        if check:
            assert "platform" in basis.lower() or "this platform" in basis.lower(), (
                f"{ref} claims {check} without scoping the claim to this platform's own AI operations"
            )


def test_a_collector_that_cannot_fail_is_not_evidence():
    """Each collector must have a failure branch, or it would report a pass no matter what the platform does."""
    import inspect

    for name in sorted(AI_COLLECTORS):
        source = inspect.getsource(assess.COLLECTORS[name])
        assert "return bad(" in source, f"{name} can never return fail"
        assert "return ok(" in source, f"{name} can never return pass"


def test_the_risk_response_collector_rejects_a_blanket_allow():
    """The whole point of MANAGE-1.1 is that something was withheld. A blanket ALLOW must not pass."""
    import inspect

    source = inspect.getsource(assess.chk_ai_risk_response_decisions)
    assert "allow == total" in source, "a run where every decision was ALLOW would pass as a risk response"
