"""Regressions for the CVSS backfill helpers.

Context: 237 open findings carried a CVE with CVSS NULL while every one of them already had EPSS
and a KEV answer, because the writer only accepted a score the scanner had already computed and
never revisited a row missing only CVSS. These tests pin the two rules that keep the backfill
honest: only a published score is stored, and an ambiguous CVE in prose is never guessed.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

import enrich_findings as enrich  # noqa: E402


def _payload(metrics):
    return {"vulnerabilities": [{"cve": {"metrics": metrics}}]}


def test_prefers_published_v31_over_v40():
    metric = enrich.pick_nvd_metric(_payload({
        "cvssMetricV40": [{"cvssData": {"baseScore": 8.9, "version": "4.0", "vectorString": "CVSS:4.0/x"}}],
        "cvssMetricV31": [{"cvssData": {"baseScore": 7.2, "version": "3.1", "vectorString": "CVSS:3.1/y"}}],
    }))
    assert metric["score"] == 7.2
    assert metric["version"] == "3.1"
    assert metric["metric"] == "cvssMetricV31"


def test_falls_back_to_v40_when_no_v3_exists():
    metric = enrich.pick_nvd_metric(_payload({
        "cvssMetricV40": [{"cvssData": {"baseScore": 8.9, "version": "4.0", "vectorString": "CVSS:4.0/x"}}],
    }))
    assert metric["score"] == 8.9
    assert metric["version"] == "4.0"


def test_records_the_vector_so_a_reader_can_audit_the_number():
    metric = enrich.pick_nvd_metric(_payload({
        "cvssMetricV31": [{"cvssData": {"baseScore": 9.8, "version": "3.1", "vectorString": "CVSS:3.1/AV:N/AC:L"}}],
    }))
    assert metric["vector"] == "CVSS:3.1/AV:N/AC:L"


def test_unknown_cve_yields_nothing_rather_than_a_zero():
    assert enrich.pick_nvd_metric({"vulnerabilities": []}) is None
    assert enrich.pick_nvd_metric(_payload({"cvssMetricV31": [{"cvssData": {}}]})) is None
    assert enrich.pick_nvd_metric({"error": "rate limited"}) is None
    assert enrich.pick_nvd_metric(None) is None


def test_text_cve_only_when_unambiguous():
    assert enrich.extract_cve_from_text("PyJWT accepts empty key (CVE-2026-123817)") == "CVE-2026-123817"
    assert enrich.extract_cve_from_text("CVE-2026-1 and CVE-2026-2 both appear") is None
    assert enrich.extract_cve_from_text("no identifier here") is None
    assert enrich.extract_cve_from_text(None, 42, "CVE-2025-99999") == "CVE-2025-99999"


def test_structured_cve_still_wins_over_text():
    details = {"aliases": ["GHSA-x", "CVE-2026-1234"]}
    assert enrich.extract_cve(details) == "CVE-2026-1234"
