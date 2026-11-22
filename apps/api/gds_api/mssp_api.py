"""Two reads the MSSP page needs and the platform could not answer.

The page at /mssp rendered a revenue band and a managed-services table from three entity names with no resource
behind them: RevenueReport, ManagedService and CustomerHealthScore. Measurement first (22 Nov 2026):

  * billing_subscriptions exists and holds ZERO rows, so revenue is not measured rather than zero. The page
    printed "$0K MRR" and "$0.00M ARR" from a null it had defaulted, which reads as a business fact.
  * services_provisioned on each customer IS real (three services on the one production customer), but nothing
    flattened it, so the managed-services table had nothing to list.
  * health is already inside /mssp/customers per customer, with a reason when a customer has no telemetry. A
    separate CustomerHealthScore read would have invented a score for a customer nothing has scanned.

So this adds two reads and no store: /mssp/services flattens what is provisioned, /mssp/revenue reports the
billing rows that exist and says so when there are none.
"""
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, get_current_user

router = APIRouter(prefix="/mssp", tags=["mssp"])


def provider_tenant_id() -> uuid.UUID:
    """Resolved per call rather than at import, so the module imports without the env present."""
    return uuid.UUID(os.environ["GDS_TENANT_ID"])


def is_provider_admin(user: CurrentUser) -> bool:
    return user.tenant_id == provider_tenant_id() and "*" in (user.permissions or [])


def _health(row: dict) -> dict:
    """Health from the customer's OWN telemetry, or not_assessed when there is none.

    A tenant that has never been scanned has no health. Reporting a comfortable default would be the
    same failure as marking a compliance control passing without evidence.
    """
    findings = int(row["findings"])
    missions = int(row["missions"])
    if findings == 0 and missions == 0:
        return {"status": "not_assessed",
                "reason": "no telemetry of its own: nothing has been scanned for this customer yet"}
    critical = int(row["critical_findings"])
    if critical > 0:
        return {"status": "at_risk", "reason": f"{critical} critical finding(s) open", "basis": "own findings"}
    return {"status": "monitored", "reason": f"{findings} finding(s), none critical", "basis": "own findings"}


def _shape(row) -> dict:
    d = dict(row)
    return {
        "tenant_id": str(d["tenant_id"]),
        "slug": d["slug"],
        "name": d["name"],
        "display_name": d["display_name"],
        "plan_tier": d["plan_tier"],
        "subscription_status": d["subscription_status"],
        "sla_tier": d["sla_tier"],
        "onboarding_status": d["onboarding_status"],
        "onboarded_at": d["onboarded_at"].isoformat() if d["onboarded_at"] else None,
        "services_provisioned": d["services_provisioned"] or [],
        "active_users": int(d["active_users"] or 0),
        "findings": int(d["findings"] or 0),
        "critical_findings": int(d["critical_findings"] or 0),
        "missions": int(d["missions"] or 0),
        "last_onboarding": d["last_onboarding"].isoformat() if d["last_onboarding"] else None,
        "environment": d["environment"],
        "health": _health(d),
    }


@router.get("/customers")
async def list_customers(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not is_provider_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "MSSP provider administrator access required")

    rows = (await db.execute(text("SELECT * FROM mssp_customer_overview()"))).mappings().all()
    shaped = [_shape(r) for r in rows]
    provider_id = str(provider_tenant_id())

    # A customer count has to survive being read out loud in a board pack, so it counts only the tenants the
    # platform is accountable for. The provider is not one of its own customers, and a fixture created to prove a
    # path is not a customer either - measured 20 Nov 2026, five tenants were three fixtures, the provider and one
    # real account, and the surface said "5". Both exclusions are reported with their reason rather than dropped,
    # because a silently filtered list is indistinguishable from a complete one.
    customers = [c for c in shaped if c["environment"] == "production" and c["tenant_id"] != provider_id]
    provider = [c for c in shaped if c["tenant_id"] == provider_id]
    excluded = [c for c in shaped if c["environment"] != "production"]

    return {
        "customers": customers,
        "count": len(customers),
        "onboarded": sum(1 for c in customers if c["onboarding_status"] == "complete"),
        "assessed": sum(1 for c in customers if c["health"]["status"] != "not_assessed"),
        "provider_tenant": provider[0] if provider else None,
        "non_production": [
            {"slug": c["slug"], "name": c["name"], "environment": c["environment"]} for c in excluded
        ],
        "non_production_count": len(excluded),
        "note": ("health is derived from each customer's own telemetry; a customer with no scans is "
                 "reported not_assessed rather than given a default score"),
    }


