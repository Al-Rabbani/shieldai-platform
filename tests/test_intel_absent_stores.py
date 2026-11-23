"""Item 37: the intelligence pages whose stores do not exist, and the flag item 36 wrongly said was absent.

Three pages are pinned here: /threat-intelligence/ransomware drew four hardcoded gangs with invented victim counts and
ransoms under a permanent red banner, /threat-intelligence/apt printed "No APT actors tracked yet" over a store that
does not exist, and /threat-intelligence/dark-web printed "● MONITORING" with four zero tiles over three stores that do
not exist. All three now read a route that either measures the thing or refuses it in words.

The fourth assertion set is a correction: item 36's refusal text said the CISA KEV catalogue carries no ransomware flag.
It does - knownRansomwareCampaignUse, 361 of 1,790 entries "Known" in catalogVersion 2026.11.20 - and this suite fails
if that false sentence ever comes back.
"""
import json
import pathlib
import re
import sys

import pytest

REPO = pathlib.Path(__file__).resolve().parents[1]
WEB = REPO / "apps" / "web" / "src"
API = REPO / "apps" / "api"

sys.path.insert(0, str(API))


def read(path: pathlib.Path) -> str:
    return path.read_text()


def strip_comments(text: str) -> str:
    """Assertions about CODE must not trip on prose: item 36 lost a cycle to a comment containing the banned word."""
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"(?m)^\s*//.*$", "", text)


# ----------------------------------------------------------------------------------------------------------------
# Routing: the two-files-one-name trap, pinned. A rewrite of the wrong file changes nothing on screen.
# ----------------------------------------------------------------------------------------------------------------

def test_app_routes_the_files_this_item_rewrote():
    app = read(WEB / "App.jsx")
    expectations = {
        "/threat-intelligence/ransomware": "@/pages/threatintel/RansomwareTrackerPage",
        "/threat-intelligence/apt": "@/pages/threatintel/APTTrackerPage",
        "/threat-intelligence/dark-web": "@/pages/DarkWebIntelPage",
    }
    for route, component in expectations.items():
        import_line = re.search(rf'<Route\s+path="{re.escape(route)}"\s+element=\{{<(\w+)', app)
        assert import_line, f"{route} is not routed"
        name = import_line.group(1)
        assert f"import {name} from '{component}'" in app, f"{route} renders {name}, which is not {component}"


# ----------------------------------------------------------------------------------------------------------------
# The ransomware page: no invented gangs, and the banner that named one is gone.
# ----------------------------------------------------------------------------------------------------------------

def test_ransomware_page_has_no_fallback_groups():
    text = strip_comments(read(WEB / "pages" / "threatintel" / "RansomwareTrackerPage.jsx"))
    for banned in ("FALLBACK_GROUPS", "LockBit", "The Gentlemen", "Qilin", "Akira"):
        assert banned not in text, f"the hardcoded gang {banned!r} is back on the ransomware page"
    # The invented figures that made the fallback look like intelligence.
    for banned in ("47 victims", "2840", "850000", "BreachForums"):
        assert banned not in text, f"invented figure {banned!r} is back"


def test_ransomware_page_reads_the_route_and_states_what_is_not_measured():
    text = read(WEB / "pages" / "threatintel" / "RansomwareTrackerPage.jsx")
    assert "base44.entities.RansomwareGroup.summary()" in text
    assert "not_measured" in text
    assert "unknown, not clean" in text, "an unchecked finding must never be presented as clean"
    # It must not claim monitoring, which nothing here performs.
    assert "MONITORING" not in strip_comments(text)


# ----------------------------------------------------------------------------------------------------------------
# APT and dark web: a refusal, not an empty list dressed as a clean estate.
# ----------------------------------------------------------------------------------------------------------------

def test_apt_page_no_longer_claims_nothing_is_tracked():
    text = strip_comments(read(WEB / "pages" / "threatintel" / "APTTrackerPage.jsx"))
    assert "No APT actors tracked yet" not in text, "an unmeasured absence is stated as a measured one"
    assert "base44.entities.APTActor.summary()" in text
    assert "would_need" in text, "the page must name what would have to exist before an actor could be listed"


