"""A limit that nothing enforces is a sentence in a brochure.

PLANS declared max_cloud_accounts and token_quota from the first commit and nothing read either, so a trial
tenant could connect unlimited cloud accounts and spend unlimited tokens on a tier that sells one account and
fifty thousand tokens. These tests pin the rule and the wiring separately: the rule so it cannot be softened
by accident, the wiring so a refactor cannot quietly drop the gate.
"""
import inspect

import pytest

from gds_api import quota
from gds_api.billing.plans import PLANS


def test_every_plan_declares_both_metered_limits():
    for plan in PLANS:
        for key in quota.LIMIT_KEYS.values():
            assert key in plan, f"tier {plan['tier']} is sold without declaring {key}"


def test_resources_and_limit_keys_agree():
    assert set(quota.RESOURCES) == set(quota.LIMIT_KEYS)


def test_allows_below_limit_and_refuses_at_it():
    assert quota.evaluate("tokens", 49_999, 50_000, "starter")["allowed"] is True
    at = quota.evaluate("tokens", 50_000, 50_000, "starter")
    assert at["allowed"] is False
    assert at["remaining"] == 0
    assert "50000 of 50000" in at["reason"]


def test_refuses_above_limit_and_remaining_never_negative():
    over = quota.evaluate("cloud_accounts", 3, 1, "starter")
    assert over["allowed"] is False
    assert over["remaining"] == 0


def test_unknown_tier_falls_back_to_the_entry_tier():
    entry = quota.limits_for("starter")
    assert quota.limits_for("trial") == entry
    assert quota.limits_for("nonsense") == entry
    assert quota.limits_for(None) == entry


def test_refusal_is_402_and_carries_the_numbers():
    exc = quota.QuotaExceeded(quota.evaluate("tokens", 60_000, 50_000, "starter"))
    assert exc.status_code == 402
    assert exc.detail["error"] == "plan_limit_reached"
    assert exc.detail["used"] == 60_000
    assert exc.detail["limit"] == 50_000


def test_unmetered_resource_is_rejected_loudly():
    with pytest.raises(ValueError):
        quota.evaluate("missions", 0, 1, "starter")


def test_both_consumption_points_enforce():
    from gds_api import missions
    from gds_api.cloud import connections

    assert "quota" in inspect.getsource(connections.create_connection_profile), \
        "cloud account creation no longer checks the plan"
    assert "quota" in inspect.getsource(missions.create_mission), \
        "mission creation no longer checks the token quota"


def test_internal_tenant_is_unmetered_and_states_it():
    # The provider's own tenant holds 7 cloud accounts and 397k tokens this month. Metering it against a
    # customer plan refused its own missions, so it is explicitly unmetered rather than accidentally capped.
    assert quota.is_metered("internal") is False
    assert quota.is_metered("starter") is True
    assert quota.is_metered(None) is True
    d = quota.unmetered("tokens", 999_999, "internal")
    assert d["allowed"] is True
    assert d["limit"] is None
    assert "not metered" in d["reason"]


def test_an_unmeasurable_tenant_is_refused_not_assumed_empty():
    # On a FORCE-RLS table an unbound session cannot see the tenant row, so it also cannot see that tenant's
    # usage. Reading that as "starter tier, zero used" opened the gate exactly where it could not measure.
    exc = quota.QuotaUnmeasurable("tokens")
    assert exc.status_code == 503
    assert exc.detail["error"] == "quota_unmeasurable"
    assert "refusing rather than assuming zero" in exc.detail["reason"]


def test_tier_or_none_distinguishes_missing_from_null():
    import inspect
    src = inspect.getsource(quota.tier_or_none)
    assert "return None" in src, "a missing tenant row must be None, not the fallback tier"
    assert "tier_for" in inspect.getsource(quota)
