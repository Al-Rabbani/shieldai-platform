"""Routes for Linear ticketing.

One endpoint, six actions, because that is the shape the console and any workflow will call. Every
route is tenant-scoped through the RLS context before it touches a row, and every action that writes
requires integrations:write rather than findings:read.

The honest failure rule: if Linear refuses, the route answers 502 with Linear's own reason and writes
nothing. There is no path here that stores a ticket identifier the platform did not receive.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api import linear
from gds_api.audit import record_audit_event
from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/integrations/linear", tags=["integrations"])

FINDING_COLUMNS = (
    "id, title, severity, target, remediation, status, cve, cvss, epss, kev_listed, "
    "exploitability, business_impact"
)


class LinearRequest(BaseModel):
    action: str = Field(default="status")
    finding_id: int | None = None
    team_id: str | None = None
    limit: int = Field(default=25, ge=1, le=200)


async def _tenant(db: AsyncSession, current_user: CurrentUser) -> str:
    tenant_id = str(current_user.tenant_id)
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": tenant_id})
    return tenant_id


async def _finding(db: AsyncSession, tenant_id: str, finding_id: int) -> dict:
    row = (
        await db.execute(
            text(
                f"SELECT {FINDING_COLUMNS} FROM security_findings "
                "WHERE tenant_id = :tid AND id = :fid"
            ),
            {"tid": tenant_id, "fid": finding_id},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Finding not found")
    return dict(row)


async def _link_for(db: AsyncSession, tenant_id: str, finding_id: int) -> dict | None:
    row = (
        await db.execute(
            text(
                "SELECT id, finding_id, linear_issue_id, identifier, url, team_id, team_key, "
                "state_name, state_type, app_status, synced_at "
                "FROM linear_issue_links WHERE tenant_id = :tid AND finding_id = :fid"
            ),
            {"tid": tenant_id, "fid": finding_id},
        )
    ).mappings().first()
    return dict(row) if row else None


async def _record_link(db: AsyncSession, tenant_id: str, finding: dict, issue: dict, team_id: str) -> dict:
    """Store a link. Only ever called with an issue Linear actually returned."""
    state = issue.get("state") or {}
    team = issue.get("team") or {}
    row = (
        await db.execute(
            text(
                """
                INSERT INTO linear_issue_links
                    (tenant_id, finding_id, linear_issue_id, identifier, url, team_id, team_key,
                     state_name, state_type, app_status)
                VALUES
                    (:tid, :fid, :issue_id, :identifier, :url, :team_id, :team_key,
                     :state_name, :state_type, :app_status)
                ON CONFLICT (tenant_id, finding_id) DO UPDATE
                    SET linear_issue_id = EXCLUDED.linear_issue_id,
                        identifier      = EXCLUDED.identifier,
                        url             = EXCLUDED.url,
                        team_id         = EXCLUDED.team_id,
                        team_key        = EXCLUDED.team_key,
                        state_name      = EXCLUDED.state_name,
                        state_type      = EXCLUDED.state_type,
                        app_status      = EXCLUDED.app_status,
                        synced_at       = now()
                RETURNING id, finding_id, linear_issue_id, identifier, url, team_id, team_key,
                          state_name, state_type, app_status
                """
            ),
            {
                "tid": tenant_id,
                "fid": finding["id"],
                "issue_id": issue["id"],
                "identifier": issue["identifier"],
                "url": issue.get("url"),
                "team_id": team.get("id") or team_id,
                "team_key": team.get("key"),
                "state_name": state.get("name"),
                "state_type": state.get("type"),
                "app_status": finding.get("status"),
            },
        )
    ).mappings().first()
    return dict(row)


def _refusal(exc: linear.LinearError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=str(exc))


@router.get("/status")
async def linear_status(
    current_user: CurrentUser = Depends(require_permission("findings:read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Whether ticketing can work, and how much of the open register is ticketed.

    configured says only that a key is present. reachable says Linear answered. They are reported
    separately because a key that exists and a workspace that answers are different facts.
    """
    tenant_id = await _tenant(db, current_user)
    counts = (
        await db.execute(
            text(
                """
                SELECT count(*) FILTER (WHERE sf.status = 'open') AS open_findings,
                       count(l.finding_id) AS ticketed,
                       count(*) FILTER (WHERE sf.status = 'open' AND l.finding_id IS NULL) AS unticketed_open
                FROM security_findings sf
                LEFT JOIN linear_issue_links l
                       ON l.tenant_id = sf.tenant_id AND l.finding_id = sf.id
                WHERE sf.tenant_id = :tid
                """
            ),
            {"tid": tenant_id},
        )
    ).mappings().first()

    result: dict[str, Any] = {
        "configured": bool(linear.os.getenv("LINEAR_API_KEY", "").strip()),
        "reachable": False,
        "viewer": None,
        "teams": [],
        "open_findings": counts["open_findings"],
        "ticketed_findings": counts["ticketed"],
        "unticketed_open": counts["unticketed_open"],
    }
    if not result["configured"]:
        result["reason"] = "LINEAR_API_KEY is not configured on this platform."
        return result
    try:
        teams = await linear.list_teams()
    except linear.LinearError as exc:
        # A configured key that Linear rejects is reported, not hidden behind an empty team list.
        result["reason"] = str(exc)
        return result
    result.update(reachable=True, viewer=teams["viewer"], teams=teams["teams"])
    return result


