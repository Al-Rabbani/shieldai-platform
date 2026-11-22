#!/usr/bin/env python3
"""Record the container runtime posture this host actually has, from docker inspect.

The runtime protection page called RuntimeThreat 16 times with no table and no route behind it. This platform has no
process-level runtime sensor, and this script does not pretend it does: it records what the container runtime really
reports - privileged mode, host namespaces, writable root filesystem, added capabilities, the account a container runs
as, and its mount count - and names each violation. A container with no violation is stored with an empty violation
list so the summary can say how many were inspected, not just how many are bad.

Usage: python3 collect_runtime_posture.py
"""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
import uuid

sys.path.insert(0, "/opt/gds-os/apps/api")

from sqlalchemy import text  # noqa: E402

from gds_api.db import async_session_factory  # noqa: E402
from gds_api.tenant_binding import bind_tenant  # noqa: E402

TENANT = os.environ.get("GDS_TENANT_ID", "2ec10dd0-e48e-4043-8c88-5998ba5e23b0")
HOST = os.environ.get("GDS_RUNTIME_HOST", "gds-api-host")

# Each violation carries its weight and, where one applies, the technique an attacker would use to exploit it.
VIOLATIONS = {
    "privileged": (40, "T1611", "Container runs privileged: it holds every capability and can reach the host."),
    "host_pid": (30, "T1611", "Container shares the host PID namespace: it can see and signal host processes."),
    "host_network": (20, "T1610", "Container shares the host network namespace: no network boundary remains."),
    "host_ipc": (15, "T1610", "Container shares the host IPC namespace."),
    "caps_added": (15, "T1611", "Extra Linux capabilities were granted beyond the default set."),
    "writable_rootfs": (5, "T1610", "Root filesystem is writable, so a compromise can persist in the image layer."),
    "runs_as_root": (5, "T1611", "Process runs as root inside the container."),
}


def _docker(args: list[str]) -> tuple[str | None, str | None]:
    try:
        out = subprocess.run(["docker", *args], capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.SubprocessError) as exc:
        return None, f"{type(exc).__name__}: {exc}"[:200]
    if out.returncode != 0:
        return None, (out.stderr or "").strip()[:200]
    return out.stdout or "", None


def docker_container_ids() -> tuple[list[str], str | None]:
    """docker ps prints one id per line, not JSON; the first version of this script parsed it as JSON and recorded
    nothing while reporting a decode error."""
    stdout, error = _docker(["ps", "-aq", "--no-trunc"])
    if stdout is None:
        return [], error
    return [line.strip() for line in stdout.splitlines() if line.strip()], None


def docker_inspect(ids: list[str]) -> tuple[list[dict] | None, str | None]:
    stdout, error = _docker(["inspect", *ids])
    if stdout is None:
        return None, error
    try:
        return json.loads(stdout), None
    except json.JSONDecodeError as exc:
        return None, f"docker inspect returned unparseable JSON: {exc}"[:200]


def assess(spec: dict) -> tuple[list[str], int, str, str | None]:
    """Name the violations this container really has. Weights are stated here, not derived from a score nobody wrote."""
    host_config = spec.get("HostConfig") or {}
    config = spec.get("Config") or {}
    found: list[str] = []
    if host_config.get("Privileged"):
        found.append("privileged")
    if host_config.get("PidMode") == "host":
        found.append("host_pid")
    if host_config.get("NetworkMode") == "host":
        found.append("host_network")
    if host_config.get("IpcMode") == "host":
        found.append("host_ipc")
    if host_config.get("CapAdd"):
        found.append("caps_added")
    if host_config.get("ReadonlyRootfs") is False:
        found.append("writable_rootfs")
    if (config.get("User") in (None, "", "0", "root")) and (spec.get("State") or {}).get("Running"):
        found.append("runs_as_root")
    score = sum(VIOLATIONS[v][0] for v in found)
    severity = "high" if score >= 40 else "medium" if score >= 15 else "low"
    techniques = sorted({VIOLATIONS[v][1] for v in found})
    return found, score, severity, (techniques[0] if techniques else None)


async def main() -> int:
    containers, error = docker_container_ids()
    if containers is None:
        print(f"docker unavailable, nothing recorded: {error}")
        return 1
    if not containers:
        print("no containers on this host, nothing recorded")
        return 0
    specs, error = docker_inspect(containers)
    if specs is None:
        print(f"docker inspect failed, nothing recorded: {error}")
        return 1

    tenant = uuid.UUID(TENANT)
    written = 0
    async with async_session_factory() as db:
        await bind_tenant(db, tenant)
        for spec in specs:
            host_config = spec.get("HostConfig") or {}
            config = spec.get("Config") or {}
            found, score, severity, technique = assess(spec)
            await db.execute(text(
                "INSERT INTO runtime_posture (tenant_id, host, container_id, container_name, image, image_digest, state, "
                "privileged, host_network, host_pid, host_ipc, read_only_rootfs, user_account, caps_added, mounts_count, "
                "posture_violations, risk_score, severity, mitre_technique, collected_at) "
                "VALUES (:t, :host, :cid, :cname, :image, :digest, :state, :priv, :hnet, :hpid, :hipc, :ro, :user, "
                "CAST(:caps AS text[]), :mounts, CAST(:violations AS jsonb), :score, :sev, :tech, now()) "
                "ON CONFLICT (tenant_id, host, container_id) DO UPDATE SET "
                "container_name = EXCLUDED.container_name, image = EXCLUDED.image, state = EXCLUDED.state, "
                "privileged = EXCLUDED.privileged, host_network = EXCLUDED.host_network, host_pid = EXCLUDED.host_pid, "
                "host_ipc = EXCLUDED.host_ipc, read_only_rootfs = EXCLUDED.read_only_rootfs, "
                "user_account = EXCLUDED.user_account, caps_added = EXCLUDED.caps_added, "
                "mounts_count = EXCLUDED.mounts_count, posture_violations = EXCLUDED.posture_violations, "
                "risk_score = EXCLUDED.risk_score, severity = EXCLUDED.severity, "
                "mitre_technique = EXCLUDED.mitre_technique, collected_at = now()"
            ), {"t": tenant, "host": HOST, "cid": spec.get("Id", "")[:64],
                "cname": (spec.get("Name") or "").lstrip("/") or "unnamed",
                "image": config.get("Image"), "digest": (spec.get("Image") or "").split("@")[-1][:80],
                "state": (spec.get("State") or {}).get("Status"),
                "priv": bool(host_config.get("Privileged")),
                "hnet": host_config.get("NetworkMode") == "host",
                "hpid": host_config.get("PidMode") == "host",
                "hipc": host_config.get("IpcMode") == "host",
                "ro": host_config.get("ReadonlyRootfs"),
                "user": config.get("User") or "root (default)",
                # asyncpg requires a real sequence for text[], not an array literal string: passing "{CAP_SYS_ADMIN}"
                # raised DataError "a sized iterable container expected (got type str)" and nothing was recorded.
                "caps": list(host_config.get("CapAdd") or []),
                "mounts": len(spec.get("Mounts") or []),
                "violations": json.dumps(found), "score": score, "sev": severity, "tech": technique})
            written += 1
        await db.commit()
    print(f"recorded posture for {written} containers on {HOST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
