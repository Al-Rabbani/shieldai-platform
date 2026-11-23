"""Item 36: the CVE Exploitation Tracker reads a real register, and its unmeasured dimensions are named.

Before this item the routed page read `base44.entities.CVERecord` over a store that does not exist, so it printed
"No CVE records match this filter" while the register held 451 distinct CVEs across 899 findings. Two of its panels
also printed facts nothing measures: a "Used by ransomware: 0" tile and an exploit-maturity badge.
"""
import asyncio
import pathlib
import re
from types import SimpleNamespace

ROOT = pathlib.Path(__file__).resolve().parents[1]
WEB = ROOT / "apps" / "web" / "src"
API = ROOT / "apps" / "api" / "gds_api"

PAGE = WEB / "pages" / "cve" / "CVEExploitTrackerPage.jsx"
PANEL = WEB / "components" / "cve" / "CVEImpactPanel.jsx"
VIEW = WEB / "components" / "cve" / "ActiveExploitationView.jsx"


def strip_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"(?m)^\s*//.*$", "", text)


def _module() -> str:
    return (API / "cve_api.py").read_text(encoding="utf-8")


# ------------------------------------------------------------------------------------------------------------------
# The route


def test_the_route_exists_is_registered_and_gated():
    module = _module()
    assert '@router.get("/records")' in module
    assert 'require_permission("findings:read")' in module
    # security_findings is FORCE RLS, so an unbound read returns nothing and would read as an empty register.
    assert "set_config('gds.tenant_id', :tid, true)" in module
    main = (API / "main.py").read_text(encoding="utf-8")
    assert "cve_api," in main
    assert "app.include_router(cve_api.router)" in main


def test_the_aggregation_keeps_an_unchecked_kev_unknown():
    """bool_or ignores NULLs but returns NULL when every row is NULL: unchecked must not become 'not listed'."""
    module = _module()
    assert "bool_or(kev_listed) AS kev_listed" in module
    assert "kev_listed IS FALSE" in module, "the not-in-KEV filter must exclude unchecked CVEs"
    assert 'where.append("kev_listed IS TRUE")' in module


def test_the_aggregation_takes_the_worst_row_not_the_first():
    module = _module()
    assert "max(cvss) AS cvss" in module
    assert "max(epss) AS epss" in module
    assert "count(DISTINCT target)" in module
    assert "GROUP BY cve" in module
    # The severity is chosen by rank, not by row order, so a medium row cannot mask a critical one.
    assert "_SEVERITY_RANK" in module and "WHEN 'critical' THEN 4" in module


def test_unmeasured_dimensions_are_named_not_scored():
    module = _module()
    for key in ("exploit_maturity", "ransomware_use", "public_exploit_count"):
        assert key in module, key
    assert "NOT_MEASURED" in module
    assert '"not_measured": NOT_MEASURED' in module


# ------------------------------------------------------------------------------------------------------------------
# The payload, exercised


class _Result:
    def __init__(self, rows=None, one=None, scalar=None):
        self._rows = rows or []
        self._one = one
        self._scalar = scalar

    def mappings(self):
        return self

    def all(self):
        return self._rows

    def one(self):
        return self._one

    def scalar(self):
        return self._scalar


