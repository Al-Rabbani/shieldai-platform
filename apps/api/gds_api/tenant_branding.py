"""Tenant branding: a tenant must be able to present itself as itself (P5 / B27).

`tenants` carried only name and slug, so every customer saw the same product with no way to show
its own identity. Branding lives on the tenant row itself rather than in a new table: it is one row
per tenant, it is read on every page load, and a join would buy nothing.

Two rules this module keeps:

  * NULL means "not configured", never "black". The response states which values were defaulted, so
    a UI cannot mistake a platform default for the customer's own choice.
  * The read is scoped to the caller's tenant by predicate, not by trusting RLS alone, and the write
    is restricted to a role that actually owns the tenant's identity.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, get_current_user

router = APIRouter(prefix="/tenant", tags=["tenant"])

# Platform defaults, named so the response can say which ones it applied.
DEFAULT_PRIMARY = "#0B1220"
DEFAULT_SECONDARY = "#1F6FEB"
BRANDING_ROLES = {"platform_owner", "admin", "owner"}


class BrandingOut(BaseModel):
    tenant_id: uuid.UUID
    name: str
    slug: str
    display_name: str
    primary_color: str
    secondary_color: str
    logo_url: str | None = None
    support_email: str | None = None
    defaults_applied: list[str] = Field(default_factory=list)


class BrandingUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    primary_color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    secondary_color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    logo_url: str | None = Field(default=None, max_length=2048)
    support_email: str | None = Field(default=None, max_length=320)


def _to_out(row) -> BrandingOut:
    defaults: list[str] = []
    display = row["display_name"]
    if not display:
        display = row["name"]
        defaults.append("display_name")
    primary = row["primary_color"]
    if not primary:
        primary = DEFAULT_PRIMARY
        defaults.append("primary_color")
    secondary = row["secondary_color"]
    if not secondary:
        secondary = DEFAULT_SECONDARY
        defaults.append("secondary_color")
    return BrandingOut(
        tenant_id=row["id"],
        name=row["name"],
        slug=row["slug"],
        display_name=display,
        primary_color=primary,
        secondary_color=secondary,
        logo_url=row["logo_url"],
        support_email=row["support_email"],
        defaults_applied=defaults,
    )


_SELECT = (
    "SELECT id, name, slug, display_name, primary_color, secondary_color, logo_url, support_email "
    "FROM tenants WHERE id = :tenant_id"
)


@router.get("/branding", response_model=BrandingOut)
async def get_branding(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BrandingOut:
    """Branding for the caller's own tenant. Never another tenant's."""
    row = (
        await db.execute(text(_SELECT), {"tenant_id": str(current_user.tenant_id)})
    ).mappings().first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    return _to_out(row)


@router.patch("/branding", response_model=BrandingOut)
async def update_branding(
    body: BrandingUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BrandingOut:
    """Set the caller's own branding. Restricted to a role that owns the tenant identity."""
    if current_user.role_name not in BRANDING_ROLES:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"role '{current_user.role_name}' cannot change tenant branding",
        )
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no branding fields supplied")
    assignments = ", ".join(f"{name} = :{name}" for name in fields)
    fields["tenant_id"] = str(current_user.tenant_id)
    await db.execute(
        text(f"UPDATE tenants SET {assignments} WHERE id = :tenant_id"), fields
    )
    await db.commit()
    row = (
        await db.execute(text(_SELECT), {"tenant_id": str(current_user.tenant_id)})
    ).mappings().first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    return _to_out(row)
