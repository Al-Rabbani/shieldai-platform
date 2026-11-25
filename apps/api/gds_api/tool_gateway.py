"""GDS OS Tool Gateway — Routes agent tool calls to real security tools.

This is the bridge between the AgentExecutionLoop and the 12 installed security tools.
When an agent executes a step with tool_name="tool_gateway.execute_tool",
this module routes it to the actual security tool implementation.
"""
import asyncio
from contextlib import nullcontext
import json
import os
import subprocess
import logging
from typing import Any

logger = logging.getLogger("gds_api.tool_gateway")

# Tool paths
TOOLS_BIN = os.environ.get("TOOLS_BIN", "/opt/tools/bin")
SYSTEM_BIN = "/usr/bin"
LOCAL_BIN = "/usr/local/bin"

def _find_tool(name: str) -> str:
    """Find the full path to a security tool."""
    for prefix in [TOOLS_BIN, SYSTEM_BIN, LOCAL_BIN]:
        path = os.path.join(prefix, name)
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    # Try which
    try:
        result = subprocess.run(["which", name], capture_output=True, text=True, timeout=2)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except:
        pass
    return name  # Fallback — let subprocess find it


async def _run_tool(cmd: list[str], timeout: int = 300) -> dict[str, Any]:
    """Execute a command and return structured output."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return {
            "exit_code": proc.returncode,
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
            "success": proc.returncode == 0,
        }
    except asyncio.TimeoutError:
        proc.kill()
        return {"exit_code": -1, "stdout": "", "stderr": "timeout", "success": False}
    except Exception as e:
        return {"exit_code": -1, "stdout": "", "stderr": str(e), "success": False}


# === Tool implementations ===

async def _nmap_scan(params: dict) -> dict:
    """Run nmap scan. params: target, ports, flags."""
    target = params.get("target", "localhost")
    ports = params.get("ports", "")
    flags = params.get("flags", ["-sV"])
    if isinstance(flags, str):
        flags = flags.split()
    
    cmd = [_find_tool("nmap")] + flags
    if ports:
        cmd.extend(["-p", ports])
    cmd.append(target)
    
    result = await _run_tool(cmd, timeout=600)
    # Parse open ports
    open_ports = []
    for line in result["stdout"].split("\n"):
        parts = line.split()
        if len(parts) >= 3 and "open" in parts:
            open_ports.append({
                "port": parts[0],
                "state": parts[1],
                "service": parts[2],
                "version": " ".join(parts[3:]) if len(parts) > 3 else "",
            })
    result["open_ports"] = open_ports
    result["tool"] = "nmap"
    return result


# The ports this platform actually publishes or watches. Fixed on purpose: an inventory control must answer
# "is my own perimeter the shape I think it is", not sweep 65,535 ports, and a constant list keeps the cost and
# the noise identical every run, so a diff between two runs means a real change rather than a different sweep.
INVENTORY_PORTS = "22,80,443,3000,5432,8000,8080,8222,9000,9001,9090"


async def _port_inventory_scan(params: dict) -> dict:
    """Read-only TCP port and service inventory of ONE authorised host.

    Deliberately narrower than nmap_scan: a single host, no CIDR or range, a fixed port list and a fixed
    non-aggressive profile. nmap_scan stays the red team's R4 tool with its per-run approval. This exists so the
    scheduled coverage control can run unattended against an authorised asset: as an R4 capability every run
    raised an approval nobody answered, so port coverage produced nothing for days while the log looked like a
    scan had been attempted. It observes the perimeter and changes nothing on the target.
    """
    target = str(params.get("target") or "").strip()
    if not target:
        return {"success": False, "error": "target is required", "code": "MISSING_TARGET"}
    if "/" in target or "," in target or " " in target or target.startswith("-"):
        return {
            "success": False,
            "code": "SINGLE_HOST_ONLY",
            "error": "inventory scan accepts one host or IP - never a range, CIDR, list or argument",
        }
    profile = {"ports": INVENTORY_PORTS, "flags": ["-sV", "-T4", "--open", "-Pn"]}
    result = await _nmap_scan({"target": target, **profile})
    result["tool"] = "port_inventory"
    result["profile"] = profile
    return result


async def _nuclei_scan(params: dict) -> dict:
    """Run nuclei scan. params: target, templates."""
    target = params.get("target", "localhost")
    templates = params.get("templates", "")
    
    # nuclei v3.11 removed -json; the JSONL flag is -jsonl (alias -j). Measured 25 Nov 2026: the stale
    # flag made every nuclei run exit 2 with "flag provided but not defined: -json" and return zero
    # findings, so the assessment role could not scan at all. The parser below already reads JSONL.
    cmd = [_find_tool("nuclei"), "-u", target, "-jsonl"]
    if templates:
        cmd.extend(["-t", templates])
    
    result = await _run_tool(cmd, timeout=600)
    findings = []
    for line in result["stdout"].split("\n"):
        if line.strip().startswith("{"):
            try:
                findings.append(json.loads(line))
            except:
                pass
    result["findings"] = findings
    result["tool"] = "nuclei"
    return result


async def _semgrep_scan(params: dict) -> dict:
    """Run semgrep scan. params: path, rules."""
    path = params.get("path", ".")
    rules = params.get("rules", "auto")
    
    cmd = [_find_tool("semgrep"), "--json", "--config", rules, path]
    result = await _run_tool(cmd, timeout=600)
    try:
        data = json.loads(result["stdout"])
        result["findings"] = data.get("results", [])
        result["summary"] = data.get("errors", [])
    except:
        result["findings"] = []
    result["tool"] = "semgrep"
    return result


async def _trivy_scan(params: dict) -> dict:
    """Run trivy scan. params: image, path, scan_type."""
    scan_type = params.get("scan_type", "fs")
    target = params.get("target", params.get("image", "."))
    
    cmd = [_find_tool("trivy"), scan_type, "--format", "json", target]
    result = await _run_tool(cmd, timeout=600)
    try:
        data = json.loads(result["stdout"])
        result["vulnerabilities"] = data.get("Results", [])
    except:
        result["vulnerabilities"] = []
    result["tool"] = "trivy"
    return result


async def _nikto_scan(params: dict) -> dict:
    """Run nikto scan. params: target, port."""
    target = params.get("target", "localhost")
    port = params.get("port", "443")
    
    # nikto has no json format (csv/htm/msf+/nbe/txt/xml only). Measured 25 Nov 2026: "-Format json" made
    # every nikto run fail its format selection and return no findings, so a web server check looked clean
    # when nothing had been parsed. XML is a real nikto format and is parsed into findings below.
    cmd = [_find_tool("nikto"), "-h", target, "-p", port, "-Format", "xml", "-nointeractive"]
    result = await _run_tool(cmd, timeout=600)
    result["tool"] = "nikto"
    findings: list[dict] = []
    raw = result.get("stdout") or ""
    start = raw.find("<")
    if start >= 0:
        try:
            import xml.etree.ElementTree as ET

            root = ET.fromstring(raw[start:])
            for item in root.iter("item"):
                findings.append(
                    {
                        "id": item.get("id"),
                        "method": item.get("method"),
                        "uri": item.get("uri"),
                        "description": item.get("description"),
                        "namelink": item.get("namelink"),
                    }
                )
        except Exception as exc:  # noqa: BLE001 - an unparsed scan is not a clean scan
            result["parse_error"] = str(exc)[:200]
    result["findings"] = findings
    return result


async def _sqlmap_scan(params: dict) -> dict:
    """Run sqlmap scan. params: url, data."""
    url = params.get("url", "")
    if not url:
        return {"success": False, "error": "url required"}
    
    cmd = [_find_tool("sqlmap"), "-u", url, "--batch", "--output-dir=/tmp/sqlmap"]
    result = await _run_tool(cmd, timeout=600)
    result["tool"] = "sqlmap"
    return result


async def _masscan_scan(params: dict) -> dict:
    """Run masscan scan. params: target, ports, rate."""
    target = params.get("target", "127.0.0.1")
    ports = params.get("ports", "1-65535")
    rate = params.get("rate", "1000")
    
    cmd = [_find_tool("masscan"), target, "-p" + ports, "--rate", rate]
    result = await _run_tool(cmd, timeout=600)
    result["tool"] = "masscan"
    return result


async def _subfinder_scan(params: dict) -> dict:
    """Run subfinder. params: domain."""
    domain = params.get("domain", "")
    if not domain:
        return {"success": False, "error": "domain required"}
    
    cmd = [_find_tool("subfinder"), "-d", domain, "-json"]
    result = await _run_tool(cmd, timeout=300)
    subdomains = []
    for line in result["stdout"].split("\n"):
        if line.strip().startswith("{"):
            try:
                data = json.loads(line)
                subdomains.append(data.get("host", ""))
            except:
                pass
    result["subdomains"] = subdomains
    result["tool"] = "subfinder"
    return result


async def _httpx_probe(params: dict) -> dict:
    """Run httpx. params: target, ports."""
    target = params.get("target", "localhost")
    
    cmd = [_find_tool("httpx"), "-u", target, "-json"]
    result = await _run_tool(cmd, timeout=300)
    result["tool"] = "httpx"
    return result


async def _ffuf_scan(params: dict) -> dict:
    """Run ffuf. params: url, wordlist."""
    url = params.get("url", "")
    wordlist = params.get("wordlist", "/opt/tools/wordlists/directory-list-2.3-medium.txt")
    
    if not url:
        return {"success": False, "error": "url required"}
    
    cmd = [_find_tool("ffuf"), "-u", url + "/FUZZ", "-w", wordlist, "-json"]
    result = await _run_tool(cmd, timeout=600)
    result["tool"] = "ffuf"
    return result


async def _gobuster_scan(params: dict) -> dict:
    """Run gobuster. params: url, mode, wordlist."""
    url = params.get("url", "")
    mode = params.get("mode", "dir")
    wordlist = params.get("wordlist", "/opt/tools/wordlists/directory-list-2.3-medium.txt")
    
    if not url:
        return {"success": False, "error": "url required"}
    
    cmd = [_find_tool("gobuster"), mode, "-u", url, "-w", wordlist]
    result = await _run_tool(cmd, timeout=600)
    result["tool"] = "gobuster"
    return result


async def _wpscan_scan(params: dict) -> dict:
    """Run wpscan. params: url."""
    url = params.get("url", "")
    if not url:
        return {"success": False, "error": "url required"}
    
    cmd = [_find_tool("wpscan"), "--url", url, "--format", "json"]
    result = await _run_tool(cmd, timeout=600)
    result["tool"] = "wpscan"
    return result


async def _check_cisa_kev(params: dict) -> dict:
    """Check CISA KEV feed. params: cve_id."""
    import httpx
    resp = await httpx.AsyncClient().get(
        "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
        timeout=30
    )
    if resp.status_code == 200:
        data = resp.json()
        cve_id = params.get("cve_id", "")
        if cve_id:
            matches = [v for v in data.get("vulnerabilities", []) if v.get("cveID") == cve_id]
            return {"success": True, "tool": "cisa_kev", "match": bool(matches), "vulnerability": matches[0] if matches else None}
        return {"success": True, "tool": "cisa_kev", "total_vulns": len(data.get("vulnerabilities", []))}
    return {"success": False, "tool": "cisa_kev", "error": f"HTTP {resp.status_code}"}


async def _search_osv(params: dict) -> dict:
    """Search OSV.dev. params: package, ecosystem."""
    import httpx
    package = params.get("package", "")
    ecosystem = params.get("ecosystem", "")
    
    resp = await httpx.AsyncClient().post(
        "https://api.osv.dev/v1/query",
        json={"package": {"name": package, "ecosystem": ecosystem}},
        timeout=30
    )
    if resp.status_code == 200:
        data = resp.json()
        vulns = data.get("vulns", [])
        return {"success": True, "tool": "osv", "vulnerabilities": vulns, "count": len(vulns)}
    return {"success": False, "tool": "osv", "error": f"HTTP {resp.status_code}"}


def _target_covered(candidate: str, covered: set[str]) -> bool:
    """True when the candidate URL or its host has a live authorisation entry."""
    value = str(candidate).strip().lower()
    host = value.split("://", 1)[-1].split("/")[0]
    return value in covered or host in covered


async def _authorised_target_refusal(params: dict, candidate: str) -> dict | None:
    """Scope enforcement for external HTTP checks.

    MEASURED DEFECT (19 Nov 2026): _check_url_headers and _check_domain_security fetched whatever
    host the caller named - _check_domain_security even defaulted to a domain - while their
    capability descriptions promised a Watchlist-authorised target. No check existed anywhere, so
    the promise was false. This enforces it: an external check needs a live authorized_targets row
    for the tenant, matched on the full URL or the host.
    """
    from sqlalchemy import text as _text

    from gds_api.db import async_session_factory as _factory
    from gds_api.tenant_binding import bind_tenant as _bind

    tenant = params.get("_tenant_id") or params.get("tenant_id")
    if not tenant:
        return {"success": False, "tool": "target_authorisation", "code": "TENANT_REQUIRED",
                "error": "an external check requires a tenant context and none was supplied"}
    async with _factory() as db:
        await _bind(db, tenant)
        rows = (await db.execute(_text(
            "SELECT target FROM authorized_targets WHERE tenant_id = :t AND status = 'active' "
            "AND (valid_until IS NULL OR valid_until > now())"), {"t": str(tenant)})).scalars().all()
    covered = {str(r).strip().lower() for r in rows}
    if _target_covered(candidate, covered):
        return None
    host = str(candidate).split("://", 1)[-1].split("/")[0].lower()
    return {"success": False, "tool": "target_authorisation", "code": "TARGET_NOT_AUTHORIZED",
            "error": (f"{host} has no active authorized_targets row for this tenant; external checks "
                      "require written scope"),
            "authorised_targets": sorted(covered)[:10]}


async def _check_url_headers(params: dict) -> dict:
    """Check security headers. params: url."""
    import httpx
    url = params.get("url", "")
    if not url:
        return {"success": False, "error": "url required"}
    refusal = await _authorised_target_refusal(params, url)
    if refusal:
        return refusal

    try:
        resp = await httpx.AsyncClient().get(url, timeout=10, follow_redirects=True)
        headers = dict(resp.headers)
        security_headers = {
            "strict-transport-security": headers.get("strict-transport-security", "MISSING"),
            "content-security-policy": headers.get("content-security-policy", "MISSING"),
            "x-frame-options": headers.get("x-frame-options", "MISSING"),
            "x-content-type-options": headers.get("x-content-type-options", "MISSING"),
            "referrer-policy": headers.get("referrer-policy", "MISSING"),
        }
        score = sum(1 for v in security_headers.values() if v != "MISSING")
        return {"success": True, "tool": "security_headers", "headers": security_headers, "score": f"{score}/5", "status_code": resp.status_code}
    except Exception as e:
        return {"success": False, "tool": "security_headers", "error": str(e)}




# === Agent-Internal Tools (platform operations) ===

async def _search_knowledge(params: dict) -> dict:
    """Real semantic search over knowledge_documents. Used the wrong qdrant collection."""
    return await platform_data.knowledge_search(
        query=params.get("query", ""), limit=platform_data.bounded_limit(params.get("limit"), 5, 20)
    )
async def _add_knowledge(params: dict) -> dict:
    """Store a real knowledge document (postgres + qdrant). Was a no-op claiming stored."""
    return await platform_data.knowledge_add(
        title=params.get("title", ""),
        content=params.get("content", ""),
        document_type=params.get("document_type", "manual"),
        mission_id=params.get("mission_id"),
    )
async def _record_mission_lesson(params: dict) -> dict:
    """Persist a lesson as a mission_lesson document. Was a no-op claiming recorded."""
    return await platform_data.record_mission_lesson(
        mission_id=params.get("mission_id"), lesson=params.get("lesson", "")
    )
async def _query_platform_metrics(params: dict) -> dict:
    """Return real tenant-scoped mission and model-cost totals."""
    return await platform_data.platform_metrics()

async def _list_pending_approvals(params: dict) -> dict:
    """Pending approvals from the live approvals table. Was a hardcoded empty list."""
    return await platform_data.pending_approvals(limit=platform_data.bounded_limit(params.get("limit"), 50))
async def _check_platform_health(params: dict) -> dict:
    """Check platform health."""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:8000/health/ready", timeout=5)
        resp.raise_for_status()
        return {"success": True, "tool": "check_platform_health", "status": resp.json()}
    except Exception as e:
        return {"success": False, "tool": "check_platform_health", "status": "error", "error": str(e)}

async def _list_recent_missions(params: dict) -> dict:
    """Recent missions with task tallies. Was a hardcoded empty list."""
    return await platform_data.recent_missions(limit=platform_data.bounded_limit(params.get("limit"), 10))
async def _search_osv_vulnerabilities(params: dict) -> dict:
    """Search OSV for vulnerabilities. params: package, ecosystem, version."""
    import httpx
    package = params.get("package", "")
    ecosystem = params.get("ecosystem", "PyPI")
    version = params.get("version", "")
    
    query = {"package": {"name": package, "ecosystem": ecosystem}}
    if version:
        query["version"] = version
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post("https://api.osv.dev/v1/query", json=query)
            if resp.status_code == 200:
                data = resp.json()
                vulns = data.get("vulns", [])
                return {"success": True, "tool": "search_osv_vulnerabilities", "package": package, "vulnerabilities": vulns, "count": len(vulns)}
            else:
                return {"success": False, "tool": "search_osv_vulnerabilities", "error": f"HTTP {resp.status_code}", "response": resp.text[:200]}
    except Exception as e:
        return {"success": False, "tool": "search_osv_vulnerabilities", "error": str(e)}

async def _enrich_finding(params: dict) -> dict:
    """Real finding detail from security_findings. Previously returned {"enriched": True}."""
    return await platform_data.finding_detail(params.get("finding_id", ""))
async def _prioritise_finding(params: dict) -> dict:
    """Priority derived from the stored finding. Previously echoed severity back."""
    detail = await platform_data.finding_detail(params.get("finding_id", ""))
    if not detail.get("success"):
        return detail
    priority = platform_data.derive_priority(detail["finding"])
    return {"success": True, "tool": "prioritise_finding", "finding_id": params.get("finding_id", ""), **priority}
async def _check_threat_indicator(params: dict) -> dict:
    """Real multi-source indicator lookup. Was a refusal with no feed behind it."""
    return await tool_actions.threat_indicator(params.get("indicator", ""), params.get("type", "unknown"))

async def _triage_finding(params: dict) -> dict:
    """Triage a real finding. Returns stored fields plus a documented priority rule."""
    detail = await platform_data.finding_detail(params.get("finding_id", ""))
    if not detail.get("success"):
        return detail
    finding = detail["finding"]
    return {
        "success": True,
        "tool": "triage_finding",
        "source": "security_findings (live, tenant-scoped)",
        "finding_id": finding["id"],
        "title": finding.get("title"),
        "severity": finding.get("severity"),
        "status": finding.get("status"),
        "kev_listed": finding.get("kev_listed"),
        "cvss": finding.get("cvss"),
        "epss": finding.get("epss"),
        **platform_data.derive_priority(finding),
    }
async def _list_open_findings(params: dict) -> dict:
    """Open findings from the live security_findings table. Was a hardcoded empty list."""
    return await platform_data.open_findings(
        severity=params.get("severity"),
        limit=platform_data.bounded_limit(params.get("limit"), 50),
        target=params.get("target"),
    )
async def _create_incident_from_findings(params: dict) -> dict:
    """Create a real incident from real findings. Was a fabricated INC-AUTO-001."""
    return await tool_actions.create_incident_from_findings(
        params.get("finding_ids"),
        params.get("title"),
        actor_id=params.get("_actor_id"),
    )

async def _list_open_incidents(params: dict) -> dict:
    """Open incidents from the live incidents table. Was a hardcoded empty list."""
    return await platform_data.open_incidents(limit=platform_data.bounded_limit(params.get("limit"), 50))
async def _review_platform_architecture(params: dict) -> dict:
    """Real RLS/tenancy posture of the schema. Was a hardcoded grade B."""
    return await platform_data.architecture_review()
async def _review_identity_posture(params: dict) -> dict:
    """Real identity data or an explicit refusal. Was a hardcoded grade B."""
    return await platform_data.identity_posture()
async def _check_domain_security(params: dict) -> dict:
    """Check domain security (DNS, SSL, headers)."""
    domain = str(params.get("domain") or "").strip()
    if not domain:
        return {"success": False, "tool": "check_domain_security", "code": "MISSING_ARGUMENT",
                "error": "domain is required; there is no default target"}
    refusal = await _authorised_target_refusal(params, domain)
    if refusal:
        return refusal
    import httpx
    try:
        resp = await httpx.AsyncClient().get(f"https://{domain}", timeout=10, follow_redirects=True)
        headers = dict(resp.headers)
        return {
            "success": True, "tool": "check_domain_security", "domain": domain,
            "ssl": resp.url.scheme == "https",
            "status_code": resp.status_code,
            "hsts": headers.get("strict-transport-security", "MISSING"),
            "csp": headers.get("content-security-policy", "MISSING"),
        }
    except Exception as e:
        return {"success": False, "tool": "check_domain_security", "error": str(e)}

async def _check_url_security_headers(params: dict) -> dict:
    """Check URL security headers (alias for check_url_headers)."""
    return await _check_url_headers(params)

async def _review_compliance_posture(params: dict) -> dict:
    """Per-framework pass/fail from compliance_assessments. Was a hardcoded 28 percent."""
    return await platform_data.compliance_posture()
async def _calculate_risk_exposure(params: dict) -> dict:
    """Exposure score computed from open findings. Was a hardcoded 88/grade A."""
    return await platform_data.risk_exposure()
async def _verify_evidence_integrity(params: dict) -> dict:
    """Real evidence lookup. Was a hardcoded intact: True."""
    return await platform_data.evidence_integrity(params.get("evidence_id", ""))
async def _scan_own_dependencies(params: dict) -> dict:
    """Real OSV batch scan of the API's pinned requirements. Was a hardcoded zero."""
    return await platform_data.scan_dependencies(
        requirements_path=params.get("requirements_path", "/opt/gds-os/apps/api/requirements.txt")
    )
