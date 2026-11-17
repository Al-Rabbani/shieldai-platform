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


def test_azure_without_an_environment_says_not_connected():
    out = _ask(provider="azure")
    assert out["code"] == "PROVIDER_NOT_CONNECTED", out
    assert out["provider"] == "azure"
    assert "service_principal" in out["supported_authentication_mechanisms"]
    assert out["required_to_connect"]


def test_gcp_without_an_environment_says_not_connected():
    out = _ask(provider="gcp")
    assert out["code"] == "PROVIDER_NOT_CONNECTED", out
    assert "service_account_impersonation" in out["supported_authentication_mechanisms"]


def test_all_four_providers_are_registered_and_named_back():
    out = _ask(provider="azure")
    assert set(out["registered_providers"]) >= {"aws", "azure", "gcp", "kubernetes"}


def test_an_unregistered_provider_is_told_so_explicitly():
    out = _ask(provider="oracle")
    assert out["code"] == "UNKNOWN_PROVIDER", out
    assert "azure" in out["registered_providers"]


def test_asking_with_neither_provider_nor_environment_names_both_options():
    out = _ask()
    assert out["code"] == "MISSING_ARGUMENT", out
    assert "provider" in out["detail"]
