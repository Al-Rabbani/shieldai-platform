"""A scanner that cannot run must not look like a scanner that found nothing.

Measured 25 Nov 2026: _semgrep_scan filed semgrep's errors under a key named "summary" and turned a JSON
parse failure into findings=[], so an unusable semgrep read exactly like a clean scan. Same family as the
nuclei -json and nikto JSON bugs fixed earlier.
"""
from __future__ import annotations

import inspect
import re

from gds_api.tool_gateway import TOOL_REGISTRY

SCANNERS = ("semgrep_scan", "nuclei_scan", "nikto_scan", "subfinder_scan", "sqlmap_scan",
            "ffuf_scan", "gobuster_scan", "wpscan_scan", "httpx_probe", "trivy_scan")


def test_no_scanner_files_its_errors_under_a_key_called_summary():
    for name in SCANNERS:
        src = inspect.getsource(TOOL_REGISTRY[name])
        assert '["summary"] = data.get("errors"' not in src, f"{name} mislabels errors as summary"


def test_no_scanner_swallows_a_parse_failure_into_an_empty_result():
    for name in SCANNERS:
        src = inspect.getsource(TOOL_REGISTRY[name])
        assert not re.search(r"\n\s*except:\s*\n\s*result\[\"findings\"\] = \[\]", src), (
            f"{name} turns a parse failure into an empty finding list")


def test_semgrep_reports_errors_separately_and_fails_loudly():
    src = inspect.getsource(TOOL_REGISTRY["semgrep_scan"])
    assert 'result["errors"] = errors' in src, "semgrep does not report errors separately"
    assert 'result["success"] = False' in src, "semgrep never fails"
    assert "no parseable JSON" in src, "semgrep does not report an unparseable response"
    assert '"errors": len(errors)' in src, "semgrep summary does not count errors"


def test_no_scanner_handler_has_a_bare_except():
    """A bare except is how a failed scan becomes an empty result."""
    import re as _re
    for name in SCANNERS:
        src = inspect.getsource(TOOL_REGISTRY[name])
        assert not _re.search(r"\n\s*except:\s*\n", src), f"{name} still has a bare except clause"


def test_nuclei_counts_malformed_lines_instead_of_swallowing_them():
    src = inspect.getsource(TOOL_REGISTRY["nuclei_scan"])
    assert "malformed" in src, "nuclei does not count malformed output"
    assert 'result["success"] = False' in src, "nuclei never fails"


def test_trivy_does_not_turn_a_parse_failure_into_a_clean_image():
    src = inspect.getsource(TOOL_REGISTRY["trivy_scan"])
    assert "no parseable JSON" in src, "trivy does not report an unparseable response"
    assert 'result["success"] = False' in src, "trivy never fails"
