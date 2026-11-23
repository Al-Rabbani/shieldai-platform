"""Per-department risk limits must not be offered over a dimension that does not exist.

Measured 23 Nov 2026: DepartmentRiskThreshold was saved through create/update/delete at five sites with no threshold
table, and security_findings carries no department, team or unit column (0), so no limit could ever be evaluated. The page
must state that, and must show the thresholds that ARE in force by reading the engine rather than recomputing them.
"""
import pathlib
import re

PAGE = pathlib.Path("/opt/gds-os/apps/web/src/pages/RiskThresholdsPage.jsx")


def rendered() -> str:
    """The component with comments stripped: prose may name what the code no longer does."""
    text = PAGE.read_text(encoding="utf-8")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"^\s*//.*$", "", text, flags=re.M)


def test_the_absent_store_is_no_longer_written():
    text = rendered()
    for name in ("DepartmentRiskThreshold", ".create(", ".update(", ".delete("):
        assert name not in text, f"{name} writes to a store that does not exist"


def test_the_page_names_the_missing_dimension():
    text = rendered()
    assert "no department, team or" in text
    assert "threshold store" in text.lower()


def test_the_page_reads_the_engine_rather_than_recomputing_the_ladder():
    text = rendered()
    assert 'invoke("gdsAutoAssignFindings"' in text
    assert '"escalate_stale"' in text
    assert "apply: false" in text, "a preview must not change the estate"
    assert "effective_hours" in text


def test_the_page_does_not_hardcode_policy_hours():
    text = rendered()
    for invented in ("24h", "168", "720", "2160", "4320"):
        assert invented not in text, f"{invented} would duplicate the policy the engine owns"
