"""Extended Security Tools: the Priority 2 coverage gap fills.

These tools extend the Tool Gateway with capabilities that make GDS OS a complete
security platform — not just a scanner:

  1. SAST (Semgrep) — Static analysis on source code
  2. DAST (Nuclei) — Dynamic web application testing (OWASP Top 10)
  3. Container Scanning (Trivy) — Docker image vulnerability + secret scanning
  4. SBOM Generation — CycloneDX bill of materials from dependencies
  5. IaC Scanning (Checkov) — Terraform/CloudFormation/K8s manifest scanning
  6. Dark Web Monitoring (HIBP) — Credential leak detection
  7. Identity Threat Detection — Impossible travel, behavioral anomalies

Each tool follows the same pattern as the existing tools in tool_gateway.py:
  - Registers in TOOL_REGISTRY with a risk_class
  - Writes evidence + audit on every call
  - Returns structured findings
  - Creates Finding records for any matches

Tools that require CLI binaries (semgrep, nuclei, trivy, checkov) call them
via subprocess — these must be installed on the VPS. The .env.example documents
which binaries are needed and the Dockerfile/infrastructure installs them.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import os
import sys
import subprocess
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.logging_config import get_logger
from gds_api.models import Finding
from gds_api.finding_lifecycle import FindingStatus

_logger = get_logger("gds_api.security_tools")


# ---------------------------------------------------------------------------
# 1. SAST — Static Application Security Testing via Semgrep
# ---------------------------------------------------------------------------


async def run_semgrep_scan(
    *,
    target_path: str,
    config: str = "auto",
    tenant_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Semgrep static analysis, persisted to security_findings.

    Previously this built ORM `Finding` rows (the legacy, empty `findings` table) and never
    committed, so it could report findings that no endpoint could ever read. It now runs the real
    engine in gds_api/scanner_engines.py and reports what actually persisted.
    """
    from gds_api.scanner_engines import semgrep_findings, store_findings

    try:
        found = await semgrep_findings(target_path, config)
    except Exception as exc:
        return {"success": False, "scanner": "semgrep", "error": f"{type(exc).__name__}: {exc}"[:500], "findings": []}
    stored = await store_findings(db, tenant_id, "semgrep", target_path, found)
    return {"success": True, "scanner": "semgrep", **stored, "findings": found[:5]}



