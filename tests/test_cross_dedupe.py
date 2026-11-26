"""Two tools looking at one server must not double the register.

MEASURED 26 Nov 2026, from the first sweep that ran both content-discovery tools: ffuf and gobuster recorded SEVEN
facts FOURTEEN times. ffuf titled a hit "discovered path https://host/api (301)" and gobuster titled the same hit
"discovered path /api (301)", and the writer dedupes on tenant+scanner+title+target, so the two could never agree on
anything. Which tool found a path is not a different fact about the server.
"""
import pathlib

from gds_api.scanner_persistence import DISCOVERY_TOOLS, _ffuf, _gobuster, _path_of

SOURCE = pathlib.Path("apps/api/gds_api/scanner_persistence.py").read_text()
TARGET = "https://app.example.io"


def test_both_discovery_tools_produce_the_same_finding_for_the_same_path():
    ffuf = _ffuf({"url": f"{TARGET}/api", "status": 301, "length": 700}, TARGET)
    gob = _gobuster({"path": "/api", "status": 301, "size": 700}, TARGET)
    assert ffuf["title"] == gob["title"] == "discovered path /api (301)"
    assert ffuf["target"] == gob["target"] == TARGET


def test_a_path_is_normalised_from_a_url_or_a_bare_path():
    assert _path_of(f"{TARGET}/v2/client_configs", TARGET) == "/v2/client_configs"
    assert _path_of("/v2/client_configs", TARGET) == "/v2/client_configs"
    assert _path_of("health", TARGET) == "/health"
    assert _path_of(TARGET, TARGET) == "/"
    assert _path_of("", TARGET) == "/"


def test_the_writer_dedupes_across_the_discovery_tools_not_within_one():
    assert DISCOVERY_TOOLS == ("ffuf_scan", "gobuster_scan")
    # the lookup must span both scanners; a per-scanner lookup cannot see the other tool's row
    assert "scanner IN ('ffuf', 'gobuster')" in SOURCE
    assert "cross_scanner_duplicates" in SOURCE
    assert "every path was already recorded by another discovery tool" in SOURCE


def test_a_discovery_path_keeps_the_path_in_the_evidence():
    finding = _gobuster({"path": "/health/live", "status": 200, "size": 12}, TARGET)
    assert finding["raw"]["path"] == "/health/live"
    assert "/health/live" in finding["description"]