def test_dark_web_page_no_longer_claims_monitoring():
    text = strip_comments(read(WEB / "pages" / "DarkWebIntelPage.jsx"))
    for banned in ("MONITORING", "Live Alerts", "Credential Leaks", "Ransomware Mentions"):
        assert banned not in text, f"{banned!r} still presents an unmeasured feed as a live one"
    assert "base44.entities.DarkWebAlert.summary()" in text
    # It must not render a count over an absent collector.
    assert not re.search(r"alerts\.length", text), "a client-side length over an absent feed is not a measurement"


# ----------------------------------------------------------------------------------------------------------------
# The adapter: every one of the three entities now resolves to a real route, read-only.
# ----------------------------------------------------------------------------------------------------------------

def test_adapter_maps_the_three_intel_entities_to_their_routes():
    adapter = read(WEB / "api" / "base44Client.js")
    for entity, path in (
        ("RansomwareGroup", "/intel/ransomware"),
        ("APTActor", "/intel/apt"),
        ("DarkWebAlert", "/intel/dark-web"),
    ):
        pattern = rf"{entity}:\s*\{{\s*path:\s*'{re.escape(path)}'[^}}]*summaryPath:\s*'{re.escape(path)}'[^}}]*readOnly:\s*true"
        assert re.search(pattern, adapter), f"{entity} is not mapped to {path} read-only"


def test_adapter_dark_web_refusal_text_no_longer_claims_no_route():
    adapter = read(WEB / "api" / "base44Client.js")
    assert "Reading dark-web coverage is served from GET /intel/dark-web" in adapter


# ----------------------------------------------------------------------------------------------------------------
# The routes themselves.
# ----------------------------------------------------------------------------------------------------------------

def test_intel_routes_are_registered():
    from gds_api.main import app

    paths = app.openapi()["paths"]
    for path in ("/intel/ransomware", "/intel/apt", "/intel/dark-web"):
        assert path in paths, f"{path} is not registered"


def test_intel_routes_are_gated_on_findings_read():
    text = read(API / "gds_api" / "intel_api.py")
    assert text.count('require_permission("findings:read")') == 3
    # FORCE RLS: an unbound read returns nothing, which would read as "no exposure".
    assert text.count("set_config('gds.tenant_id'") == 3


def test_catalogue_reader_reports_the_ransomware_flag_it_used_to_discard(tmp_path, monkeypatch):
    from gds_api import intel_api

    payload = {
        "catalogVersion": "test",
        "dateReleased": "2026-11-20T00:00:00Z",
        "vulnerabilities": [
            {"cveID": "CVE-1", "knownRansomwareCampaignUse": "Known", "vendorProject": "A", "product": "B",
             "vulnerabilityName": "n", "dateAdded": "2026-01-01", "dueDate": "2026-01-02"},
            {"cveID": "CVE-2", "knownRansomwareCampaignUse": "Unknown"},
        ],
    }
    cache = tmp_path / "kev.json"
    cache.write_text(json.dumps(payload))
    monkeypatch.setattr(intel_api, "KEV_CACHE", cache)
    monkeypatch.setattr(intel_api, "_CACHE", {"at": 0.0, "payload": None})

    result = intel_api._catalogue()
    assert result["available"] is True
    assert result["entries"] == 2
    assert result["known_ransomware_entries"] == 1
    assert result["entries_known"][0]["cveID"] == "CVE-1"


def test_catalogue_reader_states_an_unreadable_cache_instead_of_raising(tmp_path, monkeypatch):
    from gds_api import intel_api

    monkeypatch.setattr(intel_api, "KEV_CACHE", tmp_path / "missing.json")
    monkeypatch.setattr(intel_api, "_CACHE", {"at": 0.0, "payload": None})
    result = intel_api._catalogue()
    assert result["available"] is False
    assert "not readable" in result["reason"]


def test_apt_and_dark_web_refusals_name_what_is_absent():
    from gds_api import intel_api

    assert set(intel_api.APT_NOT_MEASURED) == {"actor_attribution", "campaign_tracking", "ttps", "targeting"}
    assert set(intel_api.NOT_MEASURED) == {
        "leak_site_presence", "victim_counts", "ransom_demands", "gang_attribution", "negotiation_activity"
    }
    # Every refusal has to say why, not just that something is missing.
    for reason in list(intel_api.APT_NOT_MEASURED.values()) + list(intel_api.NOT_MEASURED.values()):
        assert len(reason) > 40