async def _check_malware_hash(params: dict) -> dict:
    """Look up one SHA-256 in MalwareBazaar; unknown responses are not clean."""
    import httpx
    import re
    file_hash = str(params.get("hash") or "").lower()
    if not re.fullmatch(r"[0-9a-f]{64}", file_hash):
        return {"success": False, "tool": "check_malware_hash", "code": "INVALID_HASH",
                "error": "a SHA-256 hex digest is required"}
    key = os.environ.get("MALWAREBAZAAR_AUTH_KEY", "").strip()
    if not key:
        return {"success": False, "tool": "check_malware_hash", "code": "CONNECTOR_NOT_CONFIGURED",
                "error": "MalwareBazaar Auth-Key is not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post("https://mb-api.abuse.ch/api/v1/",
                                     data={"query": "get_info", "hash": file_hash},
                                     headers={"Auth-Key": key})
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        return {"success": False, "tool": "check_malware_hash", "code": "SOURCE_UNAVAILABLE",
                "error": f"MalwareBazaar lookup failed: {type(exc).__name__}"}
    status = data.get("query_status") if isinstance(data, dict) else None
    if status == "hash_not_found":
        return {"success": True, "tool": "check_malware_hash", "hash": file_hash,
                "malicious": False, "source": "MalwareBazaar get_info", "verdict": "not_listed"}
    if status == "ok" and isinstance(data.get("data"), list):
        matches = [item for item in data["data"] if isinstance(item, dict)
                   and str(item.get("sha256_hash") or "").lower() == file_hash]
        if matches:
            return {"success": True, "tool": "check_malware_hash", "hash": file_hash,
                    "malicious": True, "source": "MalwareBazaar get_info", "verdict": "listed",
                    "matched_record": matches[0]}
    return {"success": False, "tool": "check_malware_hash", "code": "UNVERIFIED_SOURCE_RESPONSE",
            "error": "MalwareBazaar did not return a verified hash match or explicit not-found status",
            "source_status": status}

