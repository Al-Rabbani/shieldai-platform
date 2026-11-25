"""Cyber warfare campaign: Vulnerability Assessment -> Management -> Remediation -> Incident Response -> Penetration Testing.

WHY THIS EXISTS (measured 25 Nov 2026): the platform had 23 registered roles but nothing that ran them as one
workflow, and 35 capabilities - including every scanner - had no owning role, so no agent could request them.
This module runs the five stages in order, each with the role that owns the capability and a real governed tool
call, and records every stage. Two rules keep it honest: a stage that is refused or has nothing to do says so and
does not stop the rest of the war, and an approval-gated stage is RESUMABLE on the same mission, so approving it
and resuming consumes the approval a human actually granted instead of minting a new request.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

from sqlalchemy import text

from gds_api.db import async_session_factory
from gds_api.reasoning.governed_tools import execute_governed_tool, resolve_capability_for_tool
from gds_api.tenant_binding import bind_tenant
from gds_api.tool_gateway import TOOL_REGISTRY

logger = logging.getLogger("gds.warfare.campaign")

STAGES: tuple[dict[str, Any], ...] = (
    {
        "number": 1,
        "key": "vulnerability_assessment",
        "label": "Vulnerability Assessment",
        "owner_agent": "vulnerability_assessment",
        "capability_key": "network.vulnerability_scan",
        "preferred_tool": "nuclei_scan",
        "needs_target": True,
        "team": "BLUE",
    },
    {
        "number": 2,
        "key": "vulnerability_management",
        "label": "Vulnerability Management",
        "owner_agent": "vulnerability_management",
        "capability_key": "finding.list_open",
        "preferred_tool": "list_open_findings",
        "needs_target": False,
        "team": "BLUE",
    },
    {
        "number": 3,
        "key": "vulnerability_remediation",
        "label": "Vulnerability Remediation",
        "owner_agent": "defensive_remediation_autofix",
        "capability_key": "remediation.auto_fix_finding",
        "preferred_tool": "auto_fix_finding",
        "needs_target": False,
        "team": "BLUE",
    },
    {
        "number": 4,
        "key": "incident_response",
        "label": "Incident Response",
        "owner_agent": "incident_response",
        "capability_key": "incident.list_open",
        "preferred_tool": None,
        "needs_target": False,
        "team": "BLUE",
    },
    {
        "number": 5,
        "key": "penetration_testing",
        "label": "Penetration Testing",
        "owner_agent": "red_team",
        "capability_key": "red_team.assess_attack_surface",
        "preferred_tool": "assess_attack_surface",
        "needs_target": True,
        "team": "RED",
    },
)

_STAGE_BY_KEY = {s["key"]: s for s in STAGES}


def _tools_for_capability(capability_key: str) -> list[str]:
    return [t for t in TOOL_REGISTRY if resolve_capability_for_tool(t) == capability_key]


def resolve_stage_tool(stage: dict[str, Any]) -> Optional[str]:
    """The tool a stage really runs, or None when the capability has no tool at all."""
    available = _tools_for_capability(stage["capability_key"])
    if not available:
        return None
    preferred = stage.get("preferred_tool")
    if preferred and preferred in available:
        return preferred
    return available[0]


async def _newest_fixable_finding(session, tenant_id: str) -> Optional[str]:
    row = (
        await session.execute(
            text(
                "SELECT id FROM security_findings WHERE tenant_id = :t AND status = 'open' "
                "AND raw_data->>'fixed_version' IS NOT NULL ORDER BY detected_at DESC LIMIT 1"
            ),
            {"t": tenant_id},
        )
    ).scalar()
    return str(row) if row else None


async def _ensure_mission(session, *, tenant_id: str, user_id: str, stage: dict, target: Optional[str]) -> str:
    """Governance attaches every capability request to a real mission, so a stage needs one."""
    mission_id = str(
        (
            await session.execute(
                text(
                    "INSERT INTO missions (id, tenant_id, requested_by_user_id, objective, status, mission_type) "
                    "VALUES (gen_random_uuid(), :t, :u, :o, 'running', 'warfare_stage') RETURNING id"
                ),
                {
                    "t": tenant_id,
                    "u": user_id,
                    "o": f"[warfare {stage['number']}/5] {stage['label']} vs {target or 'own estate'}",
                },
            )
        ).scalar()
    )
    await session.commit()
    await bind_tenant(session, tenant_id)
    return mission_id


async def _execute_stage(
    session,
    *,
    tenant_id: str,
    user_id: str,
    campaign_id: str,
    stage: dict,
    stage_row_id: str,
    mission_id: Optional[str],
    target: Optional[str],
) -> dict[str, Any]:
    """Run one stage and record exactly what happened. Never raises for a stage-level failure."""
    tool_name = resolve_stage_tool(stage)
    status = "executed"
    findings_count: Optional[int] = None
    summary = ""
    detail: dict[str, Any] = {}

    if tool_name is None:
        return await _record(
            session, tenant_id=tenant_id, campaign_id=campaign_id, stage=stage, stage_row_id=stage_row_id,
            mission_id=mission_id, status="skipped", findings_count=None,
            summary=f"capability {stage['capability_key']} has no tool in the registry, so this stage cannot run",
            detail={},
        )

    args: dict[str, Any] = {}
    if stage["needs_target"]:
        if not target:
            return await _record(
                session, tenant_id=tenant_id, campaign_id=campaign_id, stage=stage, stage_row_id=stage_row_id,
                mission_id=mission_id, status="skipped", findings_count=None,
                summary="this stage needs a target and none was supplied", detail={},
            )
        args["target"] = target
    if stage["key"] == "vulnerability_remediation":
        finding_id = await _newest_fixable_finding(session, tenant_id)
        if finding_id is None:
            return await _record(
                session, tenant_id=tenant_id, campaign_id=campaign_id, stage=stage, stage_row_id=stage_row_id,
                mission_id=mission_id, status="skipped", findings_count=None,
                summary="no open finding carries a fixed_version, so there is nothing to branch and fix",
                detail={},
            )
        args["finding_id"] = finding_id

    if not mission_id:
        mission_id = await _ensure_mission(session, tenant_id=tenant_id, user_id=user_id, stage=stage, target=target)

    try:
        result = await execute_governed_tool(
            tenant_id=tenant_id,
            user_id=user_id,
            mission_id=mission_id,
            agent_id=stage["owner_agent"],
            tool_name=tool_name,
            args=args,
            purpose=f"warfare campaign {campaign_id} stage {stage['number']} {stage['key']}",
        )
    except Exception as exc:  # noqa: BLE001 - a stage failure must not abort the campaign
        result = {"success": False, "error": str(exc)[:300]}

    if result.get("success"):
        found = result.get("findings")
        findings_count = len(found) if isinstance(found, list) else (found if isinstance(found, int) else None)
        summary = str(result.get("note") or result.get("source") or "executed")[:300]
        detail = {"result_keys": sorted(k for k in result if k not in ("findings", "stdout", "stderr"))[:12]}
    elif result.get("code") == "REQUIRE_APPROVAL":
        status = "awaiting_approval"
        summary = "this capability requires a human approval before it will run"
        detail = {"code": "REQUIRE_APPROVAL", "approval_url": "/approvals"}
    else:
        status = "refused"
        summary = str(result.get("error") or result.get("code") or "refused")[:300]
        detail = {"code": result.get("code")}

    return await _record(
        session, tenant_id=tenant_id, campaign_id=campaign_id, stage=stage, stage_row_id=stage_row_id,
        mission_id=mission_id, status=status, findings_count=findings_count, summary=summary, detail=detail,
    )


async def _record(
    session,
    *,
    tenant_id: str,
    campaign_id: str,
    stage: dict,
    stage_row_id: str,
    mission_id: Optional[str],
    status: str,
    findings_count: Optional[int],
    summary: str,
    detail: dict,
) -> dict[str, Any]:
    await session.execute(
        text(
            "UPDATE warfare_campaign_stages SET status = :s, findings_count = :f, result_summary = :sm, "
            "detail = CAST(:d AS jsonb), mission_id = :m, completed_at = now() WHERE id = :i"
        ),
        {"s": status, "f": findings_count, "sm": summary, "d": json.dumps(detail, default=str),
         "m": mission_id, "i": stage_row_id},
    )
    await session.commit()
    await bind_tenant(session, tenant_id)
    return {
        "stage": stage["number"],
        "key": stage["key"],
        "label": stage["label"],
        "team": stage["team"],
        "owner_agent": stage["owner_agent"],
        "tool": resolve_stage_tool(stage),
        "mission_id": mission_id,
        "status": status,
        "findings_count": findings_count,
        "summary": summary,
    }


async def _finalise(session, tenant_id: str, campaign_id: str, results: list[dict[str, Any]]) -> dict[str, Any]:
    executed = sum(1 for r in results if r["status"] == "executed")
    blocked = len(results) - executed
    if executed == len(results):
        status = "completed"
    elif executed:
        status = "partial"
    elif any(r["status"] == "awaiting_approval" for r in results):
        status = "awaiting_approval"
    else:
        status = "blocked"
    await session.execute(
        text(
            "UPDATE warfare_campaigns SET status = :s, stages_executed = :e, stages_blocked = :b, "
            "summary = CAST(:sm AS jsonb), completed_at = now() WHERE id = :c"
        ),
        {"s": status, "e": executed, "b": blocked,
         "sm": json.dumps({"stages": results}, default=str), "c": campaign_id},
    )
    await session.commit()
    await bind_tenant(session, tenant_id)
    return {
        "campaign_id": campaign_id,
        "status": status,
        "stages_total": len(results),
        "stages_executed": executed,
        "stages_blocked": blocked,
        "stages": results,
    }


async def run_campaign(
    *,
    tenant_id: str,
    user_id: str,
    target: Optional[str] = None,
    name: Optional[str] = None,
    stage_keys: Optional[list[str]] = None,
) -> dict[str, Any]:
    selected = [s for s in STAGES if not stage_keys or s["key"] in stage_keys]
    if not selected:
        return {"error": "no stage matched", "known_stages": [s["key"] for s in STAGES]}

    campaign_name = name or f"Cyber warfare campaign vs {target or 'own estate'}"
    async with async_session_factory() as session:
        await bind_tenant(session, tenant_id)
        campaign_id = str(
            (
                await session.execute(
                    text(
                        "INSERT INTO warfare_campaigns (tenant_id, name, target, status, stages_total, created_by) "
                        "VALUES (:t, :n, :tg, 'running', :total, :u) RETURNING id"
                    ),
                    {"t": tenant_id, "n": campaign_name, "tg": target, "total": len(selected), "u": user_id},
                )
            ).scalar()
        )
        await session.commit()
        await bind_tenant(session, tenant_id)

        results = []
        for stage in selected:
            stage_row_id = str(
                (
                    await session.execute(
                        text(
                            "INSERT INTO warfare_campaign_stages (campaign_id, tenant_id, stage_number, stage_key, "
                            "stage_label, owner_agent, capability_key, tool_name, status, started_at) VALUES "
                            "(:c, :t, :n, :k, :l, :a, :cap, :tool, 'running', now()) RETURNING id"
                        ),
                        {
                            "c": campaign_id, "t": tenant_id, "n": stage["number"], "k": stage["key"],
                            "l": stage["label"], "a": stage["owner_agent"],
                            "cap": stage["capability_key"], "tool": resolve_stage_tool(stage),
                        },
                    )
                ).scalar()
            )
            await session.commit()
            await bind_tenant(session, tenant_id)
            results.append(
                await _execute_stage(
                    session, tenant_id=tenant_id, user_id=user_id, campaign_id=campaign_id, stage=stage,
                    stage_row_id=stage_row_id, mission_id=None, target=target,
                )
            )
        final = await _finalise(session, tenant_id, campaign_id, results)

    return {"campaign_id": campaign_id, "name": campaign_name, "target": target, **final}


async def resume_campaign(
    *, campaign_id: str, tenant_id: str, user_id: str, target: Optional[str] = None
) -> dict[str, Any]:
    """Re-run the stages of a campaign that are not done, reusing each stage's own mission.

    This is what makes an approval-gated stage usable: the operator approves, then resumes, and the granted
    approval is consumed on the same mission instead of a new request being minted.
    """
    async with async_session_factory() as session:
        await bind_tenant(session, tenant_id)
        campaign = (
            await session.execute(
                text("SELECT id, name, target, status FROM warfare_campaigns WHERE id = CAST(:i AS uuid)"),
                {"i": campaign_id},
            )
        ).mappings().first()
        if campaign is None:
            return {"error": "campaign not found", "campaign_id": campaign_id}
        rows = (
            await session.execute(
                text(
                    "SELECT id, stage_key, status, mission_id FROM warfare_campaign_stages "
                    "WHERE campaign_id = CAST(:i AS uuid) ORDER BY stage_number"
                ),
                {"i": campaign_id},
            )
        ).mappings().all()
        if not rows:
            return {"error": "campaign has no stages", "campaign_id": campaign_id}

        results = []
        for row in rows:
            if row["status"] == "executed":
                results.append({"stage_key": row["stage_key"], "status": "executed", "note": "already done"})
                continue
            stage = _STAGE_BY_KEY.get(row["stage_key"])
            if stage is None:
                results.append({"stage_key": row["stage_key"], "status": "skipped", "note": "stage no longer defined"})
                continue
            await session.execute(
                text("UPDATE warfare_campaign_stages SET status = 'running', started_at = now() WHERE id = :i"),
                {"i": str(row["id"])},
            )
            await session.commit()
            await bind_tenant(session, tenant_id)
            results.append(
                await _execute_stage(
                    session, tenant_id=tenant_id, user_id=user_id, campaign_id=campaign_id, stage=stage,
                    stage_row_id=str(row["id"]), mission_id=row["mission_id"],
                    target=target or campaign["target"],
                )
            )
        final = await _finalise(session, tenant_id, campaign_id, results)

    return {"campaign_id": campaign_id, "name": campaign["name"], "target": target or campaign["target"], **final}
