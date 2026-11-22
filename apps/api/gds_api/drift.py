"""Configuration drift and runtime posture.

Measured 22 Nov 2026: the drift page called ConfigurationDrift, ConfigurationBaseline, ConfigurationCorrection and
DriftAlertConfig, and the runtime page called RuntimeThreat 16 times. None of the four had a table and the only route in
the area was POST /actions/cloud/{account_id}/drift-remediate, so both pages rendered nothing over data nobody had.

These routes read rows a collector actually measured: scripts/ops/drift_scan.py for host configuration against an
approved baseline, scripts/ops/collect_runtime_posture.py for container posture from docker inspect. Every field is
named after what it holds, and the runtime payload carries the same names the page already reads.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_db
from .security import require_permission

router = APIRouter(tags=["drift"])


class DriftOut(BaseModel):
    id: uuid.UUID
    asset: str
    setting_key: str
    drift_type: str
    severity: str
    expected_value: str | None
    actual_value: str | None
    status: str
    auto_correctable: bool
    risk_score: int | None
    detected_at: datetime
    corrected_at: datetime | None


class BaselineOut(BaseModel):
    id: uuid.UUID
    name: str
    target: str
    is_approved: bool
    approved_by: str | None
    approved_at: datetime | None
    captured_at: datetime
    settings_count: int
    settings_checksum: str


class DriftConfigOut(BaseModel):
    id: uuid.UUID | None = None
    is_enabled: bool = True
    asset_types: list[str] = []
    severities: list[str] = ["critical"]
    auto_fix_enabled: bool = False
    updated_by: str | None = None
    updated_at: datetime | None = None


class DriftConfigIn(BaseModel):
    is_enabled: bool | None = None
    asset_types: list[str] | None = None
    severities: list[str] | None = None
    auto_fix_enabled: bool | None = None
    updated_by: str | None = None


class DriftPatch(BaseModel):
    status: str
    corrected_at: datetime | None = None


class RuntimePostureOut(BaseModel):
    """Named for the page's own fields, with the measurements kept beside them."""

    id: uuid.UUID
    service_name: str
    threat_type: str
    mitre_technique: str | None
    status: str
    severity: str
    container_id: str
    host: str
    image: str | None
    state: str | None
    privileged: bool
    host_network: bool
    host_pid: bool
    host_ipc: bool
    read_only_rootfs: bool | None
    user_account: str | None
    caps_added: list[str] = []
    mounts_count: int | None
    posture_violations: list[str] = []
    risk_score: int
    collected_at: datetime


