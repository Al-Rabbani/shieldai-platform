"""The two MSSP reads added for the command centre: /mssp/services and /mssp/revenue.

Why they exist rather than a mapping: the page had RevenueReport and ManagedService entity names with no resource.
billing_subscriptions holds zero rows, so revenue is unmeasured rather than zero, and services_provisioned is real
but was never flattened. Both routes are provider-admin only, and both state their basis rather than returning a
number a reader would take as measured.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, "/opt/gds-os/apps/api")

SOURCE = Path("/opt/gds-os/apps/api/gds_api/mssp_api.py")


def handler(method_path: str) -> str:
    text = SOURCE.read_text(encoding="utf-8")
    marker = f'@router.get("{method_path}")'
    start = text.find(marker)
    assert start != -1, f"no handler for {method_path}"
    end = text.find("\n@router.", start + 1)
    return text[start : end if end != -1 else len(text)]


def test_both_routes_are_registered():
    from gds_api.main import app

    paths = app.openapi()["paths"]
    assert "get" in paths.get("/mssp/services", {}), "the managed-services table needs this"
    assert "get" in paths.get("/mssp/revenue", {}), "the revenue band needs this"


@pytest.mark.parametrize("path", ["/services", "/revenue"])
def test_each_route_requires_a_provider_administrator(path):
    body = handler(path)
    assert "is_provider_admin(user)" in body, f"{path} is cross-tenant and must refuse non-provider callers"
    assert "403" in body, f"{path} must refuse rather than return an empty result"


def test_revenue_reports_null_rather_than_zero_when_no_subscription_exists():
    body = handler("/revenue")
    # mrr is only a number when at least one active subscription exists.
    assert "if active else None" in body, "an empty book must not read as £0 MRR"
    assert "monthly_amount_gbp" in body, "the figure must come from the billing column that holds it"
    assert "basis" in body, "the arithmetic must travel with the number"


def test_services_states_which_measures_are_absent():
    body = handler("/services")
    assert "not_measured" in body, "six columns have no backing table and must be named absent"
    for measure in ("events_30d", "alerts_30d", "uptime_pct", "sla_met", "health_score", "automation_rate_pct"):
        assert measure in body, f"{measure} must be listed as absent rather than returned as zero"


def test_services_reads_the_customer_function_rather_than_a_new_table():
    body = handler("/services")
    assert "mssp_customer_overview()" in body, "provisioned services already live on that function"
