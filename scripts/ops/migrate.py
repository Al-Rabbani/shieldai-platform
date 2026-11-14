#!/usr/bin/env python3
"""Apply pending SQL migrations in version order and record them.

Replaces hand-applied SQL. A migration already in schema_migrations is skipped,
so the runner is safe to call on every deploy. Files are checksummed: a changed
file that was already applied is an error, because silently reapplying edited SQL
is how a schema drifts away from what was recorded.
"""
from __future__ import annotations
import hashlib, os, subprocess, sys, time
from pathlib import Path

MIGRATION_DIR = Path("/opt/gds-os/migrations/security_isolation")
DB = os.environ.get("PGDATABASE", "gds_os")

def psql(sql: str, *, tuples_only: bool = False) -> str:
    cmd = ["sudo", "-u", "postgres", "psql", "-d", DB, "-v", "ON_ERROR_STOP=1"]
    cmd.append("-tAc" if tuples_only else "-c")
    cmd.append(sql)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:400])
    return r.stdout.strip()

def applied() -> dict[str, str]:
    psql("""CREATE TABLE IF NOT EXISTS schema_migrations (
              version text PRIMARY KEY, name text NOT NULL, checksum text,
              applied_at timestamptz NOT NULL DEFAULT now(),
              applied_by text NOT NULL DEFAULT current_user, duration_ms integer);""")
    out = psql("SELECT version||'|'||coalesce(checksum,'') FROM schema_migrations;", tuples_only=True)
    return dict(line.split("|", 1) for line in out.splitlines() if "|" in line)

def main() -> int:
    done = applied()
    files = sorted(MIGRATION_DIR.glob("*.sql"))
    if not files:
        print("no migration files found"); return 0
    pending = 0
    for f in files:
        version = f.name.split("_", 1)[0]
        checksum = hashlib.sha256(f.read_bytes()).hexdigest()
        if version in done:
            recorded = done[version]
            if recorded == "pre-tracking (retro-registered)":
                # Registered retroactively without a checksum. Adopt the file's real
                # hash once so future edits are detectable, then continue.
                psql(f"UPDATE schema_migrations SET checksum='{checksum}' WHERE version='{version}';")
                print(f"adopted checksum for {f.name}")
                continue
            if recorded and recorded != checksum:
                print(f"ERROR {f.name}: already applied with a different checksum "
                      f"(recorded {recorded[:12]}, file {checksum[:12]}). Refusing to reapply.")
                return 2
            continue
        print(f"applying {f.name} ...", end=" ", flush=True)
        started = time.time()
        psql(f.read_text())
        ms = int((time.time() - started) * 1000)
        psql("INSERT INTO schema_migrations (version, name, checksum, duration_ms) "
             f"VALUES ('{version}', '{f.stem}', '{checksum}', {ms}) ON CONFLICT (version) DO NOTHING;")
        print(f"ok ({ms}ms)")
        pending += 1
    print(f"{pending} migration(s) applied, {len(done)} already recorded")
    return 0

if __name__ == "__main__":
    sys.exit(main())
