"""A remediation plan that says nothing is not a plan.

Measured 22 Nov 2026: security_findings.source is "" on 834 of 1002 rows, so the generator's source-based branch left
83% of the estate as "Manual remediation required for: ..." with fix_steps {}. These tests pin the classification that
replaced it, built only from fields a scanner row really carries.
"""
import pytest

from gds_api.remediation import classify_scanner_finding


class Row:
    def __init__(self, **kw):
        for name in ("cve", "title", "raw_data", "target"):
            setattr(self, name, kw.get(name))


def test_a_cve_with_a_named_package_is_a_dependency_upgrade():
    kind, description, steps = classify_scanner_finding(
        Row(cve="CVE-2026-22184", title="CVE-2026-22184 in zlib", raw_data={}, target=None)
    )
    assert kind == "dependency_upgrade"
    assert steps["package"] == "zlib"
    assert steps["cve"] == "CVE-2026-22184"
    assert "zlib" in description and "CVE-2026-22184" in description
    assert len(steps["steps"]) == 3


def test_the_kev_flag_comes_from_the_row_and_is_stated():
    _, description, steps = classify_scanner_finding(
        Row(cve="CVE-2026-1", title="CVE-2026-1 in openssl",
            raw_data={"enrichment": {"kev_listed": True}}, target=None)
    )
    assert steps["kev_listed"] is True
    assert "CISA KEV" in description


def test_a_row_without_kev_makes_no_such_claim():
    _, description, steps = classify_scanner_finding(
        Row(cve="CVE-2026-1", title="CVE-2026-1 in openssl",
            raw_data={"enrichment": {"kev_listed": False}}, target=None)
    )
    assert steps["kev_listed"] is False
    assert "KEV" not in description


def test_the_cvss_vector_is_carried_when_present():
    _, description, steps = classify_scanner_finding(
        Row(cve="CVE-2026-2", title="CVE-2026-2 in curl",
            raw_data={"cvss_lookup": {"vector": "CVSS:3.1/AV:L/AC:L"}}, target="api host")
    )
    assert steps["cvss_vector"] == "CVSS:3.1/AV:L/AC:L"
    assert "CVSS:3.1/AV:L/AC:L" in description


def test_no_cve_means_no_classification_rather_than_an_invented_plan():
    assert classify_scanner_finding(Row(cve=None, title="Missing CSP header", raw_data={})) is None


def test_a_title_without_a_package_stays_manual_but_still_has_steps():
    kind, _, steps = classify_scanner_finding(
        Row(cve="CVE-2026-3", title="CVE-2026-3 affects the platform", raw_data={}, target=None)
    )
    assert kind == "manual"
    assert steps["package"] is None
    assert len(steps["steps"]) == 3


def test_the_last_step_is_a_rescan_because_nothing_else_closes_a_finding():
    _, _, steps = classify_scanner_finding(
        Row(cve="CVE-2026-4", title="CVE-2026-4 in bash", raw_data={}, target=None)
    )
    assert "Re-run the scan" in steps["steps"][-1]


def test_no_shell_command_is_invented():
    _, description, steps = classify_scanner_finding(
        Row(cve="CVE-2026-5", title="CVE-2026-5 in zlib", raw_data={}, target=None)
    )
    blob = description + " ".join(steps["steps"])
    for invented in ("apt-get", "yum install", "sudo ", "npm install", "pip install"):
        assert invented not in blob


def test_malformed_raw_data_does_not_raise():
    for raw in (None, "text", [], 7):
        kind, _, steps = classify_scanner_finding(
            Row(cve="CVE-2026-6", title="CVE-2026-6 in zlib", raw_data=raw, target=None)
        )
        assert kind == "dependency_upgrade"
        assert steps["kev_listed"] is False
