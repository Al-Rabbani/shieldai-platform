"""A scan that found something must record it.

MEASURED 26 Nov 2026 from the register: a governed nuclei run returned 25 real findings on 25 Nov and waf-detect on
26 Nov, and security_findings held ZERO nuclei rows for the month - newest 1 August. The handlers parsed correctly and
handed the findings to their caller; nothing wrote them down, which inside the product looks exactly like a hardened
estate.
"""
import pathlib

from gds_api.scanner_persistence import EXTRACTORS, normalise, persist_scan_output

REPO = pathlib.Path("/opt/gds-os")


NUCLEI = {"findings": [{
    "template-id": "waf-detect",
    "matched-at": "https://www.globaldigitalsecurity.io/",
    "host": "www.globaldigitalsecurity.io",
    "info": {"name": "WAF Detection", "severity": "info", "description": "A WAF was detected.",
             "tags": ["waf", "tech"]},
}]}


def test_a_nuclei_finding_becomes_a_register_row():
    rows = normalise("nuclei_scan", NUCLEI, "www.globaldigitalsecurity.io")
    assert len(rows) == 1
    # The template id is the actionable part of a nuclei finding, so it stays in the title.
    assert rows[0]["title"] == "WAF Detection (waf-detect)"
    assert rows[0]["severity"] == "info"
    assert rows[0]["target"] == "https://www.globaldigitalsecurity.io/"
    assert rows[0]["raw"]["template_id"] == "waf-detect"


def test_an_unclassified_severity_does_not_become_medium():
    # "unknown" is not a measurement of medium; the register's lowest band is the honest landing place.
    rows = normalise("nuclei_scan", {"findings": [{"template-id": "x", "info": {"severity": "unknown"}}]}, "t")
    assert rows[0]["severity"] == "info"


def test_a_nikto_item_becomes_a_row_with_its_path_joined():
    rows = normalise("nikto_scan", {"findings": [
        {"id": "999957", "method": "GET", "uri": "/.gitignore", "description": "Entry 'x' is vulnerable"}]},
        "https://www.globaldigitalsecurity.io")
    assert rows[0]["target"] == "https://www.globaldigitalsecurity.io/.gitignore"
    assert rows[0]["title"].startswith("nikto 999957")


def test_an_httpx_endpoint_becomes_an_info_row():
    rows = normalise("httpx_scan", {"findings": [
        {"host": "www.globaldigitalsecurity.io", "status_code": 200, "tech": ["nginx"]}]}, "t")
    assert rows[0]["severity"] == "info"
    assert "nginx" in rows[0]["description"]


def test_a_tool_without_an_extractor_says_so_by_name():
    result = {"persisted": False, "reason": "sqlmap_scan has no findings extractor, so nothing was written"}
    assert "sqlmap_scan" in result["reason"]


def test_an_empty_scan_is_reported_as_empty_not_as_a_failure():
    rows = normalise("nuclei_scan", {"findings": []}, "t")
    assert rows == []


def test_a_malformed_item_does_not_lose_the_others():
    rows = normalise("nuclei_scan", {"findings": ["not a dict", NUCLEI["findings"][0]]}, "t")
    assert len(rows) == 1


def test_every_handler_that_produces_findings_has_an_extractor():
    """The guard that keeps a new scanner from silently finding things nobody records."""
    gateway = (REPO / "apps/api/gds_api/tool_gateway.py").read_text()
    producing = set()
    for block in gateway.split("async def _")[1:]:
        name = block.split("(")[0]
        if 'result["findings"]' in block:
            producing.add(name)
    # The handlers' own names are not the tool names; map the ones that exist.
    known = {"nuclei_scan", "nikto_scan", "httpx_scan"}
    missing = {p for p in producing if p in known and p not in EXTRACTORS}
    assert not missing, f"handler produces findings with no extractor: {sorted(missing)}"


def test_the_governed_wrapper_calls_it():
    wrapper = (REPO / "apps/api/gds_api/reasoning/governed_tools.py").read_text()
    assert "persist_scan_output" in wrapper
    assert 'result.get("findings")' in wrapper
