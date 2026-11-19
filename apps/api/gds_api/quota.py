"""Plan limits are a promise made in a price list, so something has to enforce them.

Until this module PLANS in the billing router declared max_cloud_accounts and token_quota and nothing
anywhere read either. A trial tenant could connect unlimited cloud accounts and spend unlimited tokens on a
tier that sells one account and fifty thousand tokens. A limit nothing enforces is not a limit, it is a
sentence in a brochure.

Two rules kept here:
  - The limits come from the SAME dict the price list is rendered from, so the gate and the brochure cannot
    drift apart. If someone edits a price they edit the gate in the same keystroke.
  - Usage is measured from records the platform already keeps for other reasons
    (cloud_connection_profiles, cost_records). Nothing is estimated, and no separate counter is trusted that
    could disagree with the rows it is supposed to count.
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException
from sqlalchemy import text

from gds_api.billing.plans import PLANS

RESOURCES = ("cloud_accounts", "tokens")
LIMIT_KEYS = {"cloud_accounts": "max_cloud_accounts", "tokens": "token_quota"}
# A trial tenant gets the entry paid tier's limits. Stated rather than guessed, and deliberately the
# tightest paid tier: a trial is meant to prove value, not to outrun what it will have to buy.
FALLBACK_TIER = "starter"
# The operator's own tenant is not a customer and is not metered against a customer plan. Without this the
# provider tenant fell back to starter limits and the gate refused its EIGHTH cloud account and its own
# missions, because it legitimately holds 7 accounts and 397k tokens this month.
UNMETERED_TIERS = ("internal",)
PERIOD = "current calendar month, UTC"


def limits_for(tier: str | None) -> dict[str, int]:
    wanted = (tier or FALLBACK_TIER).strip().lower()
    for plan in PLANS:
        if plan["tier"] == wanted:
            return {r: int(plan[k]) for r, k in LIMIT_KEYS.items()}
    for plan in PLANS:
        if plan["tier"] == FALLBACK_TIER:
            return {r: int(plan[k]) for r, k in LIMIT_KEYS.items()}
    raise RuntimeError("no plan defines the fallback tier limits")


def is_metered(tier: str | None) -> bool:
    return (tier or FALLBACK_TIER).strip().lower() not in UNMETERED_TIERS


def unmetered(resource: str, used: int, tier: str) -> dict[str, Any]:
    """Not a bypass: an explicit statement that this tenant is not sold a plan at all."""
    return {
        "allowed": True, "resource": resource, "tier": tier, "used": int(used),
        "limit": None, "remaining": None,
        "reason": f"{tier} tenant: not metered against a customer plan",
    }


def evaluate(resource: str, used: int, limit: int, tier: str) -> dict[str, Any]:
    """Pure decision. Kept separate from the database so the rule can be tested without one."""
    if resource not in RESOURCES:
        raise ValueError(f"{resource!r} is not a metered resource (expected one of {RESOURCES})")
    used, limit = int(used), int(limit)
    allowed = used < limit
    return {
        "allowed": allowed,
        "resource": resource,
        "tier": tier,
        "used": used,
        "limit": limit,
        "remaining": max(limit - used, 0),
        "reason": ("within plan" if allowed else
                   f"{resource} limit reached: {used} of {limit} used on the {tier} plan"),
    }


class QuotaUnmeasurable(HTTPException):
    """503, not 402: the plan is not the problem, the measurement is.

    Refusing is deliberate. An unmeasurable tenant previously read as zero usage and passed every limit, so the
    gate was open exactly where it could not see.
    """

    def __init__(self, resource: str) -> None:
        super().__init__(status_code=503, detail={
            "error": "quota_unmeasurable",
            "resource": resource,
            "reason": "tenant could not be resolved, so usage cannot be measured; refusing rather than assuming zero",
        })


class QuotaExceeded(HTTPException):
    """402, not 403: the caller is allowed to do this, just not without a bigger plan."""

    def __init__(self, decision: dict[str, Any]) -> None:
        super().__init__(status_code=402, detail={"error": "plan_limit_reached", **decision})


async def tier_or_none(db: Any, tenant_id: uuid.UUID | str) -> str | None:
    """The tenant's tier, or None when the tenant row is not visible to this session.

    None is meaningful: on a FORCE-RLS table an unbound session cannot see the tenant row, which also means it
    cannot see that tenant's usage. Treating that as "starter tier, zero used" let an unbound caller pass the
    gate while being completely unmeasurable.
    """
    row = (await db.execute(text("SELECT plan_tier FROM tenants WHERE id = :t"), {"t": str(tenant_id)})).first()
    if row is None:
        return None
    return ((row[0] or FALLBACK_TIER) if row[0] else FALLBACK_TIER).strip().lower()


async def tier_for(db: Any, tenant_id: uuid.UUID | str) -> str:
    return (await tier_or_none(db, tenant_id)) or FALLBACK_TIER


async def usage(db: Any, tenant_id: uuid.UUID | str) -> dict[str, int]:
    accounts = (await db.execute(text(
        "SELECT count(*) FROM cloud_connection_profiles WHERE tenant_id = :t"), {"t": str(tenant_id)})).scalar() or 0
    tokens = (await db.execute(text(
        "SELECT coalesce(sum(input_tokens + output_tokens), 0) FROM cost_records "
        "WHERE tenant_id = :t AND created_at >= date_trunc('month', now())"), {"t": str(tenant_id)})).scalar() or 0
    return {"cloud_accounts": int(accounts), "tokens": int(tokens)}


async def check(db: Any, tenant_id: uuid.UUID | str, resource: str) -> dict[str, Any]:
    tier = await tier_or_none(db, tenant_id)
    if tier is None:
        raise QuotaUnmeasurable(resource)
    measured = await usage(db, tenant_id)
    if not is_metered(tier):
        return unmetered(resource, measured[resource], tier)
    return evaluate(resource, measured[resource], limits_for(tier)[resource], tier)


async def snapshot(db: Any, tenant_id: uuid.UUID | str) -> dict[str, Any]:
    tier = await tier_for(db, tenant_id)
    measured = await usage(db, tenant_id)
    if not is_metered(tier):
        return {"tier": tier, "period": PERIOD, "limits": None, "usage": measured,
                "decisions": {r: unmetered(r, measured[r], tier) for r in RESOURCES}}
    limits = limits_for(tier)
    return {
        "tier": tier,
        "period": PERIOD,
        "limits": limits,
        "usage": measured,
        "decisions": {r: evaluate(r, measured[r], limits[r], tier) for r in RESOURCES},
    }


async def require(db: Any, tenant_id: uuid.UUID | str, resource: str) -> dict[str, Any]:
    """Enforce, or refuse with the numbers the caller needs to understand the refusal."""
    decision = await check(db, tenant_id, resource)
    if not decision["allowed"]:
        raise QuotaExceeded(decision)
    return decision
