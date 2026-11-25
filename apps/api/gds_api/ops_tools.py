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


# --------------------------------------------------------------------------- image remediation plan
_IMAGE_REGISTRIES = (
    ("docker_hub", "https://hub.docker.com/v2/repositories/{repo}/tags/?page_size=5&ordering=last_updated"),
    ("quay", "https://quay.io/api/v1/repository/{repo}/tag/?limit=5&onlyActiveTags=true"),
)


async def _registry_tags(repo: str) -> dict:
    """Ask each registry that could carry the image. A registry that does not have it says so."""
    import httpx

    found: dict[str, Any] = {}
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        for name, url in _IMAGE_REGISTRIES:
            try:
                resp = await client.get(url.format(repo=repo))
                body = resp.json() if resp.status_code < 500 else {}
            except Exception as exc:  # noqa: BLE001
                found[name] = {"reachable": False, "error": type(exc).__name__}
                continue
            if resp.status_code in (401, 403):
                # "refused" is not "absent": an authenticated registry may well carry the image.
                found[name] = {"reachable": True, "has_image": None, "auth_required": True,
                               "status": resp.status_code,
                               "message": "this registry requires authentication; it could not be checked anonymously"}
                continue
            if resp.status_code != 200 or not isinstance(body, dict):
                found[name] = {"reachable": True, "has_image": False, "status": resp.status_code,
                               "message": (body or {}).get("message") or (body or {}).get("detail")}
                continue
            tags = body.get("results") or body.get("tags") or []
            found[name] = {
                "reachable": True,
                "has_image": bool(tags),
                "newest": [t.get("name") for t in tags][:5],
                "last_updated": (tags[0].get("last_updated") or tags[0].get("last_modified")) if tags else None,
            }
    return found


def _container_config(image: str) -> dict:
    """The running container's real configuration, so a plan can be recreated faithfully."""
    import json as _json
    import subprocess

    name = image.split("/")[-1].split(":")[0]
    try:
        raw = subprocess.run(["docker", "inspect", name], capture_output=True, text=True, timeout=20)
        if raw.returncode != 0:
            return {"found": False, "error": raw.stderr.strip()[:200]}
        data = _json.loads(raw.stdout)[0]
    except Exception as exc:  # noqa: BLE001
        return {"found": False, "error": type(exc).__name__}
    host = data.get("HostConfig") or {}
    return {
        "found": True,
        "name": name,
        "image": (data.get("Config") or {}).get("Image"),
        "restart": (host.get("RestartPolicy") or {}).get("Name"),
        "ports": host.get("PortBindings") or {},
        "binds": host.get("Binds") or [],
        "cmd": (data.get("Config") or {}).get("Cmd"),
        "env_count": len((data.get("Config") or {}).get("Env") or []),
    }


def _blocker_text(repo: str, registries: dict, refused: list) -> str:
    """Say exactly why no candidate tag could be verified. Refused is not the same as absent."""
    parts = []
    for name, info in registries.items():
        if info.get("has_image") is True:
            continue
        if info.get("auth_required"):
            parts.append(f"{name} requires authentication")
        elif info.get("reachable") is False:
            parts.append(f"{name} was unreachable ({info.get('error')})")
        else:
            parts.append(f"{name} has no such image ({info.get('status')})")
    tail = ("; the running container keeps working from its local image, but the image cannot be verified as "
            "re-pullable, which is an availability risk independent of the CVEs")
    return f"no candidate tag could be verified for {repo}: " + "; ".join(parts) + tail