@router.get("/customers/{tenant_id}/health")
async def customer_health(
    tenant_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # A customer may always read their own health; only the provider admin may read anyone else's.
    if not is_provider_admin(user) and user.tenant_id != tenant_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not your tenant")

    rows = (await db.execute(
        text("SELECT * FROM mssp_customer_overview() WHERE tenant_id = :t"), {"t": tenant_id}
    )).mappings().all()
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no such customer")
    return _shape(rows[0])


@router.get("/services")
async def managed_services(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Every service each production customer is provisioned for, one row per customer per service.

    This is the only per-service fact the platform holds. There is no service telemetry table, so events, alerts,
    uptime, SLA attainment and automation rate are absent, and the response says so rather than returning zeroes
    for six columns a reader would take as measured. The page renders "not measured" for each.
    """
    if not is_provider_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "MSSP provider administrator access required")

    provider_id = str(provider_tenant_id())
    rows = (await db.execute(text("SELECT * FROM mssp_customer_overview()"))).mappings().all()

    services = []
    for row in rows:
        shaped = _shape(row)
        if shaped["environment"] != "production" or shaped["tenant_id"] == provider_id:
            continue
        for service in shaped["services_provisioned"]:
            services.append({
                "id": f"{shaped['slug']}:{service}",
                "customer_name": shaped["display_name"],
                "customer_slug": shaped["slug"],
                "service_name": service,
                "provisioned_at": shaped["onboarded_at"],
                "plan_tier": shaped["plan_tier"],
                "onboarding_status": shaped["onboarding_status"],
            })

    return {
        "services": services,
        "count": len(services),
        "customers_covered": len({s["customer_slug"] for s in services}),
        "not_measured": ["events_30d", "alerts_30d", "uptime_pct", "sla_met", "health_score",
                         "automation_rate_pct"],
        "note": ("the platform records which services a customer is provisioned for; it holds no per-service "
                 "telemetry, so those six columns are absent rather than zero"),
    }


@router.get("/revenue")
async def revenue(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """MRR and ARR from the billing rows that actually exist, with the basis stated.

    Measured 22 Nov 2026: billing_subscriptions held zero rows, so the honest answer is that revenue is not
    measured - not that MRR is zero. The page had been printing "$0K MRR" from a null it defaulted.

    Scope is the calling tenant's own billing records, because billing_subscriptions is row-level secured and this
    route does not widen that. MSSP-wide revenue would need a cross-tenant billing aggregate, which does not exist;
    saying so is better than presenting one tenant's zero as the whole book.
    """
    if not is_provider_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "MSSP provider administrator access required")

    row = (await db.execute(text("""
        SELECT count(*) AS total,
               count(*) FILTER (WHERE status = 'active') AS active,
               count(*) FILTER (WHERE status = 'trialing') AS trialing,
               coalesce(sum(monthly_amount_gbp) FILTER (WHERE status = 'active'), 0) AS mrr_gbp
        FROM billing_subscriptions
    """))).mappings().one()

    total = int(row["total"])
    active = int(row["active"])
    trialing = int(row["trialing"])
    mrr = float(row["mrr_gbp"]) if active else None

    return {
        "currency": "GBP",
        "mrr_gbp": mrr,
        "arr_gbp": mrr * 12 if mrr is not None else None,
        "nrr_pct": None,
        "active_subscriptions": active,
        "trialing_subscriptions": trialing,
        "total_subscriptions": total,
        "basis": "sum of billing_subscriptions.monthly_amount_gbp where status='active'",
        "scope": "the calling tenant's billing records; no cross-tenant billing aggregate exists",
        "note": (None if total else
                 "no subscription row exists for this tenant, so revenue is not measured rather than zero"),
        "nrr_note": "net revenue retention needs period-over-period movement, and no subscription has completed a period",
    }
