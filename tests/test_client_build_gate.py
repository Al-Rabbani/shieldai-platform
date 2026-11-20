"""The client build claimed to verify the script and verified nothing.

build_client.py documented check 2 as "the script parses in the embedded JS engine", but the engine (dukpy) is not
installed on this host, so the check printed a warning and skipped itself on every build. dukpy is also ES5, so
the optional chaining the client legitimately uses would have failed it even when installed. A syntax error in the
single inline script blanks every view at once, so "skipped" is not an acceptable outcome for this check.

These tests hold the gate itself: a broken script must fail the build, a valid one must pass, and the outcome must
be recorded rather than assumed.
"""
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

spec = importlib.util.spec_from_file_location("build_client", ROOT / "scripts" / "ops" / "build_client.py")
build_client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_client)


def _page(script: str) -> str:
    return (
        "<!doctype html><html><head><title>t</title></head><body>"
        '<a data-route="overview" href="#/overview">Overview</a>'
        '<div id="page-overview"></div>'
        f"<script>{script}</script>"
        "</body></html>"
    )


GOOD = "const ROUTES = { overview:'Overview' };\nfunction f(x) { return x?.[0]?.y || 0; }\n"
BAD = "const ROUTES = { overview:'Overview' };\nfunction f(x) { return x?.[0]?.y || 0; \n"  # unclosed brace


def test_a_valid_script_passes_and_the_engine_is_recorded():
    problems, facts = build_client.validate(_page(GOOD))
    assert facts["script_parse"] == "ok", problems
    assert facts["script_parse_engine"] in ("node", "dukpy")


def test_a_broken_script_fails_the_build():
    problems, facts = build_client.validate(_page(BAD))
    assert facts["script_parse"] == "failed"
    assert any("script does not parse" in problem for problem in problems)


def test_the_check_can_no_longer_be_silently_skipped():
    source = (ROOT / "scripts" / "ops" / "build_client.py").read_text(encoding="utf-8")
    assert "parse check skipped" not in source
    assert "no JavaScript engine available" in source
    # a missing engine is a failure, not a warning
    assert "return False, \"no JavaScript engine available (install node)\"" in source
