"""Real scanner engines and the one place scanner output becomes a stored finding.

Why this module exists
----------------------
`gds_api/security_tools.py` ran the real engines but stored their output by constructing ORM
`Finding` objects - the legacy, empty `findings` table with a uuid id and source/raw_data columns -
and never committed them. Measured consequences:

  * `run_trivy_scan` reported `findings_created: 314` for `minio/minio:latest` while
    `security_findings` gained exactly zero rows. A count that describes objects handed to a
    session is not a count of findings that exist.
  * Every scanner therefore wrote into a table no endpoint reads (`/findings/security` reads
    `security_findings`), so scan results were invisible even when they looked successful.

This module fixes both: engines return plain dicts, and `store_findings` writes to
`security_findings` - the authoritative table - deduped on (scanner, title, target, open) so a
repeat scan reports duplicates instead of inflating the register, and it reports the number of
rows that were actually committed.

Engines are the binaries already installed on the host: semgrep in the application venv,
nuclei v3.11.0 in /opt/tools/bin, trivy 0.72.0 in /usr/bin.
"""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import sys
from typing import Any

from sqlalchemy import text

_TOOL_DIRS = ("/opt/tools/bin", "/usr/local/bin", "/usr/bin", "/bin")
_VALID_SEVERITY = {"critical", "high", "medium", "low", "info"}
_MAX_STORED_PER_SCAN = 500


#: Engines that must NOT come from the app venv.
#:
#: MEASURED 26 Nov 2026: semgrep's entry point in the app venv died with ImportError
#: "cannot import name '_ExtendedAttributes' from 'opentelemetry.util.types'" - the app's own dependency pins had moved
#: under it. semgrep shares nothing with this application, so it now lives in its own venv and the app can upgrade
#: anything it likes without breaking a scanner. Overridable for a different host layout.
ISOLATED_ENGINES: dict[str, str] = {
    "semgrep": os.getenv("SEMGREP_BIN", "/opt/gds-tools/semgrep/bin/semgrep"),
}


def engine_path(name: str) -> str | None:
    """Resolve an engine the way the service PATH does, not the caller's."""
    isolated = ISOLATED_ENGINES.get(name)
    if isolated and os.path.isfile(isolated) and os.access(isolated, os.X_OK):
        return isolated
    local = os.path.join(os.path.dirname(sys.executable), name)  # semgrep ships in our venv
    if os.path.isfile(local) and os.access(local, os.X_OK):
        return local
    for directory in _TOOL_DIRS:
        candidate = os.path.join(directory, name)
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return shutil.which(name)


def _run(args: list[str], timeout: int) -> subprocess.CompletedProcess[str]:
    env = dict(os.environ)
    env["PATH"] = ":".join(_TOOL_DIRS) + ":" + env.get("PATH", "")
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, env=env)


async def _run_async(args: list[str], timeout: int) -> subprocess.CompletedProcess[str]:
    return await asyncio.to_thread(_run, args, timeout)


# ---- engine runners: real commands, plain dicts ---------------------------------


#: semgrep's own severity vocabulary mapped to the register's.
#:
#: MEASURED 26 Nov 2026: subprocess-shell-true - a command-injection pattern - was stored as LOW, because the parser
#: read the rule's CWE "impact" rating before semgrep's own severity. A real command injection filed as low is a finding
#: nobody acts on. semgrep's ERROR/WARNING/INFO is the engine's judgement of the finding; "impact" describes the class.
_SEMGREP_SEVERITY = {"error": "high", "warning": "medium", "info": "low", "inventory": "info"}


def _semgrep_severity(extra: dict[str, Any], metadata: dict[str, Any]) -> str:
    engine = str(extra.get("severity") or "").lower()
    if engine in _SEMGREP_SEVERITY:
        mapped = _SEMGREP_SEVERITY[engine]
        # An explicit impact of HIGH or CRITICAL may only raise the engine's rating, never lower it.
        impact = str(metadata.get("impact") or "").lower()
        if impact in ("critical", "high") and mapped in ("medium", "low", "info"):
            return impact
        return mapped
    impact = str(metadata.get("impact") or "").lower()
    if impact in _VALID_SEVERITY:
        return impact
    return "medium"


