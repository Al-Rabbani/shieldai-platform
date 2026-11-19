"""Approval is a scarce human attention budget, so it must be spent where it changes the outcome.

The bug this pins: OSV and CISA KEV lookups - read-only queries against public advisory databases that
cannot touch a tenant system - were classified R3 with human approval required. Twelve approvals piled up
in one afternoon from two agents doing exactly what they were told, and the agents stalled waiting for a
human to approve reading a public list. Approval fatigue is how a real gate gets rubber-stamped.
"""
import pytest

from gds_api.capabilities.catalog import CAPABILITY_REGISTRY as CAPS
from gds_api.capabilities.catalog import RiskClass, SideEffectType

PUBLIC_LOOKUPS = ("threat_intel.lookup_cve", "vulnerability.lookup", "threat_intel.lookup_ioc")


@pytest.mark.parametrize("key", PUBLIC_LOOKUPS)
def test_public_read_only_lookups_do_not_need_a_human(key):
    cap = CAPS[key]
    assert cap.requires_human_approval is False, f"{key} asks a human to approve reading a public list"
    assert cap.risk_class in (RiskClass.R1, RiskClass.R2), f"{key} is {cap.risk_class}, too high for a read"


@pytest.mark.parametrize("key", PUBLIC_LOOKUPS)
def test_public_read_only_lookups_are_network_reads(key):
    assert CAPS[key].allows_network is True


def test_active_scanning_keeps_its_gates():
    # Port scanning is R4 and needs a human as well as written scope. Vulnerability scanning is R3 and is
    # gated by target authorisation instead - so the assertion is about the gate each one actually has,
    # not about imposing one design on both.
    port = CAPS["network.port_scan"]
    assert port.requires_human_approval is True, "port scan lost its approval gate"
    assert port.allows_network is True

    vuln = CAPS["network.vulnerability_scan"]
    assert vuln.allows_network is True
    assert getattr(vuln, "requires_target_authorisation", False) is True, (
        "vulnerability scan can reach a network without written target authorisation")
