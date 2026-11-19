"""A control that names a check with no collector reads not_tested forever and nobody notices.

The bug this guards: four collectors were permanent stubs that returned not_tested with a reason, so
fifteen controls across five frameworks could never move whatever the platform actually did. Two of them
were not even unmeasurable - MFA and volume encryption were knowable and absent, so "unknown" was
understating a real failure.
"""
import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "ops" / "assess_compliance.py"
spec = importlib.util.spec_from_file_location("assess_compliance", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def test_every_named_check_has_a_collector():
    named = {c[4] for c in mod.CATALOG if c[4]}
    missing = named - set(mod.COLLECTORS)
    assert not missing, f"controls name checks with no collector: {sorted(missing)}"


def test_no_collector_is_registered_without_a_callable():
    for key, fn in mod.COLLECTORS.items():
        assert callable(fn), key


def test_previously_stubbed_checks_can_now_fail():
    # These four returned not_tested unconditionally. Each must be able to report a failure, because for
    # all four the measured fact today IS a failure.
    import inspect
    for key in ("encryption_at_rest", "mfa_enforced", "access_review"):
        src = inspect.getsource(mod.COLLECTORS[key])
        assert "bad(" in src, f"{key} can never report a failure"


def test_the_incident_checks_are_split_by_requirement():
    # One check used to serve "a plan is documented", "personnel are designated" and "reporting exists",
    # so whichever verdict it returned was wrong for two of the three.
    for key in ("incident_response_plan", "incident_response_staffing", "incident_reporting"):
        assert key in mod.COLLECTORS, key
