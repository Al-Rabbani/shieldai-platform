"""A tool the reasoning model is told about must be one the broker can actually run.

Measured 25 Nov 2026: TEN tools were advertised in tool_definitions.py but declared by no operational
capability, so the model could be instructed to call get_findings, store_finding, semgrep_scan, trivy_scan,
osv_check, cisa_kev_check, security_headers_check, httpx_scan, masscan_scan or aws_iam_scan and governance
answered "No single operational capability declares tool ...". The reasoning layer and the broker disagreed.
"""
from __future__ import annotations

from gds_api.capabilities.catalog import CAPABILITY_REGISTRY
from gds_api.capabilities.definitions import CapabilityStatus
from gds_api.reasoning.tool_definitions import _ALL_TOOL_DEFINITIONS


def _brokerable() -> set[str]:
    out: set[str] = set()
    for cap in CAPABILITY_REGISTRY.values():
        if cap.status is CapabilityStatus.OPERATIONAL:
            out |= set(cap.required_tool_ids or ())
    return out


def test_every_advertised_tool_is_brokerable():
    advertised = {t["function"]["name"] for t in _ALL_TOOL_DEFINITIONS}
    refused = sorted(advertised - _brokerable() - {"noop"})
    assert not refused, f"advertised to the model but refused by governance: {refused}"


def test_store_finding_has_a_capability_because_agents_record_what_they_find():
    assert "finding.store" in CAPABILITY_REGISTRY
    cap = CAPABILITY_REGISTRY["finding.store"]
    assert "store_finding" in (cap.required_tool_ids or ())
    assert cap.status is CapabilityStatus.OPERATIONAL
