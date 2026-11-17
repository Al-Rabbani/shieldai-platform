"""Execute a real cloud discovery job: adapter -> upsert -> job outcome.

Everything either side of this module already existed and worked in isolation: the provider
adapters enumerate real resources (AWSProviderAdapter.discover_assets), assets.upsert_asset
writes them idempotently, and start_discovery created the job, the mission and the capability
decision. Nothing connected the three, so POST /cloud/discovery-jobs raised a 500 from
capabilities/broker.py (KeyError: 'discover_cloud_environment' - the tool it asks for was never
registered) and no environment could ever hold an asset.

This module is that connection, and it is deliberately honest about failure: an adapter error,
a missing connection profile or a missing adapter marks the job failed with the real reason
rather than leaving it "running" forever.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.cloud.adapter import get_adapter
from gds_api.cloud.assets import upsert_asset
from gds_api.models import CloudAsset, CloudConnectionProfile, CloudDiscoveryJob


class DiscoveryRunError(Exception):
    """A discovery run that genuinely could not proceed, with the reason to record on the job."""


def _set_if_present(job: CloudDiscoveryJob, **values: object) -> None:
    """Set only attributes the model actually has, so a schema rename cannot silently drop counts."""
    for key, value in values.items():
        if hasattr(job, key):
            setattr(job, key, value)


async def run_discovery(
    db: AsyncSession, *, tenant_id: uuid.UUID, job_id: uuid.UUID
) -> dict[str, object]:
    job = (
        await db.execute(
            select(CloudDiscoveryJob).where(
                CloudDiscoveryJob.id == job_id, CloudDiscoveryJob.tenant_id == tenant_id
            )
        )
    ).scalars().first()
    if job is None:
        raise DiscoveryRunError(f"discovery job {job_id} not found for this tenant")

    _set_if_present(job, status="running", started_at=datetime.now(timezone.utc))

    profile = (
        await db.execute(
            select(CloudConnectionProfile)
            .where(
                CloudConnectionProfile.tenant_id == tenant_id,
                CloudConnectionProfile.environment_id == job.environment_id,
            )
            .order_by(CloudConnectionProfile.created_at.desc())
        )
    ).scalars().first()
    if profile is None:
        reason = (
            "no connection profile for this environment - create one via POST /cloud/connections "
            "before discovering"
        )
        _set_if_present(job, status="failed", completed_at=datetime.now(timezone.utc),
                        errors=[reason])
        return {"success": False, "status": "failed", "reason": reason}

    adapter = get_adapter(profile.provider)
    if adapter is None:
        reason = f"no adapter registered for provider {profile.provider!r}"
        _set_if_present(job, status="failed", completed_at=datetime.now(timezone.utc),
                        errors=[reason])
        return {"success": False, "status": "failed", "reason": reason}

    scope = str(job.environment.native_id if getattr(job, "environment", None) else "")
    if not scope:
        from gds_api.models import CloudEnvironment

        env = (
            await db.execute(
                select(CloudEnvironment).where(
                    CloudEnvironment.id == job.environment_id,
                    CloudEnvironment.tenant_id == tenant_id,
                )
            )
        ).scalars().first()
        if env is None:
            raise DiscoveryRunError(f"environment {job.environment_id} not found for this tenant")
        scope = env.native_id

    discovered = created = updated = 0
    report: dict[str, dict[str, object]] = {}
    try:
        try:
            stream = adapter.discover_assets(profile, scope, report)
        except TypeError:
            # An adapter that does not take the optional report still gets to run.
            stream = adapter.discover_assets(profile, scope)
        async for normalized in stream:
            asset, was_created, _changes = await upsert_asset(
                db,
                tenant_id=tenant_id,
                environment_id=job.environment_id,
                discovery_job_id=job.id,
                normalized=normalized,
            )
            discovered += 1
            created += 1 if was_created else 0
            updated += 0 if was_created else 1
        await db.flush()
    except Exception as exc:  # an adapter failure is recorded, never hidden
        reason = f"{type(exc).__name__}: {exc}"[:500]
        _set_if_present(job, status="failed", completed_at=datetime.now(timezone.utc),
                        errors=[reason], assets_discovered=discovered)
        return {"success": False, "status": "failed", "reason": reason, "assets": discovered}

    # What the adapter contained, made visible. A category that failed and a category that found
    # nothing used to look identical on this row, so a run that skipped everything regional still
    # reported "completed, errors=[]". Region source and per-category yields now travel with the job.
    errors = [
        f"{category}: {detail['error']}"
        for category, detail in sorted(report.items())
        if isinstance(detail, dict) and detail.get("error")
    ]
    warnings = []
    region_info = report.get("regions")
    if isinstance(region_info, dict):
        warnings.append(
            f"regions from {region_info.get('source')}: {region_info.get('yielded')} region(s)"
        )
        if region_info.get("error"):
            warnings.append(f"region resolution: {region_info['error']}")
    yielded_by_category = {
        category: detail.get("yielded")
        for category, detail in report.items()
        if isinstance(detail, dict) and category != "regions"
    }

    summary = (
        f"discovered {discovered} assets ({created} new, {updated} updated) "
        f"from provider {profile.provider} scope {scope}"
    )
    if errors:
        summary += f"; {len(errors)} categor(ies) failed and are listed in errors"

    _set_if_present(
        job, status="completed", completed_at=datetime.now(timezone.utc),
        assets_discovered=discovered, assets_updated=updated,
        errors=errors or None,
        warnings=warnings or None,
        regions=(region_info.get("regions") if isinstance(region_info, dict) else None),
    )
    stored = (
        await db.execute(
            select(CloudAsset).where(
                CloudAsset.tenant_id == tenant_id,
                CloudAsset.environment_id == job.environment_id,
            )
        )
    ).scalars().all()
    return {
        "success": True, "status": "completed", "assets_discovered": discovered,
        "created": created, "updated": updated,
        "assets_in_environment": len(stored), "summary": summary,
        "errors": errors, "warnings": warnings, "assets_by_category": yielded_by_category,
        "regions": region_info,
    }


async def discover_cloud_environment(payload: dict | None = None, **kwargs: object) -> dict:
    """Capability tool: create the discovery job, run it against the provider, report the outcome.

    Contract note: start_discovery looks the job up by mission_id AFTER this returns, so the
    job row must be created here. Returning a summary without creating the row produced the
    "Capability executed but no CloudDiscoveryJob record was created" inconsistency.
    """
    from sqlalchemy import select

    from gds_api.db import async_session_factory
    from gds_api.models import CloudEnvironment, Mission
    from gds_api.tenant_binding import bind_tenant

    payload = payload or {}
    tenant_raw = payload.get("_tenant_id") or payload.get("tenant_id") or kwargs.get("tenant_id")
    env_raw = payload.get("environment_id")
    raw_mission = (payload.get("_mission_id") or payload.get("mission_id")
                   or kwargs.get("mission_id"))
    raw_user = (payload.get("initiated_by_user_id") or payload.get("user_id")
                or payload.get("_actor_id") or kwargs.get("user_id"))
    if not tenant_raw or not env_raw:
        return {"status": "error", "code": "MISSING_ARGUMENT",
                "detail": "tenant_id and environment_id are required to run discovery"}

    tenant_id = uuid.UUID(str(tenant_raw))
    env_id = uuid.UUID(str(env_raw))
    mission_id = uuid.UUID(str(raw_mission)) if raw_mission else None

    async with async_session_factory() as session:
        await bind_tenant(session, tenant_id)
        env = (
            await session.execute(
                select(CloudEnvironment).where(
                    CloudEnvironment.id == env_id, CloudEnvironment.tenant_id == tenant_id
                )
            )
        ).scalars().first()
        if env is None:
            return {"status": "error", "code": "ENVIRONMENT_NOT_FOUND",
                    "detail": f"no cloud environment {env_id} for this tenant"}

        user_id = uuid.UUID(str(raw_user)) if raw_user else None
        if user_id is None and mission_id is not None:
            mission = (
                await session.execute(
                    select(Mission).where(Mission.id == mission_id,
                                          Mission.tenant_id == tenant_id)
                )
            ).scalars().first()
            user_id = getattr(mission, "requested_by_user_id", None) if mission else None
        if user_id is None:
            return {"status": "error", "code": "UNKNOWN_INITIATOR",
                    "detail": "cannot determine who initiated this discovery; job not created"}

        job = CloudDiscoveryJob(
            tenant_id=tenant_id,
            environment_id=env_id,
            provider=env.provider,
            mission_id=mission_id,
            initiated_by_user_id=user_id,
            requested_scope={"native_id": env.native_id},
            discovery_categories=list(payload.get("discovery_categories") or []),
            status="queued",
        )
        session.add(job)
        await session.flush()

        result = await run_discovery(session, tenant_id=tenant_id, job_id=job.id)
        await session.commit()
        result["discovery_job_id"] = str(job.id)
        return result
