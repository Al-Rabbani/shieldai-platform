"""Run every installed scanner against the authorised estate, and say what each one produced.

WHY THIS EXISTS. Measured 26 Nov 2026: twelve scanner binaries are installed and only three jobs ran unattended
(container image watch, OSV dependency watch, a 6-hourly headers-and-ports check). Nine scanners that find web,
application and network weaknesses - nuclei, nikto, nmap, semgrep, sqlmap, subfinder, httpx, ffuf, gobuster - were
reachable only when a mission happened to call one, so three of them last produced a finding on 1 August. A scanner
that never runs cannot solve a problem, and an idle scanner is indistinguishable from a broken one until it is made to
run and report.

WHAT IT DOES. For each active, in-window AuthorizedTarget it runs the sweep tools that apply to that target type,
through the same tool handlers the governed path uses, and writes whatever they find to the register via
scanner_persistence. Each scanner gets its own scan_runs row and its scan_schedules stamp, so scanner liveness and the
freshness objective see it. A scanner that errors is recorded as failed with the reason; a scanner that returns nothing
is recorded as ran-with-nothing, which is a measurement, not an absence.

WHAT IT DOES NOT DO. It does not exploit, does not scan anything that is not an active AuthorizedTarget, and does not
run a scanner that is not installed (it says so by name instead of reporting a silent zero).

Usage:
    python run_estate_sweep.py                  # every tool, every active target
    python run_estate_sweep.py --only nikto,security_headers
    python run_estate_sweep.py --dry-run        # list what would run, scan nothing
"""
from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import os
import sys
import time

from sqlalchemy import text

from gds_api.db import async_session_factory
from gds_api.scanner_persistence import persist_scan_output

TENANT = os.environ.get("GDS_TENANT_ID", "")
#: scanner name -> (governed tool, needs a URL rather than a bare host)
SWEEP: dict[str, tuple[str | None, bool]] = {
    "nuclei": ("nuclei_scan", True),
    "nikto": ("nikto_scan", True),
    "nmap": ("nmap_scan", False),
    "security_headers": ("security_headers_check", True),
    "owasp_pentest": (None, True),
    "api_pentest": (None, True),
    # Added 26 Nov 2026 once these four could actually produce a recordable result. Until then they were on-demand only:
    # ffuf and gobuster had no wordlist to read, gobuster refused to run on a catch-all host, httpx ignored -u and probed
    # nothing, and none of the four parsed its own output into findings.
    "subfinder": ("subfinder_scan", False),
    "httpx": ("httpx_scan", True),
    "ffuf": ("ffuf_scan", True),
    "gobuster": ("gobuster_scan", True),
}
#: Not in the sweep, with the reason: wpscan needs an API token to report plugin/theme vulnerabilities, so without one
#: it would run nightly and prove nothing. It stays callable but is not counted as coverage.
EXCLUDED: dict[str, str] = {
    "wpscan": "no WPScan API token configured, so it cannot report plugin or theme vulnerabilities",
}
#: Tools that make sense for a given target type. A web_application target is not port-scanned by nmap here.
APPLIES: dict[str, set[str]] = {
    "host": {"nuclei", "nikto", "nmap", "security_headers", "owasp_pentest", "api_pentest",
             "httpx", "ffuf", "gobuster"},
    "domain": {"nuclei", "nikto", "security_headers", "owasp_pentest", "api_pentest",
               "subfinder", "httpx", "ffuf", "gobuster"},
    "web_application": {"nuclei", "nikto", "security_headers", "owasp_pentest", "api_pentest",
                        "httpx", "ffuf", "gobuster"},
    "ip": {"nuclei", "nmap", "security_headers", "httpx"},
    "cidr": {"nmap"},
}
BINARIES = {"nuclei": "nuclei", "nikto": "nikto", "nmap": "nmap"}


def _bind(db, tenant: str):
    return db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"), {"t": str(tenant)})


async def _targets(db) -> list[tuple[str, str]]:
    rows = (
        await db.execute(
            text(
                "SELECT target, target_type FROM authorized_targets "
                "WHERE status = 'active' AND valid_from <= now() "
                "AND (valid_until IS NULL OR valid_until >= now()) ORDER BY target"
            )
        )
    ).all()
    return [(r[0], r[1]) for r in rows]


def _as_url(target: str, target_type: str) -> str:
    if target.startswith(("http://", "https://")):
        return target
    return f"https://{target}"