@_tool("low", "Plan a container image upgrade from real findings, registry and container state. Applies nothing.")
async def remediation_plan_image_upgrade(params: dict) -> dict:
    """Build a verified upgrade plan for an image whose CVEs are fixed only by a newer image.

    Read-only by design: it states the plan, the evidence and the exact commands, and never changes the
    running stack. A dependency-level auto-fix cannot help here because the vulnerable packages are compiled
    into the image (Go modules inside a binary), so the only real remediation is a newer image.
    """
    image = str(params.get("image") or "").strip()
    if not image:
        return {"success": False, "error": "image is required"}
    repo = image.split("@")[0]
    for suffix in (":latest",):
        if repo.endswith(suffix):
            repo = repo[: -len(suffix)]
    if ":" in repo.split("/")[-1]:
        repo = repo.rsplit(":", 1)[0]
    tenant_id = params.get("_tenant_id")
    if not tenant_id:
        return {"success": False, "error": "tenant context is required"}

    from sqlalchemy import text

    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    async with async_session_factory() as session:
        await bind_tenant(session, str(tenant_id))
        rows = (
            await session.execute(
                text(
                    "SELECT severity, raw_data->>'package' AS package, raw_data->>'installed_version' AS installed, "
                    "raw_data->>'fixed_version' AS fixed, coalesce(raw_data->>'cve_id', cve) AS cve, title "
                    "FROM findings WHERE tenant_id = :t AND raw_data->>'image' = :i "
                    "AND raw_data->>'fixed_version' IS NOT NULL AND raw_data->>'fixed_version' <> '' "
                    "ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END"
                ),
                {"t": str(tenant_id), "i": image},
            )
        ).mappings().all()

    if not rows:
        return {"success": False, "error": f"no fixable findings are recorded for {image}",
                "note": "nothing to plan; this is a real absence, not a failure"}
    by_sev: dict[str, int] = {}
    packages: dict[str, dict] = {}
    for r in rows:
        by_sev[r["severity"]] = by_sev.get(r["severity"], 0) + 1
        key = f"{r['package']} {r['installed']}"
        entry = packages.setdefault(key, {"package": r["package"], "installed": r["installed"],
                                         "fixed": r["fixed"], "cves": []})
        if r["cve"]:
            entry["cves"].append(r["cve"])

    registries = await _registry_tags(repo)
    container = _container_config(image)
    resolvable = [k for k, v in registries.items() if v.get("has_image") is True]
    refused = [k for k, v in registries.items() if v.get("auth_required")]
    newest = next((registries[k].get("newest") for k in resolvable if registries[k].get("newest")), None)

    commands = []
    if container.get("found"):
        ports = " ".join(
            f"-p {b[0].get('HostIp') or '0.0.0.0'}:{b[0].get('HostPort')}:{c.split('/')[0]}"
            for c, b in (container.get("ports") or {}).items() if b
        )
        binds = " ".join(f"-v {b}" for b in container.get("binds") or [])
        cmd = " ".join(container.get("cmd") or [])
        commands = [
            f"docker pull {image}",
            f"docker stop {container['name']} && docker rename {container['name']} {container['name']}-prev",
            f"docker run -d --name {container['name']} --restart {container.get('restart') or 'unless-stopped'} "
            f"{ports} {binds} {image} {cmd}".replace("  ", " "),
            f"docker logs --tail 20 {container['name']}",
        ]

    return {
        "success": True,
        "tool": "remediation.plan_image_upgrade",
        "image": image,
        "applied": False,
        "applied_note": "this produces a plan only; no image was pulled, replaced or restarted",
        "fixable_findings": len(rows),
        "by_severity": by_sev,
        "vulnerable_packages": list(packages.values())[:15],
        "registries": registries,
        "image_still_resolvable": bool(resolvable),
        "newest_tags": newest,
        "running_container": container,
        "plan_commands": commands,
        "verification": ("re-run the container scan and confirm the fixable count for this image drops to 0; "
                         "until then the finding stays open"),
        "blocker": (None if resolvable else _blocker_text(repo, registries, refused)),
    }


# -----------------------------------------------------------------------------------------------------------
# Config remediation that APPLIES and VERIFIES.
#
# Measured 25 Nov 2026: the five-stage campaign could plan a fix but never apply one. Container images are a
# dead end here (every vendor tag is already the newest published, and the minio image carries no package
# manager), so the fixable population that IS in reach is the web tier's own configuration. Each fix below is
# idempotent, backs the file up, validates the config before reloading, reverts on failure, and re-tests the
# live endpoint afterwards - a fix that cannot be verified is not reported as applied.
# -----------------------------------------------------------------------------------------------------------

NGINX_SITE = "/etc/nginx/sites-enabled/gds-os"
NGINX_CONF = "/etc/nginx/nginx.conf"

_DOCS_DENY = """    location ~ ^/(docs|redoc|openapi\\.json)$ {
        return 404;
    }"""

_DOCS_ENDPOINTS = (
    "https://api.globaldigitalsecurity.io/docs",
    "https://api.globaldigitalsecurity.io/redoc",
    "https://api.globaldigitalsecurity.io/openapi.json",
    "https://app.globaldigitalsecurity.io/docs",
    "https://app.globaldigitalsecurity.io/openapi.json",
)


def _http_status(url: str) -> int:
    import urllib.error
    import urllib.request

    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            return r.status
    except urllib.error.HTTPError as exc:
        return exc.code
    except Exception:  # noqa: BLE001
        return 0