class _FakeDb:
    """Answers the three statements the route runs, keyed on the SQL text they carry."""

    def __init__(self):
        self.statements = []
        self._row = {
            "cve_id": "CVE-2026-45447",
            "title": "Prototype pollution in qdrant client",
            "description": "The client merges attacker-controlled keys.",
            "severity": "critical",
            "cvss": 9.8,
            "epss": 0.42,
            "kev_listed": None,  # never checked against the catalogue
            "kev_date_added": None,
            "kev_due_date": None,
            # Item 37 added this to the aggregate; None here because kev_listed is None (never checked).
            "ransomware_known": None,
            "finding_count": 13,
            "open_count": 13,
            "closed_count": 0,
            "asset_count": 2,
            "assets": ["qdrant:1.9.0", "qdrant:1.7.4"],
            "scanners": ["trivy_container"],
            "first_detected": None,
            "last_detected": None,
            "package_name": "qdrant-client",
        }
        self._counts = {
            "distinct_cves": 451,
            "findings_with_cve": 899,
            "open_findings": 814,
            "closed_findings": 85,
            "kev_cves": 0,
            "kev_checked_absent": 901,
            "kev_unknown": 101,
            "assets_with_cve": 145,
            "high_epss_cves": 2,
            "critical_cves": 0,
            "high_cves": 330,
            "ransomware_cves": 0,
            "ransomware_checked_cves": 451,
            "last_enriched": None,
        }

    async def execute(self, statement, params=None):
        sql = str(statement)
        self.statements.append(sql)
        if "set_config" in sql:
            return _Result()
        if "count(DISTINCT cve)" in sql:
            return _Result(one=self._counts)
        if sql.startswith("SELECT count(*) FROM ("):
            return _Result(scalar=1)
        return _Result(rows=[self._row])


def _call(db, **kwargs):
    from gds_api.cve_api import cve_records

    user = SimpleNamespace(tenant_id="2ec10dd0-e48e-4043-8c88-5998ba5e23b0", user_id="u1")
    return asyncio.run(cve_records(db=db, current_user=user, **kwargs))


def test_an_unchecked_cve_returns_null_not_false():
    payload = _call(_FakeDb())
    item = payload["items"][0]
    assert item["kev_listed"] is None, "NULL means unknown; False would be a claim the catalogue was checked"
    assert item["exploit_maturity"] is None
    assert item["ransomware_use"] is None
    assert item["public_exploit_count"] is None


def test_the_item_carries_the_register_facts_the_page_renders():
    payload = _call(_FakeDb())
    item = payload["items"][0]
    assert item["id"] == item["cve_id"] == "CVE-2026-45447"
    assert item["cvss_score"] == 9.8 and item["epss_score"] == 0.42
    assert item["finding_count"] == 13 and item["open_count"] == 13
    assert item["asset_count"] == 2 and item["assets"] == ["qdrant:1.9.0", "qdrant:1.7.4"]
    assert item["scanners"] == ["trivy_container"]
    assert item["package_name"] == "qdrant-client"
    assert item["nvd_url"] == "https://nvd.nist.gov/vuln/detail/CVE-2026-45447"
    # last_updated is what the page sorts on; it must come from the newest detection, never be invented.
    assert item["last_updated"] == item["last_detected"]


def test_the_register_totals_come_from_the_aggregate_not_the_page():
    payload = _call(_FakeDb())
    counts = payload["counts"]
    assert counts["distinct_cves"] == 451
    assert counts["findings_with_cve"] == 899
    assert counts["kev_cves"] == 0 and counts["kev_unknown"] == 101
    assert counts["returned"] == 1
    # A filtered page must not print the register total beside a filtered list.
    assert counts["matched"] == 1
    assert "basis" in payload and payload["basis"]["kev"].startswith("KEV flags come from the CISA")


def test_the_tenant_is_bound_before_any_read():
    db = _FakeDb()
    _call(db)
    assert "set_config" in db.statements[0], "the first statement must bind gds.tenant_id"


# ------------------------------------------------------------------------------------------------------------------
# The adapter and the page


def test_the_adapter_serves_the_register_and_refuses_writes():
    adapter = (WEB / "api" / "base44Client.js").read_text(encoding="utf-8")
    assert "CVERecord: { path: '/cve/records', summaryPath: '/cve/records?limit=1' }" in adapter
    assert "  CVERecord:\n" in adapter, "a write must be refused with a reason, not silently accepted"


def test_the_page_under_test_is_the_one_app_jsx_routes():
    app = (WEB / "App.jsx").read_text(encoding="utf-8")
    assert "from '@/pages/cve/CVEExploitTrackerPage'" in app


def test_the_page_reads_the_register_and_its_totals():
    text = strip_comments(PAGE.read_text(encoding="utf-8"))
    assert "base44.entities.CVERecord.list(" in text
    assert "base44.entities.CVERecord.summary()" in text
    assert "counts.distinct_cves" in text
    assert "counts.matched" in text
    # The old join against a second entity is gone: each row carries its own assets.
    assert "TriagedFinding" not in text