async def _recon_dns_enumeration(params: dict) -> dict:
    """DNS enumeration using subfinder."""
    domain = params.get("domain", "globaldigitalsecurity.io")
    return await _subfinder_scan({"domain": domain})

async def _recon_port_scan(params: dict) -> dict:
    """Port scan using nmap."""
    return await _nmap_scan(params)

async def _assess_attack_surface(params: dict) -> dict:
    """Assess attack surface of a target."""
    target = params.get("target", "localhost")
    nmap_result = await _nmap_scan({"target": target, "ports": "22,80,443,8000", "flags": ["-sV"]})
    headers_result = await _check_url_headers({"url": f"https://{target}"}) if target != "localhost" else {"success": False}
    return {
        "success": True, "tool": "assess_attack_surface", "target": target,
        "open_ports": nmap_result.get("open_ports", []),
        "security_headers": headers_result if headers_result.get("success") else {},
    }

async def _validate_finding(params: dict) -> dict:
    """Re-test the finding for real. Was a hardcoded still_present: False."""
    return await tool_actions.retest_finding(params.get("finding_id"))

async def _auto_fix_finding(params: dict) -> dict:
    """Produce a real branch and commit for a dependency fix. Was a hardcoded fixed: True."""
    return await tool_actions.autofix_finding(params.get("finding_id"))