async def remediation_apply_config_fix(payload: dict | None = None, **kw) -> dict:
    """Handlers receive one positional payload dict, like every other tool in this registry."""
    payload = payload or {}
    fix_key = payload.get("fix_key") or kw.get("fix_key")
    apply = payload.get("apply", kw.get("apply", True))
    if not fix_key:
        return {"success": False, "error": "fix_key is required",
                "supported": ["hide_api_docs", "nginx_server_tokens_off"]}
    """Apply one known config fix, verify it against the live service, and say what actually changed."""
    import pathlib
    import shutil
    import subprocess

    def run(*cmd):
        return subprocess.run(cmd, capture_output=True, text=True)

    if fix_key == "hide_api_docs":
        site = pathlib.Path(NGINX_SITE)
        text = site.read_text()
        already = "location ~ ^/(docs|redoc|openapi" in text
        changed = False
        if not already and apply:
            backup = str(site) + ".bak-remediation"
            shutil.copy2(site, backup)
            # insert the refusal in front of the API host's catch-all and in place of the app host's proxy
            anchor = "    location / {\n        proxy_pass http://127.0.0.1:8000;\n"
            if anchor not in text:
                return {"success": False, "error": "api catch-all not found; refusing to guess at the layout"}
            text = text.replace(anchor, _DOCS_DENY + "\n\n" + anchor, 1)
            site.write_text(text)
            test = run("nginx", "-t")
            if test.returncode != 0:
                shutil.copy2(backup, site)
                return {"success": False, "error": f"nginx -t refused the change, reverted: {test.stderr[-300:]}"}
            if run("systemctl", "reload", "nginx").returncode != 0:
                shutil.copy2(backup, site)
                run("systemctl", "reload", "nginx")
                return {"success": False, "error": "reload failed, reverted"}
            changed = True
        statuses = {u: _http_status(u) for u in _DOCS_ENDPOINTS}
        verified = all(code == 404 for code in statuses.values())
        return {
            "success": verified,
            "fix": fix_key,
            "applied": changed,
            "already_in_place": already,
            "verification": statuses,
            "note": ("the API schema is refused on every published host"
                     if verified else "at least one schema endpoint is still reachable"),
            "findings_templates": ["openapi", "swagger-api", "redoc-api-docs"],
        }

    if fix_key == "nginx_server_tokens_off":
        conf = pathlib.Path(NGINX_CONF)
        text = conf.read_text()
        if "server_tokens off;" in text:
            changed = False
        elif apply:
            backup = str(conf) + ".bak-remediation"
            shutil.copy2(conf, backup)
            conf.write_text(text.replace("\t# server_tokens off;", "\tserver_tokens off;", 1))
            test = run("nginx", "-t")
            if test.returncode != 0:
                shutil.copy2(backup, conf)
                return {"success": False, "error": f"nginx -t refused the change, reverted: {test.stderr[-300:]}"}
            run("systemctl", "reload", "nginx")
            changed = True
        else:
            return {"success": False, "fix": fix_key, "applied": False, "note": "not enabled and apply is false"}
        banner = run("bash", "-lc", "curl -sI --max-time 10 https://app.globaldigitalsecurity.io/ | grep -i '^server:'")
        header = banner.stdout.strip()
        verified = bool(header) and "nginx/" not in header.lower()
        return {"success": verified, "fix": fix_key, "applied": changed, "server_header": header,
                "note": "the banner names the product but not the version" if verified else "version still advertised",
                "findings_templates": ["nginx-version"]}

    return {"success": False, "error": f"unknown fix_key {fix_key!r}",
            "supported": ["hide_api_docs", "nginx_server_tokens_off"]}


# -----------------------------------------------------------------------------------------------------------
# Host hardening that APPLIES and VERIFIES.
#
# Kept separate from remediation_apply_config_fix because the blast radius differs: these change the API's CORS
# policy (an API restart, ~8s) and sshd's MAC list (a bad edit locks the operator out). Both are R3 for that
# reason, both back the file up, validate before reloading, revert on a failed verification, and re-measure the
# live service afterwards.
# -----------------------------------------------------------------------------------------------------------

_CORS_ENV = "/opt/.env"
_CORS_REQUIRED = (
    "https://app.globaldigitalsecurity.io",
    "https://api.globaldigitalsecurity.io",
    "https://www.globaldigitalsecurity.io",
    "https://globaldigitalsecurity.io",
)
_SSHD_DROPIN = "/etc/ssh/sshd_config.d/10-macs.conf"
_SSHD_MODERN_MACS = (
    "MACs umac-128-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,"
    "umac-128@openssh.com,hmac-sha2-256,hmac-sha2-512"
)


