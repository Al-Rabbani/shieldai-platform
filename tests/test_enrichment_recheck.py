"""Enrichment must re-check, or a frozen answer silently becomes a wrong one.

Measured 21 Nov 2026: all 849 open findings read kev_listed = false, and the job that produces that column selected its
work with `AND (cve IS NULL OR epss IS NULL OR kev_listed IS NULL)`. The first run wrote false into every row, and false
is not NULL, so from then on the predicate matched nothing it had already touched. The log proves the decay: 500 rows
examined, then 161, then 38, and the last run examined 38 rows of which none carried a CVE, so nothing was enriched at
all while the cron kept exiting 0 every twelve hours.

The consequence is not cosmetic. CISA republishes KEV daily (2026.11.20, 1,790 entries) and EPSS is rescored daily, so
a finding marked "not exploited" in November can be exploited in December and this platform would never look again.

These tests pin the properties that make the column evidence rather than a guess: the job selects by staleness, it
stamps when it checked, and the KEV dates the feed publishes are kept instead of discarded. One of them guards a defect
that only a live run could reveal - asyncpg refuses an ISO string for a date column - so the mapping is asserted to
produce real date objects, not the strings the feed sends.
"""
from __future__ import annotations

import datetime
import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

SRC = (ROOT / "apps" / "api" / "enrich_findings.py").read_text(encoding="utf-8")


def _code(text: str) -> str:
    """The module with its docstring and comments removed.

    This file's own docstring QUOTES the old predicate to record the defect it fixed, so an assertion on raw text can
    never pass. Assertions about what the job would execute must run on code.
    """
    text = re.sub(r'\A\s*""".*?"""', "", text, flags=re.S)
    return re.sub(r"(?m)^\s*#.*$", "", text)


CODE = _code(SRC)


