"""The coverage floor may only be raised, and a regression fails.

MEASURED 26 Nov 2026, first ever: 1,550 tests pass in 104 seconds and cover 38.18% of 28,432 statements. The audit's
line was "no coverage gate (1,262 tests, none measured)" - every release since added tests with no idea whether they
reached anything. A floor that is only raised is what stops that number drifting down while the suite stays green.
"""
import importlib.util
import pathlib

REPO = pathlib.Path("/opt/gds-os")


def _load_gate():
    """Load the gate itself, not a copy: a duplicate would let the tested code and the shipped code drift apart."""
    spec = importlib.util.spec_from_file_location("coverage_gate", REPO / "scripts/ops/coverage_gate.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


GATE = _load_gate()
compare = GATE.compare
largest_untested = GATE.largest_untested
UNREACHABLE_BY_DESIGN = GATE.UNREACHABLE_BY_DESIGN
BASELINE = {"percent": 38.18, "statements": 28432}


def test_a_drop_below_the_floor_is_a_regression():
    out = compare(BASELINE, {"percent": 36.9, "statements": 29000})
    assert out["verdict"] == "regression"
    assert out["delta"] == -1.28
    assert out["statements_delta"] == 568


def test_equal_to_the_floor_passes():
    # Holding the line is not a regression; only falling below it is.
    assert compare(BASELINE, {"percent": 38.18, "statements": 28432})["verdict"] == "pass"


def test_an_improvement_passes_and_is_flagged():
    out = compare(BASELINE, {"percent": 39.5, "statements": 28432})
    assert out["verdict"] == "pass" and out["improved"] is True


def test_untested_by_design_modules_are_named_not_hidden():
    # Writing tests for code no route can reach raises the number while making nothing safer.
    files = {"gds_api/security_scope.py": {"summary": {"num_statements": 212, "percent_covered": 0.0}}}
    rows = largest_untested(files)
    assert rows[0]["module"] == "security_scope.py"
    assert rows[0]["by_design"] == UNREACHABLE_BY_DESIGN["security_scope.py"]


def test_small_or_well_covered_modules_are_not_noise():
    files = {
        "gds_api/tiny.py": {"summary": {"num_statements": 20, "percent_covered": 0.0}},
        "gds_api/good.py": {"summary": {"num_statements": 400, "percent_covered": 90.0}},
    }
    assert largest_untested(files) == []


def test_the_baseline_file_exists_and_states_its_rule():
    import json
    baseline = json.loads((REPO / "config/coverage-baseline.json").read_text())
    assert baseline["percent"] > 0
    assert "may only be raised" in baseline["note"].lower() or "only be raised" in baseline["note"].lower()


def test_the_gate_fails_the_process_on_regression():
    body = (REPO / "scripts/ops/coverage_gate.py").read_text()
    regression = body.split('if verdict["verdict"] == "pass":')[1]
    assert "return 1" in regression
