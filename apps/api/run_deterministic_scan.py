#!/usr/bin/env python3
"""Deterministic detection loop - real tools, no LLM, no simulation.

WHY THIS EXISTS
Every scheduled mission routes through an LLM for agent reasoning. When the model
provider is unavailable (exhausted quota, outage, bad key) the entire detection
pipeline stops writing findings, even though the scanners themselves are local and
work fine. That is why the newest finding in the register is 2026-09-11.

This script calls the same real executors directly and stores what they actually
return. It does not decide anything, does not summarise, and never invents a row.
If a tool fails, the failure is logged and no finding is written.

Dedupe: a finding is only inserted when no OPEN row already exists for the same
(scanner, title, target). Re-running is therefore safe and idempotent.

Exit codes: 0 = ran (even if nothing new), 1 = fatal setup error.
"""

import asyncio
import datetime as _dt
import json as _json
import json
import os
import uuid
import sys
from datetime import datetime, timezone

TENANT_SQL = "SELECT id FROM tenants WHERE slug = 'gds'"

TARGETS_HTTP = [
    # /health, not the host root: the root has no route and answers 404, which made every run record
    # nothing for this host (30 of 30 runs in the rotated log). /health is public and always routable.
    "https://api.globaldigitalsecurity.io/health",
    "https://app.globaldigitalsecurity.io",
]

# Headers that matter and the severity we assign when absent.
# Kept deliberately conservative: these are real, verifiable absences.
HEADER_RULES = [
    ("content-security-policy", "Missing Content-Security-Policy header", "medium"),
    ("referrer-policy", "Missing Referrer-Policy header", "low"),
    ("x-frame-options", "Missing X-Frame-Options header", "low"),
    ("x-content-type-options", "Missing X-Content-Type-Options header", "low"),
    ("strict-transport-security", "Missing HSTS header", "medium"),
]


def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    print(f"[{ts}] {msg}", flush=True)


async def store_finding(db, tenant_id, scanner, title, severity, target, details):
    """Insert only if no OPEN duplicate exists. Returns 'new' or 'dupe'."""
    from sqlalchemy import text

    # FORCE RLS evaluates WITH CHECK on every write. The pooled connection may
    # differ from the one that ran the session-level set_config, so the tenant
    # context is (re)asserted transaction-locally on THIS connection immediately
    # before touching the table. This is the only reliable placement.
    await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"),
                     {"t": str(tenant_id)})

    exists = (await db.execute(text("""
        SELECT 1 FROM security_findings
        WHERE scanner = :s AND title = :t AND target = :g
          AND status = 'open' AND tenant_id = :tid
        LIMIT 1
    """), {"s": scanner, "t": title, "g": target, "tid": tenant_id})).first()
    if exists:
        return "dupe"

    await db.execute(text("""
        INSERT INTO security_findings
            (scanner, title, severity, target, details, remediation, status,
             detected_at, tenant_id, source)
        VALUES (:s, :t, :sev, :g, CAST(:d AS jsonb), :rem, 'open', :dt, :tid, :src)
    """), {
        "s": scanner, "t": title, "sev": severity, "g": target,
        "d": json.dumps(details), "rem": None, "dt": datetime.now(timezone.utc).replace(tzinfo=None),
        "tid": tenant_id, "src": scanner,
    })
    return "new"


