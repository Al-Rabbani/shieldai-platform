"""MSSP provider surface: the customers this platform manages.

This router is cross-tenant by nature, so the guard is the point of the module rather than a detail.
The customer list is visible only to an administrator of the provider tenant. Everyone else is refused
outright instead of being quietly scoped to their own tenant, because a silently scoped list is
indistinguishable from an empty one and hides the fact that the caller had no business asking.

The data comes from mssp_customer_overview(), a read-only SECURITY DEFINER function that returns
aggregate counts. Row content stays behind RLS.
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
        "services_provisioned": d["services_provisioned"],
        "active_users": int(d["active_users"]),
        "findings": int(d["findings"]),
        "critical_findings": int(d["critical_findings"]),
        "missions": int(d["missions"]),
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