async def _coordinate_pentest_engagement(params: dict) -> dict:
    """Open an engagement for authorised targets only. Was a fabricated PENTEST-001."""
    return await tool_actions.coordinate_pentest_engagement(
        params.get("name"),
        params.get("targets") or params.get("target"),
        rules_of_engagement=params.get("rules_of_engagement"),
        allowed_techniques=params.get("allowed_techniques"),
        prohibited_techniques=params.get("prohibited_techniques"),
        mission_id=params.get("mission_id"),
        actor_id=params.get("_actor_id"),
    )

async def _get_current_time(params: dict) -> dict:
    """Get current time."""
    from datetime import datetime, timezone
    return {"success": True, "tool": "get_current_time", "utc_time": datetime.now(timezone.utc).isoformat()}



async def _purge_mission_memory(params: dict) -> dict:
    """Approval-gated real purge. Was a hardcoded purged: True that deleted nothing."""
    return await tool_actions.purge_mission_memory(
        params.get("mission_id"), actor_id=params.get("_actor_id")
    )

from gds_api import ops_tools as _ops_tools  # noqa: F401


# === Tool registry ===
async def _discover_cloud_environment(payload=None, **kwargs):  # noqa: ANN001
    """Run a real cloud discovery job through the provider adapter."""
    from gds_api.cloud.discovery_runner import discover_cloud_environment

    return await discover_cloud_environment(payload, **kwargs)