async def semgrep_findings(target_path: str, config: str = "auto", timeout: int = 600) -> list[dict[str, Any]]:
    """Semgrep JSON output as finding dicts. Exit 1 means 'findings found', not failure."""
    binary = engine_path("semgrep")
    if not binary:
        raise RuntimeError("semgrep is not installed on this host")
    completed = await _run_async([binary, "--json", "--config", config, target_path], timeout)
    # A CRASHED SEMGREP EXITS 1, and semgrep's contract says exit 1 means "findings found". Checking the code first
    # therefore reported a crashed scanner as a clean codebase: this is what hid the broken venv install above, and
    # semgrep had produced nothing since 1 August. Parsability is the real test - a run that found something prints
    # JSON with a results list, and a run that died prints nothing.
    stdout = (completed.stdout or "").strip()
    payload = None
    if stdout:
        try:
            payload = json.loads(stdout)
        except json.JSONDecodeError:
            payload = None
    if not isinstance(payload, dict) or "results" not in payload:
        raise RuntimeError(
            f"semgrep produced no parsable JSON (exit {completed.returncode}), so this is a failure and not a clean "
            f"scan: {(completed.stderr or stdout or 'no output')[:400]}"
        )
    if completed.returncode not in (0, 1):
        raise RuntimeError(f"semgrep failed: {(completed.stderr or '')[:400]}")
    results = []
    for item in payload.get("results", []):
        extra = item.get("extra") or {}
        metadata = extra.get("metadata") or {}
        severity = _semgrep_severity(extra, metadata)
        results.append(
            {
                "title": f"{str(item.get('check_id', 'semgrep')).split('.')[-1]} in {item.get('path', '')}"[:200],
                "severity": severity,
                "target": str(item.get("path", target_path)),
                "cwe": ", ".join(str(c) for c in metadata.get("cwe") or []) or None,
                "description": str(extra.get("message") or "")[:2000],
                "evidence": str(extra.get("lines") or "")[:1000],
                "line": (item.get("start") or {}).get("line"),
                # The whole matched span, so a caller can read the actual call rather than guess from one line.
                "end_line": (item.get("end") or {}).get("line"),
                "rule": item.get("check_id"),
            }
        )
    return results


async def nuclei_findings(
    target_url: str,
    templates: str = "cves,vulnerabilities,misconfiguration",
    severity: str = "critical,high,medium",
    timeout: int = 900,
) -> list[dict[str, Any]]:
    """Nuclei JSONL output as finding dicts."""
    binary = engine_path("nuclei")
    if not binary:
        raise RuntimeError("nuclei is not installed on this host")
    args = [
        binary, "-u", target_url, "-jsonl", "-silent", "-no-color",
        "-severity", severity, "-tags", templates, "-disable-update-check",
    ]
    completed = await _run_async(args, timeout)
    if completed.returncode not in (0, 1):
        raise RuntimeError(f"nuclei failed: {(completed.stderr or '')[:400]}")
    results = []
    for line in (completed.stdout or "").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        severity = str(item.get("info", {}).get("severity", "medium")).lower()
        if severity not in _VALID_SEVERITY:
            severity = "medium"
        classification = item.get("info", {}).get("classification") or {}
        cves = classification.get("cve-id") or []
        results.append(
            {
                "title": str(item.get("info", {}).get("name") or item.get("template-id") or "nuclei finding")[:200],
                "severity": severity,
                "target": str(item.get("matched-at") or target_url),
                "cve": (cves[0] if cves else None),
                "cwe": ", ".join(str(c) for c in classification.get("cwe-id") or []) or None,
                "description": str(item.get("info", {}).get("description") or "")[:2000],
                "evidence": str(item.get("matched-at") or "")[:500],
                "template": item.get("template-id"),
            }
        )
    return results


async def trivy_findings(
    image: str,
    scan_type: str = "vuln",
    severity: str = "CRITICAL,HIGH,MEDIUM",
    timeout: int = 900,
) -> list[dict[str, Any]]:
    """Trivy image output (vulnerabilities or secrets) as finding dicts."""
    binary = engine_path("trivy")
    if not binary:
        raise RuntimeError("trivy is not installed on this host")
    scanner = {"vuln": "vuln", "secret": "secret", "misconfig": "misconfig"}.get(scan_type, "vuln")
    args = [binary, "image", "--quiet", "--format", "json", "--scanners", scanner, "--severity", severity, image]
    completed = await _run_async(args, timeout)
    if completed.returncode != 0:
        raise RuntimeError(f"trivy failed: {(completed.stderr or '')[:400]}")
    payload = json.loads(completed.stdout or "{}")
    results = []
    for target in payload.get("Results") or []:
        for vuln in target.get("Vulnerabilities") or []:
            sev = str(vuln.get("Severity", "UNKNOWN")).lower()
            results.append(
                {
                    "title": f"{vuln.get('VulnerabilityID', 'CVE')} in {vuln.get('PkgName', 'unknown')}"[:200],
                    "severity": sev if sev in _VALID_SEVERITY else "low",
                    "target": image,
                    "cve": vuln.get("VulnerabilityID") if str(vuln.get("VulnerabilityID", "")).startswith("CVE") else None,
                    "package": vuln.get("PkgName"),
                    "installed_version": vuln.get("InstalledVersion"),
                    "fixed_version": vuln.get("FixedVersion") or None,
                    "description": str(vuln.get("Title") or vuln.get("Description") or "")[:2000],
                    "evidence": f"{target.get('Target', '')} {vuln.get('InstalledVersion', '')}",
                }
            )
        for secret in target.get("Secrets") or []:
            results.append(
                {
                    "title": f"Secret: {secret.get('Title') or secret.get('RuleID') or 'detected'}"[:200],
                    "severity": "high",
                    "target": image,
                    "description": str(secret.get("Title") or "")[:2000],
                    "evidence": str(secret.get("Target") or "")[:500],
                }
            )
    return results