@router.get("/drift/findings", response_model=list[DriftOut])
async def list_drift(
    status_filter: str | None = None,
    limit: int = 300,
    current_user=Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> list[DriftOut]:
    """Drift rows, newest first. Filtering by status happens here so a caller does not page the whole table."""
    # The predicate is assembled rather than written as ":status IS NULL OR status = :status": a parameter that only
    # appears in a null test gives asyncpg nothing to type, and the route answered 500 before this was measured.
    where = "tenant_id = :t"
    params: dict = {"t": current_user.tenant_id, "limit": min(max(limit, 1), 1000)}
    if status_filter:
        where += " AND status = :status"
        params["status"] = status_filter
    rows = (await db.execute(text(
        "SELECT id, asset, setting_key, drift_type, severity, expected_value, actual_value, status, "
        "auto_correctable, risk_score, detected_at, corrected_at FROM configuration_drift "
        f"WHERE {where} ORDER BY detected_at DESC LIMIT :limit"
    ), params)).mappings().all()
    return [DriftOut(**dict(r)) for r in rows]


@router.patch("/drift/findings/{drift_id}", response_model=DriftOut)
async def correct_drift(
    drift_id: uuid.UUID,
    patch: DriftPatch,
    current_user=Depends(require_permission("findings:write")),
    db: AsyncSession = Depends(get_db),
) -> DriftOut:
    """Mark a drift corrected. It records when, and refuses an unknown status rather than storing any string."""
    if patch.status not in {"detected", "corrected", "accepted"}:
        raise HTTPException(http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "status must be detected, corrected or accepted")
    row = (await db.execute(text(
        "UPDATE configuration_drift SET status = :status, "
        "corrected_at = CASE WHEN :status = 'corrected' THEN COALESCE(:at, now()) ELSE NULL END "
        "WHERE tenant_id = :t AND id = :id RETURNING id"
    ), {"status": patch.status, "at": patch.corrected_at, "t": current_user.tenant_id, "id": drift_id})).first()
    if row is None:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Drift row not found")
    await db.commit()
    out = (await db.execute(text(
        "SELECT id, asset, setting_key, drift_type, severity, expected_value, actual_value, status, "
        "auto_correctable, risk_score, detected_at, corrected_at FROM configuration_drift "
        "WHERE tenant_id = :t AND id = :id"
    ), {"t": current_user.tenant_id, "id": drift_id})).mappings().first()
    return DriftOut(**dict(out))


@router.get("/drift/baselines", response_model=list[BaselineOut])
async def list_baselines(
    current_user=Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> list[BaselineOut]:
    """Every baseline captured for this tenant, newest first, with how many settings each one holds."""
    rows = (await db.execute(text(
        "SELECT id, name, target, is_approved, approved_by, approved_at, captured_at, settings_checksum, "
        "(SELECT count(*) FROM jsonb_object_keys(settings)) AS settings_count "
        "FROM config_baselines WHERE tenant_id = :t ORDER BY captured_at DESC"
    ), {"t": current_user.tenant_id})).mappings().all()
    return [BaselineOut(**dict(r)) for r in rows]


@router.get("/drift/config", response_model=DriftConfigOut)
async def get_drift_config(
    current_user=Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> DriftConfigOut:
    """The stored alert settings, or the defaults when none were ever saved. Defaults are not claimed as saved."""
    row = (await db.execute(text(
        "SELECT id, is_enabled, asset_types, severities, auto_fix_enabled, updated_by, updated_at "
        "FROM drift_alert_configs WHERE tenant_id = :t ORDER BY updated_at DESC LIMIT 1"
    ), {"t": current_user.tenant_id})).mappings().first()
    if row is None:
        return DriftConfigOut()
    return DriftConfigOut(**dict(row))


async def _save_drift_config(payload: DriftConfigIn, current_user, db: AsyncSession) -> DriftConfigOut:
    row = (await db.execute(text(
        "SELECT id FROM drift_alert_configs WHERE tenant_id = :t ORDER BY updated_at DESC LIMIT 1"
    ), {"t": current_user.tenant_id})).first()
    values = {
        "is_enabled": payload.is_enabled,
        "asset_types": payload.asset_types,
        "severities": payload.severities,
        "auto_fix_enabled": payload.auto_fix_enabled,
        "updated_by": payload.updated_by or current_user.email,
    }
    if row is None:
        await db.execute(text(
            "INSERT INTO drift_alert_configs (tenant_id, is_enabled, asset_types, severities, auto_fix_enabled, updated_by) "
            "VALUES (:t, COALESCE(CAST(:enabled AS boolean), true), COALESCE(CAST(:types AS text[]), '{}'), "
            "COALESCE(CAST(:sevs AS text[]), '{critical}'), COALESCE(CAST(:auto AS boolean), false), :by)"
        ), {"t": current_user.tenant_id, "enabled": values["is_enabled"], "types": values["asset_types"] or [],
            "sevs": values["severities"] or [], "auto": values["auto_fix_enabled"], "by": values["updated_by"]})
    else:
        await db.execute(text(
            "UPDATE drift_alert_configs SET is_enabled = COALESCE(CAST(:enabled AS boolean), is_enabled), "
            "asset_types = COALESCE(CAST(:types AS text[]), asset_types), "
            "severities = COALESCE(CAST(:sevs AS text[]), severities), "
            "auto_fix_enabled = COALESCE(CAST(:auto AS boolean), auto_fix_enabled), updated_by = :by, updated_at = now() "
            "WHERE tenant_id = :t AND id = :id"
        ), {"enabled": values["is_enabled"], "types": values["asset_types"], "sevs": values["severities"],
            "auto": values["auto_fix_enabled"], "by": values["updated_by"], "t": current_user.tenant_id,
            "id": row[0]})
    await db.commit()
    return await get_drift_config(current_user=current_user, db=db)


@router.put("/drift/config", response_model=DriftConfigOut)
async def put_drift_config(
    payload: DriftConfigIn,
    current_user=Depends(require_permission("findings:write")),
    db: AsyncSession = Depends(get_db),
) -> DriftConfigOut:
    return await _save_drift_config(payload, current_user, db)


@router.post("/drift/config", response_model=DriftConfigOut)
async def post_drift_config(
    payload: DriftConfigIn,
    current_user=Depends(require_permission("findings:write")),
    db: AsyncSession = Depends(get_db),
) -> DriftConfigOut:
    """The settings page creates when it finds no row and updates when it does; both reach the same single row."""
    return await _save_drift_config(payload, current_user, db)


@router.get("/runtime/posture", response_model=list[RuntimePostureOut])
async def list_runtime_posture(
    only_violations: bool = True,
    limit: int = 100,
    current_user=Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> list[RuntimePostureOut]:
    """Container posture from the last collection.

    service_name is the container name and threat_type names the violation, because that is what the page reads. A
    container with no violation is not a threat and is excluded unless only_violations=false.
    """
    rows = (await db.execute(text(
        "SELECT id, container_name, posture_violations, mitre_technique, severity, container_id, host, image, state, "
        "privileged, host_network, host_pid, host_ipc, read_only_rootfs, user_account, caps_added, mounts_count, "
        "risk_score, collected_at FROM runtime_posture WHERE tenant_id = :t "
        "AND (CAST(:only_violations AS boolean) = false OR jsonb_array_length(posture_violations) > 0) "
        "ORDER BY risk_score DESC, container_name LIMIT :limit"
    ), {"t": current_user.tenant_id, "only_violations": only_violations,
        "limit": min(max(limit, 1), 500)})).mappings().all()
    return [_posture_payload(r) for r in rows]


def _posture_payload(row) -> RuntimePostureOut:
    """Rename the measured columns to the fields the page reads, keeping the measurements alongside them."""
    import json

    data = dict(row)
    violations = data.pop("posture_violations") or []
    if isinstance(violations, str):
        violations = json.loads(violations)
    return RuntimePostureOut(
        service_name=data.pop("container_name"),
        threat_type=", ".join(v.replace("_", " ") for v in violations) or "no violation",
        status="observed",
        posture_violations=list(violations),
        **data,
    )


@router.get("/runtime/summary", response_model=dict)
async def runtime_summary(
    current_user=Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """What was inspected, not only what was found. States plainly that this platform has no process-level sensor."""
    row = (await db.execute(text(
        "SELECT count(*) AS containers, "
        "count(*) FILTER (WHERE jsonb_array_length(posture_violations) > 0) AS with_violations, "
        "count(*) FILTER (WHERE privileged) AS privileged, "
        "count(*) FILTER (WHERE host_network) AS host_network, "
        "count(*) FILTER (WHERE host_pid) AS host_pid, "
        "count(*) FILTER (WHERE severity = 'high') AS high, "
        "count(*) FILTER (WHERE severity = 'medium') AS medium, "
        "count(*) FILTER (WHERE severity = 'low') AS low, "
        "max(collected_at) AS collected_at "
        "FROM runtime_posture WHERE tenant_id = :t"
    ), {"t": current_user.tenant_id})).mappings().first()
    return {
        **dict(row),
        "sensor": "container posture only (docker inspect); no process-level runtime sensor on this platform",
        "basis": "counts cover every container recorded at the last collection, not a page of them",
    }
