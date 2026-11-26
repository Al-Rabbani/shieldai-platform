"""Nikto has never recorded a real vulnerability, and the sweep must not report a loss as a zero.

MEASURED 26 Nov 2026. Twelve scanner binaries were installed and only three jobs ran unattended, so nine scanners
produced findings only when a mission happened to call one. Building the nightly sweep to make them run exposed four
defects in the same evening:

  * the sweep's target query returned zero rows because the session was unbound, and "no active authorised target" is
    indistinguishable from "no target authorised" (authorized_targets is RLS-bound);
  * nikto's "-Format xml" needs "-output", so the reporter died with "Unable to open '' for write" while the process
    still exited 0 - an errored scan reporting as a clean one;
  * nikto writes <description>, <uri> and <namelink> as XML CHILD ELEMENTS, so reading attributes gave every item an
    empty description and all five findings per host collapsed into one title, "nikto 999100:";
  * the register's entire nikto history - 14 rows - was report metadata ("Target IP:", "Target Port:", "Start Time:")
    and "Uncommon header ... found" observations, which report that a security header IS present.
"""
import pathlib

from gds_api.scanner_persistence import EXTRACTORS, _nmap, _security_headers
from gds_api.tool_gateway import _parse_nikto_xml

NIKTO_XML = """<?xml version="1.0" encoding="UTF-8"?>
<niktoscan>
 <scandetails>
  <item id="999957"><description>Target IP: 2.24.141.108</description></item>
  <item id="999958"><description>Target Hostname: www.example.com</description></item>
  <item id="999960"><description>Start Time: 2026-11-26 10:45:00 (GMT0)</description></item>
  <item id="999100"><description>Uncommon header 'strict-transport-security' found, with contents: max-age=1</description></item>
  <item id="000123"><description>Server leaks inodes via ETags</description><uri>/index.html</uri></item>
  <item id="000456"><description>/.git/ directory found in use</description><uri>/.git/</uri></item>
 </scandetails>
</niktoscan>
"""


def test_a_real_nikto_finding_survives_with_its_child_element_description():
    findings = _parse_nikto_xml(NIKTO_XML)
    titles = [f["description"] for f in findings]
    assert "Server leaks inodes via ETags" in titles
    assert "/.git/ directory found in use" in titles
    # the uri is a child element too; reading only attributes left it empty
    assert [f["uri"] for f in findings if f["id"] == "000123"] == ["/index.html"]


def test_nikto_report_metadata_is_not_a_finding():
    findings = _parse_nikto_xml(NIKTO_XML)
    descriptions = " ".join(f["description"] for f in findings)
    for metadata in ("Target IP:", "Target Hostname:", "Start Time:"):
        assert metadata not in descriptions, f"{metadata} is nikto's own report header, not a weakness"


def test_a_security_header_that_exists_is_not_a_finding():
    # nikto reports "Uncommon header 'x' found" for every header that IS set. Five per host were recorded as info
    # findings saying a hardened estate was unusual for having HSTS, CSP and XFO.
    findings = _parse_nikto_xml(NIKTO_XML)
    assert not any("Uncommon header" in f["description"] for f in findings)


def test_an_unparsable_report_yields_nothing_rather_than_a_guess():
    assert _parse_nikto_xml("") == []
    assert _parse_nikto_xml("not xml at all") == []


def test_every_tool_the_sweep_runs_can_persist_what_it_finds():
    # nmap and the headers check had no extractor at all, so both reported "nothing was written" after finding things.
    for tool in ("nuclei_scan", "nikto_scan", "nmap_scan", "port_inventory_scan",
                 "security_headers_check", "check_url_security_headers"):
        assert tool in EXTRACTORS, f"{tool} is run by the sweep but has no extractor"


def test_an_open_port_is_recorded_as_info_not_as_a_vulnerability():
    finding = _nmap({"port": 443, "service": "https", "version": "nginx"}, "www.example.com")
    assert finding["severity"] == "info"
    assert "443" in finding["title"]


def test_a_missing_header_names_the_header():
    finding = _security_headers({"header": "content-security-policy", "score": "4/5"}, "https://www.example.com")
    assert "content-security-policy" in finding["title"]
    assert finding["severity"] == "low"


def test_the_sweep_only_scans_targets_that_are_authorised_and_in_window():
    # Search the whole target-reading function: the SQL is assembled from implicitly concatenated string literals, so
    # slicing at the first ")" cut the clause in half and the assertion failed on a query that was correct.
    source = pathlib.Path("apps/api/run_estate_sweep.py").read_text()
    start = source.index("async def _targets(db)")
    end = source.index("async def ", start + 10)
    function = source[start:end]
    assert "FROM authorized_targets" in function
    assert "status = 'active'" in function
    assert "valid_until IS NULL OR valid_until >= now()" in function


def test_the_sweep_binds_the_tenant_before_it_reads_targets():
    # An unbound session reads ZERO rows from authorized_targets, and that reads as "nothing authorised".
    source = pathlib.Path("apps/api/run_estate_sweep.py").read_text()
    body = source[source.index("async with async_session_factory() as db:"):]
    bind_at = body.index("await _bind(db, TENANT)")
    read_at = body.index("await _targets(db)")
    assert bind_at < read_at