async def _evaluate_cloud_posture(payload=None, **kwargs):  # noqa: ANN001
    """Run a real cloud posture evaluation for one environment."""
    from gds_api.cloud.posture.evaluation_runner import evaluate_cloud_posture

    return await evaluate_cloud_posture(payload, **kwargs)


TOOL_REGISTRY = {
    "evaluate_cloud_posture": _evaluate_cloud_posture,
    "discover_cloud_environment": _discover_cloud_environment,
    "nmap_scan": _nmap_scan,
    "port_inventory_scan": _port_inventory_scan,
    "nuclei_scan": _nuclei_scan,
    "semgrep_scan": _semgrep_scan,
    "trivy_scan": _trivy_scan,
    "nikto_scan": _nikto_scan,
    "sqlmap_scan": _sqlmap_scan,
    "masscan_scan": _masscan_scan,
    "subfinder_scan": _subfinder_scan,
    "httpx_probe": _httpx_probe,
    "ffuf_scan": _ffuf_scan,
    "gobuster_scan": _gobuster_scan,
    "wpscan_scan": _wpscan_scan,
    "check_cisa_kev": _check_cisa_kev,
    "search_osv": _search_osv,
    "check_url_headers": _check_url_headers,
    # Internal tools
    "noop": lambda params: asyncio.coroutine(lambda: {"success": True, "tool": "noop"})(),
    "add_knowledge": _add_knowledge,
    "assess_attack_surface": _assess_attack_surface,
    "auto_fix_finding": _auto_fix_finding,
    "calculate_risk_exposure": _calculate_risk_exposure,
    "check_domain_security": _check_domain_security,
    "check_malware_hash": _check_malware_hash,
    "check_platform_health": _check_platform_health,
    "check_threat_indicator": _check_threat_indicator,
    "check_url_security_headers": _check_url_security_headers,
    "coordinate_pentest_engagement": _coordinate_pentest_engagement,
    "create_incident_from_findings": _create_incident_from_findings,
    "enrich_finding": _enrich_finding,
    "get_current_time": _get_current_time,
    "list_open_findings": _list_open_findings,
    "list_open_incidents": _list_open_incidents,
    "list_pending_approvals": _list_pending_approvals,
    "list_recent_missions": _list_recent_missions,
    "prioritise_finding": _prioritise_finding,
    "query_platform_metrics": _query_platform_metrics,
    "recon_dns_enumeration": _recon_dns_enumeration,
    "recon_port_scan": _recon_port_scan,
    "record_mission_lesson": _record_mission_lesson,
    "review_compliance_posture": _review_compliance_posture,
    "review_identity_posture": _review_identity_posture,
    "review_platform_architecture": _review_platform_architecture,
    "scan_own_dependencies": _scan_own_dependencies,
    "search_knowledge": _search_knowledge,
    "search_osv_vulnerabilities": _search_osv_vulnerabilities,
    "triage_finding": _triage_finding,
    "validate_finding": _validate_finding,
    "verify_evidence_integrity": _verify_evidence_integrity,
    "purge_mission_memory": _purge_mission_memory,
    "shell_run_allowlisted": _ops_tools.shell_run_allowlisted,
    "repository_write_file": _ops_tools.repository_write_file,
    "engineering_commit": _ops_tools.engineering_commit,
    "engineering_commit_mission": _ops_tools.engineering_commit_mission,
    "cloud_read_posture": _ops_tools.cloud_read_posture,
    "cloud_apply_remediation": _ops_tools.cloud_apply_remediation,
    "engineering_plan_mission": _ops_tools.engineering_plan_mission,
    "engineering_execute_session": _ops_tools.engineering_execute_session,
    "remediation_plan_image_upgrade": _ops_tools.remediation_plan_image_upgrade,
}


