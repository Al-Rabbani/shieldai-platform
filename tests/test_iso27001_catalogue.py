"""ISO/IEC 27001:2022 Annex A catalogue invariants.

The framework reported no coverage at all until 21 Nov 2026, because nothing was catalogued. That was honest but
useless: a reader could not tell "we have not looked" from "there is nothing to look at". The catalogue now covers 45
of the standard's 93 controls, which makes two things worth guarding.

First, it must stay a partial catalogue that says so. The people (6.x) and physical (7.x) themes are deliberately
absent because this platform holds no screening, disciplinary, secure-area or equipment-disposal records. If someone
later adds a 6.x or 7.x row, they are claiming a control environment that does not exist, and this file fails.

Second, a catalogued control must either name a collector that exists or say in writing what is missing. A blank basis
is indistinguishable from an assessment somebody forgot to run.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

_spec = importlib.util.spec_from_file_location(
    "assess_compliance_iso", ROOT / "scripts" / "ops" / "assess_compliance.py"
)
assess = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(assess)

_cat_spec = importlib.util.spec_from_file_location(
    "catalogue_iso27001", ROOT / "scripts" / "ops" / "catalogue_iso27001.py"
)
iso_module = importlib.util.module_from_spec(_cat_spec)
_cat_spec.loader.exec_module(iso_module)

ISO = [c for c in assess.CATALOG if c[0] == "iso27001"]
CATEGORIES = {
    "access", "appsec", "config", "continuity", "crypto", "data", "endpoint",
    "incident", "monitoring", "network", "operations", "vulnerability",
}


def test_the_official_count_matches_the_standard_structure():
    assert iso_module.OFFICIAL_CONTROL_COUNT == 93
    themes = {k: v[1] for k, v in iso_module.THEMES.items()}
    assert themes == {"5": 37, "6": 8, "7": 14, "8": 34}


def test_the_framework_is_registered_with_the_right_official_count():
    entry = next(f for f in assess.FRAMEWORKS if f[0] == "iso27001")
    assert entry[3] == 93, f"official control count is {entry[3]}, the standard has 93"
    assert "45 of 93" in entry[5], "the source note no longer states that this is a partial catalogue"


def test_every_technological_control_is_catalogued():
    """8.1-8.34 is the theme this platform can actually answer for, so all 34 must be present."""
    refs = {c[1] for c in ISO}
    missing = [f"8.{n}" for n in range(1, 35) if f"8.{n}" not in refs]
    assert not missing, f"technological controls missing from the catalogue: {missing}"


def test_people_and_physical_themes_are_not_claimed():
    """No screening, disciplinary, secure-area or equipment records exist, so 6.x and 7.x must stay out."""
    claimed = [c[1] for c in ISO if c[1].split(".")[0] in {"6", "7"}]
    assert not claimed, (
        f"controls from the people or physical themes were catalogued: {claimed}. GDS OS holds no evidence for "
        "them, and a catalogued control with no basis reads like an assessed one."
    )


def test_refs_are_unique_and_inside_the_themes_claimed():
    refs = [c[1] for c in ISO]
    assert len(set(refs)) == len(refs), "duplicate control refs"
    for ref in refs:
        assert ref.split(".")[0] in {"5", "8"}, f"{ref} is outside the themes this catalogue claims"


def test_every_control_is_evidenced_or_explains_why_not():
    collectors = set(assess.COLLECTORS)
    for _fw, ref, title, _cat, check, _sev, basis in ISO:
        if check:
            assert check in collectors, f"{ref} names collector {check}, which does not exist"
        else:
            assert basis and len(basis) > 30, f"{ref} ({title}) is neither evidenced nor explained"


def test_an_evidenced_control_does_not_read_like_an_unevidenced_one():
    """The basis for a mapped control must describe evidence, not a missing artefact.

    This is a real trap: a row that has a collector but whose text still begins "Not evidenced" would tell a reader
    the opposite of what the assessment does, and the two shapes sit next to each other in the same list.
    """
    for _fw, ref, _title, _cat, check, _sev, basis in ISO:
        if check:
            assert basis and len(basis) > 40, f"{ref} is mapped to {check} with a stub basis"
            assert not basis.lower().startswith("not evidenced"), (
                f"{ref} has collector {check} but its basis says it is not evidenced"
            )


def test_categories_are_from_the_known_set():
    for _fw, ref, _title, cat, _check, _sev, _basis in ISO:
        assert cat in CATEGORIES, f"{ref} has unknown category {cat}"


def test_severities_are_from_the_known_set():
    for _fw, ref, _title, _cat, _check, sev, _basis in ISO:
        assert sev in {"critical", "high", "medium", "low"}, f"{ref} has unknown severity {sev}"


def test_no_control_carries_a_verdict_in_the_catalogue():
    """A catalogue row describes how a control is judged; it must never carry the judgement itself."""
    for row in ISO:
        assert len(row) == 7, f"catalogue row shape changed: {row}"
        assert not any(isinstance(field, bool) for field in row), "a catalogue row carries a pass/fail flag"


def test_the_module_is_actually_wired_into_the_catalog():
    """A catalogue file that nothing imports is a document, not a control set."""
    assert len(ISO) == 45, f"expected 45 ISO rows in CATALOG, found {len(ISO)}"
    assert len(assess.ISO27001_CATALOGUE) == 45
