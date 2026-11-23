"""Item 31: the threat intel feed is derived from the register, and its absences are named.

These pin the parts that were fabricated before: the page asserted 15,847 IOCs and 47 zero-days from a hardcoded object,
offered seven feed types of which two have a source, and fetched a function that does not exist.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
WEB = ROOT / "apps" / "web" / "src"
API = ROOT / "apps" / "api" / "gds_api"
ROUTED = WEB / "pages" / "platform" / "defensive" / "ThreatIntelPage.jsx"


def strip_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"(?m)^\s*//.*$", "", text)


def test_the_feed_route_exists_and_is_registered():
    module = (API / "threat_intel_api.py").read_text(encoding="utf-8")
    assert '@router.get("/feed")' in module
    main = (API / "main.py").read_text(encoding="utf-8")
    assert "threat_intel_api," in main
    assert "app.include_router(threat_intel_api.router)" in main


def test_feed_types_are_only_the_two_with_a_source():
    module = (API / "threat_intel_api.py").read_text(encoding="utf-8")
    assert "CASE WHEN kev_listed IS TRUE THEN 'KEV' ELSE 'CVE' END" in module
    for absent in ("Advisory", "Malware", "Ransomware", "APT", "DarkWeb"):
        assert absent in module, f"{absent} must be named as having no source"


def test_an_unavailable_feed_type_is_refused_not_returned_empty():
    module = (API / "threat_intel_api.py").read_text(encoding="utf-8")
    assert 'if feed_type and feed_type not in ("CVE", "KEV"):' in module
    assert '"unavailable": {feed_type: reason}' in module


def test_the_adapter_serves_the_feed_and_names_the_dark_web_absence():
    adapter = (WEB / "api" / "base44Client.js").read_text(encoding="utf-8")
    assert "ThreatIntelFeed: { path: '/threat-intel/feed'" in adapter
    assert "DarkWebAlert:" in adapter
    assert "Reading dark-web coverage is served from GET /intel/dark-web" in adapter  # item 37 replaced the sentence


def test_the_routed_page_does_not_carry_the_invented_numbers():
    """App.jsx imports this file. The unrouted twin at pages/ThreatIntelPage.jsx is not what the route renders."""
    app = (WEB / "App.jsx").read_text(encoding="utf-8")
    assert "from '@/pages/platform/defensive/ThreatIntelPage'" in app
    text = strip_comments(ROUTED.read_text(encoding="utf-8"))
    for invented in ("15,847", "CANONICAL_THREAT", "shieldThreatIntel", "zero_day", "typosquat"):
        assert invented not in text, invented


def test_the_routed_page_reads_the_feed_and_its_counts():
    text = ROUTED.read_text(encoding="utf-8")
    assert "base44.entities.ThreatIntelFeed.list(" in text
    assert "base44.entities.ThreatIntelFeed.summary()" in text
    assert "counts.total" in text


def test_the_routed_page_no_longer_calls_the_refused_orchestrator():
    text = ROUTED.read_text(encoding="utf-8")
    assert "useAgentPage" not in strip_comments(text)