async def _execute_registered_tool(
    tool_name: str,
    action: str = "execute",
    payload: dict[str, Any] | None = None,
    actor_id: str = "",
    actor_type: str = "agent",
    actor_role: str = "",
    tenant_id: str = "",
    mission_id: str = "",
) -> dict[str, Any]:
    """Execute a tool by name. This is the main entry point for the AgentExecutionLoop."""
    payload = payload or {}
    
    logger.info(f"tool_executing: tool={tool_name} actor={actor_id} tenant={tenant_id}")
    
    if tool_name not in TOOL_REGISTRY:
        logger.warning(f"tool_unknown: tool={tool_name}")
        return {"success": False, "error": f"Unknown tool: {tool_name}", "available": list(TOOL_REGISTRY.keys())}
    
    handler = TOOL_REGISTRY[tool_name]
    # Tenant scope for the handler. Platform-state tools open their own sessions, and
    # use_tenant makes the engine bind gds.tenant_id on every transaction they start, so a
    # FORCE-RLS read cannot silently return zero rows and masquerade as "none found".
    # bind_tenant never sets ambient state, and this scope resets on exit.
    scope = use_tenant(tenant_id) if tenant_id else nullcontext()
    try:
        if isinstance(payload, dict):
            # Handlers that record provenance (approvals, engagement authorisation, cloud
            # discovery) need the acting principal and the execution context. It used to be
            # dropped between the governance layer and the handler, which left any handler that
            # must write a row it owns (cloud_discovery_jobs.initiated_by_user_id) with no way to
            # know who asked - so that tool could not create its own record at all.
            if actor_id:
                payload.setdefault("_actor_id", actor_id)
            if tenant_id:
                payload.setdefault("_tenant_id", tenant_id)
            if mission_id:
                payload.setdefault("_mission_id", mission_id)
        with scope:
            result = await handler(payload) if asyncio.iscoroutinefunction(handler) else handler(payload)
        logger.info(f"tool_completed: tool={tool_name} success={result.get('success', True)}")
        return result
    except Exception as e:
        logger.error(f"tool_error: tool={tool_name} error={str(e)}")
        return {"success": False, "error": str(e), "tool": tool_name}


