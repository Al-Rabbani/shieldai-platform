"""The five declared scanner capabilities: sast_scan, dast_scan, container_scan, iac_scan, generate_sbom.

`capabilities/catalog.py` declares these five, each with `required_tool_ids` naming it, but none of
the names existed in `tool_gateway.TOOL_REGISTRY`, so the broker's lookup raised KeyError and every
one of them returned 500.

The engines were installed and three runners already existed in `gds_api/security_tools.py` under
different names (semgrep_scan, nuclei_scan, trivy_scan), so this module joins the declared names to
real execution. The engines themselves live in `gds_api/scanner_engines.py`, together with the
single storage path into `security_findings`, because the old runners counted ORM objects that were
never committed and wrote to the legacy `findings` table (measured: trivy reported 314 findings for
minio/minio:latest while `security_findings` gained zero rows).

Refusals are explicit and are the product behaviour, not decoration:
  MISSING_ARGUMENT     required input absent
  PATH_NOT_FOUND       a path that is not on this host
  TARGET_NOT_AUTHORIZED  DAST target without an active authorized_targets row
                         (the catalogue sets requires_target_authorisation=True for dast_scan)
  ENGINE_UNAVAILABLE   the binary is genuinely missing
  SCAN_FAILED          the engine failed, with its own stderr
"""
from __future__ import annotations

import asyncio
import json
import uuid
from pathlib import Path
from typing import Any

from gds_api.db import async_session_factory
from gds_api.scanner_engines import (
    engine_path,
    nuclei_findings,
    semgrep_findings,
    store_findings,
    trivy_config_findings,
    trivy_findings,
)
from gds_api.tenant_binding import bind_tenant

_SBOM_DIR = Path("/var/lib/gds/sbom")
_SCAN_TIMEOUT = 900


def _refuse(tool: str, code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"success": False, "tool": tool, "code": code, "error": message, **extra}


def _tenant(payload: dict[str, Any]) -> str | None:
    tenant = payload.get("_tenant_id") or payload.get("tenant_id")
    return str(tenant) if tenant else None


def _path(payload: dict[str, Any]) -> str:
    return str(payload.get("target_path") or payload.get("path") or "").strip()


# ---- the five capabilities ------------------------------------------------------


