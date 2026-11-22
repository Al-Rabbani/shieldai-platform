"""The tenant's team roster.

Four routed pages ask for a TeamMember entity to fill assignment dropdowns: Assets, Risk Thresholds, Vulnerability
Management and the escalation settings page. The adapter refused the name, so every one of those dropdowns was empty
while the platform held real people.

Measured 22 Nov 2026 before writing this: there is no team_members table. `users` carries id, tenant_id, role_id, email,
is_active, created_at and the MFA columns, and `roles` carries name, so a roster of real identities is available without
inventing anything. There is no display-name column anywhere, so the page's `name` is filled from the email, which is the
identity this platform actually holds.

WHAT THIS ROUTE DOES NOT SERVE, so a page can say it instead of printing zero:
  - slack_user_id: no Slack identity is stored on this platform, for any user.
  - per-member escalation settings: no such store exists. The escalation page writes TeamMember.update, which therefore
    refuses with a reason rather than pretending to save.

Only identity fields leave this module. password_hash and the MFA columns are never selected, so they cannot leak into a
response, a log line or a browser bundle.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, get_current_user

router = APIRouter(prefix="/team", tags=["team"])

_LIST_SQL = """
SELECT u.id,
       u.email,
       u.is_active,
       u.created_at,
       r.name AS role_name
  FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
 WHERE u.tenant_id = :tenant_id
 ORDER BY u.created_at
"""

_SUMMARY_SQL = """
SELECT count(*) AS total,
       count(*) FILTER (WHERE u.is_active) AS active,
       count(*) FILTER (WHERE NOT u.is_active) AS inactive,
       count(DISTINCT u.role_id) AS roles_used,
       min(u.created_at) AS first_joined,
       max(u.created_at) AS newest_joined
  FROM users u
 WHERE u.tenant_id = :tenant_id
"""

_ROLE_SQL = """
SELECT COALESCE(r.name, 'no role assigned') AS role_name,
       count(*) AS members,
       count(*) FILTER (WHERE u.is_active) AS active
  FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
 WHERE u.tenant_id = :tenant_id
 GROUP BY 1
 ORDER BY 2 DESC, 1
"""

NOT_SERVED = {
    "slack_user_id": "No Slack identity is stored on this platform, for any user.",
    "escalation_settings": "There is no per-member escalation store here, so no member can carry a threshold.",
}


def _iso(value):
    return value.isoformat() if isinstance(value, datetime) else value


def _member(row) -> dict:
    m = row._mapping
    return {
        "id": str(m["id"]),
        "email": m["email"],
        # The platform holds no display name. Filling it with the email keeps the value real rather than blank or made up.
        "name": m["email"],
        "role": m["role_name"],
        "is_active": m["is_active"],
        "created_at": _iso(m["created_at"]),
    }


@router.get("/members")
async def list_team_members(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Every user in the caller's own tenant, with their role name and active state."""
    rows = (await db.execute(text(_LIST_SQL), {"tenant_id": str(current_user.tenant_id)})).all()
    members = [_member(row) for row in rows]
    return {
        "members": members,
        "count": len(members),
        "tenant_scoped": True,
        "not_served": NOT_SERVED,
    }


@router.get("/summary")
async def team_summary(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    params = {"tenant_id": str(current_user.tenant_id)}
    totals = (await db.execute(text(_SUMMARY_SQL), params)).first()._mapping
    roles = (await db.execute(text(_ROLE_SQL), params)).all()
    return {
        "total": totals["total"],
        "active": totals["active"],
        "inactive": totals["inactive"],
        "roles_used": totals["roles_used"],
        "first_joined": _iso(totals["first_joined"]),
        "newest_joined": _iso(totals["newest_joined"]),
        "by_role": [
            {"role": r._mapping["role_name"], "members": r._mapping["members"], "active": r._mapping["active"]}
            for r in roles
        ],
        "tenant_scoped": True,
        "not_served": NOT_SERVED,
    }
