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
import json
import os
import sys
from datetime import datetime, timezone

TENANT_SQL = "SELECT id FROM tenants WHERE slug = 'gds'"

TARGETS_HTTP = [
    "https://api.globaldigitalsecurity.io",
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
    """Real nmap through the existing governed executor."""
    try:
        from gds_api.tool_gateway import execute_tool
        res = await execute_tool("nmap_scan", action="execute", payload={"target": host})
    except Exception as e:
        log(f"nmap {host}: TOOL FAILED {type(e).__name__}: {e}")
        return {"new": 0, "dupe": 0, "failed": 1}

    if not isinstance(res, dict) or not res.get("success", True):
        log(f"nmap {host}: executor returned no usable result: {str(res)[:160]}")
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
        log(f"nmap {host}: open={numbers} (local listener, not internet-facing; no finding filed)")
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
    log(f"nmap {host}: open={numbers} new={new} duplicate={dupe}")
    return {"new": new, "dupe": dupe, "failed": 0}


async def main():
    from sqlalchemy import text
    from gds_api.db import async_session_factory

    totals = {"new": 0, "dupe": 0, "failed": 0}
    async with async_session_factory() as db:
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
            for k in totals:
                totals[k] += r[k]

        r = await check_ports(db, tenant_id)
        for k in totals:
            totals[k] += r[k]

        await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"),
                         {"t": str(tenant_id)})
        after = (await db.execute(text("SELECT count(*) FROM security_findings"))).scalar()

    log(f"DONE new={totals['new']} duplicate={totals['dupe']} failed={totals['failed']} "
        f"register {before} -> {after}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