async def _run_one(db, tenant: str, scanner: str, target: str, target_type: str) -> dict:
    """Run a single scanner against a single target. Never raises; reports what happened."""
    tool, needs_url = SWEEP[scanner]
    started = time.monotonic()
    result: dict = {"scanner": scanner, "target": target, "findings": 0, "recorded": 0,
                    "duplicates": 0, "error": None, "duration_ms": 0}
    try:
        await _bind(db, tenant)
        if tool is not None:
            from gds_api.tool_gateway import TOOL_REGISTRY

            handler = TOOL_REGISTRY.get(tool)
            if handler is None:
                result["error"] = f"{tool} is not registered in TOOL_REGISTRY"
                return result
            params = {"target": _as_url(target, target_type) if needs_url else target}
            output = await handler(params)
            if not isinstance(output, dict):
                result["error"] = f"{tool} returned {type(output).__name__}, not a result object"
                return result
            found = output.get("findings") or []
            result["findings"] = len(found) if isinstance(found, list) else 0
            persisted = await persist_scan_output(tenant, tool, params["target"], output)
            # The writer's REAL keys are findings_created / duplicates_skipped / findings_total. Guessing at them three
            # times in one night made written rows display as "0 recorded", which is the same lie as a silent zero.
            # Read the documented names first, then any older spelling, and never infer a zero from a missing key.
            result["recorded"] = int(
                persisted.get("findings_created")
                if persisted.get("findings_created") is not None
                else (persisted.get("created") or persisted.get("new") or 0)
            )
            result["duplicates"] = int(
                persisted.get("duplicates_skipped")
                if persisted.get("duplicates_skipped") is not None
                else (persisted.get("duplicates") or persisted.get("deduped") or 0)
            )
            result["persistence_note"] = persisted.get("note")
            if persisted.get("persisted") is False:
                result["error"] = persisted.get("reason")
        else:
            # The two in-platform scanners write their own findings and report honestly whether they did.
            from gds_api.pentest.api_scanner import APIScanner
            from gds_api.pentest.owasp_scanner import OWASPScanner

            cls = OWASPScanner if scanner == "owasp_pentest" else APIScanner
            instance = cls(_as_url(target, target_type), tenant_id=tenant, db=db)
            out = await instance.run_all_tests()
            result["findings"] = int(out.get("findings_created") or 0)
            result["recorded"] = result["findings"]
            result["duplicates"] = 0
            if out.get("writes_refused"):
                result["error"] = f"{out['writes_refused']} write(s) refused: {out.get('write_errors')}"
            elif out.get("tests_failed"):
                result["error"] = f"{out['tests_failed']} test(s) failed: {out.get('failed_tests')}"
    except Exception as exc:  # noqa: BLE001 - one scanner must not end the sweep
        result["error"] = f"{type(exc).__name__}: {str(exc)[:300]}"
        try:
            await db.rollback()
        except Exception:  # noqa: BLE001
            pass
    result["duration_ms"] = int((time.monotonic() - started) * 1000)
    return result


