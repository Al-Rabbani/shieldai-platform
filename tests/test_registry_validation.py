"""The startup validator that has never been tested, on a registry of 26 live agents.

MEASURED 26 Nov 2026 by the first coverage run: agents/validation.py was at 0.0% of 138 statements and is imported by
38 modules - it runs once at every boot from gds_api.main and RAISES rather than best-effort-fixing a broken entry, so
a wrongly strict rule stops the platform starting and a wrongly lax rule ships an agent users cannot trust. Nothing had
ever proved either direction.
"""
import dataclasses

import pytest

from gds_api.agents import validation
from gds_api.agents.manifest import AgentStatus, RiskCeiling, Team
from gds_api.agents.registry import AGENT_REGISTRY, PLANNED_AGENTS


def one_key() -> str:
    return next(iter(AGENT_REGISTRY))


def manifest_of(key: str):
    return AGENT_REGISTRY[key]


def test_the_real_registry_passes_validation():
    # The invariant every boot depends on, asserted for the first time.
    validation.validate_agent_registry()


def test_a_duplicate_stable_key_is_refused(monkeypatch):
    key = one_key()
    doubled = dict(AGENT_REGISTRY)
    # A second entry under the same key is what a careless merge produces.
    monkeypatch.setattr(validation, "AGENT_REGISTRY", doubled)
    monkeypatch.setattr(validation, "PLANNED_AGENTS", dict(PLANNED_AGENTS, **{key: PLANNED_AGENTS.get(key) or manifest_of(key)}))
    with pytest.raises(validation.RegistryValidationError) as caught:
        validation._check_duplicate_keys()
    assert caught.value.agent_key == key


def test_an_operational_agent_with_no_tools_is_refused(monkeypatch):
    key = one_key()
    monkeypatch.setattr(validation, "AGENT_REGISTRY", {key: dataclasses.replace(manifest_of(key), tool_names=())})
    monkeypatch.setattr(validation, "PLANNED_AGENTS", {})
    with pytest.raises(validation.RegistryValidationError) as caught:
        validation._check_operational_agents_loadable()
    assert caught.value.rule == "operational_agent_no_tools"


def test_an_operational_agent_with_no_prompt_is_refused(monkeypatch):
    key = one_key()
    monkeypatch.setattr(validation, "AGENT_REGISTRY", {key: dataclasses.replace(manifest_of(key), system_prompt="   ")})
    monkeypatch.setattr(validation, "PLANNED_AGENTS", {})
    with pytest.raises(validation.RegistryValidationError) as caught:
        validation._check_operational_agents_loadable()
    assert caught.value.rule == "operational_agent_no_prompt"


def test_a_planned_agent_marked_operational_is_refused(monkeypatch):
    if not PLANNED_AGENTS:
        pytest.skip("no planned agents declared")
    key = next(iter(PLANNED_AGENTS))
    monkeypatch.setattr(validation, "PLANNED_AGENTS",
                        {key: dataclasses.replace(PLANNED_AGENTS[key], status=AgentStatus.OPERATIONAL)})
    monkeypatch.setattr(validation, "AGENT_REGISTRY", {})
    with pytest.raises(validation.RegistryValidationError) as caught:
        validation._check_planned_agents_not_operational()
    assert caught.value.rule == "planned_agent_wrong_status"


def test_an_unknown_tool_reference_is_refused(monkeypatch):
    key = one_key()
    monkeypatch.setattr(validation, "AGENT_REGISTRY",
                        {key: dataclasses.replace(manifest_of(key), tool_names=("no_such_tool_xyz",))})
    with pytest.raises(validation.RegistryValidationError) as caught:
        validation._check_tool_references()
    assert caught.value.rule == "missing_tool_reference"
    assert "no_such_tool_xyz" in str(caught.value)


def test_a_red_team_agent_without_target_authorisation_is_refused(monkeypatch):
    # The safety rule that makes the offensive layer usable at all.
    key = one_key()
    red = dataclasses.replace(manifest_of(key), team=Team.RED, target_authorisation_required=False,
                              risk_ceiling=RiskCeiling.R4)
    monkeypatch.setattr(validation, "AGENT_REGISTRY", {key: red})
    with pytest.raises(validation.RegistryValidationError) as caught:
        validation._check_red_team_safety_policy()
    assert caught.value.rule == "red_team_missing_target_authorisation"


def test_a_red_team_agent_with_a_low_risk_ceiling_is_refused(monkeypatch):
    key = one_key()
    red = dataclasses.replace(manifest_of(key), team=Team.RED, target_authorisation_required=True,
                              risk_ceiling=RiskCeiling.R2)
    monkeypatch.setattr(validation, "AGENT_REGISTRY", {key: red})
    with pytest.raises(validation.RegistryValidationError) as caught:
        validation._check_red_team_safety_policy()
    assert caught.value.rule == "red_team_risk_ceiling_too_low"


def test_the_error_names_the_agent_and_the_rule():
    # An operator reading a failed boot must learn which entry and which rule, not just "invalid registry".
    error = validation.RegistryValidationError("some_agent", "some_rule", "the detail")
    assert error.agent_key == "some_agent"
    assert error.rule == "some_rule"
    assert "some_agent" in str(error) and "some_rule" in str(error)
