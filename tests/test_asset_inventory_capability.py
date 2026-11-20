"""Port coverage must be able to run unattended, or it is not a control.

Measured 20 Nov 2026: every six-hourly run logged "capability REQUIRE_APPROVAL - This action changes an external
system and requires approval" with a fresh approval_id. Nobody answers an approval every six hours forever, so
port coverage produced nothing for days while the log looked like a scan had been attempted.

The cause was classification, not a missing gate. The scheduled scan requested network.port_scan, which is
R4/OFFENSIVE/RED-only with a per-run human approval, and the broker keys the approval policy on the BACKING TOOL's
legacy risk class - nmap_scan is "high" - so no amount of capability-side tuning would have changed the verdict.
R4 is right for a red-team engagement. It is wrong for an inventory read of your own authorised perimeter.

These tests hold the line in both directions: the new capability must be genuinely read-only and still gated on
target authorisation, and the red team's R4 path must be untouched.
"""
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from gds_api.capabilities.catalog import CAPABILITY_REGISTRY, TOOL_TO_CAPABILITY_KEY  # noqa: E402
from gds_api.capabilities.definitions import RiskClass, SideEffectType, Team  # noqa: E402
from gds_api.tool_gateway import TOOL_REGISTRY, _port_inventory_scan  # noqa: E402

SCAN = (ROOT / "apps" / "api" / "run_deterministic_scan.py").read_text(encoding="utf-8")


def test_the_inventory_capability_is_a_read_not_an_offensive_action():
    cap = CAPABILITY_REGISTRY["network.asset_inventory"]
    assert cap.risk_class == RiskClass.R2
    assert cap.side_effect_type == SideEffectType.READ_EXTERNAL
    assert Team.BLUE in cap.allowed_team_types
    assert Team.RED not in cap.allowed_team_types


def test_it_runs_without_a_per_run_approval_but_still_needs_an_authorised_target():
    """The trade is deliberate: no human in the loop, but an active AuthorizedTarget is still required."""
    cap = CAPABILITY_REGISTRY["network.asset_inventory"]
    assert cap.requires_human_approval is False
    assert cap.requires_target_authorisation is True
    assert cap.allows_network is True


def test_the_red_team_capability_is_untouched():
    cap = CAPABILITY_REGISTRY["network.port_scan"]
    assert cap.risk_class == RiskClass.R4
    assert cap.side_effect_type == SideEffectType.OFFENSIVE
    assert cap.requires_human_approval is True
    assert cap.allowed_team_types == (Team.RED,)


def test_each_tool_maps_to_its_own_capability():
    """nmap_scan must keep pointing at the R4 capability; a shared mapping would downgrade the red team."""
    assert TOOL_TO_CAPABILITY_KEY["nmap_scan"] == "network.port_scan"
    assert TOOL_TO_CAPABILITY_KEY["port_inventory_scan"] == "network.asset_inventory"


def test_the_inventory_tool_carries_the_medium_label_the_policy_needs():
    """The broker keys approval on the tool's legacy risk class. 'medium' is what makes it run unattended."""
    spec = TOOL_REGISTRY["port_inventory_scan"]
    assert spec.risk_class == "medium"
    assert TOOL_REGISTRY["nmap_scan"].risk_class == "critical"


def test_a_range_or_argument_list_is_refused_before_any_scan_runs():
    for bad in ("10.0.0.0/24", "a.example,b.example", "host -oN /tmp/x", "-sS"):
        result = asyncio.run(_port_inventory_scan({"target": bad}))
        assert result["success"] is False
        assert result["code"] == "SINGLE_HOST_ONLY", bad


def test_a_missing_target_is_refused():
    result = asyncio.run(_port_inventory_scan({}))
    assert result["code"] == "MISSING_TARGET"


def test_the_scheduled_scan_requests_the_read_only_capability_as_a_blue_agent():
    assert 'capability_key="network.asset_inventory"' in SCAN
    assert 'requested_tool_id="port_inventory_scan"' in SCAN
    assert 'requesting_agent_id="network_security"' in SCAN
    assert 'tool_name="port_inventory_scan"' in SCAN
    assert 'capability_key="network.port_scan"' not in SCAN


def test_the_run_closes_its_own_mission_on_every_path():
    """The leak that put eleven port_scan rows in `running`: the path never closed what it opened."""
    assert "await _close_mission(db, tid, mission_id, outcome)" in SCAN
    assert "finally:" in SCAN
    # the close must come from the finally block, not only from the happy path
    assert SCAN.index("outcome = await _execute_port_inventory") < SCAN.index(
        "await _close_mission(db, tid, mission_id, outcome)")


def test_closing_rebinds_the_tenant_after_the_earlier_commit():
    """A commit returns the pooled connection, so the tenant context from before it is gone."""
    close_fn = SCAN.split("async def _close_mission", 1)[1].split("async def _execute_port_inventory", 1)[0]
    assert "set_config('gds.tenant_id'" in close_fn
    assert close_fn.index("set_config('gds.tenant_id'") < close_fn.index("UPDATE missions")


def test_a_refusal_is_recorded_as_the_missions_own_ending():
    """A broker refusal must land in the mission report, not only in a log line."""
    assert '"detail": f"capability {evaluation.decision}' in SCAN


def test_the_agent_that_runs_it_can_actually_hold_it():
    from gds_api.agents.registry import AGENT_REGISTRY

    agent = AGENT_REGISTRY["network_security"]
    assert "port_inventory_scan" in agent.tool_names
    assert "network.asset_inventory" in agent.allowed_capability_ids
    # The capability is R2 and the agent's ceiling must cover it, or the broker refuses on ceiling.
    assert str(getattr(agent.risk_ceiling, "value", agent.risk_ceiling)) == "R2"
