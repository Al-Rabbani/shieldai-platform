"""Behavioural tests for the pure client functions (gap register C9 and C13).

These are not structural. The chart and router logic is pure, so it is extracted from the page and
EXECUTED in an embedded JavaScript engine. That makes an assertion like "a null measurement renders as
the words not assessed" a fact about the code rather than a grep for a string that happens to be present.

If the engine is not installed the tests skip with that reason instead of passing quietly.
"""
import json
import re
from pathlib import Path

import pytest

dukpy = pytest.importorskip(
    "dukpy", reason="embedded JS engine not installed; behavioural client tests cannot run"
)

SHELL = Path(__file__).resolve().parents[1] / "web" / "gds_app.html"
JS = re.search(r"<script>(.*?)</script>", SHELL.read_text(encoding="utf-8"), re.S).group(1)


def _block(start):
    """Return the balanced {...} block that begins at or after `start`."""
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
    # The trailing "(" matters: "function formatDate" is a prefix of "function formatDateTime", so a
    # bare name search silently extracts the wrong function and leaves the intended one undefined.
    return _block(JS.index("function " + name + "("))


def _const(name):
    return _block(JS.index("const " + name + " ="))


SOURCE = "\n".join([
    _const("ROUTES"),
    _fn("escapeHtml"),
    _fn("formatValue"),
    _fn("routeFromHash"),
    _fn("returnRoute"),
    _fn("svgGroupedBars"),
    _fn("uiLocale"),
    _fn("formatDateTime"),
    _fn("formatDate"),
    _fn("formatNumber"),
    _fn("shouldRetry"),
    _fn("isSuperseded"),
    _fn("cacheFresh"),
    _fn("unavailableLabel"),
])


STUBS = "var CACHE_TTL_MS = 15000;\nvar localStorage={getItem:function(){return null},setItem:function(){}}; var navigator={language:'de-DE'};\n"


def run(expr):
    return dukpy.evaljs(STUBS + SOURCE + "\n" + expr)


def test_route_from_hash_maps_addresses():
    cases = {
        "#/findings": "findings",
        "#/mssp": "mssp",
        "#/compliance": "compliance",
        "#findings": "findings",
        "#/cloud?tab=1": "cloud",
        "": "overview",
        "#/": "overview",
        "#/does-not-exist": "overview",
    }
    for hash_value, expected in cases.items():
        got = run("routeFromHash(%s);" % json.dumps(hash_value))
        assert got == expected, f"{hash_value!r} routed to {got!r}, expected {expected!r}"


def test_a_null_hash_lands_on_overview():
    assert run("routeFromHash(null);") == "overview"


def test_null_measurement_is_written_out_not_drawn_as_zero():
    # A measurement nobody took and a measured zero are different facts. The chart must not merge them.
    svg = run("svgGroupedBars([{label:'NIST AI RMF', a:null, b:null}], {aria:'x'});")
    assert "not assessed" in svg


def test_a_measured_zero_is_drawn_as_zero_not_as_missing():
    svg = run("svgGroupedBars([{label:'NIST AI RMF', a:0, b:null}], {aria:'x'});")
    assert "not assessed" not in svg
    assert 'width="0.0"' in svg


def test_labels_are_escaped_before_reaching_the_dom():
    svg = run("svgGroupedBars([{label:'<script>alert(1)</script>', a:10, b:null}], {aria:'x'});")
    assert "<script" not in svg
    assert "&lt;script&gt;" in svg


def test_a_chart_is_readable_without_vision():
    svg = run("svgGroupedBars([{label:'A', a:10, b:null}], {aria:'Open findings per tenant'});")
    assert 'role="img"' in svg
    assert 'aria-label="Open findings per tenant"' in svg


def test_values_scale_against_the_stated_maximum():
    # 50 of 100 over a 380px bar is 190.0px; a chart that ignores its own scale misleads by geometry.
    svg = run("svgGroupedBars([{label:'A', a:50, b:null}], {aria:'x', max:100});")
    assert 'width="190.0"' in svg


