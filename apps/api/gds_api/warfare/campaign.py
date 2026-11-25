"""Cyber warfare campaign: Vulnerability Assessment -> Management -> Remediation -> Incident Response -> Penetration Testing.

WHY THIS EXISTS (measured 25 Nov 2026): the platform had 23 registered roles but nothing that ran them as one
workflow, and 35 capabilities - including every scanner - had no owning role, so no agent could request them.

THE STAGES RUN AS COORDINATING AGENTS, NOT A QUEUE. A stage declares the stages it depends on. Everything whose
dependencies are met runs at the same time, and a downstream stage receives what its upstream stages actually
produced (a shared context), which is the handoff between the teams. Measured dependency graph:
  group 1 (concurrent): assessment, incident_response, penetration_testing   - independent work
  group 2:              management   <- needs the assessment's findings
  group 3:              remediation  <- needs the management stage's prioritised finding
Two rules keep it honest: a stage that is refused or has nothing to do says so and does not stop the rest of the
war, and an approval-gated stage is RESUMABLE on its own mission, so approving it and resuming consumes the
approval a human actually granted instead of minting a new request.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Optional

from sqlalchemy import text

from gds_api.db import async_session_factory
from gds_api.reasoning.governed_tools import execute_governed_tool, resolve_capability_for_tool
from gds_api.tenant_binding import bind_tenant
from gds_api.tool_gateway import TOOL_REGISTRY

logger = logging.getLogger("gds.warfare.campaign")

MAX_PARALLEL_STAGES = 3

STAGES: tuple[dict[str, Any], ...] = (
    {
        "number": 1, "key": "vulnerability_assessment", "label": "Vulnerability Assessment",
        "owner_agent": "vulnerability_assessment", "capability_key": "network.vulnerability_scan",
        "preferred_tool": "nuclei_scan", "needs_target": True, "team": "BLUE", "depends_on": (),
    },
    {
        "number": 2, "key": "vulnerability_management", "label": "Vulnerability Management",
        "owner_agent": "vulnerability_management", "capability_key": "finding.list_open",
        "preferred_tool": "list_open_findings", "needs_target": False, "team": "BLUE",
        "depends_on": ("vulnerability_assessment",),
    },
    {
        "number": 3, "key": "vulnerability_remediation", "label": "Vulnerability Remediation",
        "owner_agent": "defensive_remediation_autofix", "capability_key": "remediation.auto_fix_finding",
        "preferred_tool": "auto_fix_finding", "needs_target": False, "team": "BLUE",
        "depends_on": ("vulnerability_management",),
    },
    {
        "number": 4, "key": "incident_response", "label": "Incident Response",
        "owner_agent": "incident_response", "capability_key": "incident.list_open",
        "preferred_tool": None, "needs_target": False, "team": "BLUE", "depends_on": (),
    },
    {
        "number": 5, "key": "penetration_testing", "label": "Penetration Testing",
        "owner_agent": "red_team", "capability_key": "red_team.assess_attack_surface",
        "preferred_tool": "assess_attack_surface", "needs_target": True, "team": "RED", "depends_on": (),
    },
)

_STAGE_BY_KEY = {s["key"]: s for s in STAGES}


def parallel_groups(stages: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    """Group stages into waves: everything whose dependencies are already satisfied runs together."""
    remaining = list(stages)
    done: set[str] = set()
    groups: list[list[dict[str, Any]]] = []
    while remaining:
        wave = [s for s in remaining if all(d in done for d in s["depends_on"])]
        if not wave:  # a cycle or a dependency outside this selection: run the rest in order rather than hang
            wave = [remaining[0]]
        groups.append(wave)
        for s in wave:
            done.add(s["key"])
            remaining.remove(s)
    return groups


def _tools_for_capability(capability_key: str) -> list[str]:
    return [t for t in TOOL_REGISTRY if resolve_capability_for_tool(t) == capability_key]


def resolve_stage_tool(stage: dict[str, Any]) -> Optional[str]:
    available = _tools_for_capability(stage["capability_key"])
    if not available:
        return None
    preferred = stage.get("preferred_tool")
    if preferred and preferred in available:
        return preferred
    return available[0]


async def _session(tenant_id: str):
    session = async_session_factory()
    await bind_tenant(session, tenant_id)
    return session


async def _commit(session, tenant_id: str) -> None:
    """Commit then re-bind: gds.tenant_id is transaction-local, so a plain commit leaves the next
    statement with no tenant and FORCE RLS rejects the row (measured 25 Nov 2026)."""
    await session.commit()
    await bind_tenant(session, tenant_id)


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
    mission_id = str(
        (
            await session.execute(
                text(
                    "INSERT INTO missions (id, tenant_id, requested_by_user_id, objective, status, mission_type) "
                    "VALUES (gen_random_uuid(), :t, :u, :o, 'running', 'warfare_stage') RETURNING id"
                ),
                {"t": tenant_id, "u": user_id,
                 "o": f"[warfare {stage['number']}/5] {stage['label']} vs {target or 'own estate'}"},
            )
        ).scalar()
    )
    await _commit(session, tenant_id)
    return mission_id


async def _record(session, *, tenant_id, campaign_id, stage, stage_row_id, mission_id,
                  status, findings_count, summary, detail) -> dict[str, Any]:
    await session.execute(
        text(
            "UPDATE warfare_campaign_stages SET status = :s, findings_count = :f, result_summary = :sm, "
            "detail = CAST(:d AS jsonb), mission_id = :m, completed_at = now() WHERE id = :i"
        ),
        {"s": status, "f": findings_count, "sm": summary, "d": json.dumps(detail, default=str),
         "m": mission_id, "i": stage_row_id},
    )
    await _commit(session, tenant_id)
    return {
        "stage": stage["number"], "key": stage["key"], "label": stage["label"], "team": stage["team"],
        "owner_agent": stage["owner_agent"], "tool": resolve_stage_tool(stage), "mission_id": mission_id,
        "status": status, "findings_count": findings_count, "summary": summary,
    }


async def _execute_stage(*, tenant_id: str, user_id: str, campaign_id: str, stage: dict,
                         stage_row_id: str, mission_id: Optional[str], target: Optional[str],
                         shared: dict[str, Any]) -> dict[str, Any]:
    """Run one stage in its own session so stages can run at the same time."""
    session = await _session(tenant_id)
    try:
        tool_name = resolve_stage_tool(stage)
        if tool_name is None:
            return await _record(session, tenant_id=tenant_id, campaign_id=campaign_id, stage=stage,
                                 stage_row_id=stage_row_id, mission_id=mission_id, status="skipped",
                                 findings_count=None, summary=f"capability {stage['capability_key']} has no tool",
                                 detail={})

        args: dict[str, Any] = {}
        if stage["needs_target"]:
            if not target:
                return await _record(session, tenant_id=tenant_id, campaign_id=campaign_id, stage=stage,
                                     stage_row_id=stage_row_id, mission_id=mission_id, status="skipped",
                                     findings_count=None, summary="this stage needs a target and none was supplied",
                                     detail={})
            args["target"] = target

        # ---- the handoff: a downstream stage receives what its upstream stages really produced ----
        handoff = {d: shared.get(d) for d in stage["depends_on"] if shared.get(d)}
        if handoff:
            args["_upstream"] = handoff

        if stage["key"] == "vulnerability_remediation":
            finding_id = await _newest_fixable_finding(session, tenant_id)
            if finding_id is None:
                return await _record(session, tenant_id=tenant_id, campaign_id=campaign_id, stage=stage,
                                     stage_row_id=stage_row_id, mission_id=mission_id, status="skipped",
                                     findings_count=None,
                                     summary="no open finding carries a fixed_version, so there is nothing to fix",
                                     detail={"handoff": handoff})
            args["finding_id"] = finding_id

        if not mission_id:
            mission_id = await _ensure_mission(session, tenant_id=tenant_id, user_id=user_id,
                                               stage=stage, target=target)

        try:
            result = await execute_governed_tool(
                tenant_id=tenant_id, user_id=user_id, mission_id=mission_id, agent_id=stage["owner_agent"],
                tool_name=tool_name, args=args,
                purpose=f"warfare campaign {campaign_id} stage {stage['number']} {stage['key']}",
            )
        except Exception as exc:  # noqa: BLE001 - a stage failure must not abort the campaign
            result = {"success": False, "error": str(exc)[:300]}

        count: Optional[int] = None
        if result.get("success"):
            found = result.get("findings")
            count = len(found) if isinstance(found, list) else (found if isinstance(found, int) else None)
            status = "executed"
            summary = str(result.get("note") or result.get("source") or "executed")[:300]
            detail = {"handoff_received": sorted(handoff), "result_keys":
                      sorted(k for k in result if k not in ("findings", "stdout", "stderr"))[:12]}
            shared[stage["key"]] = {"findings": count, "tool": tool_name, "owner_agent": stage["owner_agent"]}
        elif result.get("code") == "REQUIRE_APPROVAL":
            status = "awaiting_approval"
            summary = "this capability requires a human approval before it will run"
            detail = {"code": "REQUIRE_APPROVAL"}
        else:
            status = "refused"
            summary = str(result.get("error") or result.get("code") or "refused")[:300]
            detail = {"code": result.get("code"), "handoff": handoff}

        return await _record(session, tenant_id=tenant_id, campaign_id=campaign_id, stage=stage,
                             stage_row_id=stage_row_id, mission_id=mission_id, status=status,
                             findings_count=count, summary=summary, detail=detail)
    finally:
        await session.close()


async def _finalise(tenant_id: str, campaign_id: str, results: list[dict[str, Any]]) -> dict[str, Any]:
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
    session = await _session(tenant_id)
    try:
        await session.execute(
            text(
                "UPDATE warfare_campaigns SET status = :s, stages_executed = :e, stages_blocked = :b, "
                "summary = CAST(:sm AS jsonb), completed_at = now() WHERE id = :c"
            ),
            {"s": status, "e": executed, "b": blocked, "sm": json.dumps({"stages": results}, default=str),
             "c": campaign_id},
        )
        await _commit(session, tenant_id)
    finally:
        await session.close()
    return {"campaign_id": campaign_id, "status": status, "stages_total": len(results),
            "stages_executed": executed, "stages_blocked": blocked, "stages": results}


async def _create_stage_rows(tenant_id: str, campaign_id: str, stages: list[dict[str, Any]]) -> dict[str, str]:
    session = await _session(tenant_id)
    rows: dict[str, str] = {}
    try:
        for stage in stages:
            rows[stage["key"]] = str(
                (
                    await session.execute(
                        text(
                            "INSERT INTO warfare_campaign_stages (campaign_id, tenant_id, stage_number, stage_key, "
                            "stage_label, owner_agent, capability_key, tool_name, status, started_at) VALUES "
                            "(:c, :t, :n, :k, :l, :a, :cap, :tool, 'pending', NULL) RETURNING id"
                        ),
                        {"c": campaign_id, "t": tenant_id, "n": stage["number"], "k": stage["key"],
                         "l": stage["label"], "a": stage["owner_agent"], "cap": stage["capability_key"],
                         "tool": resolve_stage_tool(stage)},
                    )
                ).scalar()
            )
            await _commit(session, tenant_id)
    finally:
        await session.close()
    return rows


async def run_campaign(*, tenant_id: str, user_id: str, target: Optional[str] = None,
                       name: Optional[str] = None, stage_keys: Optional[list[str]] = None) -> dict[str, Any]:
    selected = [s for s in STAGES if not stage_keys or s["key"] in stage_keys]
    if not selected:
        return {"error": "no stage matched", "known_stages": [s["key"] for s in STAGES]}

    campaign_name = name or f"Cyber warfare campaign vs {target or 'own estate'}"
    session = await _session(tenant_id)
    try:
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
        await _commit(session, tenant_id)
    finally:
        await session.close()

    rows = await _create_stage_rows(tenant_id, campaign_id, selected)
    shared: dict[str, Any] = {}
    results: list[dict[str, Any]] = []
    semaphore = asyncio.Semaphore(MAX_PARALLEL_STAGES)

    for wave in parallel_groups(selected):
        async def one(stage: dict, _wave=wave):
            async with semaphore:
                return await _execute_stage(
                    tenant_id=tenant_id, user_id=user_id, campaign_id=campaign_id, stage=stage,
                    stage_row_id=rows[stage["key"]], mission_id=None, target=target, shared=shared,
                )
        wave_results = await asyncio.gather(*(one(s) for s in wave))
        results.extend(wave_results)

    final = await _finalise(tenant_id, campaign_id, results)
    return {"campaign_id": campaign_id, "name": campaign_name, "target": target,
            "concurrency": {"max_parallel": MAX_PARALLEL_STAGES,
                            "waves": [[s["key"] for s in w] for w in parallel_groups(selected)]},
            **final}


async def resume_campaign(*, campaign_id: str, tenant_id: str, user_id: str,
                          target: Optional[str] = None) -> dict[str, Any]:
    """Re-run the stages that are not done, reusing each stage's own mission so a granted approval is consumed."""
    session = await _session(tenant_id)
    try:
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
                text("SELECT id, stage_key, status, mission_id FROM warfare_campaign_stages "
                     "WHERE campaign_id = CAST(:i AS uuid) ORDER BY stage_number"),
                {"i": campaign_id},
            )
        ).mappings().all()
    finally:
        await session.close()
    if not rows:
        return {"error": "campaign has no stages", "campaign_id": campaign_id}

    shared: dict[str, Any] = {}
    results: list[dict[str, Any]] = []
    for row in rows:
        if row["status"] == "executed":
            results.append({"stage_key": row["stage_key"], "status": "executed", "note": "already done"})
            continue
        stage = _STAGE_BY_KEY.get(row["stage_key"])
        if stage is None:
            results.append({"stage_key": row["stage_key"], "status": "skipped", "note": "stage no longer defined"})
            continue
        results.append(
            await _execute_stage(
                tenant_id=tenant_id, user_id=user_id, campaign_id=campaign_id, stage=stage,
                stage_row_id=str(row["id"]), mission_id=row["mission_id"],
                target=target or campaign["target"], shared=shared,
            )
        )
    final = await _finalise(tenant_id, campaign_id, results)
    return {"campaign_id": campaign_id, "name": campaign["name"], "target": target or campaign["target"], **final}