@router.post("")
async def linear_action(
    body: LinearRequest,
    current_user: CurrentUser = Depends(require_permission("integrations:write")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    tenant_id = await _tenant(db, current_user)

    if body.action == "list_teams":
        try:
            teams = await linear.list_teams()
        except linear.LinearError as exc:
            raise _refusal(exc) from exc
        return {"viewer": teams["viewer"], "teams": teams["teams"]}

    if body.action == "create_ticket":
        if body.finding_id is None:
            raise HTTPException(status_code=400, detail="finding_id is required")
        if not body.team_id:
            raise HTTPException(status_code=400, detail="team_id is required")
        finding = await _finding(db, tenant_id, body.finding_id)
        existing = await _link_for(db, tenant_id, body.finding_id)
        if existing:
            return {"created": False, "reason": "already linked", "link": existing}
        try:
            issue = await linear.create_issue(finding, body.team_id)
        except linear.LinearError as exc:
            raise _refusal(exc) from exc
        link = await _record_link(db, tenant_id, finding, issue, body.team_id)
        await record_audit_event(
            db,
            tenant_id=uuid.UUID(tenant_id),
            user_id=current_user.user_id,
            action="linear.ticket_created",
            detail={"finding_id": finding["id"], "identifier": issue["identifier"], "url": issue.get("url")},
        )
        return {"created": True, "link": link}

    if body.action == "push_state":
        if body.finding_id is None:
            raise HTTPException(status_code=400, detail="finding_id is required")
        link = await _link_for(db, tenant_id, body.finding_id)
        if not link:
            return {"synced": False, "reason": "no linked ticket"}
        finding = await _finding(db, tenant_id, body.finding_id)
        target_type = linear.APP_TO_STATE.get(str(finding.get("status")), "unstarted")
        try:
            states = await linear.team_states(link["team_id"])
        except linear.LinearError as exc:
            raise _refusal(exc) from exc
        state = next((s for s in states if s.get("type") == target_type), None)
        if not state:
            return {"synced": False, "reason": f"team has no {target_type} state"}
        try:
            issue = await linear.move_issue(link["linear_issue_id"], state["id"])
        except linear.LinearError as exc:
            raise _refusal(exc) from exc
        await db.execute(
            text(
                "UPDATE linear_issue_links SET state_name = :name, state_type = :type, "
                "app_status = :status, synced_at = now() WHERE id = :id"
            ),
            {
                "name": state.get("name"),
                "type": state.get("type"),
                "status": finding.get("status"),
                "id": link["id"],
            },
        )
        return {
            "synced": True,
            "identifier": issue.get("identifier") or link["identifier"],
            "state": state.get("name"),
            "app_status": finding.get("status"),
        }

    if body.action == "sync_states":
        links = (
            await db.execute(
                text(
                    "SELECT id, finding_id, linear_issue_id, identifier, state_type, app_status "
                    "FROM linear_issue_links WHERE tenant_id = :tid ORDER BY synced_at DESC LIMIT :lim"
                ),
                {"tid": tenant_id, "lim": body.limit},
            )
        ).mappings().all()
        if not links:
            return {"checked": 0, "synced": 0, "updated": 0}
        try:
            remote = await linear.issues_by_id([row["linear_issue_id"] for row in links])
        except linear.LinearError as exc:
            raise _refusal(exc) from exc
        synced = updated = 0
        for row in links:
            issue = remote.get(row["linear_issue_id"])
            if not issue or not issue.get("state"):
                continue
            synced += 1
            state = issue["state"]
            app_status = linear.STATE_TO_APP.get(state.get("type")) or row["app_status"] or "open"
            if row["state_type"] == state.get("type") and row["app_status"] == app_status:
                continue
            await db.execute(
                text(
                    "UPDATE linear_issue_links SET state_name = :name, state_type = :type, "
                    "app_status = :status, synced_at = now() WHERE id = :id"
                ),
                {"name": state.get("name"), "type": state.get("type"), "status": app_status, "id": row["id"]},
            )
            if app_status != "open":
                await db.execute(
                    text(
                        "UPDATE security_findings SET status = :status, "
                        "resolved_at = CASE WHEN :status = 'fixed' THEN now() ELSE resolved_at END "
                        "WHERE tenant_id = :tid AND id = :fid AND status <> :status"
                    ),
                    {"status": app_status, "tid": tenant_id, "fid": row["finding_id"]},
                )
            updated += 1
        return {"checked": len(links), "synced": synced, "updated": updated}

    if body.action == "auto_critical":
        team_id = body.team_id
        if not team_id:
            try:
                teams = await linear.list_teams()
            except linear.LinearError as exc:
                raise _refusal(exc) from exc
            if not teams["teams"]:
                raise HTTPException(status_code=409, detail="No Linear team is available in this workspace.")
            team_id = teams["teams"][0]["id"]
        rows = (
            await db.execute(
                text(
                    f"""
                    SELECT {FINDING_COLUMNS} FROM security_findings sf
                    WHERE sf.tenant_id = :tid
                      AND sf.status IN ('open', 'in_remediation')
                      AND lower(sf.severity) = 'critical'
                      AND NOT EXISTS (
                          SELECT 1 FROM linear_issue_links l
                          WHERE l.tenant_id = sf.tenant_id AND l.finding_id = sf.id)
                    ORDER BY sf.cvss DESC NULLS LAST, sf.id
                    LIMIT :lim
                    """
                ),
                {"tid": tenant_id, "lim": body.limit},
            )
        ).mappings().all()
        created, failed = 0, []
        for row in rows:
            finding = dict(row)
            try:
                issue = await linear.create_issue(finding, team_id)
            except linear.LinearError as exc:
                # Stop on the first refusal: a broken key should not produce 25 identical failures.
                failed.append({"finding_id": finding["id"], "reason": str(exc)})
                break
            await _record_link(db, tenant_id, finding, issue, team_id)
            created += 1
        return {"considered": len(rows), "created": created, "failed": failed}

    raise HTTPException(status_code=400, detail=f"Unknown action {body.action!r}")