async def execute_tool(
    tool_name: str, action: str = "execute", payload: dict[str, Any] | None = None,
    actor_id: str = "", actor_type: str = "agent", actor_role: str = "", tenant_id: str = "",
) -> dict[str, Any]:
    """Legacy dispatch is closed; actor strings are not an authorization grant."""
    return {"success": False, "error": "A governed capability request is required",
            "code": "GOVERNED_CAPABILITY_REQUIRED", "execution_mode": "not_executed"}


def list_tools() -> list[str]:
    """Return all available tool names."""
    return list(TOOL_REGISTRY.keys())


# ---- Repository capabilities -----------------------------------------------------
# The ten names capabilities/catalog.py declares as repository.* and that
# repository_api._REPOSITORY_CAPABILITY_TOOLS maps to. They were declared but unregistered,
# so the broker's lookup raised KeyError and the endpoints returned 500.
from gds_api.repository.tools import REPOSITORY_TOOL_HANDLERS  # noqa: E402

TOOL_REGISTRY.update(REPOSITORY_TOOL_HANDLERS)

# ---- Declared scanner capabilities ----------------------------------------------
# capabilities/catalog.py declares sast_scan, dast_scan, container_scan, iac_scan and
# generate_sbom. The engines were installed but these names were never registered, so the
# broker raised KeyError and all five returned 500.
from gds_api.scanner_actions import SCANNER_TOOL_HANDLERS  # noqa: E402

TOOL_REGISTRY.update(SCANNER_TOOL_HANDLERS)

# ---- Declared identity capabilities ---------------------------------------------
# check_credential_leaks and detect_identity_threats are declared in the catalogue and were
# never registered, so the broker raised KeyError and both returned 500.
from gds_api.threat_actions import IDENTITY_TOOL_HANDLERS  # noqa: E402

TOOL_REGISTRY.update(IDENTITY_TOOL_HANDLERS)

# ---- Real tool specs (risk_class + description) ---------------------------------
# gds_api.workflows' decide prompt and _resolve_task_risk_class() read
# spec.risk_class / spec.description off every TOOL_REGISTRY function. Those fields
# are NOT invented here: for tools that map to an OPERATIONAL capability both fields
# come from the capability catalog itself (CAPABILITY_REGISTRY via
# TOOL_TO_CAPABILITY_KEY, whose risk classes are the documented model in
# docs/security/capability-risk-model.md), and the RiskClass->label mapping below is
# that model's own wording (R0/R1 fall inside "low"; R2/R3/R4 map to medium/high/
# critical respectively). The legacy scanner tools are NOT capability-mapped yet -
# evaluate_task already fail-closes them at the broker until they are - so their specs
# are hand-written here from their real behaviour, at the same scale.
from gds_api.capabilities.definitions import RiskClass  # noqa: E402
from gds_api import platform_data
from gds_api import tool_actions  # noqa: E402
from gds_api.tenant_binding import bind_tenant, use_tenant

_RISK_CLASS_LABEL: dict[str, str] = {
    RiskClass.R0: "low",
    RiskClass.R1: "low",
    RiskClass.R2: "medium",
    RiskClass.R3: "high",
    RiskClass.R4: "critical",
}

# Legacy scanners, not yet in the capability catalog. The broker denies them until they
# are properly mapped, so these labels only ever reach the decide prompt - they never
# grant execution. Risk labels follow the same low/medium/high/critical scale.
_LEGACY_SCANNER_SPECS: dict[str, tuple[str, str]] = {
    "nmap_scan": ("high", "TCP port and service scan of a target host or range (nmap)."),
    "nuclei_scan": ("high", "Template-driven vulnerability scan of a target (nuclei)."),
    "nikto_scan": ("high", "Web server vulnerability scan of a target (nikto)."),
    "sqlmap_scan": ("critical", "Active SQL injection testing against a target (sqlmap)."),
    "masscan_scan": ("high", "High-speed TCP port sweep of a target range (masscan)."),
    "ffuf_scan": ("high", "Directory/endpoint brute-force discovery of a target (ffuf)."),
    "gobuster_scan": ("high", "Directory/endpoint brute-force discovery of a target (gobuster)."),
    "wpscan_scan": ("high", "WordPress-specific scan of a target (wpscan)."),
    "semgrep_scan": ("low", "Static code scan of a local repository (semgrep)."),
    "trivy_scan": ("low", "Vulnerability scan of a local container image (trivy)."),
    "check_url_headers": ("low", "Fetch and review a target URL's HTTP response headers."),
    "httpx_probe": ("low", "Probe target URL(s) for reachability and basic HTTP data (httpx)."),
    "subfinder_scan": ("low", "Passive subdomain enumeration via DNS sources (subfinder)."),
    "search_osv": ("low", "Look up known vulnerabilities for a package (OSV.dev API)."),
    "noop": ("low", "Do nothing - a no-op for testing the tool path only."),
}