async def trivy_config_findings(path: str, timeout: int = 900) -> list[dict[str, Any]]:
    """Trivy config (IaC) output as finding dicts."""
    binary = engine_path("trivy")
    if not binary:
        raise RuntimeError("trivy is not installed on this host")
    args = [binary, "config", "--quiet", "--format", "json",
            "--severity", "CRITICAL,HIGH,MEDIUM,LOW", path]
    completed = await _run_async(args, timeout)
    if completed.returncode != 0:
        raise RuntimeError(f"trivy config failed: {(completed.stderr or '')[:400]}")
    payload = json.loads(completed.stdout or "{}")
    results = []
    for file_result in payload.get("Results") or []:
        for item in file_result.get("Misconfigurations") or []:
            sev = str(item.get("Severity") or "MEDIUM").lower()
            results.append(
                {
                    "title": str(item.get("Title") or item.get("ID") or "IaC misconfiguration")[:200],
                    "severity": sev if sev in _VALID_SEVERITY else "medium",
                    "target": path,
                    "description": str(item.get("Description") or "")[:2000],
                    "remediation": str(item.get("Resolution") or "")[:2000],
                    "evidence": f"{file_result.get('Target', '')} {item.get('ID', '')}",
                    "check_id": item.get("ID"),
                }
            )
    return results


# ---- the single storage path -----------------------------------------------------


async def store_findings(
    db: Any,
    tenant_id: str,
    scanner: str,
    target: str,
    findings: list[dict[str, Any]],
    *,
    commit: bool = True,
) -> dict[str, Any]:
    """Write real findings to security_findings, deduped, and report what persisted."""
    created = 0
    duplicates = 0
    failures: list[str] = []
    for item in findings[:_MAX_STORED_PER_SCAN]:
        title = str(item.get("title") or "Unknown finding")[:250]
        severity = str(item.get("severity") or "medium").lower()
        if severity not in _VALID_SEVERITY:
            severity = "medium"
        finding_target = str(item.get("target") or target)[:500]
        try:
            existing = (
                await db.execute(
                    text(
                        "SELECT id FROM security_findings WHERE tenant_id = :t AND scanner = :s "
                        "AND title = :title AND target = :target AND status = 'open' LIMIT 1"
                    ),
                    {"t": tenant_id, "s": scanner, "title": title, "target": finding_target},
                )
            ).scalar_one_or_none()
            if existing:
                duplicates += 1
                continue
            await db.execute(
                text(
                    "INSERT INTO security_findings (tenant_id, scanner, title, severity, target, details, status) "
                    "VALUES (:t, :s, :title, :sev, :target, CAST(:details AS jsonb), 'open')"
                ),
                {
                    "t": tenant_id,
                    "s": scanner,
                    "title": title,
                    "sev": severity,
                    "target": finding_target,
                    "details": json.dumps(
                        {
                            "description": item.get("description") or "",
                            "remediation": item.get("remediation") or "",
                            "cve": item.get("cve"),
                            "cwe": item.get("cwe"),
                            "package": item.get("package"),
                            "installed_version": item.get("installed_version"),
                            "fixed_version": item.get("fixed_version"),
                            "evidence": item.get("evidence"),
                            "rule": item.get("rule") or item.get("template") or item.get("check_id"),
                        }
                    ),
                },
            )
            created += 1
        except Exception as exc:  # one bad row must not lose the scan
            failures.append(f"{title}: {type(exc).__name__}")
    if commit:
        await db.commit()
    return {
        "findings_total": len(findings),
        "findings_created": created,
        "duplicates_skipped": duplicates,
        "failures": failures[:10],
    }
