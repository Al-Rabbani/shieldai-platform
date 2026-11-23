"""Assignment rules that actually assign.

Measured 23 Nov 2026: AssignmentRulesPage saved rules into a table that did not exist and told the user "New findings
matching it are assigned on discovery", while nothing in the repo assigned anything and security_findings had no owner
column. The page's only action button called gdsAutoAssignFindings with action "escalate_stale" - escalation, a different
concern from assignment.

This module stores the rules, assigns on demand, and never invents a match: a rule matches on severity and source because
those are the columns security_findings carries (0 of 849 open findings carry an asset_type). Assignment never overwrites an
existing owner, and applying twice assigns nothing the second time, which is what makes it safe to run on a schedule.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/assignment-rules", tags=["assignment"])

_COLUMNS = (
    "id, rule_name, match_severity, match_source, owner_team, assignee_name, assignee_email, team_lead_name, "
    "team_lead_email, assignee_slack_user_id, team_lead_slack_user_id, is_active, fire_count, last_fired, created_at"
)

_SELECT = f"SELECT {_COLUMNS} FROM assignment_rules WHERE tenant_id = :tenant_id ORDER BY created_at"
_SELECT_ONE = f"SELECT {_COLUMNS} FROM assignment_rules WHERE tenant_id = :tenant_id AND id = :id"

_INSERT = """
INSERT INTO assignment_rules
       (tenant_id, rule_name, match_severity, match_source, owner_team, assignee_name, assignee_email, team_lead_name,
        team_lead_email, assignee_slack_user_id, team_lead_slack_user_id, is_active, created_by)
VALUES (:tenant_id, :rule_name, :match_severity, :match_source, :owner_team, :assignee_name, :assignee_email,
        :team_lead_name, :team_lead_email, :assignee_slack_user_id, :team_lead_slack_user_id, :is_active, :created_by)
RETURNING id
"""

_UPDATE = """
UPDATE assignment_rules
   SET rule_name = COALESCE(:rule_name, rule_name),
       match_severity = COALESCE(:match_severity, match_severity),
       match_source = COALESCE(:match_source, match_source),
       owner_team = COALESCE(:owner_team, owner_team),
       assignee_name = COALESCE(:assignee_name, assignee_name),
       assignee_email = COALESCE(:assignee_email, assignee_email),
       team_lead_name = COALESCE(:team_lead_name, team_lead_name),
       team_lead_email = COALESCE(:team_lead_email, team_lead_email),
       assignee_slack_user_id = COALESCE(:assignee_slack_user_id, assignee_slack_user_id),
       team_lead_slack_user_id = COALESCE(:team_lead_slack_user_id, team_lead_slack_user_id),
       is_active = COALESCE(:is_active, is_active),
       updated_at = now()
 WHERE tenant_id = :tenant_id AND id = :id
"""

_DELETE = "DELETE FROM assignment_rules WHERE tenant_id = :tenant_id AND id = :id"

_RECORD_FIRE = """
UPDATE assignment_rules
   SET fire_count = fire_count + :assigned, last_fired = now(), updated_at = now()
 WHERE tenant_id = :tenant_id AND id = :id