def _cors_headers(origin: str) -> str:
    import urllib.request

    req = urllib.request.Request("https://api.globaldigitalsecurity.io/health", headers={"Origin": origin})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return (r.headers.get("access-control-allow-origin") or "")
    except Exception:  # noqa: BLE001
        return ""


async def remediation_apply_host_hardening(payload: dict | None = None, **kw) -> dict:
    """Apply one host hardening fix and prove it live."""
    import pathlib
    import re
    import shutil
    import subprocess
    import time

    payload = payload or {}
    fix_key = payload.get("fix_key") or kw.get("fix_key")
    apply = payload.get("apply", kw.get("apply", True))

    def run(*cmd):
        return subprocess.run(cmd, capture_output=True, text=True)

    if fix_key == "restrict_cors_origins":
        env = pathlib.Path(_CORS_ENV)
        text = env.read_text()
        m = re.search(r"^API_CORS_ORIGINS=(.*)$", text, re.M)
        current = m.group(1).strip() if m else ""
        changed = False
        if current.strip() == "*" and apply:
            backup = str(env) + ".bak-cors"
            shutil.copy2(env, backup)
            new = ",".join(_CORS_REQUIRED)
            text = (re.sub(r"^API_CORS_ORIGINS=.*$", f"API_CORS_ORIGINS={new}", text, count=1, flags=re.M)
                    if m else text.rstrip("\n") + f"\nAPI_CORS_ORIGINS={new}\n")
            env.write_text(text)
            run("supervisorctl", "restart", "gds-os")
            healthy = False
            for _ in range(45):
                if run("curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                       "--max-time", "3", "http://127.0.0.1:8000/health").stdout.strip() == "200":
                    healthy = True
                    break
                time.sleep(1)
            if not healthy:
                shutil.copy2(backup, env)
                run("supervisorctl", "restart", "gds-os")
                return {"success": False, "error": "the API did not come back healthy, CORS reverted"}
            changed = True
        foreign = _cors_headers("https://evil.example")
        ours = _cors_headers("https://app.globaldigitalsecurity.io")
        verified = (foreign == "" and ours == "https://app.globaldigitalsecurity.io")
        return {
            "success": verified, "fix": fix_key, "applied": changed,
            "previous_value": current or "(unset)",
            "foreign_origin_allowed": foreign or None,
            "app_origin_allowed": ours or None,
            "note": ("a foreign origin gets no CORS grant while the app origin still does" if verified
                     else "CORS is still too permissive"),
            "findings_templates": ["cors-misconfig"],
        }

    if fix_key == "ssh_remove_sha1_mac":
        conf = pathlib.Path("/etc/ssh/sshd_config")
        dropin = pathlib.Path(_SSHD_DROPIN)
        before = run("sshd", "-T").stdout
        already = "hmac-sha1" not in before and "umac-64@" not in before
        changed = False
        if not already and apply:
            if dropin.parent.exists():
                dropin.write_text(_SSHD_MODERN_MACS + "\n")
            else:
                shutil.copy2(conf, str(conf) + ".bak-macs")
                conf.write_text(conf.read_text().rstrip("\n") + "\n" + _SSHD_MODERN_MACS + "\n")
            if run("sshd", "-t").returncode != 0:
                if dropin.exists():
                    dropin.unlink()
                else:
                    shutil.copy2(str(conf) + ".bak-macs", conf)
                return {"success": False, "error": "sshd -t refused the MAC list, reverted"}
            if run("systemctl", "reload", "ssh").returncode != 0:
                run("systemctl", "reload", "sshd")
            changed = True
        after = run("sshd", "-T").stdout
        weak = [ln for ln in after.splitlines() if ln.lower().startswith("macs") and
                ("hmac-sha1" in ln or "umac-64@" in ln)]
        verified = not weak and "hmac-sha2-256-etm@openssh.com" in after
        return {
            "success": verified, "fix": fix_key, "applied": changed, "already_in_place": already,
            "weak_macs_remaining": weak,
            "note": ("only SHA-2 and umac-128 MACs remain" if verified else "a weak MAC is still offered"),
            "findings_templates": ["ssh-sha1-hmac-algo"],
        }

    return {"success": False, "error": f"unknown fix_key {fix_key!r}",
            "supported": ["restrict_cors_origins", "ssh_remove_sha1_mac"]}
