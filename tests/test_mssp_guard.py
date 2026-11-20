"""The MSSP customer list is cross-tenant, so its guard is the security control.

These tests pin the refusal, not just the success: an endpoint that quietly scoped itself to the
caller's own tenant would look identical to an empty customer list, so it must 403 instead.
"""
import os
import uuid
from types import SimpleNamespace

import pytest

from gds_api import mssp_api


def fake_user(tenant_id, permissions):
    return SimpleNamespace(tenant_id=tenant_id, permissions=permissions)


def test_provider_admin_needs_both_provider_tenant_and_star_permission():
    if not os.environ.get("GDS_TENANT_ID"):
        pytest.skip("GDS_TENANT_ID is not set; the provider tenant is configuration, so the guard is untestable here")
    provider = mssp_api.provider_tenant_id()
    assert mssp_api.is_provider_admin(fake_user(provider, ["*"])) is True
    # Right permission, wrong tenant: a platform_owner of a customer tenant is not the provider.
    assert mssp_api.is_provider_admin(fake_user(uuid.uuid4(), ["*"])) is False
    # Right tenant, ordinary permissions: an analyst in the provider tenant is not an admin.
    assert mssp_api.is_provider_admin(fake_user(provider, ["read", "findings:read"])) is False
    assert mssp_api.is_provider_admin(fake_user(provider, [])) is False


def test_health_is_not_assessed_without_telemetry():
    h = mssp_api._health({"findings": 0, "missions": 0, "critical_findings": 0})
    assert h["status"] == "not_assessed"
    assert "no telemetry" in h["reason"]


def test_health_reports_at_risk_only_from_own_findings():
    h = mssp_api._health({"findings": 5, "missions": 1, "critical_findings": 2})
    assert h["status"] == "at_risk" and h["basis"] == "own findings"
    ok = mssp_api._health({"findings": 3, "missions": 1, "critical_findings": 0})
    assert ok["status"] == "monitored"
