#!/usr/bin/env python3.11
"""Record that a scheduled scan actually ran, so "scanner silent" can mean something.

Measured before writing this: NOTHING in the repository writes scan_schedules. Only monitoring.py and
check_alerts.py read it, and there is no UPDATE anywhere in the tree. The five rows were seeded once and
frozen, so:

  * four container rows have last_run_at NULL forever and a next_run_at of 2026-11-20 20:29;
  * the OSV row last ran 2026-11-17 and has no schedule that would ever run it again.

check_alerts.py compares next_run_at against the row's own interval and alerts when overdue. Because no
row can ever advance, it has been emailing and Slacking the owner every hour, indefinitely, about
schedules that can never clear. That is alert fatigue built into the monitor: a genuine stall would look
exactly like the noise it is buried in.

This is the missing writer. It stamps last_run_at = now and next_run_at = now + the row's own interval,
which is what makes the existing silence detector honest rather than permanent.

Two modes:
  --name "<exact schedule name>"                  one row
  --monitor-type container_scan --images-from-docker
                                                  every container row whose image is actually running
                                                  right now, and no row whose image is not

Usage from a scanner:
  scan_schedule_record.py --name "Own dependency watch (OSV)" --ok
  scan_schedule_record.py --monitor-type container_scan --images-from-docker --ok
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys

DB = "gds_os"


def psql(sql: str) -> tuple[int, str]:
    proc = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", DB, "-tA", "-c", sql],
        capture_output=True,
        text=True,
        timeout=60,
    )
    return proc.returncode, (proc.stdout or proc.stderr).strip()


def sql_str(value: str) -> str:
    """Quote for SQL. These values come from the database or from docker, never from a user."""
    return "'" + value.replace("'", "''") + "'"


def running_image_identities() -> tuple[set[str], set[str]]:
    """Return (repositories, full references) for the images the running containers use.

    A container may report a name:tag, a bare repository, or only an image id. Repositories are the
    reliable join key; RepoTags are added because an id-only container still carries its tags.
    """
    proc = subprocess.run(
        ["docker", "ps", "--format", "{{.Image}}"], capture_output=True, text=True, timeout=60
    )
    if proc.returncode != 0:
        return set(), set()
    refs = {line.strip() for line in proc.stdout.splitlines() if line.strip()}

    expanded: set[str] = set(refs)
    for ref in refs:
        insp = subprocess.run(
            ["docker", "image", "inspect", "--format", "{{join .RepoTags \",\"}}", ref],
            capture_output=True, text=True, timeout=60,
        )
        if insp.returncode == 0:
            expanded.update(t.strip() for t in insp.stdout.strip().split(",") if t.strip())

    repos = {r.split(":")[0] for r in expanded if r and not r.startswith("sha256:")}

    # Container names are a real identity too: a container running an untagged image id still has a name.
    names_proc = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True, timeout=60
    )
    if names_proc.returncode == 0:
        for name in names_proc.stdout.split():
            if name.strip():
                repos.add(name.strip())
    return repos, expanded


def row_image(name: str) -> str:
    """'Container image watch: nats:latest' -> 'nats:latest'."""
    return name.split(": ", 1)[1] if ": " in name else name


def stamp(where: str, tenant_id: str, ok: bool, error: str | None,
          findings: int | None = None) -> list[str]:
    error_sql = "NULL" if ok else sql_str((error or "scan reported failure")[:400])
    # A completed run is a run. A failed attempt is recorded in last_error and last_run_at but is not counted as a
    # completed run, and a finding count the caller does not know is left alone rather than written as zero.
    count_sql = "total_runs = total_runs + 1, " if ok else ""
    findings_sql = f"last_run_findings = {int(findings)}, " if (ok and findings is not None) else ""
    sql = (
        "UPDATE scan_schedules SET "
        "last_run_at = now(), "
        "next_run_at = now() + (interval_minutes || ' minutes')::interval, "
        f"{count_sql}{findings_sql}"
        f"last_error = {error_sql}, "
        "status = 'active' "
        f"WHERE tenant_id = {sql_str(tenant_id)} AND {where} "
        "RETURNING name, to_char(last_run_at, 'YYYY-MM-DD HH24:MI'), "
        "to_char(next_run_at, 'YYYY-MM-DD HH24:MI');"
    )
    code, out = psql(sql)
    if code != 0:
        print(f"ERROR recording run: {out}", file=sys.stderr)
        return []
    return [line for line in out.splitlines() if line.strip()]


def main() -> int:
    ap = argparse.ArgumentParser(description="Stamp scan_schedules after a real scan run.")
    ap.add_argument("--name", help="exact schedule name")
    ap.add_argument("--monitor-type", help="stamp every row of this monitor type whose image is running")
    ap.add_argument("--images-from-docker", action="store_true",
                    help="with --monitor-type: only rows whose image appears in docker ps")
    ap.add_argument("--tenant", default=os.environ.get("SECURITY_ALERT_TENANT_ID")
                    or os.environ.get("GDS_TENANT_ID"))
    ap.add_argument("--ok", action="store_true", help="the scan completed")
    ap.add_argument("--fail", action="store_true", help="the scan failed")
    ap.add_argument("--error", default=None)
    ap.add_argument("--findings", type=int, default=None,
                    help="findings this run produced; recorded only when given, never defaulted to 0")
    args = ap.parse_args()

    if not args.tenant:
        print("ERROR no tenant: set SECURITY_ALERT_TENANT_ID or GDS_TENANT_ID, or pass --tenant",
              file=sys.stderr)
        return 2
    if not args.name and not args.monitor_type:
        print("ERROR give --name or --monitor-type", file=sys.stderr)
        return 2

    ok = not args.fail

    if args.name:
        stamped = stamp(f"name = {sql_str(args.name)}", args.tenant, ok, args.error, args.findings)
        if not stamped:
            print(f"WARN no schedule row named {args.name!r} for this tenant", file=sys.stderr)
        for line in stamped:
            print(f"recorded {line}")
        return 0

    if not args.images_from_docker:
        print("ERROR --monitor-type needs --images-from-docker", file=sys.stderr)
        return 2

    repos, refs = running_image_identities()
    if not refs:
        print("WARN docker ps returned no images, nothing stamped", file=sys.stderr)
        return 0

    code, out = psql(
        "SELECT name FROM scan_schedules WHERE tenant_id = %s AND monitor_type = %s AND status = 'active';"
        % (sql_str(args.tenant), sql_str(args.monitor_type))
    )
    if code != 0:
        print(f"ERROR reading schedules: {out}", file=sys.stderr)
        return 1

    stamped_any = 0
    for name in [n for n in out.splitlines() if n.strip()]:
        image = row_image(name)
        repo = image.split(":")[0]
        if image not in refs and repo not in repos:
            print(f"skipped {name}: image {image!r} is not running", file=sys.stderr)
            continue
        for line in stamp(f"name = {sql_str(name)}", args.tenant, ok, args.error, args.findings):
            print(f"recorded {line}")
            stamped_any += 1
    if not stamped_any:
        print(f"WARN no {args.monitor_type} rows matched the running images", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
