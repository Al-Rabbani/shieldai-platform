"""An advisory that resolves to a CVE must write it, because nobody else can discover it.

Measured 21 Nov 2026: three open findings carried GHSA ids whose OSV records name a CVE alias (GHSA-c8m5-c952-6cm4 ->
CVE-2026-123609, GHSA-4w2j-m93h-cj5j -> CVE-2026-25800, GHSA-2mjx-qc3c-rqvc -> CVE-2026-123613). The alias resolver
queried OSV, printed "has CVE ... - leave for the CVE enricher", and threw the answer away with a bare `continue`.

The reasoning in that branch was true but incomplete: the CVE-keyed enricher does own EPSS and KEV, but only for CVEs
somebody has already written down. These three had no CVE in details, in the title, or in the cve column - the resolver
was the only component that knew, so "leave it for the enricher" meant it would never be enriched at all. The findings
sat with cve NULL and no EPSS or KEV answer while the answer had been fetched and discarded.

Same failure class as the reaper that reported "cancelled 0 mission(s)" and the enricher that re-queried only empty
values: a component that holds the answer and declines to record it, while reporting success.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = (ROOT / "scripts" / "ops" / "enrich_package_findings.py").read_text(encoding="utf-8")


def _load():
    spec = importlib.util.spec_from_file_location(
        "package_enrich_probe", ROOT / "scripts" / "ops" / "enrich_package_findings.py"
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules["package_enrich_probe"] = module
    spec.loader.exec_module(module)
    return module


enrich = _load()


# ------------------------------------------------------------------ the decision itself
def test_a_resolved_cve_is_written_not_deferred():
    assert enrich.write_action({"cves": ["CVE-2026-123609"]}) == "cve"


def test_an_advisory_with_no_cve_is_recorded_as_such():
    assert enrich.write_action({"cves": []}) == "no_cve"
    assert enrich.write_action({}) == "no_cve"


# ------------------------------------------------------------------ the write that follows it
def test_the_cve_branch_writes_the_column_and_clears_the_stamp():
    """Writing the CVE is only half of it: the row must also be marked as needing enrichment again, or EPSS and KEV
    wait up to twelve hours for the staleness window to come round."""
    start = SRC.index('if write_action(p) == "cve":')
    end = SRC.index("continue\n", start)  # the statement, not the word quoted in the comment above it
    branch = SRC[start:end]
    assert "cve = $1::text" in branch, "the resolved CVE must reach the column"
    assert "enrichment_checked_at = NULL" in branch, "a newly known CVE must be enriched on the next pass"
    assert "'cve_alias'" in branch, "the record must say where the CVE came from"


def test_the_old_deferral_is_gone():
    assert "leave for the CVE enricher" not in SRC
    assert "a CVE exists; the CVE-keyed enricher owns EPSS and KEV" not in SRC, (
        "that comment described the defect: the enricher cannot own a CVE nobody wrote down"
    )


def test_the_run_reports_what_it_resolved():
    assert "resolved {sum(1 for p in plan if p['cves'])} to a CVE" in SRC, (
        "a resolver that silently drops its answers cannot be noticed by reading its output"
    )


# ------------------------------------------------------------------ the no-CVE path still behaves
def test_the_no_cve_branch_still_records_the_advisory_and_aliases():
    assert "'no_cve', jsonb_build_object('advisory'" in SRC
    assert "no CVE assigned, so EPSS and CISA KEV do not apply" in SRC
