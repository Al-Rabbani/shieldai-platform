"""B26 end to end: the overview panel fills from real payload shapes.

The dukpy tests next door prove the chart helpers. This one proves the loader: it runs the real loadViz
from the served page in a real JavaScript engine with the payloads the API actually returns (captured from
the live platform on 21 Nov 2026), stubs only the DOM, and asserts what the operator would see.

The payloads matter. /findings/summary carries no "info" key, so the honest render is "not reported" for
that series rather than a zero bar - that distinction is the point of the panel and is asserted here.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

NODE = shutil.which("node")
pytestmark = pytest.mark.skipif(NODE is None, reason="node is not installed; the loader cannot be executed")

ROOT = Path(__file__).resolve().parents[1]
SHELL = ROOT / "web" / "gds_app.html"

# Shapes captured from the live API on 21 Nov 2026 (values trimmed where they do not affect the render).
PAYLOADS = {
    "/findings/summary": {"ok": True, "status": 200, "data": {
        "total": 1002, "open": 849, "resolved": 139, "critical": 0, "high": 330,
        "medium": 513, "low": 2, "kev": 0, "accepted": 14, "accepted_critical": 14}},
    "/incidents": {"ok": True, "status": 200, "data": [
        {"id": "a", "severity": "critical", "status": "open", "open_findings": 0, "resolved_findings": 12},
        {"id": "b", "severity": "high", "status": "open", "open_findings": 0, "resolved_findings": 4}]},
    "/agents": {"ok": True, "status": 200, "data":
        [{"name": "a%d" % i, "status": "OPERATIONAL"} for i in range(20)]
        + [{"name": "p%d" % i, "status": "PLANNED"} for i in range(3)]},
}

HARNESS = r"""
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const payloads = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
function block(start) {
  let depth = 0;
  for (let k = js.indexOf('{', start); k < js.length; k++) {
    if (js[k] === '{') depth++;
    else if (js[k] === '}') { depth--; if (depth === 0) return js.slice(start, k + 1); }
  }
  throw new Error('unbalanced');
}
const fn = n => block(js.indexOf('function ' + n + '('));
const parts = ['escapeHtml','formatNumber','svgBars','vizBlock','vizUnavailable','unavailableLabel'].map(fn);
parts.push('function apiResult(p){ const d = ' + JSON.stringify(payloads) + '; return d[p] || {ok:false,status:0}; }');
parts.push('var __out = null; var document = { getElementById: function(){ return { set innerHTML(v){ __out = v; }, get innerHTML(){ return __out; } }; } };');
parts.push(js.slice(js.indexOf('async function loadViz()'), js.indexOf('async function loadOverview()')));
eval(parts.join('\n'));
loadViz().then(() => { process.stdout.write(__out || ''); });
"""


@pytest.fixture(scope="module")
def rendered(tmp_path_factory) -> str:
    tmp = tmp_path_factory.mktemp("viz")
    harness = tmp / "harness.js"
    harness.write_text(HARNESS, encoding="utf-8")
    payloads = tmp / "payloads.json"
    payloads.write_text(json.dumps(PAYLOADS), encoding="utf-8")
    result = subprocess.run(
        [NODE, str(harness), str(SHELL), str(payloads)],
        capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, result.stderr
    return result.stdout


def test_all_three_series_render(rendered):
    for caption in ("Open findings by severity", "Incidents by severity", "Agents by status"):
        assert caption in rendered, f"{caption} did not render"


def test_the_findings_chart_uses_the_real_counts(rendered):
    assert "849 open of 1002 recorded" in rendered
    assert ">330 (39%)<" in rendered and ">513 (61%)<" in rendered


def test_a_series_the_api_omits_reads_not_reported_not_zero(rendered):
    """/findings/summary has no "info" key. Drawing it as zero would assert an absence nobody measured."""
    assert "not reported" in rendered


def test_the_agent_chart_separates_planned_from_operational(rendered):
    assert "20 (87%)" in rendered and "3 (13%)" in rendered
    assert "23 agents in the registry" in rendered


def test_nothing_renders_as_nan_or_undefined(rendered):
    assert "NaN" not in rendered and "undefined" not in rendered