def _load():
    spec = importlib.util.spec_from_file_location("enrich_probe", ROOT / "apps" / "api" / "enrich_findings.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


enrich = _load()

# The real shape of a KEV entry, trimmed to the fields the loader keeps.
KEV_PAYLOAD = {
    "catalogVersion": "2026.11.20",
    "vulnerabilities": [
        {
            "cveID": "CVE-2021-44228",
            "vendorProject": "Apache",
            "product": "Log4j2",
            "vulnerabilityName": "Apache Log4j2 Remote Code Execution Vulnerability",
            "dateAdded": "2021-12-10",
            "dueDate": "2021-12-24",
        },
        {
            "cveID": "cve-2023-0001",
            "vendorProject": "Example",
            "product": "Widget",
            "vulnerabilityName": "Example flaw",
            "dateAdded": "2023-01-05",
            "dueDate": "2023-01-26",
        },
    ],
}


# ------------------------------------------------------------------ the selection looks at age, not emptiness
def test_selection_is_by_staleness_not_by_null():
    """The regression this whole change exists for: selecting only NULLs converged to a permanent no-op."""
    assert "enrichment_checked_at IS NULL" in SRC
    assert "enrichment_checked_at < now() - make_interval(hours => :age)" in SRC
    # Target the WORK SELECTION, not the word. The run summary legitimately counts rows where kev_listed is still NULL
    # (`COUNT(*) FILTER (WHERE kev_listed IS NULL) AS kev_null`); that is a report, not a predicate deciding what gets
    # examined. Banning the string outright made this test fail on a correct module.
    selection = re.search(r"SELECT id, title, details, cve, cvss FROM security_findings.*?LIMIT :n", CODE, re.S)
    assert selection, "the work-selection statement is not recognisable; fix this test before trusting it"
    assert "kev_listed" not in selection.group(0), (
        "the old predicate is back in the selection: a row that already holds false would never be re-examined"
    )


def test_the_old_predicate_is_gone_as_a_whole():
    # The phrase survives in the module docstring, which records the defect it fixed. What must not survive is the
    # predicate itself, in a form the job would execute.
    assert "AND (cve IS NULL OR epss IS NULL OR kev_listed IS NULL)" not in CODE
    assert "WHERE (cve IS NULL OR epss IS NULL OR kev_listed IS NULL)" not in CODE


def test_a_job_with_nothing_stale_says_so_and_stops():
    """A maintenance job that reports success while doing nothing is the defect, so the no-work path is explicit."""
    assert "nothing to re-check" in SRC
    assert SRC.index("nothing to re-check") < SRC.index("UPDATE security_findings SET cve = :cve")


def test_the_staleness_window_matches_the_cron_cadence():
    assert 'default=12' in SRC, "the default window must equal the 12-hourly schedule or runs will overlap"
    assert '--max-age-hours' in SRC


# ------------------------------------------------------------------ the answer carries its timestamp
def test_every_write_stamps_when_it_checked():
    assert SRC.count("enrichment_checked_at = now()") >= 2, (
        "both the CVE path and the no-CVE path must stamp the check, or unchecked rows look checked"
    )


def test_the_kev_dates_the_feed_publishes_are_kept():
    index = enrich.kev_index(KEV_PAYLOAD)
    assert index["CVE-2021-44228"]["date_added"] == "2021-12-10"
    assert index["CVE-2021-44228"]["due_date"] == "2021-12-24"
    assert index["CVE-2021-44228"]["vendor"] == "Apache"


def test_kev_ids_still_returns_a_set_of_upper_cased_ids():
    """Existing contract, kept because callers only need membership."""
    assert enrich.kev_ids(KEV_PAYLOAD) == {"CVE-2021-44228", "CVE-2023-0001"}


# ------------------------------------------------------------------ dates, not strings (the live-only defect)
def test_as_date_returns_date_objects():
    """asyncpg raised "str object has no attribute toordinal" on the ISO string the feed sends. A unit test on the
    mapping alone looked correct; only the real database refused it."""
    assert enrich.as_date("2021-12-10") == datetime.date(2021, 12, 10)
    assert enrich.as_date("2021-12-10T00:00:00Z") == datetime.date(2021, 12, 10)
    assert enrich.as_date(datetime.date(2021, 12, 10)) == datetime.date(2021, 12, 10)
    assert enrich.as_date(None) is None
    assert enrich.as_date("") is None
    assert enrich.as_date("not-a-date") is None


def test_build_updates_produces_real_dates_for_a_listed_cve():
    rows = [{"id": 1, "title": "t", "details": {"cve": "CVE-2021-44228"}, "cve": None, "cvss": None}]
    cve_updates, no_cve_updates = enrich.build_updates(rows, enrich.kev_index(KEV_PAYLOAD), {}, "now", "download")
    assert not no_cve_updates
    u = cve_updates[0]
    assert u["kev"] is True
    assert u["kev_date_added"] == datetime.date(2021, 12, 10)
    assert u["kev_due_date"] == datetime.date(2021, 12, 24)
    assert isinstance(u["kev_date_added"], datetime.date), "a string here is a DataError against the real column"


# ------------------------------------------------------------------ the three outcomes are distinct
def test_a_cve_absent_from_kev_is_false_with_no_dates():
    rows = [{"id": 2, "title": "t", "details": {"cve": "CVE-2026-99999"}, "cve": None, "cvss": None}]
    cve_updates, _ = enrich.build_updates(rows, enrich.kev_index(KEV_PAYLOAD), {}, "now", "cache")
    u = cve_updates[0]
    assert u["kev"] is False
    assert u["kev_date_added"] is None and u["kev_due_date"] is None


def test_a_finding_with_no_cve_is_stamped_without_a_kev_claim():
    rows = [{"id": 3, "title": "no advisory id here", "details": {}, "cve": None, "cvss": None}]
    cve_updates, no_cve_updates = enrich.build_updates(rows, {}, {}, "now", "cache")
    assert not cve_updates
    assert no_cve_updates[0]["id"] == 3
    assert "kev" not in no_cve_updates[0], "a row with no CVE must not assert anything about KEV"
    assert "no_cve_in_finding" in no_cve_updates[0]["raw"]


def test_an_unknown_epss_stays_null_rather_than_zero():
    """A CVE the EPSS feed does not know is unknown, not safe."""
    rows = [{"id": 4, "title": "t", "details": {"cve": "CVE-2026-11111"}, "cve": None, "cvss": None}]
    cve_updates, _ = enrich.build_updates(rows, {}, {}, "now", "cache")
    assert cve_updates[0]["epss"] is None
    assert '"epss_known": false' in cve_updates[0]["raw"]


# ------------------------------------------------------------------ where the CVE comes from
def test_the_stored_cve_column_is_used_when_details_do_not_carry_it():
    """An earlier run may have resolved an alias that the scanner never spelled out in details."""
    rows = [{"id": 5, "title": "trivy finding", "details": {}, "cve": "cve-2020-1234", "cvss": 7.5}]
    cve_updates, _ = enrich.build_updates(rows, {}, {}, "now", "cache")
    assert cve_updates[0]["cve"] == "CVE-2020-1234"


def test_details_win_over_the_stored_column():
    rows = [{"id": 6, "title": "t", "details": {"cve": "CVE-2024-0001"}, "cve": "CVE-2024-0002", "cvss": None}]
    assert enrich.resolve_cve(rows[0]) == "CVE-2024-0001"


def test_a_cve_only_in_the_title_is_still_found():
    rows = [{"id": 7, "title": "CVE-2019-0708 in rdp", "details": {}, "cve": None, "cvss": None}]
    assert enrich.resolve_cve(rows[0]) == "CVE-2019-0708"


# ------------------------------------------------------------------ a no-CVE note is not clobbered
def test_the_no_cve_update_preserves_an_existing_note():
    """enrich_package_findings.py writes the alias list and CVSS vector there; a re-check must not flatten it."""
    assert "? 'no_cve' THEN raw_data" in SRC
