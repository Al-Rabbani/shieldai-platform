"""Real tools behind the capabilities that previously had none.

Measured 25 Nov 2026: nine capabilities were declared but had NO tool at all, so cloud remediation, code commit and
shell operations could not be performed by any agent, and the warfare campaign's remediation stage could only skip.
Each tool here does real work: real AWS calls through boto3, real git operations inside an allowlisted repository,
a real allowlist of fixed commands, and real mission planning through the platform's own orchestrator. Nothing here
fabricates a result: a missing AWS permission is returned as the real AccessDenied, and a commit with no changes is
refused rather than reported as done.
"""
from __future__ import annotations

import asyncio
import hashlib
import os
import shutil
from pathlib import Path
from typing import Any

REPO_ROOTS = ("/opt/gds-os",)

# A fixed allowlist: an action name maps to exact argv. There is deliberately no free-form command parameter,
# because "allowlisted shell" that accepts arbitrary strings is just an unrestricted shell with extra steps.
SHELL_ALLOWLIST: dict[str, tuple[str, ...]] = {
    "disk_usage": ("df", "-h"),
    "memory": ("free", "-m"),
    "load": ("uptime",),
    # supervisor runs the API, worker and kernel on this host, not systemd: `systemctl is-active gds-os`
    # answered "inactive" while the service was healthy, which would read as an outage.
    "api_service": ("supervisorctl", "status", "gds-os"),
    "worker_service": ("supervisorctl", "status", "gds-worker"),
    "kernel_service": ("supervisorctl", "status", "gds-kernel"),
    "supervisor_all": ("supervisorctl", "status"),
    "git_status": ("git", "-C", "/opt/gds-os", "status", "--porcelain"),
    "git_log": ("git", "-C", "/opt/gds-os", "log", "--oneline", "-n", "10"),
    "git_branch": ("git", "-C", "/opt/gds-os", "rev-parse", "--abbrev-ref", "HEAD"),
    "python_version": ("/opt/gds-os/apps/api/venv/bin/python3.11", "--version"),
}


