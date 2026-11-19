#!/usr/bin/env python3
"""One-command measurement of the GDS OS platform.

Every count in the build sequence was gathered by hand over SSH until this existed. Run it
before and after a phase so a claim about the platform is a measurement, not a memory.

    python3 scripts/ops/measure_platform.py            # human report
    python3 scripts/ops/measure_platform.py --json     # machine report
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

DB = os.environ.get("GDS_DB", "gds_os")
API = os.environ.get("GDS_API", "http://127.0.0.1:8000")
REPO = Path(__file__).resolve().parents[2]


def psql(sql: str) -> list[list[str]]:
    out = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", DB, "-tAF", "|", "-c", sql],
        capture_output=True, text=True, cwd="/tmp", timeout=60,
    )
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip().splitlines()[-1] if out.stderr.strip() else "psql failed")
    return [line.split("|") for line in out.stdout.strip().splitlines() if line]


def one(sql: str, default: str = "?") -> str:
    rows = psql(sql)
    return rows[0][0] if rows and rows[0] else default


def http(path: str) -> tuple[int, str]:
    out = subprocess.run(
        ["curl", "-s", "-m", "8", "-o", "/tmp/.measure_body", "-w", "%{http_code}", f"{API}{path}"],
        capture_output=True, text=True, timeout=20,
    )
    body = ""
    try:
        body = Path("/tmp/.measure_body").read_text()[:2000]
    except OSError:
        pass
    return int(out.stdout or 0), body


def git(*args: str) -> str:
    out = subprocess.run(["git", *args], capture_output=True, text=True, cwd=REPO, timeout=30)
    return out.stdout.strip()


def measure() -> dict:
    code, version_body = http("/health/version")
    try:
        version = json.loads(version_body)
    except ValueError:
        version = {}

    by_sev = {row[0]: int(row[1]) for row in psql(
        "select severity, count(*) from security_findings where status='open' group by 1 order by 2 desc"
    )}

    tenant_tables = int(one(
        "select count(*) from information_schema.columns where table_schema='public' "
        "and column_name='tenant_id' and table_name in "
        "(select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE')"
    ) or 0)
    forced = int(one(
        "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace "
        "join information_schema.columns col on col.table_name=c.relname and col.column_name='tenant_id' "
        "and col.table_schema='public' where n.nspname='public' and c.relkind='r' and c.relforcerowsecurity"
    ) or 0)
    unforced = [r[0] for r in psql(
        "select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace "
        "join information_schema.columns col on col.table_name=c.relname and col.column_name='tenant_id' "
        "and col.table_schema='public' where n.nspname='public' and c.relkind='r' and not c.relforcerowsecurity order by 1"
    )]

    # The dumps live in daily/; the top level also holds unrelated artifacts, so a top-level
    # scan reported a 128h-old file while a real 8h-old dump sat one directory down.
    backup_root = Path("/var/backups/gds")
    dumps = sorted(backup_root.rglob("*.dump")) if backup_root.is_dir() else []
    newest_dump = dumps[-1].name if dumps else "none"
    dump_age_h = "?"
    if dumps:
        age = datetime.now(timezone.utc).timestamp() - dumps[-1].stat().st_mtime
        dump_age_h = f"{age / 3600:.1f}"

    log = Path("/var/log/gds-backup.log")
    offhost = "unknown"
    if log.is_file():
        for line in reversed(log.read_text(errors="replace").splitlines()[-40:]):
            # The newest marker decides, not any marker: an older "not configured" line in the same log
            # tail made this report "not configured" while B2 uploads were succeeding every night.
            if "OFFHOST_B2 ok" in line:
                offhost = "verified off-host (B2)"
                break
            if "OFFHOST OK" in line or "offhost copy ok" in line.lower():
                offhost = "copying"
                break
            if "OFFHOST_NOT_CONFIGURED" in line:
                offhost = "not configured"
                break

    return {
        "measured_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "release": {
            "sha": version.get("sha", git("rev-parse", "HEAD")[:40]),
            "branch": version.get("branch", git("rev-parse", "--abbrev-ref", "HEAD")),
            "tree_clean": version.get("tree_clean", git("status", "--porcelain") == ""),
            "schema_version": version.get("schema_version"),
            "health_http": code,
        },
        "database": {
            "tables": int(one("select count(*) from information_schema.tables where table_schema='public'") or 0),
            "migrations_recorded": int(one("select count(*) from schema_migrations") or 0),
            "tenant_tables": tenant_tables,
            "tenant_tables_forced": forced,
            "tenant_tables_unforced": unforced,
        },
        "findings": {
            "total": int(one("select count(*) from security_findings") or 0),
            "open": int(one("select count(*) from security_findings where status='open'") or 0),
            "open_by_severity": by_sev,
            "newest": one("select max(detected_at)::date from security_findings"),
        },
        "backups": {
            "dumps_present": len(dumps),
            "newest": newest_dump,
            "newest_age_hours": dump_age_h,
            "archive_mode": one("show archive_mode"),
            "offhost": offhost,
        },
        "disk_root_used_pct": subprocess.run(
            ["df", "-h", "/"], capture_output=True, text=True
        ).stdout.strip().splitlines()[-1].split()[4] if True else "?",
    }


def report(m: dict) -> str:
    r, d, f, b = m["release"], m["database"], m["findings"], m["backups"]
    sev = ", ".join(f"{k} {v}" for k, v in f["open_by_severity"].items())
    unforced = ", ".join(d["tenant_tables_unforced"]) or "none"
    return "\n".join([
        f"GDS OS measured {m['measured_at']}",
        "",
        f"  release      {r['sha'][:12]} on {r['branch']}, tree_clean={r['tree_clean']}, "
        f"schema {r['schema_version']}, health {r['health_http']}",
        f"  database     {d['tables']} tables, {d['migrations_recorded']} migrations recorded",
        f"  isolation    {d['tenant_tables_forced']}/{d['tenant_tables']} tenant tables forced; unforced: {unforced}",
        f"  findings     {f['open']} open of {f['total']} total, newest {f['newest']}",
        f"               {sev}",
        f"  backups      {b['dumps_present']} dumps, newest {b['newest']} ({b['newest_age_hours']}h old), "
        f"archive_mode={b['archive_mode']}, off-host={b['offhost']}",
        f"  disk         root {m['disk_root_used_pct']} used",
    ])


if __name__ == "__main__":
    result = measure()
    print(json.dumps(result, indent=2) if "--json" in sys.argv else report(result))
