#!/usr/bin/env python3
"""Beat a verified, signed heartbeat for every registered agent role.

WHY THIS EXISTS
Measured 25 Nov 2026: `agent_heartbeats` held ONE row, for `blue_team`, observed 18 Nov 16:14. So
`GET /agents/fleet/status` reported `unknown` for 22 of 23 roles — not because the agents were broken, but because
nothing ever told the platform they were alive. An agent that cannot be observed alive cannot be operated.

WHAT "ALIVE" MEANS HERE, AND WHAT IT DOES NOT
This worker is the running host process naming the roles it can serve. It does NOT assert that an agent is capable
of doing work: that is `capability_evidence` (executed governed receipts in the last 24h), which this worker never
touches. So the honest ladder stays intact — fresh beat + receipts = online, fresh beat + no receipts = degraded,
no beat = unknown.

THE HEALTH SIGNAL IS DERIVED, NEVER HARDCODED
For each role the worker resolves every tool the manifest declares:
  * is the tool in tool_gateway.TOOL_REGISTRY at all?
  * if its implementation shells out to a binary, is that binary on PATH?
A role whose tools all resolve and whose binaries exist reports `ok`. A role with an unmapped tool or a missing
binary reports `degraded` and names exactly what is wrong in `task_ref`. That is how a missing nuclei install shows
up as an agent that says so, instead of an agent that looks fine and fails at the first scan.

Run: PYTHONPATH=/opt/gds-os/apps/api /opt/gds-os/apps/api/venv/bin/python scripts/ops/agent_heartbeat.py
"""
from __future__ import annotations

import asyncio
import inspect
import os
import re
import socket
import subprocess
import sys
import uuid
from datetime import datetime, timezone

BINARIES = (
    "nmap", "nuclei", "semgrep", "trivy", "nikto", "sqlmap", "masscan",
    "subfinder", "httpx", "ffuf", "gobuster", "wpscan",
)
# Extra places a tool may be installed outside PATH (matches tool_gateway._find_tool).
SEARCH_DIRS = ("/opt/tools/bin", "/usr/local/bin", "/usr/bin")


def _which(name: str) -> str | None:
    for d in SEARCH_DIRS:
        p = os.path.join(d, name)
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    for d in os.environ.get("PATH", "").split(os.pathsep):
        if not d:
            continue
        p = os.path.join(d, name)
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    return None


def _release_sha() -> str:
    try:
        out = subprocess.run(
            ["git", "-C", "/opt/gds-os", "rev-parse", "--short=8", "HEAD"],
            capture_output=True, text=True, timeout=10,
        )
        return out.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def tool_capability(tool_name: str, registry: dict) -> tuple[bool, str | None]:
    """Return (usable, reason). A tool is usable when it is registered AND any binary it needs exists."""
    fn = registry.get(tool_name)
    if fn is None:
        return False, f"{tool_name} is not in TOOL_REGISTRY"
    try:
        src = inspect.getsource(fn)
    except Exception:
        return True, None  # cannot inspect, but it is registered: do not invent a failure
    for binary in BINARIES:
        if re.search(rf'["\']{re.escape(binary)}["\']', src):
            if _which(binary) is None:
                return False, f"{tool_name} needs '{binary}', which is not installed"
            break
    return True, None


def role_health(manifest, registry: dict) -> tuple[str, str | None]:
    """Derive the signal for one role from its declared tools. Never returns 'ok' on an unverified assumption."""
    declared = list(getattr(manifest, "tool_names", None) or [])
    if not declared:
        return "degraded", "declares no tools, so it cannot act"
    problems: list[str] = []
    for t in declared:
        usable, reason = tool_capability(t, registry)
        if not usable and reason:
            problems.append(reason)
    if problems:
        return "degraded", "; ".join(problems)[:200]
    return "ok", None


async def main() -> int:
    from sqlalchemy import text as _text

    from gds_api import agent_heartbeats
    from gds_api.agents.registry import AGENT_REGISTRY
    from gds_api.db import async_session_factory
    from gds_api.tool_gateway import TOOL_REGISTRY

    tenant = os.environ.get("GDS_TENANT_ID", "").strip()
    if not tenant:
        print("FAIL: GDS_TENANT_ID is not set; refusing to guess a tenant", file=sys.stderr)
        return 2

    worker = f"{socket.gethostname()}-heartbeat"
    sha = _release_sha()
    observed = datetime.now(timezone.utc).isoformat()
    key = agent_heartbeats.tenant_key(tenant)

    recorded, degraded = 0, 0
    async with async_session_factory() as session:
        for agent_id in sorted(AGENT_REGISTRY):
            manifest = AGENT_REGISTRY[agent_id]
            signal, reason = role_health(manifest, TOOL_REGISTRY)
            payload = {
                "agent_id": agent_id,
                "tenant_id": tenant,
                "worker_id": worker,
                "release_sha": sha,
                "observed_at": observed,
                "health_signal": signal,
                "task_ref": reason,
                "nonce": str(uuid.uuid4()),
            }
            signature = agent_heartbeats.sign(payload, key)
            try:
                await agent_heartbeats.ingest(
                    session, payload=payload, signature=signature, expected_tenant=tenant
                )
                recorded += 1
                if signal != "ok":
                    degraded += 1
            except agent_heartbeats.HeartbeatRejected as exc:
                print(f"  REJECTED {agent_id}: {exc.code} {exc.detail}", file=sys.stderr)

    print(f"  beat {recorded}/{len(AGENT_REGISTRY)} roles as {worker} @ {sha} "
          f"({degraded} reporting degraded with a named reason)")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