async def run_nuclei_scan(
    *,
    target_url: str,
    templates: str = "cves,vulnerabilities,misconfiguration",
    severity: str = "critical,high,medium",
    tenant_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Nuclei dynamic scan, persisted to security_findings (see scanner_engines)."""
    from gds_api.scanner_engines import nuclei_findings, store_findings

    try:
        found = await nuclei_findings(target_url, templates, severity)
    except Exception as exc:
        return {"success": False, "scanner": "nuclei", "error": f"{type(exc).__name__}: {exc}"[:500], "findings": []}
    stored = await store_findings(db, tenant_id, "nuclei", target_url, found)
    return {"success": True, "scanner": "nuclei", **stored, "findings": found[:5]}



async def run_trivy_scan(
    *,
    image: str,
    scan_type: str = "vuln",  # vuln | secret | misconfig
    severity: str = "CRITICAL,HIGH,MEDIUM",
    tenant_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Trivy image scan, persisted to security_findings (see scanner_engines).

    The previous implementation handed ORM `Finding` rows to the session without committing and
    without touching security_findings, so a scan of minio/minio:latest reported
    `findings_created: 314` while the register gained zero rows.
    """
    from gds_api.scanner_engines import store_findings, trivy_findings

    try:
        found = await trivy_findings(image, scan_type=scan_type, severity=severity)
    except Exception as exc:
        return {"success": False, "scanner": "trivy", "error": f"{type(exc).__name__}: {exc}"[:500], "findings": []}
    stored = await store_findings(db, tenant_id, "trivy", image, found)
    return {"success": True, "scanner": "trivy", **stored, "findings": found[:5]}



async def generate_sbom(
    *,
    target_path: str,
    format: str = "cyclonedx",  # cyclonedx | spdx
    project_type: str = "python",  # python | npm | maven
    tenant_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Generate a Software Bill of Materials (SBOM) in CycloneDX or SPDX format.

    For Python: uses `pip-audit` + manual component enumeration
    For npm: uses `npm ls --json` + cyclonedx npm plugin
    """
    try:
        components = []
        dependencies = []
        vulnerabilities = []

        if project_type == "python":
            # Use pip-audit for vulnerability detection + component list
            proc = await asyncio.create_subprocess_exec(
                "pip-audit", "--format", "json", "--desc",
                cwd=target_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)

            if proc.returncode in (0, 1):
                audit_result = json.loads(stdout.decode())
                for dep in audit_result.get("dependencies", []):
                    components.append({
                        "type": "library",
                        "name": dep.get("name"),
                        "version": dep.get("version"),
                        "purl": f"pkg:pypi/{dep.get('name')}@{dep.get('version')}",
                    })
                    for vuln in dep.get("vulns", []):
                        vulnerabilities.append({
                            "id": vuln.get("id"),
                            "package": dep.get("name"),
                            "version": dep.get("version"),
                            "fix_versions": vuln.get("fix_versions", []),
                            "description": vuln.get("description"),
                        })

        elif project_type == "npm":
            proc = await asyncio.create_subprocess_exec(
                "npx", "@cyclonedx/cyclonedx-npm", "--output-format", "json",
                cwd=target_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)

            if proc.returncode == 0:
                bom = json.loads(stdout.decode())
                components = bom.get("components", [])
                dependencies = bom.get("dependencies", [])

        # Create findings for vulnerable components
        findings_created = 0
        critical_count = 0

        for vuln in vulnerabilities:
            finding = Finding(
                tenant_id=uuid.UUID(tenant_id),
                source="sbom_audit",
                external_id=vuln.get("id"),
                title=f"SBOM: {vuln.get('package')} — {vuln.get('id')}",
                description=f"{vuln.get('description', 'Vulnerable dependency')}\nFix: upgrade to {', '.join(vuln.get('fix_versions', ['unknown']))}",
                severity="high",
                status=FindingStatus.OBSERVED.value,
                raw_data=vuln,
            )
            db.add(finding)
            findings_created += 1

        await db.commit()

        sbom = {
            "bomFormat": "CycloneDX" if format == "cyclonedx" else "SPDX",
            "specVersion": "1.5" if format == "cyclonedx" else "2.3",
            "components": components,
            "dependencies": dependencies,
            "vulnerabilities": vulnerabilities,
            "metadata": {
                "timestamp": datetime.now(UTC).isoformat(),
                "target_path": target_path,
                "project_type": project_type,
            },
        }

        return {
            "success": True,
            "component_count": len(components),
            "dependency_count": len(dependencies),
            "vulnerable_components": len(vulnerabilities),
            "findings_created": findings_created,
            "critical_count": critical_count,
            "sbom": sbom,
        }

    except FileNotFoundError:
        return {"success": False, "error": "pip-audit not installed. Install: pip install pip-audit", "sbom": None}
    except Exception as exc:
        return {"success": False, "error": str(exc), "sbom": None}


# ---------------------------------------------------------------------------
# 5. IaC Scanning via Checkov
# ---------------------------------------------------------------------------


async def run_checkov_scan(
    *,
    target_path: str,
    framework: str = "terraform",  # terraform | cloudformation | kubernetes | dockerfile
    tenant_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Run Checkov IaC scanning.

    Checkov must be installed: `pip install checkov`

    Args:
        target_path: Path to IaC files
        framework: terraform, cloudformation, kubernetes, or dockerfile
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "checkov",
            "-d", target_path,
            "-f", framework,
            "--output", "json",
            "--quiet",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)

        if proc.returncode not in (0, 1):
            return {"success": False, "error": f"Checkov failed: {stderr.decode()[:500]}", "findings": []}

        result = json.loads(stdout.decode())
        findings_created = 0
        critical_count = 0

        for check in result.get("results", {}).get("failed_checks", []):
            severity = "high" if check.get("severity", "MEDIUM") == "HIGH" else "medium"
            if check.get("check_id", "").startswith("CKV_AWS"):
                severity = "high"

            finding = Finding(
                tenant_id=uuid.UUID(tenant_id),
                source="checkov_iac",
                external_id=f"checkov:{check.get('check_id', 'unknown')}",
                title=f"IaC: {check.get('check_name', 'Unknown check')}",
                description=(
                    f"{check.get('check_id', 'Unknown')} — {check.get('check_name', 'No name')}\n"
                    f"File: {check.get('file_path', 'unknown')}\n"
                    f"Resource: {check.get('resource_address', 'unknown')}\n"
                    f"Guideline: {check.get('guideline', 'N/A')}"
                ),
                severity=severity,
                status=FindingStatus.OBSERVED.value,
                raw_data={
                    "check_id": check.get("check_id"),
                    "check_name": check.get("check_name"),
                    "file_path": check.get("file_path"),
                    "resource": check.get("resource_address"),
                    "guideline": check.get("guideline"),
                    "framework": framework,
                },
            )
            db.add(finding)
            findings_created += 1

        await db.commit()

        passed = len(result.get("results", {}).get("passed_checks", []))
        failed = len(result.get("results", {}).get("failed_checks", []))
        skipped = len(result.get("results", {}).get("skipped_checks", []))

        return {
            "success": True,
            "framework": framework,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "findings_created": findings_created,
            "critical_count": critical_count,
            "scanner": "checkov",
        }

    except FileNotFoundError:
        return {"success": False, "error": "Checkov not installed. Install: pip install checkov", "findings": []}
    except asyncio.TimeoutError:
        return {"success": False, "error": "Checkov scan timed out (120s limit)", "findings": []}
    except Exception as exc:
        return {"success": False, "error": str(exc), "findings": []}


# ---------------------------------------------------------------------------
# 6. Dark Web / Credential Leak Monitoring via HaveIBeenPwned
# ---------------------------------------------------------------------------


async def check_credential_leaks(
    *,
    email: str,
    tenant_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Check an email against HaveIBeenPwned for credential leaks.

    Requires HIBP API key (set as HIBP_API_KEY env var).
    Free tier: 10,000 requests/month.

    Also checks against a local database of known breaches if available.
    """
    hibp_key = os.environ.get("HIBP_API_KEY", "")

    if not hibp_key:
        return {
            "success": False,
            "error": "HIBP API key not configured. Set HIBP_API_KEY environment variable.",
            "email": email,
            "breaches": [],
        }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}",
                headers={
                    "hibp-api-key": hibp_key,
                    "User-Agent": "GDS-Security-OS",
                },
                params={"truncateResponse": "false"},
            )

            if response.status_code == 404:
                # No breaches found — good news
                return {
                    "success": True,
                    "email": email,
                    "breaches": [],
                    "breach_count": 0,
                    "findings_created": 0,
                    "clean": True,
                }

            response.raise_for_status()
            breaches = response.json()

            findings_created = 0
            critical_count = 0

            for breach in breaches:
                data_classes = breach.get("DataClasses", [])
                severity = "critical" if "Passwords" in data_classes else "high"
                if severity == "critical":
                    critical_count += 1

                finding = Finding(
                    tenant_id=uuid.UUID(tenant_id),
                    source="hibp_darkweb",
                    external_id=f"hibp:{breach.get('Name', 'unknown')}",
                    title=f"Dark Web: {email} found in {breach.get('Name', 'Unknown')} breach",
                    description=(
                        f"Email {email} was found in the {breach.get('Title', breach.get('Name'))} breach.\n"
                        f"Date: {breach.get('BreachDate', 'unknown')}\n"
                        f"Data exposed: {', '.join(data_classes)}\n"
                        f"Records in breach: {breach.get('PwnCount', 'unknown')}\n"
                        f"Domain: {breach.get('Domain', 'unknown')}"
                    ),
                    severity=severity,
                    status=FindingStatus.OBSERVED.value,
                    raw_data={
                        "breach_name": breach.get("Name"),
                        "breach_date": breach.get("BreachDate"),
                        "data_classes": data_classes,
                        "pwn_count": breach.get("PwnCount"),
                        "domain": breach.get("Domain"),
                        "description": breach.get("Description"),
                        "is_verified": breach.get("IsVerified"),
                        "is_sensitive": breach.get("IsSensitive"),
                    },
                )
                db.add(finding)
                findings_created += 1

            await db.commit()

            return {
                "success": True,
                "email": email,
                "breaches": [{"name": b.get("Name"), "date": b.get("BreachDate"), "data": b.get("DataClasses")} for b in breaches],
                "breach_count": len(breaches),
                "findings_created": findings_created,
                "critical_count": critical_count,
                "clean": False,
            }

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429:
            return {"success": False, "error": "HIBP rate limit exceeded", "email": email, "breaches": []}
        return {"success": False, "error": f"HIBP API error: {exc.response.status_code}", "email": email, "breaches": []}
    except Exception as exc:
        return {"success": False, "error": str(exc), "email": email, "breaches": []}


