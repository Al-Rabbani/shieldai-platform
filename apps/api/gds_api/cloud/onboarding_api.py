"""HTTP surface for client cloud onboarding.

A profile's ExternalId is generated here, never supplied by a caller: it is the value that binds a
client's role to this tenant. If a profile predates this endpoint it gets one on first read, which is
an idempotent backfill rather than a silent behaviour change.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.cloud.onboarding import is_valid_external_id, new_external_id, onboarding_package
from gds_api.db import get_db
from gds_api.models import CloudConnectionProfile
from gds_api.security import CurrentUser, get_current_user
from gds_api.tenant_binding import bind_tenant

router = APIRouter(prefix="/cloud", tags=["cloud"])


@router.get("/connections/{connection_profile_id}/onboarding")
async def connection_onboarding(
    connection_profile_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """The grant a client runs, for one connection profile."""
    await bind_tenant(db, current_user.tenant_id)
    profile = (
        await db.execute(
            select(CloudConnectionProfile).where(
                CloudConnectionProfile.id == connection_profile_id,
                CloudConnectionProfile.tenant_id == current_user.tenant_id,
            )
        )
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "connection profile not found")

    generated = False
    if not is_valid_external_id(profile.external_id):
        profile.external_id = new_external_id()
        generated = True
        await db.commit()

    try:
        package = onboarding_package(provider=profile.provider, external_id=profile.external_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    return {
        "connection_profile_id": str(profile.id),
        "provider": profile.provider,
        "environment_id": str(profile.environment_id),
        "authentication_type": profile.authentication_type,
        "role_or_principal_reference": profile.role_or_principal_reference,
        "external_id_generated_now": generated,
        "onboarding": package,
    }