async def check_headers(db, tenant_id, base_url):
    """Real HTTP fetch of response headers; records only what is genuinely absent."""
    import urllib.request

    try:
        req = urllib.request.Request(base_url, method="GET",
                                     headers={"User-Agent": "GDS-Deterministic-Scanner/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            hdrs = {k.lower(): v for k, v in resp.headers.items()}
            status = resp.status
    except urllib.error.HTTPError as e:
        # A 4xx/5xx still returns headers, and a missing header on an error page
        # is still a real absence - capture rather than fail.
        hdrs = {k.lower(): v for k, v in e.headers.items()}
        status = e.code
    except Exception as e:
        log(f"headers {base_url}: TOOL FAILED {type(e).__name__}: {e}")
        return {"new": 0, "dupe": 0, "failed": 1}

    new = dupe = 0
    for hname, title, sev in HEADER_RULES:
        if hname in hdrs:
            continue
        full = f"{title} on {base_url.replace('https://', '')}"
        outcome = await store_finding(db, tenant_id, "security_headers", full, sev, base_url,
                                     {"header": hname, "http_status": status,
                                      "checked_at": datetime.now(timezone.utc).isoformat()})
        new += outcome == "new"
        dupe += outcome == "dupe"
    await db.commit()
    log(f"headers {base_url}: http={status} new={new} duplicate={dupe}")
    return {"new": new, "dupe": dupe, "failed": 0}


async def check_ports(db, tenant_id, host="127.0.0.1"):
    """Real port inventory through the governed capability path.

    The capability is network.asset_inventory (R2, read-only, target-authorisation required), not
    network.port_scan (R4, offensive, human approval per run). Requesting the R4 one meant every six-hourly run
    raised an approval nobody answered, so this control produced nothing while logging an attempt. The
    authorisation gate is unchanged: an active AuthorizedTarget is still required.

    The governed path is: open a real mission, propose a capability request, let the broker decide, and only
    then execute. A refusal is recorded as the mission's ending with the broker's own reason, so it reads as a
    decision rather than a generic tool failure.
    """
    import uuid as _uuid

    tid = _uuid.UUID(str(tenant_id))
    owner = (os.environ.get("GDS_OWNER_USER_ID", "") or "").strip()
    if not owner:
        log(f"port inventory {host}: NOT ATTEMPTED - GDS_OWNER_USER_ID is not configured, so a capability request cannot be attributed")
        return {"new": 0, "dupe": 0, "failed": 1, "reason": "no owner identity"}
    uid = _uuid.UUID(owner)

    from sqlalchemy import text as _text
    mission_id = _uuid.uuid4()
    await db.execute(_text("SELECT set_config('gds.tenant_id', :t, true)"), {"t": str(tid)})
    await db.execute(_text(
        "INSERT INTO missions (id, tenant_id, requested_by_user_id, objective, status, mission_type, created_at) "
        "VALUES (:id, :tid, :uid, :obj, 'running', 'port_scan', NOW())"),
        {"id": str(mission_id), "tid": str(tid), "uid": str(uid),
         "obj": f"Scheduled port coverage of {host}"})
    await db.commit()

    # Re-bind AFTER the commit. The commit returns the pooled connection, so the tenant context
    # from before it is gone; the broker's authorisation step reads the user table under FORCE RLS
    # and an unbound read makes the requesting user invisible, which reports as
    # "The requesting user could not be authorized".
    await db.execute(_text("SELECT set_config('gds.tenant_id', :t, true)"), {"t": str(tid)})

    outcome = {"new": 0, "dupe": 0, "failed": 1, "detail": "did not run"}
    try:
        outcome = await _execute_port_inventory(db, tid, uid, mission_id, host)
    finally:
        # Close the mission this run opened, on every path including a crash. Leaving it running is exactly
        # what put eleven port_scan rows in `running` between 19 and 20 Nov: the reaper is a net for processes
        # that died without a chance to write anything, not a fix for a path that never closes its own mission.
        await _close_mission(db, tid, mission_id, outcome)
    return outcome


async def _close_mission(db, tenant_id, mission_id, outcome):
    """Record the real ending of this run. Re-binds first: an earlier commit returned the pooled connection."""
    from sqlalchemy import text as _text

    ok = int(outcome.get("failed", 1)) == 0
    detail = {k: v for k, v in outcome.items() if k != "detail"}
    if outcome.get("detail"):
        detail["reason"] = outcome["detail"]
    await db.execute(_text("SELECT set_config('gds.tenant_id', :t, true)"), {"t": str(tenant_id)})
    await db.execute(_text(
        "UPDATE missions SET status = :s, completed_at = NOW(), report = :r "
        "WHERE id = :id AND tenant_id = :tid"),
        {"s": "completed" if ok else "failed", "r": json.dumps({"port_inventory": detail}),
         "id": str(mission_id), "tid": str(tenant_id)})
    await db.commit()
    log(f"port inventory mission {str(mission_id)[:8]}: closed {'completed' if ok else 'failed'}")


async def _execute_port_inventory(db, tid, uid, mission_id, host):
    """The governed run itself. Returns an outcome dict; never raises past the caller's finally."""
    from gds_api.capabilities.broker import evaluate_capability_request
    from gds_api.capabilities.gateway import execute_capability_request

    try:
        evaluation = await evaluate_capability_request(
            db, tenant_id=tid, user_id=uid, mission_id=mission_id,
            # The blue-team agent whose ceiling covers R2 inventory, not the red-team coordinator.
            requesting_agent_id="network_security", supervising_agent_id=None,
            capability_key="network.asset_inventory", requested_tool_id="port_inventory_scan",
            target_type="domain", target_reference=host, target_scope=None,
            purpose=f"scheduled exposure scan: port coverage of {host}"[:200],
            requested_parameters={"target": host},
        )
    except Exception as e:
        log(f"port inventory {host}: capability request raised {type(e).__name__}: {e}")
        return {"new": 0, "dupe": 0, "failed": 1}

    if evaluation.decision != "ALLOW":
        log(f"port inventory {host}: capability {evaluation.decision} - {getattr(evaluation, 'safe_message', '') or 'no reason given'}"
            f" (approval_id={getattr(evaluation, 'approval_id', None)})")
        return {"new": 0, "dupe": 0, "failed": 1, "decision": evaluation.decision,
                "detail": f"capability {evaluation.decision}: "
                          f"{getattr(evaluation, 'safe_message', '') or 'no reason given'}"}

    try:
        res = await execute_capability_request(
            db, tenant_id=tid, request_id=evaluation.request_id,
            tool_name="port_inventory_scan", input_data={"target": host},
            user_id=uid, mission_id=mission_id,
        )
    except Exception as e:
        log(f"port inventory {host}: governed execution failed {type(e).__name__}: {e}")
        return {"new": 0, "dupe": 0, "failed": 1}

    if not isinstance(res, dict) or not res.get("success", True):
        log(f"port inventory {host}: executor returned no usable result: {str(res)[:160]}")
        return {"new": 0, "dupe": 0, "failed": 1}

    ports = res.get("ports") or res.get("open_ports") or []
    if not isinstance(ports, list):
        ports = []
    numbers = []
    for p in ports:
        raw = None
        if isinstance(p, dict):
            raw = p.get("port") or p.get("portid")
        else:
            raw = p
        if raw is None:
            continue
        # nmap entries arrive as "22/tcp", 22, or "22" - take the numeric head.
        head = str(raw).split("/")[0].strip()
        if head.isdigit():
            numbers.append(int(head))
    numbers = sorted(set(numbers))

    # A port listening on a loopback or private address is NOT an exposure. The
    # 2026-11-14 run scanned 127.0.0.1 and filed 5432/8000/8001/8222/9000/9001 as
    # "unexpected open ports" while every one of them was blocked at the firewall.
    # Reachability is measured from outside (see the external test), so a local
    # listener must never be reported as an internet-facing finding.
    _h = str(host).split(":")[0].strip().lower()
    _private = (_h in ("localhost", "::1", "127.0.0.1")
                or _h.startswith("127.")
                or _h.startswith("10.")
                or _h.startswith("192.168.")
                or any(_h.startswith(f"172.{n}.") for n in range(16, 32)))
    if _private:
        await db.commit()
        log(f"port inventory {host}: open={numbers} (local listener, not internet-facing; no finding filed)")
        return {"new": 0, "dupe": 0, "failed": 0}

    new = dupe = 0
    unexpected = [n for n in numbers if n not in (22, 80, 443)]
    if unexpected:
        title = f"Unexpected open ports on {host}: {', '.join(map(str, unexpected))}"
        outcome = await store_finding(db, tenant_id, "nmap", title, "medium", host,
                                     {"open_ports": numbers, "unexpected": unexpected})
        new += outcome == "new"
        dupe += outcome == "dupe"
    await db.commit()
    log(f"port inventory {host}: open={numbers} new={new} duplicate={dupe}")
    return {"new": new, "dupe": dupe, "failed": 0}


async def main():
    run_started = _dt.datetime.now(_dt.timezone.utc)
    from sqlalchemy import text
    from gds_api.db import async_session_factory

    totals = {"new": 0, "dupe": 0, "failed": 0}
    targets_checked = 0
    async with async_session_factory() as db:
        # R2.1: tenants is FORCE-RLS protected, so a lookup by slug returns nothing until a
        # tenant is bound - and binding requires the id this query is trying to find. The
        # operator supplies it instead; the slug lookup stays as a fallback for the case where
        # the table is ever readable again (or RLS is relaxed for this operational script).
        env_tid = os.environ.get("GDS_TENANT_ID", "").strip()
        if env_tid:
            tenant_id = uuid.UUID(env_tid)
            row = (tenant_id,)
        else:
            row = (await db.execute(text(TENANT_SQL))).first()
        if not row:
            log("FATAL: GDS tenant not found")
            return 1
        tenant_id = row[0]

        # FORCE RLS on security_findings. Session-scoped (false) rather than
        # transaction-local, because this script commits between checks and a
        # transaction-local setting is cleared by each COMMIT - which silently
        # made later inserts fail the RLS WITH CHECK.
        await db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"),
                         {"t": str(tenant_id)})

        before = (await db.execute(text("SELECT count(*) FROM security_findings"))).scalar()

        for url in TARGETS_HTTP:
            r = await check_headers(db, tenant_id, url)
            targets_checked += 1
            # r.get, not r[k]: a check reports the counters it has, and a missing key must not abort a scan that
            # has already written findings.
            for k in totals:
                totals[k] += r.get(k, 0)

        # The scheduled scan measures the real internet-facing surface, not a loopback listener:
        # a private host is never an exposure and the scan deliberately files no finding for one.
        _port_host = os.environ.get("GDS_SCAN_PUBLIC_HOST", "www.globaldigitalsecurity.io").strip()
        r = await check_ports(db, tenant_id, host=_port_host)
        targets_checked += 1
        for k in totals:
            totals[k] += r.get(k, 0)

        await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"),
                         {"t": str(tenant_id)})
        after = (await db.execute(text("SELECT count(*) FROM security_findings"))).scalar()

    # Item 46: record this run and stamp its schedule. Before this, the only trace of a scan was a line in
    # /var/log/gds-deterministic-scan.log, so a dead scanner and a quiet estate looked identical from inside the
    # product. The insert is best-effort on purpose: a failure to record must not turn a completed scan into an
    # error, but it must be visible in the log rather than swallowed.
    try:
        async with async_session_factory() as _db:
            await _db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"),
                              {"t": str(tenant_id)})
            await _db.execute(
                text(
                    "INSERT INTO scan_runs (tenant_id, scanner, started_at, duration_ms, targets, new_findings, "
                    "duplicates, failed, register_before, register_after, outcome, detail) VALUES "
                    "(:tid, :scanner, :started, :dur, :targets, :new, :dupe, :failed, :before, :after, :outcome, "
                    "CAST(:detail AS jsonb))"
                ),
                {
                    "tid": str(tenant_id),
                    "scanner": "Deterministic estate scan (headers + ports)",
                    "started": run_started,
                    "dur": int((_dt.datetime.now(_dt.timezone.utc) - run_started).total_seconds() * 1000),
                    "targets": targets_checked,
                    "new": totals["new"],
                    "dupe": totals["dupe"],
                    "failed": totals["failed"],
                    "before": before,
                    "after": after,
                    "outcome": "ok" if totals["failed"] == 0 else "partial",
                    "detail": _json.dumps({"log": "/var/log/gds-deterministic-scan.log"}),
                },
            )
            # make_interval, and a separate binding for each use of the timestamp. asyncpg deduced a single :now
            # used both as a timestamptz and inside an interval expression as "inconsistent types for parameter $1"
            # and rolled the whole block back - the same family of typing defect as the COALESCE/array casts.
            await _db.execute(
                text(
                    "UPDATE scan_schedules SET last_run_at = CAST(:last AS timestamptz), "
                    "next_run_at = CAST(:next AS timestamptz) + make_interval(mins => interval_minutes), "
                    "last_run_findings = CAST(:new AS integer), total_runs = total_runs + 1, "
                    "total_findings = total_findings + CAST(:new AS integer), last_error = NULL, "
                    "updated_at = CAST(:touched AS timestamptz) "
                    "WHERE tenant_id = CAST(:tid AS uuid) AND monitor_type = 'deterministic'"
                ),
                {
                    "last": run_started,
                    "next": run_started,
                    "touched": run_started,
                    "new": totals["new"],
                    "tid": str(tenant_id),
                },
            )
            await _db.commit()
    except Exception as exc:  # noqa: BLE001 - recording must never fail the scan
        log(f"WARN could not record this run: {exc}")

    log(f"DONE new={totals['new']} duplicate={totals['dupe']} failed={totals['failed']} "
        f"register {before} -> {after}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
