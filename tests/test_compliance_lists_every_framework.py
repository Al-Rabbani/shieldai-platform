"""Four frameworks with verdicts were missing from the compliance surface, and one row carried two denominators.

Measured 20 Nov 2026, live: GET /compliance/frameworks returned 6 frameworks, while compliance_assessments held 18
manual, unevidenced verdicts under iso27001, nist_csf, pci_dss and soc2 - keys with no compliance_frameworks row, so
they were never listed. The route's own docstring promises manual rows are "counted separately rather than being
allowed to lift the score"; they were not counted at all, and a verdict nobody can see is indistinguishable from one
that was never taken.

Second defect, same route: the page showed "Assessed 28 / 35" beside "Coverage 18.3%". 35 was the number of control
rows that exist; the coverage divided by the framework's official size, 153. Both true, one row, neither labelled.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

ROUTE = (ROOT / "apps" / "api" / "gds_api" / "compliance_api.py").read_text(encoding="utf-8")
CLIENT = (ROOT / "web" / "gds_app.html").read_text(encoding="utf-8")


def _load_route():
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "compliance_api_probe", ROOT / "apps" / "api" / "gds_api" / "compliance_api.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_the_listing_is_a_union_of_catalogue_and_verdicts():
    assert "UNION ALL" in ROUTE
    assert "a.framework NOT IN (SELECT framework_key FROM compliance_frameworks)" in ROUTE


def test_an_uncatalogued_framework_is_marked_not_invented():
    assert '"catalogued": bool(f["catalogued"])' in ROUTE
    assert "true AS catalogued" in ROUTE
    assert "false AS catalogued" in ROUTE


def test_an_unknown_framework_size_never_produces_a_coverage_percentage():
    """Dividing by an unknown total is how a fabricated 0% or 100% reaches a board pack.

    The denominator moved on 21 Nov 2026: coverage now divides by APPLICABLE controls, because a requirement excluded
    by an approved scope determination is not an untested one. The invariant is unchanged - no denominator, no
    percentage - and coverage_of() is where it now lives, so it is checked directly as well as in the source.
    """
    assert '"coverage_pct": coverage_of(assessed, applicable)' in ROUTE
    assert '"official_control_count": official or None' in ROUTE
    api = _load_route()
    assert api.coverage_of(0, 0) is None, "nothing applicable must produce no percentage, not a division by zero"
    assert api.coverage_of(5, 0) is None
    assert api.coverage_of(1, 1) == 100.0


def test_the_two_denominators_are_named_apart():
    # control_rows counts every recorded row, including those a determination excluded, so it can never be mistaken
    # for the assessed count.
    assert '"control_rows": (passing + failing + not_tested + not_applicable)' in ROUTE
    assert "<th>Assessed of official size</th>" in CLIENT
    assert "control rows recorded" in CLIENT
    assert "official size unknown" in CLIENT
    # Coverage now names its denominator explicitly, and out-of-scope requirements get their own column rather than
    # being folded into "not tested".
    assert "<th>Coverage of applicable</th>" in CLIENT
    assert "<th>Not applicable</th>" in CLIENT
    assert "out of scope" in CLIENT


def test_unevidenced_verdicts_are_counted_and_disclosed_not_dropped():
    assert "tot_manual += manual" in ROUTE
    assert '"manual_unevidenced": tot_manual' in ROUTE
    assert "manual verdicts carry no evidence" in CLIENT
    assert "manual, no evidence" in CLIENT


def test_manual_verdicts_still_do_not_reach_the_score():
    """The score stays a pass rate over automated assessed controls only."""
    assert '"score_over_assessed": round(100.0 * tot_pass / tot_assessed, 1) if tot_assessed else None' in ROUTE
    assert "verdict_source = 'manual'" in ROUTE
    assert "verdict_source = 'automated' AND lower(status) = 'pass'" in ROUTE
