"""The compliance pages must read the field the route actually returns.

MEASURED 25 Nov 2026: GET /compliance/controls returns `verdict` (pass | fail | not_tested | not_applicable) and the
underlying table has neither a status nor a verdict column - the route computes it. FrameworkTrackingPage read
`item.status`, so all 297 real controls fell through to "needs_evidence" and the page reported 0% passing on an estate
that has verdicts. ControlFailureHeatmap read `item.status === "incomplete"`, which is never true, so it drew an
all-clear. Both are now guarded here.
"""
import pathlib

WEB = pathlib.Path(__file__).resolve().parents[1] / "apps/web/src"


def test_framework_tracking_reads_verdict():
    src = (WEB / "pages/compliance/FrameworkTrackingPage.jsx").read_text()
    assert "item.verdict" in src, "FrameworkTrackingPage must read the verdict field the route returns"
    assert 'String(item.status || "")' not in src, "reading only item.status made every control needs_evidence"


def test_failure_heatmap_counts_a_fail_verdict():
    src = (WEB / "components/compliance/ControlFailureHeatmap.jsx").read_text()
    assert "function isFailing" in src, "the heatmap must classify a fail verdict"
    assert "item.verdict" in src
    assert src.count('item.status === "incomplete"') <= 1, "status-only comparisons hid every failure"


def test_the_controls_route_still_computes_verdict():
    src = (pathlib.Path(__file__).resolve().parents[1] / "apps/api/gds_api/compliance_api.py").read_text()
    assert '"verdict": r["status"]' in src, "if the route renames the field, the pages must follow"
