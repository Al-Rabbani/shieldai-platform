"""B26: the estate is drawn from live data, and every route the page calls must exist.

Two kinds of assertion here. The chart helpers are executed in an embedded JavaScript engine, so "a
measurement the API did not report renders as 'not reported' rather than as an empty bar" is a fact about
the code. The endpoint check is a structural one against the app's own OpenAPI schema, so a page that calls
a route the API does not serve fails the build instead of showing a blank panel in production.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from gds_api.main import app

dukpy = pytest.importorskip("dukpy", reason="embedded JS engine not installed; behavioural client tests cannot run")

SHELL = Path(__file__).resolve().parents[1] / "web" / "gds_app.html"
HTML = SHELL.read_text(encoding="utf-8")
JS = re.search(r"<script>(.*?)</script>", HTML, re.S).group(1)


def _block(start):
    depth = 0
    for k in range(JS.index("{", start), len(JS)):
        if JS[k] == "{":
            depth += 1
        elif JS[k] == "}":
            depth -= 1
            if depth == 0:
                return JS[start:k + 1]
    raise AssertionError("unbalanced block in the shell")


def _fn(name):
    return _block(JS.index("function " + name + "("))


SOURCE = "\n".join([
    _fn("escapeHtml"),
    _fn("formatNumber"),
    _fn("svgBars"),
    _fn("vizBlock"),
    _fn("vizUnavailable"),
])
STUBS = "var CACHE_TTL_MS = 15000;\n"


def run(expr):
    return dukpy.evaljs(STUBS + SOURCE + "\n" + expr)


# ------------------------------------------------------------------ the chart itself
def test_a_reported_measurement_draws_a_bar_and_a_share():
    rows = [{"label": "High", "value": 30}, {"label": "Low", "value": 10}]
    svg = run("svgBars(%s, {aria: 'x'});" % json.dumps(rows))
    assert "High" in svg and "Low" in svg
    assert ">30 (75%)<" in svg, "the share of the total is what makes a bar readable"
    assert ">10 (25%)<" in svg


def test_a_measurement_the_api_did_not_report_is_not_drawn_as_zero():
    """The distinction the page must keep: unknown is not an absence of findings."""
    rows = [{"label": "Critical", "value": None}, {"label": "High", "value": 5}]
    svg = run("svgBars(%s, {aria: 'x'});" % json.dumps(rows))
    assert "not reported" in svg
    assert "NaN" not in svg


def test_an_all_zero_series_draws_no_percentages():
    rows = [{"label": "Critical", "value": 0}, {"label": "High", "value": 0}]
    svg = run("svgBars(%s, {aria: 'x'});" % json.dumps(rows))
    # "%)" rather than "%": width="100%" is part of the SVG frame, not a share.
    assert "%)" not in svg, "0% of nothing is noise, not information"
    assert "NaN" not in svg


def test_a_title_is_escaped():
    block = run("vizBlock('<img src=x onerror=alert(1)>', 'body');")
    assert "<img" not in block
    assert "&lt;img" in block


def test_unavailable_says_what_is_unknown():
    text = run("vizUnavailable('Unreachable', 'incidents');")
    assert "Unreachable" in text and "incidents" in text
    assert "role=\"alert\"" in text


# ------------------------------------------------------------------ every page draws from a real route
def _page_paths() -> set[str]:
    return set(re.findall(r"""['"`](/[a-z][a-z0-9/{}._-]*)['"`]""", JS))


def _normalise(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "{}", path.split("?")[0].rstrip("/") or "/")


def test_every_route_the_page_calls_exists_in_the_api():
    served = {_normalise(p) for p in app.openapi()["paths"]}
    served |= {"/openapi.json", "/docs", "/redoc"}
    called = {_normalise(p) for p in _page_paths()}
    # Fragments the regex picks up from prose and links, not calls.
    ignored = {"/api", "/api.globaldigitalsecurity.io/docs", "/decide", "/resolve", "/approvals/", "/incidents/"}
    missing = sorted(p for p in called - served - ignored if p.count("/") >= 1 and not p.startswith("/api."))
    assert missing == [], f"the page calls routes the API does not serve: {missing}"


def test_the_four_estate_series_are_wired_to_their_sources():
    viz = _block(JS.index("async function loadViz()"))
    for route, what in (("/findings/summary", "findings"), ("/incidents", "incidents"), ("/agents", "agents")):
        assert route in viz, f"{what} chart has lost its source"
    assert "/cloud/posture/score" in _block(JS.index("async function loadPosturePanel()")), "risk lost its source"


def test_the_charts_render_on_the_overview():
    assert 'id="vizGrid"' in HTML
    overview = _block(JS.index("async function loadOverview()"))
    assert "loadViz()" in overview, "the charts would never be drawn"
