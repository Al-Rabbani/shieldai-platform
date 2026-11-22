"""What the offensive side of this platform actually holds.

The Red Team Command and Pentest Results pages render four counters that are all fetched-array lengths over entity names
with no store: CloudAttackPath, AttackSimulation, PentestCampaign and AttackFinding. Measured 22 Nov 2026, none of those
tables exists (information_schema matched only prompt_attacks for '%attack%'), so every one of those counters printed 0 -
an absence dressed as a measured zero, next to a real risk score.

What does exist, and was invisible to those pages:
  authorized_targets        2 rows, the only written authorisation on the platform
  red_team_safety_state     1 row, the emergency-stop latch
  engagements               0 rows
  pentest_authorizations    0 rows - the authorisation path has never been exercised
  pentest_agreements        0 rows

This route states both halves. Counts are real counts; an absent store is named in `not_served` and never returned as 0.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission
from gds_api.redteam import get_safety_state

router = APIRouter(prefix="/red-team", tags=["red-team-overview"])

_TARGETS_SQL = """
SELECT target, target_type, status, valid_from, valid_until, max_actions_per_hour
  FROM authorized_targets
 WHERE tenant_id = :tenant_id
 ORDER BY created_at DESC
"""

_COUNT_SQL = """
SELECT (SELECT count(*) FROM authorized_targets WHERE tenant_id = :tenant_id) AS targets_total,
       (SELECT count(*) FROM authorized_targets WHERE tenant_id = :tenant_id AND status = 'active') AS targets_active,
       (SELECT count(*) FROM engagements WHERE tenant_id = :tenant_id) AS engagements_total,
       (SELECT count(*) FROM pentest_authorizations WHERE tenant_id = :tenant_id) AS authorizations_total,
       (SELECT count(*) FROM pentest_agreements WHERE tenant_id = :tenant_id) AS agreements_total
"""

NOT_SERVED = {
    "CloudAttackPath": "No attack-path store exists on this platform and the asset relationship graph holds no edges.",
    "AttackSimulation": "No simulation store exists, so no simulation has ever been recorded.",
    "PentestCampaign": "No campaign store exists; engagements are the real record and there are none.",
    "AttackFinding": "No attack-finding store exists. Pentest results would be scanner findings, and no pentest has run.",
}


def _iso(value):
    return value.isoformat() if isinstance(value, datetime) else value


@router.get("/overview")
async def red_team_overview(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("redteam:read")),
) -> dict:
    params = {"tenant_id": str(current_user.tenant_id)}
    counts = (await db.execute(text(_COUNT_SQL), params)).first()._mapping
    rows = (await db.execute(text(_TARGETS_SQL), params)).all()
    state = await get_safety_state(db, current_user.tenant_id)
    await db.commit()
    return {
        "emergency_stop_engaged": state.emergency_stop_engaged,
        "emergency_stop_engaged_at": _iso(state.engaged_at),
        "targets_total": counts["targets_total"],
        "targets_active": counts["targets_active"],
        "engagements_total": counts["engagements_total"],
        "authorizations_total": counts["authorizations_total"],
        "agreements_total": counts["agreements_total"],
        "authorization_path_exercised": counts["authorizations_total"] > 0,
        "targets": [
            {
                "target": r._mapping["target"],
                "target_type": r._mapping["target_type"],
                "status": r._mapping["status"],
                "valid_from": _iso(r._mapping["valid_from"]),
                "valid_until": _iso(r._mapping["valid_until"]),
                "max_actions_per_hour": r._mapping["max_actions_per_hour"],
            }
            for r in rows
        ],
        "tenant_scoped": True,
        "not_served": NOT_SERVED,
    }