# ----------------------------------------------------------------------------------------------------------------
# Item 36's false claim, pinned against its return.
# ----------------------------------------------------------------------------------------------------------------

def test_cve_route_no_longer_claims_the_catalogue_has_no_ransomware_flag():
    text = read(API / "gds_api" / "cve_api.py")
    assert "carries no ransomware flag" not in text
    assert "knownRansomwareCampaignUse" in text, "the correction must name the field it was wrong about"
    assert "ransomware_known" in text, "the flag the catalogue does carry must reach the row"


def test_cve_route_keeps_three_states_for_the_ransomware_flag():
    text = read(API / "gds_api" / "cve_api.py")
    assert "bool_or(kev_ransomware_use) AS ransomware_known" in text


# ----------------------------------------------------------------------------------------------------------------
# The enricher: the flag is kept at load time and written going forward, or the column rots.
# ----------------------------------------------------------------------------------------------------------------

def test_enricher_keeps_and_writes_the_ransomware_flag():
    text = read(API / "enrich_findings.py")
    assert 'knownRansomwareCampaignUse' in text
    assert '"ransomware": str(v.get("knownRansomwareCampaignUse", "")).lower() == "known"' in text
    assert '"kev_ransomware": bool(entry.get("ransomware")) if cve in kev else False' in text
    assert "kev_ransomware_use = :kev_ransomware" in text


def test_enricher_flags_a_listed_ransomware_cve_and_clears_an_unlisted_one():
    """The pure helper, called directly: listed-and-flagged true, listed-and-unknown false, not-listed false."""
    sys.path.insert(0, str(API))
    import enrich_findings as enricher

    payload = {
        "vulnerabilities": [
            {"cveID": "CVE-RANSOM", "knownRansomwareCampaignUse": "Known", "dateAdded": "2026-01-01"},
            {"cveID": "CVE-PLAIN", "knownRansomwareCampaignUse": "Unknown", "dateAdded": "2026-01-02"},
        ]
    }
    kev = enricher.kev_index(payload)
    rows = [
        {"id": "1", "cve": "CVE-RANSOM", "details": {}},
        {"id": "2", "cve": "CVE-PLAIN", "details": {}},
        {"id": "3", "cve": "CVE-ABSENT", "details": {}},
    ]
    cve_updates, _ = enricher.build_updates(rows, kev, {}, "now", "cache")
    by_cve = {u["cve"]: u for u in cve_updates}
    assert by_cve["CVE-RANSOM"]["kev_ransomware"] is True
    assert by_cve["CVE-PLAIN"]["kev_ransomware"] is False
    assert by_cve["CVE-ABSENT"]["kev_ransomware"] is False


# ----------------------------------------------------------------------------------------------------------------
# The routed consumers of the same absent feed. Found while wiring this item, fixed in it.
# ----------------------------------------------------------------------------------------------------------------

def test_command_center_does_not_count_dark_web_alerts_over_an_absent_collector():
    text = read(WEB / "pages" / "CommandCenter.jsx")
    assert "darkWebAlerts: darkWebAlerts.length" not in text, "a client-side length is being reported as a count"
    assert "darkWebAlerts: null" in text, "the home page must state the absence the way attackPaths and runtimeThreats do"


def test_features_row_renders_an_absent_dark_web_count_as_not_recorded():
    text = read(WEB / "components" / "home" / "SecurityFeaturesRow.jsx")
    assert 'stats.darkWebAlerts == null ? "dark web not recorded"' in text
    assert "`${stats.darkWebAlerts} dark web alerts`" in text, "the measured case must still render its number"


def test_copilot_panel_reads_the_dark_web_refusal_instead_of_inferring_it():
    """Mapping DarkWebAlert made unavailableEntities() stop listing it, which silenced the panel's absence note."""
    text = read(WEB / "components" / "copilot" / "LiveIntelligencePanel.jsx")
    assert 'darkWebCoverage?.available === false' in text
    assert 'unavailableEntities().includes("DarkWebAlert")' not in text, "that condition can no longer be true"
    assert "base44.entities.DarkWebAlert.summary()" in text