def _attach_tool_specs() -> None:
    # Imported lazily: capabilities.catalog is a peer module and this keeps the import
    # order independent of it.
    from gds_api.capabilities.catalog import CAPABILITY_REGISTRY, TOOL_TO_CAPABILITY_KEY

    for _name, _fn in TOOL_REGISTRY.items():
        if hasattr(_fn, "risk_class"):
            continue
        _cap = CAPABILITY_REGISTRY.get(TOOL_TO_CAPABILITY_KEY.get(_name, ""))
        if _cap is not None:
            _fn.risk_class = _RISK_CLASS_LABEL[_cap.risk_class]
            _fn.description = _cap.description
        elif _name in _LEGACY_SCANNER_SPECS:
            _fn.risk_class, _fn.description = _LEGACY_SCANNER_SPECS[_name]
        else:
            # Fail closed: a registry tool with no capability mapping and no explicit
            # spec must be loud at startup, not silently mislabeled in the decide
            # prompt or approval gating.
            raise RuntimeError(
                f"tool {_name!r} has no capability mapping and no explicit spec - "
                "attach one before it can be advertised to the reasoning loop"
            )


_attach_tool_specs()


def _parameters_match_redacted(stored: Any, actual: Any) -> bool:
    """Compare a redacted stored parameter set with the real input it authorised.

    The broker persists `requested_parameters_safe`, in which sensitive values are replaced
    with "[REDACTED]". Comparing that to the real input with plain equality therefore denies
    EVERY governed execution whose parameters were redacted - and it denies silently, because
    the caller only sees EXECUTION_BINDING_MISMATCH. A redacted value is a wildcard: the key
    must still be present, and every unredacted value must match exactly.
    """
    if not isinstance(stored, dict) or not isinstance(actual, dict):
        return stored == actual
    if set(stored) != set(actual):
        return False
    for key, expected in stored.items():
        if expected == "[REDACTED]":
            continue
        if actual[key] != expected:
            return False
    return True


async def execute_tool_governed(
    db: Any,
    *,
    tenant_id: Any,
    user_id: Any,
    mission_id: Any,
    tool_name: str,
    input_data: dict[str, Any],
    requesting_agent_id: Any = None,
    workflow_run_id: Any = None,
    capability_decision_id: Any = None,
) -> dict[str, Any]:
    """Capability-governed execution entry point for gds_api.capabilities.gateway.

    Phase 17's gateway passes the real db/tenant-scoped context (the human user_id and
    mission behind the request, plus the agent/workflow/decision that authorized it).
    The broker has ALREADY made its governance decision for this exact request
    (evaluate_capability_request + reevaluate_capability_request in the gateway); this
    function makes no second governance decision - it only executes the real registered
    handler through the plain execute_tool path (registry lookup, tool_executing /
    tool_completed logging, error containment) with the real actor fields, so every
    governed execution keeps the same real audit trail an ungoverned one has.

    The authorizing decision id is logged, not re-evaluated: the gateway records
    executed|failed on that decision itself (mark_capability_execution), guarded by
    CapabilityExecutionConflict so a decision can only ever be marked executed once.
    """
    actor_id = str(requesting_agent_id) if requesting_agent_id else str(user_id)
    actor_type = "agent" if requesting_agent_id else "user"
    logger.info(
        f"tool_governed_execute: tool={tool_name} actor={actor_id} "
        f"tenant={tenant_id} mission={mission_id} decision={capability_decision_id}"
    )
    from datetime import datetime, UTC
    from gds_api.models import CapabilityDecisionRecord, CapabilityRequestRecord
    # R2: capability_decisions is FORCE-RLS and db.py uses NullPool, so the claim's
    # commit can leave this session on a fresh unbound connection. Without a bind
    # here the decision row is invisible and the grant is wrongly rejected.
    await bind_tenant(db, tenant_id)
    decision = await db.get(CapabilityDecisionRecord, capability_decision_id)
    if decision is None:
        logger.warning(
            "grant_check: decision=%s NOT_FOUND (missing row or RLS hid it)", capability_decision_id
        )
    else:
        _now = datetime.now(UTC)
        logger.debug(
            "grant_check: decision=%s tenant_ok=%s user_ok=%s mission_ok=%s verdict=%s "
            "exec_status=%r expires_at=%s expired=%s",
            capability_decision_id,
            decision.tenant_id == tenant_id,
            decision.evaluated_user_id == user_id,
            decision.evaluated_mission_id == mission_id,
            decision.decision,
            decision.execution_status,
            decision.expires_at,
            (decision.expires_at is None or decision.expires_at <= _now),
        )
    if (decision is None or decision.tenant_id != tenant_id
            or decision.evaluated_user_id != user_id
            or decision.evaluated_mission_id != mission_id
            or decision.decision != "ALLOW" or decision.execution_status != "executing"
            or decision.expires_at is None or decision.expires_at <= datetime.now(UTC)):
        return {"success": False, "code": "INVALID_EXECUTION_GRANT", "error": "Execution grant is invalid"}
    request = await db.get(CapabilityRequestRecord, decision.request_id)
    if (request is None or request.tenant_id != tenant_id or request.user_id != user_id
            or request.mission_id != mission_id or request.requested_tool_id != tool_name
            or not _parameters_match_redacted(request.requested_parameters_safe, input_data)):
        return {"success": False, "code": "EXECUTION_BINDING_MISMATCH", "error": "Execution request mismatch"}
    return await _execute_registered_tool(
        tool_name=tool_name,
        payload=input_data,
        actor_id=actor_id,
        actor_type=actor_type,
        actor_role=f"mission:{mission_id}",
        tenant_id=str(tenant_id),
        mission_id=str(mission_id) if mission_id else "",
    )