"""


class RuleIn(BaseModel):
    rule_name: str = Field(min_length=1)
    match_severity: str | None = None
    match_source: str | None = None
    owner_team: str = ""
    assignee_name: str = ""
    assignee_email: str = ""
    team_lead_name: str = ""
    team_lead_email: str = ""
    assignee_slack_user_id: str = ""
    team_lead_slack_user_id: str = ""
    is_active: bool = True


class RulePatch(BaseModel):
    rule_name: str | None = None
    match_severity: str | None = None
    match_source: str | None = None
    owner_team: str | None = None
    assignee_name: str | None = None
    assignee_email: str | None = None
    team_lead_name: str | None = None
    team_lead_email: str | None = None
    assignee_slack_user_id: str | None = None
    team_lead_slack_user_id: str | None = None
    is_active: bool | None = None


class ApplyRequest(BaseModel):
    apply: bool = False


def _row(r) -> dict:
    m = r._mapping
    out = {k: m[k] for k in m.keys()}
    out["id"] = str(m["id"])
    out["last_fired"] = m["last_fired"].isoformat() if m["last_fired"] else None
    out["created_at"] = m["created_at"].isoformat() if m["created_at"] else None
    return out


def _match_clause(rule) -> tuple[str, dict]:
    """Severity and source are the only real match keys. A rule with neither matches every unassigned open finding."""
    where, params = "", {}
    if rule["match_severity"]:
        where += " AND lower(severity) = :severity"
        params["severity"] = rule["match_severity"].strip().lower()
    if rule["match_source"]:
        where += " AND lower(coalesce(source, '')) = :source"
        params["source"] = rule["match_source"].strip().lower()
    return where, params


async def _assignable(db, tenant_id, rule) -> int:
    where, extra = _match_clause(rule)
    sql = f"""
    SELECT count(*) FROM security_findings
     WHERE tenant_id = :tenant_id AND status = 'open' AND owner IS NULL{where}
    """
    return (await db.execute(text(sql), {"tenant_id": str(tenant_id), **extra})).scalar_one()


async def _assign(db, tenant_id, rule) -> int:
    where, extra = _match_clause(rule)
    sql = f"""
    UPDATE security_findings
       SET owner = :owner, owner_assigned_at = now()
     WHERE tenant_id = :tenant_id AND status = 'open' AND owner IS NULL{where}
    RETURNING id
    """
    owner = rule["assignee_email"] or rule["assignee_name"] or rule["owner_team"] or "unassigned-rule"
    rows = (await db.execute(text(sql), {"tenant_id": str(tenant_id), "owner": owner, **extra})).all()
    return len(rows)


@router.get("")
async def list_rules(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:read")),
) -> dict:
    rows = (await db.execute(text(_SELECT), {"tenant_id": str(current_user.tenant_id)})).all()
    items = [_row(r) for r in rows]
    return {
        "items": items,
        "count": len(items),
        "tenant_scoped": True,
        "match_keys": ["match_severity", "match_source"],
        "basis": (
            "Rules match on severity and source, the columns findings carry. Asset type is not stored on any finding "
            "(measured 0 of 849 open rows), so it cannot be a match key. Slack user ids are recorded but nothing "
            "delivers to them: this host holds no Slack bot token."
        ),
    }


@router.post("", status_code=201)
async def create_rule(
    body: RuleIn,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:assign")),
) -> dict:
    params = {"tenant_id": str(current_user.tenant_id), "created_by": str(current_user.user_id), **body.model_dump()}
    new_id = (await db.execute(text(_INSERT), params)).scalar_one()
    await db.commit()
    row = (await db.execute(text(_SELECT_ONE), {"tenant_id": params["tenant_id"], "id": str(new_id)})).first()
    return _row(row)


@router.patch("/{rule_id}")
async def update_rule(
    rule_id: uuid.UUID,
    body: RulePatch,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:assign")),
) -> dict:
    params = {"tenant_id": str(current_user.tenant_id), "id": str(rule_id), **body.model_dump()}
    result = await db.execute(text(_UPDATE), params)
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="No rule with that id in this tenant.")
    row = (await db.execute(text(_SELECT_ONE), {"tenant_id": params["tenant_id"], "id": params["id"]})).first()
    return _row(row)


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:assign")),
) -> Response:
    result = await db.execute(text(_DELETE), {"tenant_id": str(current_user.tenant_id), "id": str(rule_id)})
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="No rule with that id in this tenant.")
    return Response(status_code=204)


@router.post("/apply")
async def apply_rules(
    body: ApplyRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("findings:assign")),
) -> dict:
    """Preview by default. With apply=true it writes, never overwriting an owner that is already set."""
    apply = bool(body.apply) if body else False
    rules = (await db.execute(text(_SELECT), {"tenant_id": str(current_user.tenant_id)})).all()
    per_rule, assigned_total, preview_total = [], 0, 0
    for r in rules:
        rule = _row(r)
        if not rule["is_active"]:
            continue
        assignable = await _assignable(db, current_user.tenant_id, rule)
        preview_total += assignable
        if apply and assignable:
            done = await _assign(db, current_user.tenant_id, rule)
            await db.execute(
                text(_RECORD_FIRE),
                {"tenant_id": str(current_user.tenant_id), "id": rule["id"], "assigned": done},
            )
            assigned_total += done
            per_rule.append({"rule_name": rule["rule_name"], "assigned": done})
        elif assignable:
            per_rule.append({"rule_name": rule["rule_name"], "assignable": assignable})
    if apply:
        await db.commit()
    return {
        "applied": apply,
        "assigned": assigned_total,
        "assignable": preview_total,
        "per_rule": per_rule,
        "tenant_scoped": True,
        "basis": (
            "Counts cover open findings with no owner. A finding already owned is never reassigned, so a second run "
            "assigns nothing."
        ),
    }
