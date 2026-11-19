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

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.cloud.adapter import get_adapter
from gds_api.cloud.assets import upsert_asset
from gds_api.models import (
    CloudAsset,
    CloudConnectionProfile,
    CloudDiscoveryJob,
    CloudInventorySnapshot,
)


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

    # A real inventory snapshot for this run. Without it every environment-level policy found
    # snapshot=None and fell through to INDETERMINATE, because the evaluator refuses to treat
    # absence as a finding without a completeness record. Measured on the live account: CloudTrail,
    # Config recorder and GuardDuty all sat indeterminate although none is enabled - three real
    # findings suppressed by a missing row, not by any uncertainty about the account.
    snapshot_id = None
    try:
        counts_rows = (
            await db.execute(
                select(CloudAsset.normalized_category, func.count())
                .where(
                    CloudAsset.tenant_id == tenant_id,
                    CloudAsset.environment_id == job.environment_id,
                    CloudAsset.discovery_job_id == job.id,
                )
                .group_by(CloudAsset.normalized_category)
            )
        ).all()
        failed_categories = sorted(
            {
                str(category).split(":", 1)[0]
                for category, detail in report.items()
                if isinstance(detail, dict) and detail.get("error")
            }
        )
        snapshot = CloudInventorySnapshot(
            tenant_id=tenant_id,
            environment_id=job.environment_id,
            provider=profile.provider,
            discovery_job_id=job.id,
            started_at=job.started_at or datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
            status="completed" if not errors else "partially_completed",
            resource_counts_by_category={str(cat): int(n) for cat, n in counts_rows},
            relationship_count=0,
            regions_covered=list(region_info.get("regions") or []) if isinstance(region_info, dict) else [],
            failed_scopes=failed_categories,
            warnings=warnings,
            completeness_status="complete" if not errors else "partial",
        )
        db.add(snapshot)
        await db.flush()
        snapshot_id = snapshot.id
        await db.execute(
            update(CloudAsset)
            .where(
                CloudAsset.tenant_id == tenant_id,
                CloudAsset.environment_id == job.environment_id,
                CloudAsset.discovery_job_id == job.id,
            )
            .values(inventory_snapshot_id=snapshot.id)
        )
    except Exception as exc:  # noqa: BLE001 - the assets are already stored; never lose them for this
        warnings.append(f"inventory snapshot not recorded: {type(exc).__name__}: {exc}"[:250])

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
        "regions": region_info, "inventory_snapshot_id": str(snapshot_id) if snapshot_id else None,
    }



def _provider_not_connected(provider: str) -> dict:
    """Say exactly which provider is unconnected and what connecting it requires."""
    from gds_api.cloud.providers import get_provider, list_providers

    registered = sorted(p.provider_id for p in list_providers())
    definition = get_provider(provider) if provider else None
    if definition is None:
        return {
            "status": "error",
            "code": "UNKNOWN_PROVIDER",
            "provider": provider or None,
            "registered_providers": registered,
            "detail": f"'{provider}' is not a registered cloud provider",
        }
    return {
        "status": "error",
        "code": "PROVIDER_NOT_CONNECTED",
        "provider": definition.provider_id,
        "display_name": definition.display_name,
        "detail": (
            f"no {definition.display_name} environment is registered for this tenant, so discovery "
            "has nothing to scan - the provider itself is implemented and registered"
        ),
        "required_to_connect": [
            "register a cloud environment for this provider (native_id is the account, "
            "subscription or project identifier)",
            "register a read-only connection profile for it",
        ],
        "supported_authentication_mechanisms": list(definition.supported_authentication_mechanisms),
        "registered_providers": registered,
    }


def _uuid_or_none(value: object) -> "uuid.UUID | None":
    """Parse a UUID, or None when the value is absent or is a non-UUID reference."""
    if not value:
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        return None


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
    provider_raw = str(payload.get("provider") or kwargs.get("provider") or "").strip().lower()
    if not tenant_raw:
        return {"status": "error", "code": "MISSING_ARGUMENT",
                "detail": "tenant_id is required to run discovery"}
    if not env_raw and not provider_raw:
        return {"status": "error", "code": "MISSING_ARGUMENT",
                "detail": "environment_id or provider is required to run discovery"}

    tenant_id = uuid.UUID(str(tenant_raw))
    env_id = _uuid_or_none(env_raw)
    # 19 Nov 2026: a kernel-style mission reference ("mission-abc123") is not a UUID and raised
    # "badly formed hexadecimal UUID string", so every agent-driven discovery failed before it
    # touched AWS. The mission link is useful but not required: an unparseable reference is
    # dropped and the discovery proceeds, rather than the whole scan dying on a label.
    mission_id = _uuid_or_none(raw_mission)

    async with async_session_factory() as session:
        await bind_tenant(session, tenant_id)
        if env_id is not None:
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
        else:
            # A provider-only request is how an agent asks "scan my Azure estate". Before this, it
            # answered "environment_id is required", which named an argument rather than the real
            # cause and hid the fact that the provider was never connected at all.
            candidates = (
                await session.execute(
                    select(CloudEnvironment).where(
                        CloudEnvironment.tenant_id == tenant_id,
                        CloudEnvironment.provider == provider_raw,
                    )
                )
            ).scalars().all()
            if not candidates:
                return _provider_not_connected(provider_raw)
            if len(candidates) > 1:
                return {
                    "status": "error",
                    "code": "AMBIGUOUS_ENVIRONMENT",
                    "provider": provider_raw,
                    "detail": (
                        f"this tenant has {len(candidates)} {provider_raw} environments; "
                        "name one with environment_id"
                    ),
                    "environments": [
                        {"environment_id": str(c.id), "native_id": c.native_id,
                         "environment_type": getattr(c, "environment_type", None)}
                        for c in candidates
                    ],
                }
            env = candidates[0]
        env_id = env.id

        # _actor_id from the capability gateway is the AGENT name ("security_architecture"),
        # not a user id, so a naive uuid.UUID() raised and killed the whole discovery. A
        # non-UUID actor is treated as unknown here and the mission's real initiator is used
        # instead; if neither yields a real user the function refuses with UNKNOWN_INITIATOR.
        user_id = _uuid_or_none(raw_user)
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
