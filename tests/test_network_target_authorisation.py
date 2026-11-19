"""External HTTP checks must honour written scope.

Measured 19 Nov 2026: check_url_headers and check_domain_security fetched any host a caller named,
and check_domain_security silently defaulted to a domain, while the catalogue promised a
Watchlist-authorised target. These tests pin the enforcement that now backs that promise.
"""
import asyncio
import os

import pytest

from gds_api.tool_gateway import _check_domain_security, _check_url_headers, _target_covered

TENANT = os.environ.get("SECURITY_ALERT_TENANT_ID", "")
needs_tenant = pytest.mark.skipif(
    not TENANT, reason="requires SECURITY_ALERT_TENANT_ID from the host environment"
)


def test_host_or_url_entry_covers_the_target():
    covered = {"api.globaldigitalsecurity.io", "https://app.example.com/health"}
    assert _target_covered("https://api.globaldigitalsecurity.io/health", covered)
    assert _target_covered("API.globaldigitalsecurity.io", covered)
    assert _target_covered("https://app.example.com/health", covered)
    assert not _target_covered("https://evil.example.net/", covered)


def test_external_check_without_tenant_is_refused():
    out = asyncio.run(_check_url_headers({"url": "https://api.globaldigitalsecurity.io/health"}))
    assert out["code"] == "TENANT_REQUIRED"


@needs_tenant
def test_unauthorised_host_is_refused_not_fetched():
    out = asyncio.run(_check_url_headers({"url": "https://example.com/", "_tenant_id": TENANT}))
    assert out["code"] == "TARGET_NOT_AUTHORIZED"
    assert "authorised_targets" in out


def test_domain_check_has_no_silent_default_target():
    out = asyncio.run(_check_domain_security({"_tenant_id": TENANT}))
    assert out["code"] == "MISSING_ARGUMENT"
