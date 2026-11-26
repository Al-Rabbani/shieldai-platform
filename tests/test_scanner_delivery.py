"""A scanner that cannot be fed, cannot be read, or hangs on stdin reports a clean estate.

MEASURED 26 Nov 2026, asking what each installed scanner needs to actually function rather than whether its binary
exists. All twelve binaries ran and returned a version; four of them still could not produce a recordable result.

  * ffuf and gobuster both defaulted to /opt/tools/wordlists/directory-list-2.3-medium.txt, and /opt/tools/wordlists
    did not exist at all, so both failed instantly and returned nothing - which reads as a web server with nothing on
    it. The list they named is also 220k entries and cannot finish inside the 600s tool budget.
  * gobuster REFUSED to run against www.globaldigitalsecurity.io: "the server returns a status code that matches the
    provided options for non existing urls (Length: 139)". It was not finding nothing, it was declining to look.
  * httpx v1.10.0 IGNORES -u. It printed its banner, probed nothing and exited 0, so every probe returned zero
    findings. The same target on stdin produces a full record.
  * _run_tool left stdin inherited, and the projectdiscovery tools read targets from stdin when it is not a terminal,
    so a command that takes 25ms from a shell hung until timeout when launched through the gateway.
"""
import pathlib

import pytest

from gds_api.scanner_persistence import EXTRACTORS, _httpx, _subfinder
from gds_api.tool_gateway import DEFAULT_WORDLIST, _require_wordlist

SOURCE = pathlib.Path("apps/api/gds_api/tool_gateway.py").read_text()


def test_the_default_wordlist_actually_exists():
    # The old default named a file in a directory that did not exist, so ffuf and gobuster died before scanning.
    assert pathlib.Path(DEFAULT_WORDLIST).is_file(), f"{DEFAULT_WORDLIST} is not installed"
    assert pathlib.Path(DEFAULT_WORDLIST).stat().st_size > 1000


def test_a_missing_wordlist_is_named_not_treated_as_a_clean_target():
    error = _require_wordlist("/opt/tools/wordlists/does-not-exist.txt")
    assert error and "does-not-exist.txt" in error
    assert _require_wordlist("") is not None
    assert _require_wordlist(DEFAULT_WORDLIST) is None


def test_content_discovery_handlers_refuse_without_a_wordlist():
    # Both handlers must return an explicit failure rather than running a tool that cannot scan.
    for tool in ("_ffuf_scan", "_gobuster_scan"):
        body = SOURCE[SOURCE.index(f"async def {tool}("):]
        body = body[: body.index("    problem = _require_wordlist(wordlist)") + 60]
        assert "_require_wordlist(wordlist)" in body
        assert '"success": False' in body


def test_ffuf_parses_its_own_json_report_and_calibrates_the_catch_all():
    body = SOURCE[SOURCE.index("async def _ffuf_scan("):]
    body = body[: body.index("async def _gobuster_scan(")]
    assert '"-of", "json"' in body, "ffuf has no parseable report without -of json"
    assert '"-ac"' in body, "without -ac a catch-all host fills the register with invented paths"
    assert 'result["findings"] = findings' in body


def test_gobuster_excludes_the_measured_placeholder_and_parses_unrooted_paths():
    body = SOURCE[SOURCE.index("async def _gobuster_scan("):]
    body = body[: body.index("async def _wpscan_scan(")]
    assert "--exclude-length" in body, "gobuster refuses to run on a host that answers every path with 200"
    # dir mode prints "health   (Status: 200) [Size: 700]" with no leading slash; a pattern anchored on "/" matched
    # nothing and a successful run reported zero findings.
    assert 'match.group("path").startswith("/")' in body


def test_httpx_is_fed_through_a_file_because_this_build_ignores_u():
    body = SOURCE[SOURCE.index("async def _httpx_probe("):]
    body = body[: body.index("DEFAULT_WORDLIST =")]
    assert '"-l"' in body
    assert '"-json"' in body
    assert '"-u", target' not in body, "httpx v1.10.0 ignores -u and returns zero findings with exit code 0"


def test_every_tool_run_through_the_gateway_has_a_closed_stdin():
    # An inherited stdin makes the projectdiscovery tools wait for input that never comes.
    body = SOURCE[SOURCE.index("async def _run_tool("):]
    body = body[: body.index("async def ", body.index("async def _run_tool(") + 10)]
    assert "stdin=asyncio.subprocess.DEVNULL" in body


def test_discovery_tools_emit_findings_so_their_results_can_be_recorded():
    for tool in ("subfinder_scan", "httpx_scan", "ffuf_scan", "gobuster_scan"):
        assert tool in EXTRACTORS, f"{tool} produces results but has no extractor"


def test_a_discovered_subdomain_and_a_live_endpoint_become_readable_findings():
    sub = _subfinder({"subdomain": "api.example.com", "root_domain": "example.com"}, "example.com")
    assert "api.example.com" in sub["title"] and sub["severity"] == "info"
    live = _httpx({"url": "https://example.com", "status_code": 200, "webserver": "nginx",
                   "tech": ["HSTS", "Nginx"], "title": "Example"}, "https://example.com")
    assert "200" in live["title"] and "nginx" in live["description"]


def test_a_discovery_tool_that_finds_nothing_says_so_rather_than_looking_clean():
    # subfinder's own note already distinguishes "the sources had nothing" from "none exist"; keep it.
    assert "not that none exist" in SOURCE
