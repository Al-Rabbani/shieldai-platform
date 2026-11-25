"""Cyber warfare campaign: Vulnerability Assessment -> Management -> Remediation -> Incident Response -> Penetration Testing.

WHY THIS EXISTS (measured 25 Nov 2026): the platform had 23 registered roles but nothing that ran them as one
workflow. 35 capabilities had no owning role at all, so the scanners could not be requested by any agent, and the
only way to make an agent do something was a human starting a separate mission per tool. This module runs the five
stages in order, each with the role that owns the capability and a real governed tool call, and records every stage
so the campaign is a record rather than a claim. A stage that is refused, or that has nothing to do, says so and
does not stop the rest of the war.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy import text

from gds_api.capabilities.catalog import CAPABILITY_REGISTRY
from gds_api.db import async_session_factory
from gds_api.reasoning.governed_tools import execute_governed_tool, resolve_capability_for_tool
from gds_api.tenant_binding import bind_tenant
from gds_api.tool_gateway import TOOL_REGISTRY

logger = logging.getLogger("gds.warfare.campaign")

# The five stages the owner named, each bound to the role that owns the capability and a preferred tool.
# preferred_tool is a hint: the resolver picks the tool that really maps to the capability, so a rename cannot
# leave a stage pointing at a tool that does not exist.
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


async def run_campaign(
    *,
    tenant_id: str,
    user_id: str,
    target: Optional[str] = None,
    name: Optional[str] = None,
    stage_keys: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Run the five stages in order. Returns the campaign record, including what each stage really did."""
    selected = [s for s in STAGES if not stage_keys or s["key"] in stage_keys]
    if not selected:
        return {"error": "no stage matched", "known_stages": [s["key"] for s in STAGES]}

    campaign_name = name or f"Cyber warfare campaign vs {target or 'own estate'}"
    async with async_session_factory() as session:
        await bind_tenant(session, tenant_id)

        async def _commit() -> None:
            """Commit, then re-bind: the tenant setting is transaction-local, so after a commit the next
            statement runs with no gds.tenant_id and FORCE RLS rejects the row. Measured 25 Nov 2026: the
            campaign row inserted and the first stage insert then failed with "new row violates row-level
            security policy for table warfare_campaign_stages"."""
            await session.commit()
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
        await _commit()

        results: list[dict[str, Any]] = []
        executed = blocked = 0
        for stage in selected:
            tool_name = resolve_stage_tool(stage)
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
                            "cap": stage["capability_key"], "tool": tool_name,
                        },
                    )
                ).scalar()
            )
            await _commit()

            status = "executed"
            findings_count: Optional[int] = None
            summary = ""
            detail: dict[str, Any] = {}

            if tool_name is None:
                status = "skipped"
                summary = (
                    f"capability {stage['capability_key']} has no tool in the registry, so this stage cannot run"
                )
            else:
                args: dict[str, Any] = {}
                if stage["needs_target"]:
                    if not target:
                        status = "skipped"
                        summary = "this stage needs a target and none was supplied"
                    else:
                        args["target"] = target
                if stage["key"] == "vulnerability_remediation":
                    finding_id = await _newest_fixable_finding(session, tenant_id)
                    if finding_id is None:
                        status = "skipped"
                        summary = (
                            "no open finding carries a fixed_version, so there is nothing to branch and fix"
                        )
                    else:
                        args["finding_id"] = finding_id

                if status == "executed":
                    try:
                        result = await execute_governed_tool(
                            tenant_id=tenant_id,
                            user_id=user_id,
                            mission_id=None,
                            agent_id=stage["owner_agent"],
                            tool_name=tool_name,
                            args=args,
                            purpose=f"warfare campaign {campaign_id} stage {stage['number']} {stage['key']}",
                        )
                    except Exception as exc:  # noqa: BLE001 - a stage failure must not abort the campaign
                        result = {"success": False, "error": str(exc)[:300]}
                    if result.get("success"):
                        status = "executed"
                        findings_count = len(result.get("findings") or []) if isinstance(result.get("findings"), list) else None
                        if findings_count is None and isinstance(result.get("findings"), int):
                            findings_count = result["findings"]
                        summary = (result.get("note") or result.get("source") or "executed")[:300]
                        detail = {
                            "keys": sorted(k for k in result if k not in ("findings", "stdout", "stderr"))[:12]
                        }
                    elif result.get("code") == "REQUIRE_APPROVAL":
                        status = "awaiting_approval"
                        summary = "this capability requires a human approval before it will run"
                        detail = {"code": "REQUIRE_APPROVAL"}
                    else:
                        status = "refused"
                        summary = str(result.get("error") or result.get("code") or "refused")[:300]
                        detail = {"code": result.get("code")}

            if status == "executed":
                executed += 1
            else:
                blocked += 1
            await session.execute(
                text(
                    "UPDATE warfare_campaign_stages SET status = :s, findings_count = :f, result_summary = :sm, "
                    "detail = CAST(:d AS jsonb), completed_at = now() WHERE id = :i"
                ),
                {"s": status, "f": findings_count, "sm": summary, "d": _json(detail), "i": stage_row_id},
            )
            await session.execute(
                text(
                    "UPDATE warfare_campaigns SET stages_executed = :e, stages_blocked = :b WHERE id = :c"
                ),
                {"e": executed, "b": blocked, "c": campaign_id},
            )
            await _commit()
            results.append(
                {
                    "stage": stage["number"],
                    "key": stage["key"],
                    "label": stage["label"],
                    "team": stage["team"],
                    "owner_agent": stage["owner_agent"],
                    "tool": tool_name,
                    "status": status,
                    "findings_count": findings_count,
                    "summary": summary,
                }
            )

        final_status = "completed" if blocked == 0 else ("partial" if executed else "blocked")
        summary_json = {"stages": results, "executed": executed, "blocked": blocked}
        await session.execute(
            text(
                "UPDATE warfare_campaigns SET status = :s, summary = CAST(:sm AS jsonb), completed_at = now() "
                "WHERE id = :c"
            ),
            {"s": final_status, "sm": _json(summary_json), "c": campaign_id},
        )
        await _commit()

    return {
        "campaign_id": campaign_id,
        "name": campaign_name,
        "target": target,
        "status": final_status,
        "stages_total": len(selected),
        "stages_executed": executed,
        "stages_blocked": blocked,
        "stages": results,
    }


def _json(value: Any) -> str:
    import json

    return json.dumps(value, default=str)