async def sast_scan(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Semgrep static analysis of a real source path, findings committed to security_findings."""
    payload = payload or {}
    tool = "sast_scan"
    tenant = _tenant(payload)
    if not tenant:
        return _refuse(tool, "MISSING_ARGUMENT", "tenant_id is required")
    target_path = _path(payload)
    if not target_path:
        return _refuse(tool, "MISSING_ARGUMENT", "target_path is required (a local source directory)")
    if not Path(target_path).exists():
        return _refuse(tool, "PATH_NOT_FOUND", f"{target_path} does not exist on this host")
    if not engine_path("semgrep"):
        return _refuse(tool, "ENGINE_UNAVAILABLE", "semgrep is not installed on this host")
    try:
        found = await semgrep_findings(target_path, str(payload.get("config") or "auto"))
    except Exception as exc:
        return _refuse(tool, "SCAN_FAILED", f"{type(exc).__name__}: {exc}"[:500])
    async with async_session_factory() as db:
        await bind_tenant(db, uuid.UUID(tenant))
        stored = await store_findings(db, tenant, "semgrep", target_path, found)
    return {"success": True, "tool": tool, "engine": "semgrep", "target_path": target_path, **stored}


async def dast_scan(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Nuclei dynamic scan of a target that holds a live authorisation row."""
    from sqlalchemy import text

    payload = payload or {}
    tool = "dast_scan"
    tenant = _tenant(payload)
    if not tenant:
        return _refuse(tool, "MISSING_ARGUMENT", "tenant_id is required")
    target_url = str(payload.get("target_url") or payload.get("target") or "").strip()
    if not target_url:
        return _refuse(tool, "MISSING_ARGUMENT", "target_url is required")
    if not engine_path("nuclei"):
        return _refuse(tool, "ENGINE_UNAVAILABLE", "nuclei is not installed on this host")

    host = target_url.split("://", 1)[-1].split("/")[0].lower()
    async with async_session_factory() as db:
        await bind_tenant(db, uuid.UUID(tenant))
        authorised = (
            await db.execute(
                text(
                    "SELECT target FROM authorized_targets WHERE tenant_id = :t AND status = 'active' "
                    "AND (valid_until IS NULL OR valid_until > now())"
                ),
                {"t": tenant},
            )
        ).scalars().all()
        covered = {str(t).lower() for t in authorised}
        if target_url.lower() not in covered and host not in covered:
            return _refuse(
                tool,
                "TARGET_NOT_AUTHORIZED",
                f"{target_url} has no active authorized_targets row for this tenant; "
                "dast_scan requires target authorisation",
                authorised_targets=sorted(covered),
            )
    try:
        found = await nuclei_findings(
            target_url,
            templates=str(payload.get("templates") or "cves,vulnerabilities,misconfiguration"),
            severity=str(payload.get("severity") or "critical,high,medium"),
        )
    except Exception as exc:
        return _refuse(tool, "SCAN_FAILED", f"{type(exc).__name__}: {exc}"[:500])
    async with async_session_factory() as db:
        await bind_tenant(db, uuid.UUID(tenant))
        stored = await store_findings(db, tenant, "nuclei", target_url, found)
    return {"success": True, "tool": tool, "engine": "nuclei", "target_url": target_url, **stored}


async def container_scan(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Trivy image scan for vulnerabilities, secrets or misconfigurations."""
    payload = payload or {}
    tool = "container_scan"
    tenant = _tenant(payload)
    if not tenant:
        return _refuse(tool, "MISSING_ARGUMENT", "tenant_id is required")
    image = str(payload.get("image") or "").strip()
    if not image:
        return _refuse(tool, "MISSING_ARGUMENT", "image is required (for example nginx:1.27-alpine)")
    if not engine_path("trivy"):
        return _refuse(tool, "ENGINE_UNAVAILABLE", "trivy is not installed on this host")
    scan_type = str(payload.get("scan_type") or "vuln")
    if scan_type not in {"vuln", "secret", "misconfig"}:
        return _refuse(tool, "INVALID_ARGUMENT", "scan_type must be vuln, secret or misconfig")
    try:
        found = await trivy_findings(
            image, scan_type=scan_type, severity=str(payload.get("severity") or "CRITICAL,HIGH,MEDIUM")
        )
    except Exception as exc:
        return _refuse(tool, "SCAN_FAILED", f"{type(exc).__name__}: {exc}"[:500])
    async with async_session_factory() as db:
        await bind_tenant(db, uuid.UUID(tenant))
        stored = await store_findings(db, tenant, "trivy", image, found)
    return {"success": True, "tool": tool, "engine": "trivy", "image": image, "scan_type": scan_type, **stored}


async def iac_scan(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Trivy config scan of an IaC directory (Terraform, CloudFormation, Kubernetes, Docker)."""
    payload = payload or {}
    tool = "iac_scan"
    tenant = _tenant(payload)
    if not tenant:
        return _refuse(tool, "MISSING_ARGUMENT", "tenant_id is required")
    target_path = _path(payload)
    if not target_path:
        return _refuse(tool, "MISSING_ARGUMENT", "target_path is required (the IaC source directory)")
    if not Path(target_path).exists():
        return _refuse(tool, "PATH_NOT_FOUND", f"{target_path} does not exist on this host")
    if not engine_path("trivy"):
        return _refuse(tool, "ENGINE_UNAVAILABLE", "trivy is not installed on this host")
    try:
        found = await trivy_config_findings(target_path)
    except Exception as exc:
        return _refuse(tool, "SCAN_FAILED", f"{type(exc).__name__}: {exc}"[:500])
    async with async_session_factory() as db:
        await bind_tenant(db, uuid.UUID(tenant))
        stored = await store_findings(db, tenant, "trivy-iac", target_path, found)
    return {
        "success": True,
        "tool": tool,
        "engine": "trivy-config",
        "note": "checkov is not installed on this host; trivy config is the real IaC engine used",
        "target_path": target_path,
        **stored,
    }


async def generate_sbom(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Generate a CycloneDX SBOM for a real filesystem path or container image."""
    payload = payload or {}
    tool = "generate_sbom"
    tenant = _tenant(payload)
    if not tenant:
        return _refuse(tool, "MISSING_ARGUMENT", "tenant_id is required")
    target_path = _path(payload)
    image = str(payload.get("image") or "").strip()
    if not target_path and not image:
        return _refuse(tool, "MISSING_ARGUMENT", "target_path or image is required")
    if target_path and not Path(target_path).exists():
        return _refuse(tool, "PATH_NOT_FOUND", f"{target_path} does not exist on this host")
    binary = engine_path("trivy")
    if not binary:
        return _refuse(tool, "ENGINE_UNAVAILABLE", "trivy is not installed on this host")

    target_label = image or target_path
    _SBOM_DIR.mkdir(parents=True, exist_ok=True)
    safe = "".join(c if c.isalnum() or c in "-._" else "-" for c in target_label)[:80]
    output = _SBOM_DIR / f"sbom-{safe}-{uuid.uuid4().hex[:8]}.cdx.json"
    args = [binary, "image" if image else "fs", "--quiet", "--format", "cyclonedx", "--output", str(output)]
    if payload.get("scanners"):
        args += ["--scanners", str(payload["scanners"])]
    args.append(image or target_path)

    def _run() -> Any:
        import subprocess

        return subprocess.run(args, capture_output=True, text=True, timeout=_SCAN_TIMEOUT)

    try:
        completed = await asyncio.to_thread(_run)
    except Exception as exc:
        return _refuse(tool, "SCAN_FAILED", f"{type(exc).__name__}: {exc}"[:500])
    if completed.returncode != 0 or not output.exists():
        return _refuse(tool, "SCAN_FAILED", (completed.stderr or "trivy produced no SBOM")[:500])
    try:
        document = json.loads(output.read_text())
    except json.JSONDecodeError:
        return _refuse(tool, "SCAN_FAILED", "the generated SBOM is not valid JSON")
    return {
        "success": True,
        "tool": tool,
        "engine": "trivy",
        "format": "cyclonedx-json",
        "target": target_label,
        "target_kind": "image" if image else "filesystem",
        "components": len(document.get("components") or []),
        "dependencies": len(document.get("dependencies") or []),
        "sbom_path": str(output),
        "sbom_bytes": output.stat().st_size,
        "spec_version": document.get("specVersion"),
    }


# ---- registration ---------------------------------------------------------------

SCANNER_TOOL_HANDLERS: dict[str, Any] = {
    "sast_scan": sast_scan,
    "dast_scan": dast_scan,
    "container_scan": container_scan,
    "iac_scan": iac_scan,
    "generate_sbom": generate_sbom,
}

_DESCRIPTIONS = {
    "sast_scan": "Run Semgrep static analysis on a local source path and store real findings.",
    "dast_scan": "Run Nuclei dynamic scanning against an authorised target URL.",
    "container_scan": "Run Trivy against a container image for vulnerabilities or secrets.",
    "iac_scan": "Run Trivy config on an IaC source path and store real misconfigurations.",
    "generate_sbom": "Generate a CycloneDX SBOM for a filesystem path or container image.",
}

_RISK = {"sast_scan": "low", "dast_scan": "medium", "container_scan": "low", "iac_scan": "low", "generate_sbom": "low"}

for _name, _handler in SCANNER_TOOL_HANDLERS.items():
    _handler.risk_class = _RISK[_name]  # type: ignore[attr-defined]
    _handler.description = _DESCRIPTIONS[_name]  # type: ignore[attr-defined]
