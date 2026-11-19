"""The client build step (gap C1) and the token contrast floor (gap C2).

The build is the only thing standing between a hand-edited page and production, so its checks are tested
by planting each defect it is meant to catch. A build whose checks are never exercised is a build that
reports success for the wrong reason.
"""
import importlib.util
import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SHELL = ROOT / "web" / "gds_app.html"

_spec = importlib.util.spec_from_file_location("build_client", ROOT / "scripts" / "ops" / "build_client.py")
build_client = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(build_client)


def _tokens():
    html = SHELL.read_text(encoding="utf-8")
    block = re.search(r":root\{(.*?)\}", html, re.S).group(1)
    return dict(re.findall(r"--([\w-]+):\s*(#[0-9a-fA-F]{3,6})", block))


def _ratio(a, b):
    def channel(v):
        c = v / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    def lum(hex_value):
        h = hex_value.lstrip("#")
        h = "".join(c + c for c in h) if len(h) == 3 else h
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def test_the_real_client_passes_every_build_check():
    problems, facts = build_client.validate(SHELL.read_text(encoding="utf-8"))
    assert problems == [], problems
    assert facts["inline_scripts"] == 1
    assert facts["hex_outside_tokens"] == 0
    assert facts["routes"], "no routes discovered"


@pytest.mark.parametrize("planted,replacement,expected", [
    ("id=\"stat-findings\"", "id=\"stat-findings-renamed\"", "getElementById targets with no element"),
    ("id=\"page-findings\"", "id=\"page-findings-renamed\"", "routes with no page section"),
    ('data-route="compliance"', 'data-route="compliancex"', "nav links to unknown routes"),
    ("background:var(--bg)", "background:#123456", "hex colours outside the token block"),
])
def test_each_check_catches_the_defect_it_exists_for(planted, replacement, expected):
    html = SHELL.read_text(encoding="utf-8")
    assert planted in html, f"fixture drifted: {planted} not present"
    broken = html.replace(planted, replacement, 1)
    problems, _ = build_client.validate(broken)
    assert any(expected in p for p in problems), f"planted {expected!r} was not caught: {problems}"


def test_an_external_script_is_refused():
    html = SHELL.read_text(encoding="utf-8").replace("<script>", '<script src="https://cdn.example/x.js"></script><script>', 1)
    problems, _ = build_client.validate(html)
    assert any("external <script" in p for p in problems)


def test_the_manifest_describes_the_bytes_that_were_built():
    assert build_client.build() == 0
    manifest = json.loads((ROOT / "web" / "dist" / "manifest.json").read_text())
    dist = (ROOT / "web" / "dist" / "gds_app.html").read_bytes()
    assert manifest["bytes"] == len(dist)
    import hashlib

    assert manifest["sha256"] == hashlib.sha256(dist).hexdigest()


def test_body_text_meets_the_aa_floor_on_every_surface():
    # 4.5:1 is the AA floor for normal text. Anything lower is a real readability failure, not a taste
    # question, so a token change that breaks it fails here rather than shipping.
    tokens = _tokens()
    surfaces = ["bg", "surface", "surface2", "surface-panel"]
    for fg in ("text", "text-strong", "text-soft", "muted"):
        for bg in surfaces:
            ratio = _ratio(tokens[fg], tokens[bg])
            assert ratio >= 4.5, f"--{fg} on --{bg} is {ratio:.2f}:1, below AA"


def test_severity_colours_are_readable_and_defined_once():
    tokens = _tokens()
    for name in ("sev-critical", "sev-high", "sev-medium", "sev-low", "sev-info"):
        for bg in ("surface", "surface2"):
            ratio = _ratio(tokens[name], tokens[bg])
            assert ratio >= 4.5, f"--{name} on --{bg} is {ratio:.2f}:1, below AA"


def test_the_button_label_is_computed_not_assumed():
    # White on the default primary measures 3.67:1. The page must choose the readable foreground rather
    # than pin white and hope every tenant picks a dark primary.
    tokens = _tokens()
    assert _ratio(tokens["paper"], tokens["primary"]) < 4.5, "fixture drifted: white now passes on primary"
    assert _ratio(tokens["ink"], tokens["primary"]) >= 4.5, (
        "neither page foreground is readable on the default primary, so no choice can rescue it"
    )