async def _record(db, tenant: str, results: list[dict]) -> None:
    """One scan_runs row and one scan_schedules stamp per scanner, so liveness sees the sweep."""
    by_scanner: dict[str, list[dict]] = {}
    for r in results:
        by_scanner.setdefault(r["scanner"], []).append(r)
    now = dt.datetime.now(dt.timezone.utc)
    for scanner, rows in by_scanner.items():
        created = sum(r["recorded"] for r in rows)
        failed = sum(1 for r in rows if r["error"])
        duration = sum(r["duration_ms"] for r in rows)
        detail = {r["target"]: (r["error"] or f"{r['findings']} found, {r['recorded']} recorded") for r in rows}
        outcome = "failed" if failed == len(rows) else ("degraded" if failed else "ok")
        await _bind(db, tenant)
        await db.execute(
            text(
                "INSERT INTO scan_runs (tenant_id, scanner, started_at, duration_ms, targets, new_findings, "
                "duplicates, failed, register_before, register_after, outcome, detail) VALUES "
                "(:tid, :scanner, :started, :dur, :targets, :new, :dupe, :failed, NULL, NULL, :outcome, "
                "CAST(:detail AS jsonb))"
            ),
            {"tid": str(tenant), "scanner": f"estate_sweep:{scanner}", "started": now, "dur": duration,
             "targets": len(rows), "new": created, "dupe": sum(r["duplicates"] for r in rows),
             "failed": failed, "outcome": outcome, "detail": __import__("json").dumps(detail)},
        )
        # The schedule row is what the freshness objective and the "scanner silent" alert read.
        await db.execute(
            text(
                "INSERT INTO scan_schedules (tenant_id, name, monitor_type, target_config, interval_minutes, "
                "auto_triage, auto_escalate, status, last_run_at, next_run_at, last_run_findings, total_runs, "
                "total_findings) VALUES (:tid, :name, 'estate_sweep', '{}'::jsonb, 1440, true, false, 'active', "
                ":last, CAST(:last AS timestamptz) + make_interval(mins => 1440), :new, 1, :new) "
                "ON CONFLICT DO NOTHING"
            ),
            {"tid": str(tenant), "name": f"Estate sweep: {scanner}", "last": now, "new": created},
        )
        await db.execute(
            text(
                "UPDATE scan_schedules SET last_run_at = CAST(:last AS timestamptz), "
                "next_run_at = CAST(:last AS timestamptz) + make_interval(mins => interval_minutes), "
                "last_run_findings = :new, total_runs = total_runs + 1, "
                "total_findings = total_findings + :new, last_error = :err, updated_at = CAST(:last AS timestamptz) "
                "WHERE tenant_id = :tid AND name = :name"
            ),
            {"tid": str(tenant), "name": f"Estate sweep: {scanner}", "last": now, "new": created,
             "err": None if outcome == "ok" else outcome},
        )
    await db.commit()


async def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="comma-separated scanner names")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    if not TENANT:
        print("GDS_TENANT_ID is not set: refusing to run without a tenant", file=sys.stderr)
        return 2
    only = {s.strip() for s in args.only.split(",") if s.strip()}
    if only - set(SWEEP):
        print(f"unknown scanner(s): {sorted(only - set(SWEEP))}", file=sys.stderr)
        return 2

    results: list[dict] = []
    async with async_session_factory() as db:
        # authorised_targets is RLS-bound: an unbound session reads ZERO rows, and "no active target" is
        # indistinguishable from "no target authorised". Bind before the first read, not just before the first write.
        await _bind(db, TENANT)
        targets = await _targets(db)
        if not targets:
            print("no active authorised target in window: nothing may be scanned", file=sys.stderr)
            return 3
        plan = [(s, t, tt) for (t, tt) in targets for s in sorted(SWEEP)
                if (not only or s in only) and s in APPLIES.get(tt, set())]
        if args.dry_run:
            for s, t, tt in plan:
                print(f"would run {s:18} against {t} ({tt})")
            return 0
        for scanner, target, ttype in plan:
            binary = BINARIES.get(scanner)
            if binary and not _installed(binary):
                print(f"  {scanner:18} {target:34} SKIPPED: {binary} is not installed")
                continue
            print(f"  {scanner:18} {target:34} running...", flush=True)
            r = await _run_one(db, TENANT, scanner, target, ttype)
            results.append(r)
            if r["error"]:
                status = f"ERROR {r['error']}"
            else:
                # A dedupe is not a loss: "0 recorded" beside "22 found" reads as 22 findings thrown away.
                status = (f"{r['findings']} found, {r['recorded']} new, "
                          f"{r['duplicates']} already known")
                if r.get("persistence_note"):
                    status += f" ({r['persistence_note']})"
            print(f"  {scanner:18} {target:34} {status}  ({r['duration_ms']}ms)", flush=True)
        if results:
            await _record(db, TENANT, results)

    print("\n=== SWEEP SUMMARY: does each scanner solve a problem? ===")
    by_scanner: dict[str, list[dict]] = {}
    for r in results:
        by_scanner.setdefault(r["scanner"], []).append(r)
    for scanner, rows in sorted(by_scanner.items()):
        found = sum(r["findings"] for r in rows)
        recorded = sum(r["recorded"] for r in rows)
        errors = [r["error"] for r in rows if r["error"]]
        verdict = "BROKEN" if len(errors) == len(rows) else ("PARTIAL" if errors else "ran")
        print(f"  {scanner:18} {verdict:8} found={found:3} recorded={recorded:3} targets={len(rows)}")
        for err in errors:
            print(f"      reason: {err[:150]}")
    return 0 if results else 1


def _installed(binary: str) -> bool:
    import shutil

    return shutil.which(binary) is not None or os.path.exists(f"/opt/tools/bin/{binary}")


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