def test_the_page_offers_only_filters_it_can_answer():
    text = strip_comments(PAGE.read_text(encoding="utf-8"))
    assert 'label: "Weaponized"' not in text, "no exploit-maturity source exists, so this filter could only return nothing"
    assert 'label: "Touches my assets"' not in text, "every row is derived from a finding on an asset, so it selected all"
    assert 'label: "CISA KEV"' in text and 'label: "EPSS ≥ 10%"' in text


def test_no_component_prints_a_ransomware_or_maturity_claim():
    for path in (PAGE, PANEL, VIEW):
        text = strip_comments(path.read_text(encoding="utf-8"))
        assert "MATURITY[" not in text, f"{path.name} still maps exploit maturity to a badge"
        assert 'label: "Used by ransomware"' not in text, f"{path.name} still prints a ransomware count"
        assert "ransomware_use) score" not in text, f"{path.name} still scores ransomware use"
    # Item 36 required the ransomware ABSENCE to be stated here. Item 37 measured the flag (CISA KEV
    # knownRansomwareCampaignUse -> kev_ransomware_use), so the requirement inverted: read it, never score it.
    view = strip_comments(VIEW.read_text(encoding="utf-8"))
    panel = strip_comments(PANEL.read_text(encoding="utf-8"))
    assert "Ransomware association is not recorded" not in view, "the flag is measured; this sentence is now false"
    assert "counts.ransomware_cves" in view and "notMeasured.ransomware_leak_sites" in view
    assert "ransomware_known" in panel, "the panel must render the three-state flag"


def test_every_icon_used_is_imported_in_the_file_that_uses_it():
    """An undefined JSX identifier blanks the whole app and no build catches it."""
    for path in (PAGE, PANEL, VIEW):
        text = path.read_text(encoding="utf-8")
        imported = set()
        for line in re.findall(r'import\s*\{([^}]+)\}\s*from\s*"lucide-react"', text):
            imported.update(part.strip() for part in line.split(",") if part.strip())
        used = set(re.findall(r"<([A-Z][A-Za-z0-9]*)\s*(?:size=|className=|style=|/>)", text))
        used.update(re.findall(r"icon:\s*([A-Z][A-Za-z0-9]*)", text))
        # `({ icon: Icon })` destructures the tile's icon into a local name; that is an alias, not a component reference.
        aliases = set(re.findall(r"\{\s*icon:\s*([A-Z][A-Za-z0-9]*)", text))
        missing = {name for name in used if name not in imported} - {"React"} - aliases
        assert not missing, f"{path.name} uses unimported icon(s): {sorted(missing)}"


# ---------------------------------------------------------------- item 37: the flag is measured, so carry it
def test_the_register_counts_the_ransomware_flag_over_its_own_cves():
    """0 is a measurement here, not a placeholder: the catalogue flags 361 entries and none is in this register."""
    payload = _call(_FakeDb())
    assert payload["counts"]["ransomware_cves"] == 0
    assert payload["counts"]["ransomware_checked_cves"] == 451
    assert payload["basis"]["ransomware_flag"].startswith("ransomware_known comes from CISA KEV")


def test_a_row_carries_the_three_state_flag_and_the_legacy_key_agrees():
    item = _call(_FakeDb())["items"][0]
    assert item["ransomware_known"] is None, "the fixture row was never checked, so unknown must stay None"
    assert item["ransomware_use"] == item["ransomware_known"], "the legacy key must not disagree with the measured one"


def test_ransomware_is_no_longer_listed_as_unmeasured():
    """It sat under a NOT_MEASURED heading while being measured, which is the same class of lie it replaced."""
    from gds_api import cve_api

    assert "ransomware_use" not in cve_api.NOT_MEASURED
    assert "ransomware_leak_sites" in cve_api.NOT_MEASURED, "what is still unmeasured must stay named"