async def _run(cmd: tuple[str, ...], *, cwd: str | None = None, timeout: int = 60) -> dict[str, Any]:
    binary = shutil.which(cmd[0]) or (cmd[0] if os.path.exists(cmd[0]) else None)
    if binary is None:
        return {"success": False, "error": f"{cmd[0]} is not installed on this host", "command": list(cmd)}
    try:
        proc = await asyncio.create_subprocess_exec(
            binary, *cmd[1:], cwd=cwd,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": str(exc)[:300], "command": list(cmd)}
    try:
        out, err = await asyncio.wait_for(proc.communicate(), timeout)
    except asyncio.TimeoutError:
        proc.kill()
        return {"success": False, "error": f"timed out after {timeout}s", "command": list(cmd)}
    return {
        "success": proc.returncode == 0,
        "exit_code": proc.returncode,
        "stdout": (out or b"").decode("utf-8", "replace")[:20000],
        "stderr": (err or b"").decode("utf-8", "replace")[:4000],
        "command": list(cmd),
    }


def _resolve_in_repo(relative_path: str, repo_root: str | None = None) -> tuple[Path | None, str]:
    """Contain a write inside an allowlisted repository root. Returns (path, error)."""
    root = Path(repo_root or REPO_ROOTS[0]).resolve()
    if not any(str(root) == r or str(root).startswith(r + "/") for r in REPO_ROOTS):
        return None, f"repo root {root} is not in the allowlist {list(REPO_ROOTS)}"
    candidate = (root / relative_path).resolve()
    if not str(candidate).startswith(str(root) + "/"):
        return None, f"path escapes the repository root: {relative_path}"
    return candidate, ""



def _tool(risk_class: str, description: str):
    """Tag a handler the way every other tool in the gateway is tagged.

    Measured 25 Nov 2026: TOOL_REGISTRY maps name -> function and the function carries risk_class and
    description. Handlers registered without them read as low risk to the preflight and to the broker, so a
    critical shell would have been treated as harmless.
    """

    def decorate(fn):
        fn.risk_class = risk_class
        fn.description = description
        return fn

    return decorate


# --------------------------------------------------------------------------- shell
@_tool("critical", "Run one of a fixed allowlist of named operational commands.")
async def shell_run_allowlisted(params: dict) -> dict:
    action = str(params.get("action") or "").strip()
    if not action:
        return {"success": False, "error": "action is required", "allowed_actions": sorted(SHELL_ALLOWLIST)}
    cmd = SHELL_ALLOWLIST.get(action)
    if cmd is None:
        return {"success": False, "error": f"action {action!r} is not on the allowlist",
                "allowed_actions": sorted(SHELL_ALLOWLIST)}
    result = await _run(cmd, timeout=int(params.get("timeout") or 60))
    result["tool"] = "shell"
    result["action"] = action
    return result


# --------------------------------------------------------------------------- repository write
@_tool("high", "Write a file inside the allowlisted repository root.")
async def repository_write_file(params: dict) -> dict:
    relative_path = str(params.get("path") or "").strip()
    content = params.get("content")
    if not relative_path:
        return {"success": False, "error": "path is required"}
    if content is None:
        return {"success": False, "error": "content is required"}
    path, error = _resolve_in_repo(relative_path, params.get("repo_root"))
    if path is None:
        return {"success": False, "error": error}
    data = content if isinstance(content, str) else str(content)
    existed = path.exists()
    previous = path.read_text(errors="replace")[:2000] if existed and path.is_file() else None
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(data)
    return {
        "success": True,
        "tool": "repository.write",
        "path": str(path),
        "bytes_written": len(data.encode()),
        "sha256": hashlib.sha256(data.encode()).hexdigest(),
        "created": not existed,
        "previous_preview": previous,
    }


# --------------------------------------------------------------------------- git commit
async def _git(*args: str, timeout: int = 120) -> dict:
    return await _run(("git", "-C", REPO_ROOTS[0], *args), timeout=timeout)


@_tool("high", "Commit staged changes to the allowlisted repository.")
async def engineering_commit(params: dict) -> dict:
    message = str(params.get("message") or "").strip()
    if not message:
        return {"success": False, "error": "message is required"}
    paths = params.get("paths") or []
    if isinstance(paths, str):
        paths = [paths]
    for p in paths:
        contained, error = _resolve_in_repo(str(p))
        if contained is None:
            return {"success": False, "error": error}
    staged = await _git("add", "--", *(paths or ["-A"]))
    if not staged.get("success"):
        return {"success": False, "error": "git add failed", "detail": staged.get("stderr")}
    pending = await _git("diff", "--cached", "--name-only")
    if not (pending.get("stdout") or "").strip():
        return {"success": False, "error": "nothing staged, so there is nothing to commit",
                "note": "a commit with no changes would be a false report of work"}
    committed = await _git("commit", "-m", message)
    head = await _git("rev-parse", "HEAD")
    stat = await _git("show", "--stat", "--oneline", "HEAD")
    return {
        "success": bool(committed.get("success")),
        "tool": "engineering.commit",
        "sha": (head.get("stdout") or "").strip(),
        "files": [x for x in (pending.get("stdout") or "").splitlines() if x.strip()],
        "stat": (stat.get("stdout") or "")[:2000],
        "stderr": committed.get("stderr"),
    }


@_tool("high", "Commit changes with a verified mission reference.")
async def engineering_commit_mission(params: dict) -> dict:
    mission_id = str(params.get("mission_id") or "").strip()
    if not mission_id:
        return {"success": False, "error": "mission_id is required"}
    from sqlalchemy import text

    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    tenant_id = params.get("_tenant_id")
    if tenant_id:
        async with async_session_factory() as session:
            await bind_tenant(session, str(tenant_id))
            exists = (
                await session.execute(
                    text("SELECT 1 FROM missions WHERE id = CAST(:i AS uuid)"), {"i": mission_id}
                )
            ).scalar()
        if not exists:
            return {"success": False, "error": f"mission {mission_id} does not exist, so it cannot be referenced"}
    message = str(params.get("message") or f"Mission {mission_id}").strip()
    body = f"{message}\n\nMission: {mission_id}"
    result = await engineering_commit({"message": body, "paths": params.get("paths")})
    result["tool"] = "engineering.commit_mission"
    result["mission_id"] = mission_id
    return result


# --------------------------------------------------------------------------- cloud
def _aws_session():
    import boto3

    region = os.environ.get("AWS_DEFAULT_REGION") or os.environ.get("AWS_REGION") or "eu-west-2"
    return boto3.session.Session(region_name=region)


def _posture_sync(limit: int) -> dict:
    s3 = _aws_session().client("s3")
    buckets = s3.list_buckets().get("Buckets", [])[:limit]
    rows = []
    for b in buckets:
        name = b["Name"]
        enc = public = None
        try:
            enc = s3.get_bucket_encryption(Bucket=name).get("ServerSideEncryptionConfiguration")
            encryption = bool(enc and enc.get("Rules"))
        except Exception as exc:  # noqa: BLE001
            encryption = None
            enc = {"error": type(exc).__name__}
        try:
            block = s3.get_public_access_block(Bucket=name).get("PublicAccessBlockConfiguration") or {}
            public = not all(
                [block.get("BlockPublicAcls"), block.get("IgnorePublicAcls"),
                 block.get("BlockPublicPolicy"), block.get("RestrictPublicBuckets")]
            )
        except Exception as exc:  # noqa: BLE001
            public = None
            block = {"error": type(exc).__name__}
        rows.append({"bucket": name, "encryption_enabled": encryption, "public_access_allowed": public,
                     "detail": {"encryption": enc, "public_access_block": block}})
    return {
        "buckets_total": len(buckets),
        "unencrypted": sum(1 for r in rows if r["encryption_enabled"] is False),
        "public_access_allowed": sum(1 for r in rows if r["public_access_allowed"] is True),
        "undetermined": sum(1 for r in rows if r["encryption_enabled"] is None),
        "buckets": rows,
    }


@_tool("low", "Read real S3 encryption and public access posture.")
async def cloud_read_posture(params: dict) -> dict:
    limit = int(params.get("limit") or 50)
    try:
        data = await asyncio.to_thread(_posture_sync, limit)
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": f"{type(exc).__name__}: {exc}"[:400], "tool": "cloud.read_posture"}
    data["success"] = True
    data["tool"] = "cloud.read_posture"
    data["source"] = "aws s3 list_buckets + get_bucket_encryption + get_public_access_block"
    data["findings"] = data["unencrypted"] + data["public_access_allowed"]
    return data


def _remediate_sync(bucket: str, action: str) -> dict:
    s3 = _aws_session().client("s3")
    if action == "enable_default_encryption":
        s3.put_bucket_encryption(
            Bucket=bucket,
            ServerSideEncryptionConfiguration={
                "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
            },
        )
        return {"applied": True, "detail": "SSE-S3 default encryption enabled"}
    if action == "block_public_access":
        s3.put_public_access_block(
            Bucket=bucket,
            PublicAccessBlockConfiguration={
                "BlockPublicAcls": True, "IgnorePublicAcls": True,
                "BlockPublicPolicy": True, "RestrictPublicBuckets": True,
            },
        )
        return {"applied": True, "detail": "all four public access blocks enabled"}
    raise ValueError(f"unsupported action {action!r}; supported: enable_default_encryption, block_public_access")


@_tool("high", "Apply a real, narrow cloud hardening change.")
async def cloud_apply_remediation(params: dict) -> dict:
    """Perform a real, narrow, idempotent S3 hardening write and report the real AWS answer."""
    bucket = str(params.get("bucket") or "").strip()
    action = str(params.get("action") or "enable_default_encryption").strip()
    if not bucket:
        return {"success": False, "error": "bucket is required", "tool": "cloud.apply_remediation"}
    try:
        result = await asyncio.to_thread(_remediate_sync, bucket, action)
    except Exception as exc:  # noqa: BLE001
        name = type(exc).__name__
        detail = str(exc)[:400]
        return {
            "success": False,
            "tool": "cloud.apply_remediation",
            "bucket": bucket,
            "action": action,
            "error": f"{name}: {detail}",
            "note": "this is the real AWS response; a read-only credential cannot apply a change",
        }
    return {"success": True, "tool": "cloud.apply_remediation", "bucket": bucket, "action": action, **result}


# --------------------------------------------------------------------------- mission planning / execution
@_tool("low", "Plan a mission through the platform orchestrator.")
async def engineering_plan_mission(params: dict) -> dict:
    goal = str(params.get("goal") or "").strip()
    if not goal:
        return {"success": False, "error": "goal is required"}
    from gds_api.reasoning.mission_orchestrator import plan_mission

    plan = await plan_mission(goal, model=str(params.get("model") or "gpt-4.1"),
                              tenant_id=params.get("_tenant_id"))
    steps = plan.get("steps") or plan.get("agents") or []
    return {
        "success": True,
        "tool": "engineering.plan_mission",
        "goal": goal,
        "agent_count": len(steps),
        "agents": [s.get("agent") or s.get("agent_id") for s in steps][:12],
        "plan": plan,
    }


@_tool("medium", "Execute a multi-agent mission through the orchestrator.")
async def engineering_execute_session(params: dict) -> dict:
    goal = str(params.get("goal") or "").strip()
    if not goal:
        return {"success": False, "error": "goal is required"}
    from gds_api.reasoning.mission_orchestrator import execute_mission

    result = await execute_mission(
        goal,
        context=params.get("context") or {},
        model=str(params.get("model") or "gpt-4.1"),
        max_agents_parallel=int(params.get("max_agents_parallel") or 3),
        mission_id=params.get("mission_id"),
    )
    return {
        "success": True,
        "tool": "engineering.execute_session",
        "goal": goal,
        "mission_id": result.get("mission_id"),
        "agent_results": len(result.get("agent_results") or []),
        "duration_ms": result.get("duration_ms"),
        "summary": (result.get("final_answer") or result.get("summary") or "")[:1500],
    }
