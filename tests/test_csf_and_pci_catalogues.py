"""NIST CSF 2.0 and PCI DSS catalogue invariants.

Two catalogues with deliberately different shapes, and both need guarding for opposite reasons.

NIST CSF is partial by design: 67 of 106 subcategories, covering the operational functions. The Govern function and
the awareness, improvement and recovery-communication subcategories are absent because they are artefacts GDS OS does
not hold. A test fails if one is added, because a governance row with no evidence behind it is a document pretending
to be an assessment.

PCI DSS is catalogued at requirement level with NO control mapped, because applicability is the open question: no
cardholder data environment has ever been defined and the platform stores no account data. A test fails if a PCI
requirement is mapped to a collector, because that would certify a scope that was never established. When the owner
defines the CDE, that test is the place to change the rule deliberately.
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


assess = _load("assess_compliance_csf", ROOT / "scripts" / "ops" / "assess_compliance.py")
csf_module = _load("catalogue_nist_csf", ROOT / "scripts" / "ops" / "catalogue_nist_csf.py")
pci_module = _load("catalogue_pci_dss", ROOT / "scripts" / "ops" / "catalogue_pci_dss.py")

CSF = [c for c in assess.CATALOG if c[0] == "nist_csf"]
PCI = [c for c in assess.CATALOG if c[0] == "pci_dss"]
CATEGORIES = {
    "access", "appsec", "config", "continuity", "crypto", "data", "endpoint", "governance",
    "incident", "inventory", "monitoring", "network", "operations", "risk", "supplychain", "vulnerability",
}


# ------------------------------------------------------------------ NIST CSF 2.0
def test_the_published_structure_is_recorded_correctly():
    assert csf_module.OFFICIAL_SUBCATEGORY_COUNT == 106
    assert sum(csf_module.FUNCTIONS.values()) == 106
    assert csf_module.FUNCTIONS["GV"] == 31


def test_the_framework_is_registered_with_the_official_count():
    entry = next(f for f in assess.FRAMEWORKS if f[0] == "nist_csf")
    assert entry[3] == 106, f"official subcategory count is {entry[3]}, the framework has 106"
    assert "67 of 106" in entry[5], "the source note no longer states that this is a partial catalogue"


def test_the_operational_functions_are_fully_catalogued():
    """Every subcategory in Identify-Asset, Protect, Detect, Respond and Recover-Recovery must be present."""
    expected = {
        "ID.AM": 7, "ID.RA": 10, "PR.AA": 6, "PR.AT": 2, "PR.DS": 4, "PR.PS": 6, "PR.IR": 4,
        "DE.CM": 5, "DE.AE": 6, "RS.MA": 5, "RS.AN": 4, "RS.CO": 2, "RS.MI": 2, "RC.RP": 6,
    }
    counts: dict[str, int] = {}
    for _fw, ref, _t, _c, _chk, _s, _b in CSF:
        key = ref.rsplit("-", 1)[0]
        counts[key] = counts.get(key, 0) + 1
    # PR.AT (awareness and training) is deliberately excluded, so it must be absent rather than short.
    expected.pop("PR.AT")
    assert counts == expected, f"category counts drifted: {counts}"


def test_governance_and_workforce_subcategories_are_not_claimed():
    """GV, ID.IM and RC.CO are policy, oversight, improvement and comms artefacts this platform does not hold."""
    excluded = {"GV", "ID.IM", "RC.CO", "PR.AT"}
    claimed = [c[1] for c in CSF if c[1].rsplit("-", 1)[0] in excluded]
    assert not claimed, f"excluded subcategories were catalogued: {claimed}"


def test_every_csf_row_is_evidenced_or_explained():
    collectors = set(assess.COLLECTORS)
    for _fw, ref, title, _cat, check, _sev, basis in CSF:
        if check:
            assert check in collectors, f"{ref} names collector {check}, which does not exist"
            assert basis and len(basis) > 40, f"{ref} is mapped to {check} with a stub basis"
            assert not basis.lower().startswith("not evidenced"), (
                f"{ref} has collector {check} but its basis says it is not evidenced"
            )
        else:
            assert basis and len(basis) > 30, f"{ref} ({title}) is neither evidenced nor explained"


def test_csf_refs_are_unique_and_titles_are_meaningful():
    refs = [c[1] for c in CSF]
    assert len(set(refs)) == len(refs), "duplicate subcategory refs"
    for _fw, ref, title, _c, _chk, _s, _b in CSF:
        assert len(title) > 15, f"{ref} has a title that is too short to be the published wording: {title!r}"


# ------------------------------------------------------------------ PCI DSS v4.0.1
def test_pci_has_twelve_requirements():
    assert pci_module.OFFICIAL_REQUIREMENT_COUNT == 12
    refs = [c[1] for c in PCI]
    assert refs == [str(n) for n in range(1, 13)], f"requirement refs are {refs}"


def test_no_pci_requirement_is_marked_against_a_scope_that_does_not_exist():
    """The guard on this whole catalogue: applicability is undetermined, so nothing may pass."""
    mapped = [(c[1], c[4]) for c in PCI if c[4]]
    assert not mapped, (
        f"PCI requirements are mapped to collectors: {mapped}. No cardholder data environment has been defined, so a "
        "mapping would certify a scope that was never established. Change this test deliberately when the CDE is set."
    )


def test_every_pci_row_states_its_applicability_position():
    for _fw, ref, _title, _cat, _check, _sev, basis in PCI:
        assert basis and len(basis) > 60, f"requirement {ref} has a stub basis"
        assert "applicab" in basis.lower() or "not applicable" in basis.lower(), (
            f"requirement {ref} does not state whether it applies: {basis[:80]}"
        )


def test_pci_titles_are_the_twelve_requirement_headings():
    for _fw, ref, title, _c, _chk, _s, _b in PCI:
        assert title and title[0].isupper(), f"requirement {ref} has no heading"
        assert len(title) > 20, f"requirement {ref} heading is too short: {title!r}"


# ------------------------------------------------------------------ shared
def test_no_catalogue_row_carries_a_verdict():
    for row in CSF + PCI:
        assert len(row) == 7, f"row shape changed: {row}"
        assert not any(isinstance(field, bool) for field in row), "a catalogue row carries a pass/fail flag"


def test_both_catalogues_are_wired_into_the_catalog():
    assert len(CSF) == 67, f"expected 67 CSF rows, found {len(CSF)}"
    assert len(PCI) == 12, f"expected 12 PCI rows, found {len(PCI)}"
    assert len(assess.NIST_CSF_CATALOGUE) == 67
    assert len(assess.PCI_DSS_CATALOGUE) == 12


def test_categories_and_severities_are_from_the_known_sets():
    for _fw, ref, _t, cat, _chk, sev, _b in CSF + PCI:
        assert cat in CATEGORIES, f"{ref} has unknown category {cat}"
        assert sev in {"critical", "high", "medium", "low"}, f"{ref} has unknown severity {sev}"
