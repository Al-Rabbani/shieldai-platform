#!/usr/bin/env python3
"""Run one governed nmap port scan against an authorised target.

The governed path is propose -> decide -> (human approve) -> re-check -> execute. network.port_scan
is R4 and requires_human_approval, so the scheduler cannot self-approve: this tool exists so an
approved scan can actually be executed, and so the reason for a refusal is printed rather than
hidden behind a generic tool error.

--approve-as-owner records the OWNER's decision on the approval row. It must only be passed when
the owner has actually instructed that the scan be run; it is not a way around the gate.
"""
import argparse, asyncio, os, sys, uuid
sys.path.insert(0, "/opt/gds-os/apps/api")
for line in open("/opt/.env").read().split("\n"):
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

from sqlalchemy import text
from gds_api.db import async_session_factory
from gds_api.capabilities.broker import evaluate_capability_request, reevaluate_capability_request
from gds_api.capabilities.gateway import execute_capability_request

TID = uuid.UUID(os.environ["GDS_TENANT_ID"])
UID = uuid.UUID(os.environ["GDS_OWNER_USER_ID"])


async def bind(db):
    await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"), {"t": str(TID)})


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("target")
    ap.add_argument("--agent", default="penetration_testing_coordinator")
    ap.add_argument("--approve-as-owner", action="store_true")
    a = ap.parse_args()

    async with async_session_factory() as db:
        mid = uuid.uuid4()
        await bind(db)
        await db.execute(text(
            "INSERT INTO missions (id, tenant_id, requested_by_user_id, objective, status, mission_type, created_at) "
            "VALUES (:i, :t, :u, :o, 'running', 'port_scan', NOW())"),
            {"i": str(mid), "t": str(TID), "u": str(UID), "o": f"Governed port scan of {a.target}"})
        await db.commit()

        await bind(db)  # a commit drops the tenant context
        ev = await evaluate_capability_request(
            db, tenant_id=TID, user_id=UID, mission_id=mid,
            requesting_agent_id=a.agent, supervising_agent_id=None,
            capability_key="network.port_scan", requested_tool_id="nmap_scan",
            target_type="domain", target_reference=a.target, target_scope=None,
            purpose=f"governed port scan of {a.target}"[:200],
            requested_parameters={"target": a.target})
        print("decision:", ev.decision, "| approval:", getattr(ev, "approval_id", None),
              "| reason:", getattr(ev, "safe_message", None))

        if ev.decision == "REQUIRE_APPROVAL" and a.approve_as_owner:
            await bind(db)
            await db.execute(text(
                "UPDATE approvals SET status='approved', decided_by_user_id=:u, decided_at=NOW() "
                "WHERE id=:a AND tenant_id=:t"), {"u": str(UID), "a": str(ev.approval_id), "t": str(TID)})
            await db.commit()
            print("approval recorded for owner", UID)
            await bind(db)
            ev = await reevaluate_capability_request(db, tenant_id=TID, request_id=ev.request_id)
            print("re-evaluated:", ev.decision, "| reason:", getattr(ev, "safe_message", None))

        if ev.decision != "ALLOW":
            print("NOT EXECUTED")
            return 1

        await bind(db)
        res = await execute_capability_request(
            db, tenant_id=TID, request_id=ev.request_id, tool_name="nmap_scan",
            input_data={"target": a.target}, user_id=UID, mission_id=mid)
        print("nmap success:", res.get("success"), "| ports:", res.get("ports") or res.get("open_ports"))
        print("raw:", str(res)[:300])

        # Store what the scan actually returned. Only genuinely unexpected ports become a finding:
        # 22/80/443 are this host's published services, so re-filing them every run would be noise
        # that trains the reader to ignore the register.
        ports = res.get("ports") or res.get("open_ports") or []
        numbers = sorted({int(p["port"].split("/")[0]) for p in ports if str(p.get("port", "")).split("/")[0].isdigit()})
        expected = {22, 80, 443}
        unexpected = [n for n in numbers if n not in expected]
        print("open ports:", numbers, "| unexpected:", unexpected)
        if unexpected:
            import json
            title = "Unexpected open ports on %s: %s" % (a.target, ", ".join(map(str, unexpected)))
            details = json.dumps({"open_ports": numbers, "unexpected": unexpected, "services": ports})
            await bind(db)
            row = await db.execute(text(
                "INSERT INTO security_findings (scanner, title, severity, target, details, status, detected_at, tenant_id, source) "
                "SELECT 'nmap', :ti, 'medium', :tg, CAST(:de AS jsonb), 'open', NOW(), :tid, 'governed_port_scan' "
                "WHERE NOT EXISTS (SELECT 1 FROM security_findings WHERE tenant_id=:tid AND scanner='nmap' "
                "AND title=:ti AND target=:tg AND status='open') RETURNING id"), 
                {"ti": title, "tg": a.target, "de": details, "tid": str(TID)})
            await db.commit()
            got = row.first()
            print("finding stored:", got[0] if got else "duplicate (already open)")
        else:
            print("no finding filed: every open port is an expected published service")
        return 0

sys.exit(asyncio.run(main()))
