"""PCI DSS scope determination invariants.

The determination is the single thing that turns PCI from "nobody has looked" into a judged framework, so it has to be
right in a way a note in a chat log never is. These tests pin the properties that make it trustworthy:

  * every one of the twelve requirements is classified exactly once, so no requirement can sit unjudged;
  * the decision is internally consistent (no CHD stored means no CHD processed or transmitted);
  * it cannot be written without evidence, an approver and a review date;
  * the only mapped requirement is the one the determination says applies;
  * and the gap it exposes is recorded rather than smoothed over, which is why the third-party agreement and the
    attestation review are asserted to be absent until someone actually obtains them.

The last one is the important one. When the owner obtains Stripe's attestation and records the agreement, that test
will fail, and it should: the failure is the reminder to update the record and let requirement 12 be re-judged.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


scope = _load("scope_determinations", ROOT / "scripts" / "ops" / "scope_determinations.py")
pci_catalogue = _load("catalogue_pci_dss", ROOT / "scripts" / "ops" / "catalogue_pci_dss.py")
assess = _load("assess_compliance", ROOT / "scripts" / "ops" / "assess_compliance.py")

DET = scope.PCI_DETERMINATION
ALL_REFS = {str(n) for n in range(1, 13)}


# ------------------------------------------------------------------ the decision is complete
def test_every_requirement_is_classified_exactly_once():
    applicable = set(DET["applicable_refs"])
    excluded = set(DET["not_applicable_refs"])
    assert applicable | excluded == ALL_REFS, f"unclassified requirements: {sorted(ALL_REFS - (applicable | excluded))}"
    assert not applicable & excluded, f"requirements in both lists: {sorted(applicable & excluded)}"


def test_the_determination_covers_exactly_the_catalogued_requirements():
    catalogued = {c[1] for c in pci_catalogue.CATALOGUE}
    assert catalogued == ALL_REFS
    assert set(DET["applicable_refs"]) | set(DET["not_applicable_refs"]) == catalogued


def test_only_third_party_management_remains_applicable():
    """Outsourcing the card data does not outsource the duty to manage the provider."""
    assert DET["applicable_refs"] == ["12"]
    assert len(DET["not_applicable_refs"]) == 11


# ------------------------------------------------------------------ the decision is internally consistent
def test_no_cardholder_data_environment_means_no_chd_anywhere():
    if DET["cde_defined"]:
        return  # a future determination may define a CDE; then this consistency rule does not apply
    assert DET["chd_stored"] is False
    assert DET["chd_processed"] is False
    assert DET["chd_transmitted"] is False


def test_the_decision_states_a_reason_and_a_track():
    assert len(DET["cde_summary"]) > 150, "the scope decision must explain itself, not just assert a boolean"
    assert "SAQ" in (DET["saq_track"] or "")


def test_the_candidate_track_is_named_as_a_candidate():
    """SAQ A has not been read: the questionnaire is gated. Calling it confirmed would overstate the evidence."""
    assert "candidate" in DET["saq_track"].lower()


# ------------------------------------------------------------------ the decision carries its evidence
def test_every_evidence_entry_names_a_method_and_a_result():
    assert len(DET["evidence"]) >= 5, "a scope decision this consequential needs more than a glance"
    for item in DET["evidence"]:
        assert item.get("method"), f"evidence entry has no method: {item}"
        assert item.get("result"), f"evidence entry has no result: {item}"
        assert len(item["result"]) > 20, f"evidence result is too thin to verify: {item}"


def test_the_evidence_covers_each_place_card_data_could_hide():
    methods = " ".join(e["method"].lower() for e in DET["evidence"])
    for place in ("billing", "console", "log", "schema", "webhook"):
        assert place in methods, f"no evidence about {place}, which is where card data would appear"


def test_the_caveats_name_what_the_decision_does_not_cover():
    joined = " ".join(DET["caveats"]).lower()
    assert "saq" in joined, "the caveat that SAQ A is unread must travel with the record"
    assert "licensed" in joined, "the unverified requirement headings must be disclosed"
    assert "void" in joined or "no longer" in joined, "the record must say what would invalidate it"


def test_approval_names_the_owner_and_his_words():
    assert DET["approved_by"] == "president@globaldigitalstreams.com"
    assert "let's fix this first" in DET["approval_basis"], "the approval basis must quote the instruction it rests on"
    assert DET["review_due_at"], "an approved determination must expire"


# ------------------------------------------------------------------ the gap is recorded, not smoothed over
def test_the_third_party_is_named():
    assert [t["name"] for t in DET["tpsp"]] == ["Stripe"]


def test_the_agreement_and_attestation_review_are_absent_until_obtained():
    """Requirement 12 fails on these two facts. When they are recorded, update the record and re-judge it."""
    stripe = DET["tpsp"][0]
    assert stripe["written_agreement_recorded"] is False, (
        "a written PCI responsibility agreement is now recorded: update the determination and let requirement 12 be "
        "re-judged rather than leaving a stale fail"
    )
    assert stripe["attestation_reviewed_at"] is None, (
        "an attestation review is now recorded: update the determination and let requirement 12 be re-judged"
    )


# ------------------------------------------------------------------ the writer refuses bad records
def test_validate_accepts_the_shipped_record():
    scope.validate({**DET, "approved_at": "2026-11-21T00:00:00Z"})


def test_validate_rejects_a_ref_in_both_lists():
    bad = {**DET, "approved_at": "2026-11-21T00:00:00Z", "not_applicable_refs": ["12"]}
    try:
        scope.validate(bad)
    except ValueError as e:
        assert "both lists" in str(e)
    else:
        raise AssertionError("a requirement listed as both applicable and excluded must be refused")


def test_validate_rejects_an_approval_without_an_approver():
    bad = {**DET, "approved_by": None, "approved_at": None}
    try:
        scope.validate(bad)
    except ValueError as e:
        assert "approver" in str(e)
    else:
        raise AssertionError("an approved determination with no approver must be refused")


def test_validate_rejects_an_approval_without_evidence():
    bad = {**DET, "approved_at": "2026-11-21T00:00:00Z", "evidence": []}
    try:
        scope.validate(bad)
    except ValueError as e:
        assert "evidence" in str(e)
    else:
        raise AssertionError("an approved determination with no evidence must be refused")


def test_validate_rejects_an_approval_without_a_review_date():
    bad = {**DET, "approved_at": "2026-11-21T00:00:00Z", "review_due_at": None}
    try:
        scope.validate(bad)
    except ValueError as e:
        assert "review date" in str(e)
    else:
        raise AssertionError("an approved determination with no review date must be refused")


# ------------------------------------------------------------------ the catalogue follows the determination
def test_only_applicable_requirements_are_mapped_to_a_collector():
    mapped = {c[1] for c in pci_catalogue.CATALOGUE if c[4]}
    assert mapped == set(DET["applicable_refs"]), (
        f"mapped requirements {sorted(mapped)} do not match the determination's applicable set "
        f"{DET['applicable_refs']}"
    )


def test_excluded_requirements_name_the_determination_as_their_reason():
    for _fw, ref, _title, _cat, check, _sev, basis in pci_catalogue.CATALOGUE:
        if ref in DET["not_applicable_refs"]:
            assert check is None, f"requirement {ref} is excluded but still mapped to {check}"
            assert DET["determination_ref"] in basis, (
                f"requirement {ref} is excluded without naming the record that decided it"
            )


def test_the_collector_exists_and_is_registered():
    assert "tpsp_management" in assess.COLLECTORS
    assert callable(assess.COLLECTORS["tpsp_management"])


def test_the_collector_cannot_pass_without_a_determination():
    """No determination, no verdict: an unapproved scope must never yield a pass on third-party management."""
    src = open(ROOT / "scripts" / "ops" / "assess_compliance.py").read()
    start = src.index("def chk_tpsp_management")
    body = src[start:src.index("\nCOLLECTORS = {", start)]
    assert "status = 'approved'" in body, "the collector must read an approved determination"
    assert 'return unknown("no approved PCI scope determination' in body, (
        "with no approved determination the collector must return not_tested, never pass"
    )


# ------------------------------------------------------------------ coverage divides by what applies
def test_coverage_is_over_applicable_not_official_size():
    api = _load("compliance_api", ROOT / "apps" / "api" / "gds_api" / "compliance_api.py")
    # PCI: 1 assessed out of 1 applicable. Over the official 12 that would read 8.3%, which misdescribes a scope
    # decision as neglect.
    assert api.coverage_of(1, 1) == 100.0
    assert api.coverage_of(1, 12) == 8.3
    assert api.coverage_of(0, 0) is None, "nothing applicable must return None, not a division by zero"
    # A framework with no determination is unaffected.
    assert api.coverage_of(17, 93) == 18.3


def test_score_is_still_over_assessed_controls():
    """Excluding requirements from scope must not inflate the pass rate either."""
    api = _load("compliance_api", ROOT / "apps" / "api" / "gds_api" / "compliance_api.py")
    assert api.score_of(0, 1) == 0.0
    assert api.score_of(3, 0) == 100.0
    assert api.score_of(0, 0) == 0.0


# ------------------------------------------------------------------ the record has a home
def test_the_migration_guards_one_approved_scope_per_framework():
    sql = (ROOT / "migrations" / "security_isolation" / "046_compliance_scope_determinations.sql").read_text()
    assert "WHERE status = 'approved'" in sql, "the partial unique index must restrict one approved scope per framework"
    assert "compliance_scope_determinations_approval_chk" in sql, "approval must require an approver and a time"
    assert "GRANT SELECT, INSERT, UPDATE ON compliance_scope_determinations TO gds_runtime" in sql