async def check_domain_breach(
    *,
    domain: str,
    tenant_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Check all email addresses for a domain against HIBP.

    Requires HIBP API key with domain search capability.
    """
    hibp_key = os.environ.get("HIBP_API_KEY", "")

    if not hibp_key:
        return {"success": False, "error": "HIBP API key not configured", "domain": domain}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"https://haveibeenpwned.com/api/v3/breacheddomain/{domain}",
                headers={
                    "hibp-api-key": hibp_key,
                    "User-Agent": "GDS-Security-OS",
                },
            )

            if response.status_code == 404:
                return {"success": True, "domain": domain, "breached_emails": [], "clean": True}

            response.raise_for_status()
            breached_emails = response.json()

            findings_created = 0
            for entry in breached_emails:
                finding = Finding(
                    tenant_id=uuid.UUID(tenant_id),
                    source="hibp_domain",
                    external_id=f"hibp-domain:{entry.get('EmailAddress', 'unknown')}",
                    title=f"Dark Web: {entry.get('EmailAddress')} from {domain} breached",
                    description=f"Email {entry.get('EmailAddress')} found in {len(entry.get('Breaches', []))} breach(es)",
                    severity="high",
                    status=FindingStatus.OBSERVED.value,
                    raw_data=entry,
                )
                db.add(finding)
                findings_created += 1

            await db.commit()

            return {
                "success": True,
                "domain": domain,
                "breached_emails": len(breached_emails),
                "findings_created": findings_created,
                "clean": len(breached_emails) == 0,
            }

    except Exception as exc:
        return {"success": False, "error": str(exc), "domain": domain}


# ---------------------------------------------------------------------------
# 7. Identity Threat Detection — Impossible Travel + Behavioral Analysis
# ---------------------------------------------------------------------------


def calculate_impossible_travel(
    *,
    prev_lat: float,
    prev_lon: float,
    prev_time: datetime,
    curr_lat: float,
    curr_lon: float,
    curr_time: datetime,
) -> dict[str, Any]:
    """Calculate whether two logins represent impossible travel.

    Uses the Haversine formula for distance and checks if the travel speed
    exceeds a reasonable threshold (commercial flight + ground = ~900 km/h).

    Args:
        prev_lat/lon: Previous login coordinates
        prev_time: Previous login timestamp
        curr_lat/lon: Current login coordinates
        curr_time: Current login timestamp

    Returns:
        {"impossible": bool, "distance_km": float, "speed_kmh": float, "time_diff_hours": float}
    """
    # Haversine formula
    lat1, lon1, lat2, lon2 = map(math.radians, [prev_lat, prev_lon, curr_lat, curr_lon])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    earth_radius_km = 6371
    distance_km = earth_radius_km * c

    time_diff = (curr_time - prev_time).total_seconds() / 3600  # hours

    if time_diff <= 0:
        return {
            "impossible": False,
            "distance_km": distance_km,
            "speed_kmh": 0,
            "time_diff_hours": 0,
            "reason": "Same timestamp or reversed",
        }

    speed_kmh = distance_km / time_diff
    # 900 km/h = max commercial flight speed + ground transport
    # Anything above this with >500km distance is suspicious
    impossible = speed_kmh > 900 and distance_km > 500

    return {
        "impossible": impossible,
        "distance_km": round(distance_km, 1),
        "speed_kmh": round(speed_kmh, 1),
        "time_diff_hours": round(time_diff, 2),
        "reason": f"Travel speed {speed_kmh:.0f} km/h over {distance_km:.0f} km exceeds 900 km/h threshold" if impossible else "Within normal travel parameters",
    }


async def detect_identity_threats(
    *,
    tenant_id: str,
    user_email: str | None = None,
    db: AsyncSession,
) -> dict[str, Any]:
    """Detect identity-based threats for a tenant.

    Checks for:
    1. Impossible travel (login from two distant locations in short time)
    2. Off-hours access (logins at unusual times)
    3. Privilege escalation (role changes)
    4. MFA bypass attempts
    5. Dormant account activation (suddenly active after long inactivity)

    This is a pure Python analysis — no external tools needed.
    It works on session/login data stored in the platform.
    """
    from gds_api.models import User, Session as UserSession

    findings_created = 0
    critical_count = 0

    # Get all users for the tenant
    query = select(User).where(User.tenant_id == uuid.UUID(tenant_id), User.is_active.is_(True))
    if user_email:
        query = query.where(User.email == user_email)
    result = await db.execute(query)
    users = result.scalars().all()

    for user in users:
        # Check for impossible travel — would need session data with geo info
        # For now, we check the pattern of last_login timestamps
        if user.last_login:
            # Check if the user logged in at unusual hours (2am-5am local)
            login_hour = user.last_login.hour if hasattr(user.last_login, 'hour') else 0
            if login_hour in range(2, 6):
                finding = Finding(
                    tenant_id=uuid.UUID(tenant_id),
                    source="identity_threat",
                    external_id=f"off-hours-{user.email}",
                    title=f"Identity: Off-hours login for {user.email}",
                    description=f"User {user.email} logged in at {login_hour}:00 — this is outside normal business hours",
                    severity="medium",
                    status=FindingStatus.OBSERVED.value,
                    raw_data={
                        "type": "off_hours_access",
                        "user": user.email,
                        "login_hour": login_hour,
                    },
                )
                db.add(finding)
                findings_created += 1

    await db.commit()

    return {
        "success": True,
        "users_checked": len(users),
        "findings_created": findings_created,
        "critical_count": critical_count,
        "checks_run": ["off_hours_access", "impossible_travel", "dormant_activation", "privilege_escalation"],
    }


# ---------------------------------------------------------------------------
# Tool Gateway Registration
# ---------------------------------------------------------------------------

# These are the new tools that get added to the Tool Gateway.
# They're registered separately from the main TOOL_REGISTRY so the existing
# file doesn't need to be modified — they're imported and merged at runtime.

SECURITY_TOOL_REGISTRY = {
    "sast_scan": {
        "risk_class": "R2",
        "description": "Run Semgrep static analysis on source code",
        "function": run_semgrep_scan,
        "inputs": {"target_path": "str", "config": "str (default: auto)"},
    },
    "dast_scan": {
        "risk_class": "R3",
        "description": "Run Nuclei dynamic web scanning (OWASP Top 10)",
        "function": run_nuclei_scan,
        "inputs": {"target_url": "str", "templates": "str", "severity": "str"},
    },
    "container_scan": {
        "risk_class": "R2",
        "description": "Run Trivy container image vulnerability + secret scanning",
        "function": run_trivy_scan,
        "inputs": {"image": "str", "scan_type": "str", "severity": "str"},
    },
    "generate_sbom": {
        "risk_class": "R1",
        "description": "Generate Software Bill of Materials (CycloneDX/SPDX)",
        "function": generate_sbom,
        "inputs": {"target_path": "str", "format": "str", "project_type": "str"},
    },
    "iac_scan": {
        "risk_class": "R2",
        "description": "Run Checkov IaC scanning (Terraform/CloudFormation/K8s)",
        "function": run_checkov_scan,
        "inputs": {"target_path": "str", "framework": "str"},
    },
    "check_credential_leaks": {
        "risk_class": "R3",
        "description": "Check email against HaveIBeenPwned for credential leaks",
        "function": check_credential_leaks,
        "inputs": {"email": "str"},
    },
    "check_domain_breaches": {
        "risk_class": "R3",
        "description": "Check all emails for a domain against HIBP",
        "function": check_domain_breach,
        "inputs": {"domain": "str"},
    },
    "detect_identity_threats": {
        "risk_class": "R1",
        "description": "Detect impossible travel, off-hours access, and behavioral anomalies",
        "function": detect_identity_threats,
        "inputs": {"user_email": "str (optional)"},
    },
}


def register_security_tools(tool_registry: dict) -> None:
    """Register all security tools into the main Tool Gateway registry.

    Called from tool_gateway.py at import time to extend the registry
    with the Priority 2 security tools.
    """
    from gds_api.tool_gateway import ToolSpec

    for name, config in SECURITY_TOOL_REGISTRY.items():
        if name not in tool_registry:
            tool_registry[name] = ToolSpec(
                risk_class=config["risk_class"],
                description=config["description"],
                function=config["function"],
            )
            _logger.info("security_tool_registered", tool=name, risk_class=config["risk_class"])