def test_the_second_legend_appears_only_when_a_second_series_exists():
    one = run("svgGroupedBars([{label:'A', a:10, b:null}], {aria:'x', legend:{a:'One'}});")
    two = run("svgGroupedBars([{label:'A', a:10, b:20}], {aria:'x', legend:{a:'One', b:'Two'}});")
    assert "One" in one and "Two" not in one
    assert "Two" in two


def test_coverage_and_pass_rate_are_drawn_as_separate_series():
    # The compliance view must never let 87% pass rate stand alone beside 15% coverage.
    svg = run("svgGroupedBars([{label:'CIS', a:15.0, b:87.0}], {aria:'x', legend:{a:'Coverage', b:'Pass rate'}, suffix:'%'});")
    assert "15.0%" in svg and "87.0%" in svg
    assert svg.count("<rect") >= 3


def test_a_valid_route_is_restored_after_signing_back_in():
    assert run("returnRoute('#/findings', '');") == "#/findings"
    assert run("returnRoute('#/mssp', '');") == "#/mssp"


def test_planted_or_unknown_values_are_never_restored():
    # The stored value is attacker-writable storage, so it is only honoured if it is one of this page's
    # own routes in exactly that form.
    for junk in ("javascript:alert(1)", "https://elsewhere.example", "#/nope", "#/findings?x=1", ""):
        assert run("returnRoute(%s, '');" % json.dumps(junk)) == "", junk


def test_an_absent_return_route_is_empty_not_a_default():
    assert run("returnRoute(null, '#/cloud');") == ""


def test_an_unparseable_timestamp_renders_nothing_rather_than_invalid_date():
    # "Invalid Date" on a dashboard looks like a data fault; an empty cell reads as "no date recorded".
    assert run("formatDateTime('not-a-date');") == ""
    assert run("formatDate('not-a-date');") == ""
    assert run("formatDateTime(null);") == ""


def test_a_missing_number_is_reported_not_coerced_to_zero():
    assert run("formatNumber(null);") == "n/a"
    assert run("formatNumber(undefined);") == "n/a"


def test_formatting_survives_an_engine_without_intl():
    # Duktape has no Intl, which makes this the fallback path a real browser would also take if Intl were
    # stripped. It must produce an unambiguous UTC timestamp, never throw.
    out = run("formatDateTime('2026-11-19T18:05:00+00:00');")
    assert "UTC" in out and "2026-11-19" in out
    assert run("formatDate('2026-11-19T18:05:00+00:00');") == "2026-11-19"


def test_the_locale_falls_back_to_the_browser_then_to_a_default():
    assert run("uiLocale();") == "de-DE"


def test_only_a_transient_failure_is_retried():
    # A 4xx is the server's decision. Retrying it wastes the operator's time and hides the reason.
    assert run("shouldRetry({ok:false, status:500});") is True
    assert run("shouldRetry({ok:false, status:503});") is True
    for decided in (401, 403, 404, 422):
        assert run("shouldRetry({ok:false, status:%d});" % decided) is False, decided
    assert run("shouldRetry({ok:true, status:200});") is False
    assert run("shouldRetry(null);") is False


def test_a_response_from_a_previous_route_is_recognised_as_stale():
    assert run("isSuperseded(1, 2);") is True
    assert run("isSuperseded(2, 2);") is False


def test_the_cache_expires_rather_than_serving_forever():
    assert run("cacheFresh({at:1000, data:1}, 1000);") is True
    assert run("cacheFresh({at:1000, data:1}, 1000 + 15000);") is True
    assert run("cacheFresh({at:1000, data:1}, 1000 + 15001);") is False
    assert run("cacheFresh(undefined, 1000);") is False


def test_each_failure_mode_gets_its_own_message():
    # A permission boundary, an outage and a timeout are different facts and must not share one label.
    assert run("unavailableLabel({ok:false, status:403});") == "Restricted"
    assert run("unavailableLabel({ok:false, status:0, error:'network'});") == "Unreachable"
    assert run("unavailableLabel({ok:false, status:0, error:'timeout'});") == "Timed out"
    assert run("unavailableLabel({ok:false, status:500});") == "Unavailable"
    assert run("unavailableLabel({ok:true, status:200});") == ""
