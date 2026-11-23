"""The platform settings page's real store, and the one setting that changes behaviour.

Measured 23 Nov 2026: GDSSettingsPage wrote OrgSettings.update/create behind `.catch(() => {})` and then showed
"Settings saved" unconditionally, so nothing was ever written and nothing ever failed visibly. No settings table existed.

Only the SLA hours change how the platform behaves: POST /findings/escalate-stale now reads them through hours_override()
and falls back to the cron script's ladder per severity when a column is NULL. Every other column here records what an
operator asked for; the route reports that distinction in `enforced_by` so a toggle is never mistaken for an engine.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/settings/org", tags=["settings"])

_COLUMNS = (
    "organization_name, domain, industry, sla_critical_hours, sla_high_hours, sla_medium_hours, data_residency, "
    "retention_days, auto_triage_enabled, auto_fix_enabled, ci_gate_enabled, mfa_required, updated_at"
)

_SELECT = f"SELECT {_COLUMNS} FROM org_settings WHERE tenant_id = :tenant_id"

# Per-severity hours, read by the escalation route. A NULL column is left out so the caller keeps the platform ladder.
_HOURS_SQL = """
SELECT sla_critical_hours, sla_high_hours, sla_medium_hours
  FROM org_settings
 WHERE tenant_id = :tenant_id
"""

_UPSERT = f"""
INSERT INTO org_settings (tenant_id, organization_name, domain, industry, sla_critical_hours, sla_high_hours,
                          sla_medium_hours, data_residency, retention_days, auto_triage_enabled, auto_fix_enabled,
                          ci_gate_enabled, mfa_required, updated_by)
VALUES (:tenant_id, :organization_name, :domain, :industry, :sla_critical_hours, :sla_high_hours, :sla_medium_hours,
        :data_residency, :retention_days, :auto_triage_enabled, :auto_fix_enabled, :ci_gate_enabled, :mfa_required,
        :updated_by)
ON CONFLICT (tenant_id) DO UPDATE
   SET organization_name = EXCLUDED.organization_name,
       domain = EXCLUDED.domain,
       industry = EXCLUDED.industry,
       sla_critical_hours = EXCLUDED.sla_critical_hours,
       sla_high_hours = EXCLUDED.sla_high_hours,
       sla_medium_hours = EXCLUDED.sla_medium_hours,
       data_residency = EXCLUDED.data_residency,
       retention_days = EXCLUDED.retention_days,
       auto_triage_enabled = EXCLUDED.auto_triage_enabled,
       auto_fix_enabled = EXCLUDED.auto_fix_enabled,
       ci_gate_enabled = EXCLUDED.ci_gate_enabled,
       mfa_required = EXCLUDED.mfa_required,
       updated_by = EXCLUDED.updated_by,
       updated_at = now()
"""

# What a stored value actually does today. Stated by the API so the page cannot imply an engine that does not exist.
ENFORCED_BY = {
    "sla_critical_hours": "findings escalation: a critical finding past this many hours is escalated to a human",
    "sla_high_hours": "findings escalation: a high finding past this many hours is escalated to a human",
    "sla_medium_hours": "findings escalation: a medium finding past this many hours is escalated to a human",
    "auto_triage_enabled": None,
    "auto_fix_enabled": None,
    "ci_gate_enabled": None,
    "mfa_required": None,
    "retention_days": None,
    "data_residency": None,
    "organization_name": None,
    "domain": None,
    "industry": None,
}


class OrgSettingsIn(BaseModel):
    organization_name: str = ""
    domain: str = ""
    industry: str = ""
    sla_critical_hours: int | None = Field(default=None, ge=1, le=8760)
    sla_high_hours: int | None = Field(default=None, ge=1, le=8760)
    sla_medium_hours: int | None = Field(default=None, ge=1, le=8760)
    data_residency: str = "eu"
    retention_days: int = Field(default=90, ge=1, le=3650)
    auto_triage_enabled: bool = False
    auto_fix_enabled: bool = False
    ci_gate_enabled: bool = False
    mfa_required: bool = False


def _row(r: Any) -> dict:
    m = r._mapping
    out = {k: m[k] for k in m.keys()}
    out["updated_at"] = m["updated_at"].isoformat() if m["updated_at"] else None
    return out


async def hours_override(db: AsyncSession, tenant_id) -> dict[str, int]:
    """Tenant SLA hours, per severity, for whichever columns are set. Empty when the tenant has stored none."""
    row = (await db.execute(text(_HOURS_SQL), {"tenant_id": str(tenant_id)})).first()
    if row is None:
        return {}
    m = row._mapping
    pairs = {"critical": m["sla_critical_hours"], "high": m["sla_high_hours"], "medium": m["sla_medium_hours"]}
    return {sev: hours for sev, hours in pairs.items() if hours}


@router.get("")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
) -> dict:
    row = (await db.execute(text(_SELECT), {"tenant_id": str(current_user.tenant_id)})).first()
    stored = row is not None
    settings = _row(row) if stored else {
        "organization_name": "", "domain": "", "industry": "",
        "sla_critical_hours": None, "sla_high_hours": None, "sla_medium_hours": None,
        "data_residency": "eu", "retention_days": 90,
        "auto_triage_enabled": False, "auto_fix_enabled": False, "ci_gate_enabled": False, "mfa_required": False,
        "updated_at": None,
    }
    return {
        "settings": settings,
        "stored": stored,
        "tenant_scoped": True,
        "enforced_by": ENFORCED_BY,
        "basis": (
            "SLA hours change when a finding is escalated. Every other field is recorded only: no auto-triage, auto-fix, "
            "CI-gate toggle, MFA requirement, retention or residency behaviour reads it."
        ),
    }


@router.put("")
async def put_settings(
    body: OrgSettingsIn,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("settings:write")),
) -> dict:
    params = {"tenant_id": str(current_user.tenant_id), "updated_by": str(current_user.user_id), **body.model_dump()}
    await db.execute(text(_UPSERT), params)
    await db.commit()
    row = (await db.execute(text(_SELECT), {"tenant_id": params["tenant_id"]})).first()
    return {
        "settings": _row(row),
        "stored": True,
        "tenant_scoped": True,
        "enforced_by": ENFORCED_BY,
        "basis": "Saved. Only the SLA hours change platform behaviour; the rest are recorded only.",
    }
