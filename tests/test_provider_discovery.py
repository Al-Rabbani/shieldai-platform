"""An unconnected cloud provider must be named as unconnected, not as a missing argument.

Azure and GCP are registered providers with real adapters and policy packs, but neither has an
environment for this tenant yet. Asking discovery for them used to answer "tenant_id and
environment_id are required", which pointed at the caller when the real state was "not connected".
"""
from __future__ import annotations

import os

import pytest

from gds_api.cloud.discovery_runner import discover_cloud_environment

TENANT = os.environ.get("SECURITY_ALERT_TENANT_ID")
pytestmark = pytest.mark.skipif(not TENANT, reason="needs the production tenant id in env")


def _ask(**payload):
    import asyncio

    return asyncio.run(discover_cloud_environment({"tenant_id": TENANT, **payload}))


def test_kubernetes_without_an_environment_says_not_connected():
    """A provider with no registered environment must say so, not blame the caller."""
    out = _ask(provider="kubernetes")
    assert out["code"] == "PROVIDER_NOT_CONNECTED", out
    assert out["provider"] == "kubernetes"
    assert out["supported_authentication_mechanisms"]
    assert out["required_to_connect"]


def test_azure_declares_service_principal_authentication():
    """Azure's mechanisms are a registry fact, so assert them without depending on what is connected."""
    from gds_api.cloud.providers import get_provider

    definition = get_provider("azure")
    assert definition is not None
    assert "service_principal" in definition.supported_authentication_mechanisms


def test_a_connected_provider_is_not_reported_as_unconnected():
    """The GDS Azure subscription is registered, so discovery must proceed rather than claim it is not
    connected. This pins the regression that a real environment cannot be reported as absent."""
    out = _ask(provider="azure")
    assert out.get("code") != "PROVIDER_NOT_CONNECTED", out


def test_gcp_without_an_environment_says_not_connected():
    out = _ask(provider="gcp")
    assert out["code"] == "PROVIDER_NOT_CONNECTED", out
    assert "service_account_impersonation" in out["supported_authentication_mechanisms"]


def test_all_four_providers_are_registered_and_named_back():
    # Asked with a provider that has no environment, because that is the response that lists the registry.
    out = _ask(provider="kubernetes")
    assert set(out["registered_providers"]) >= {"aws", "azure", "gcp", "kubernetes"}


def test_an_unregistered_provider_is_told_so_explicitly():
    out = _ask(provider="oracle")
    assert out["code"] == "UNKNOWN_PROVIDER", out
    assert "azure" in out["registered_providers"]


def test_asking_with_neither_provider_nor_environment_names_both_options():
    out = _ask()
    assert out["code"] == "MISSING_ARGUMENT", out
    assert "provider" in out["detail"]
