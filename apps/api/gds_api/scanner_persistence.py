"""A scan that found something must record it.

MEASURED 26 Nov 2026 from the register itself: a governed nuclei run on 25 Nov returned 25 real findings
(ssh-sha1-hmac-algo, waf-detect, exposed-gitignore) and another on 26 Nov returned waf-detect, and security_findings
holds ZERO nuclei rows for the month - the newest is 1 August. The tools parsed their output correctly and handed the
findings to their caller; nothing wrote them down. From inside the product that is indistinguishable from a hardened
estate, which is the failure mode this platform has a rule against.

The writer already existed (scanner_engines.store_findings, deduped on tenant+scanner+title+target while open) and was
called only by the older scanner_actions path. This module connects the governed execution path to it.

Only tools whose handler actually produces a `findings` list are covered, and every covered tool has an explicit
extractor. A tool with no extractor is reported as not persisted WITH ITS NAME, never silently skipped: a silent skip
is the same lie as a silent zero.
"""
from __future__ import annotations

from typing import Any, Callable

MAX_PERSISTED_PER_SCAN = 200


def _severity(value: object) -> str:
    text = str(value or "").strip().lower()
    if text in ("critical", "high", "medium", "low", "info"):
        return text
    # Nuclei says "unknown"; a scanner that did not classify is not a medium by evidence, but the register has no
    # "unknown" severity, so it is recorded at the lowest band and the raw value stays in details.
    return "info"


def _nuclei(item: dict, target: str) -> dict:
    info = item.get("info") or {}
    name = info.get("name") or item.get("template-id") or "nuclei finding"
    template = item.get("template-id") or ""
    return {
        "title": f"{name} ({template})" if template and template not in name else name,
        "severity": _severity(info.get("severity")),
        "target": item.get("matched-at") or item.get("host") or target,
        "description": info.get("description") or "",
        "raw": {"template_id": template, "matcher": item.get("matcher-name"),
                "type": item.get("type"), "tags": info.get("tags")},
    }


def _nikto(item: dict, target: str) -> dict:
    identifier = item.get("id") or "nikto"
    path = item.get("uri") or target
    description = item.get("description") or ""
    return {
        "title": f"nikto {identifier}: {description}"[:250],
        "severity": _severity(item.get("severity")),
        "target": f"{target.rstrip('/')}{path}" if str(path).startswith("/") else str(path),
        "description": description,
        "raw": {"id": identifier, "method": item.get("method"), "namelink": item.get("namelink")},
    }


def _nmap(item: dict, target: str) -> dict:
    """An open port is a fact about the perimeter. Recorded at info: an open port is not a vulnerability by itself,
    and calling it one is how a scanner earns a reputation for noise."""
    port = item.get("port") or item.get("portid") or "?"
    service = item.get("service") or item.get("name") or "unknown"
    version = item.get("version") or ""
    return {
        "title": f"open port {port}/{str(item.get('protocol') or 'tcp')} {service}".strip()[:250],
        "severity": "info",
        "target": target,
        "description": f"{service} {version}".strip() or "service not identified",
        "raw": {"port": port, "protocol": item.get("protocol"), "service": service, "version": version},
    }


#: The headers the platform itself requires. Measured 26 Nov 2026: security_headers_check had NO extractor, so every
#: headers check reported "nothing was written" while the check had in fact run and returned a score.
REQUIRED_HEADERS = (
    "strict-transport-security",
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
)


def _security_headers(item: dict, target: str) -> dict:
    name = item.get("header") or "header"
    return {
        "title": f"missing security header: {name}"[:250],
        "severity": "low",
        "target": target,
        "description": item.get("description") or f"The response does not set {name}.",
        "raw": {"header": name, "score": item.get("score")},
    }


def _httpx(item: dict, target: str) -> dict:
    host = item.get("host") or item.get("url") or item.get("input") or target
    tech = item.get("tech") or item.get("technologies") or []
    tech_text = ", ".join(tech) if isinstance(tech, list) else str(tech or "")
    status = item.get("status_code") or item.get("status-code")
    return {
        "title": f"http endpoint exposed: {host} [{status}]"[:250],
        "severity": "info",
        "target": host,
        "description": f"Live HTTP endpoint detected{f' running {tech_text}' if tech_text else ''}.",
        "raw": {"status_code": status, "title": item.get("title"), "webserver": item.get("webserver"),
                "tech": tech},
    }


# Every tool whose handler puts a `findings` list on its result. A guard test fails if a handler starts producing
# findings for a tool that is missing here.
def _ffuf(item: dict, target: str) -> dict:
    url = item.get("url") or target
    status = item.get("status")
    return {
        "title": f"discovered path {url} ({status})"[:250],
        "severity": "info",
        "target": url,
        "description": f"ffuf found a {status} response ({item.get('length')} bytes).",
        "raw": {"status": status, "length": item.get("length"), "words": item.get("words"),
                "content_type": item.get("content_type")},
    }


def _gobuster(item: dict, target: str) -> dict:
    path = item.get("path") or "/"
    status = item.get("status")
    return {
        "title": f"discovered path {path} ({status})"[:250],
        "severity": "info",
        "target": f"{target.rstrip('/')}{path}",
        "description": f"gobuster found a {status} response ({item.get('size')} bytes).",
        "raw": {"status": status, "size": item.get("size")},
    }


def _subfinder(item: dict, target: str) -> dict:
    name = item.get("subdomain") or target
    return {
        "title": f"discovered subdomain {name}"[:250],
        "severity": "info",
        "target": name,
        "description": f"Passive enumeration of {item.get('root_domain') or target} resolved {name}.",
        "raw": {"root_domain": item.get("root_domain")},
    }


def _httpx(item: dict, target: str) -> dict:
    url = item.get("url") or item.get("host") or target
    status = item.get("status_code")
    tech = ", ".join(item.get("tech") or []) or "no technology detected"
    return {
        "title": f"live endpoint {url} ({status})"[:250],
        "severity": "info",
        "target": url,
        "description": f"{item.get('webserver') or 'server not disclosed'}; {tech}; title {item.get('title')!r}.",
        "raw": {"status_code": status, "webserver": item.get("webserver"), "tech": item.get("tech")},
    }


EXTRACTORS: dict[str, Callable[[dict, str], dict]] = {
    "nuclei_scan": _nuclei,
    "nikto_scan": _nikto,
    "httpx_scan": _httpx,
    "httpx_probe": _httpx,
    # Added 26 Nov 2026: both tools returned results the writer could not read, so an open port and a missing security
    # header could be found and never recorded.
    "nmap_scan": _nmap,
    "port_inventory_scan": _nmap,
    "security_headers_check": _security_headers,
    "check_url_security_headers": _security_headers,
    # Added 26 Nov 2026: neither content-discovery tool parsed its own output, so neither could be recorded.
    "ffuf_scan": _ffuf,
    "gobuster_scan": _gobuster,
    # httpx and subfinder returned their own shapes with no findings list, so neither could ever be recorded.
    "subfinder_scan": _subfinder,
}


def normalise(tool_name: str, output: dict, target: str) -> list[dict]:
    """Map a tool's own finding objects to the writer's shape. Unknown tools yield nothing, and say so upstream."""
    extractor = EXTRACTORS.get(tool_name)
    if extractor is None:
        return []
    findings = output.get("findings")
    if not isinstance(findings, list):
        return []
    normalised: list[dict] = []
    for item in findings[:MAX_PERSISTED_PER_SCAN]:
        if not isinstance(item, dict):
            continue
        try:
            normalised.append(extractor(item, target))
        except Exception:  # noqa: BLE001 - one unreadable item must not lose the rest
            continue
    return normalised


async def persist_scan_output(tenant_id: Any, tool_name: str, target: str, output: dict) -> dict:
    """Write a governed scan's findings to the register, and report exactly what happened.

    Never raises: the caller is an execution path whose result the model reads, and a persistence failure must not be
    reported as a tool failure. It is reported as itself.
    """
    if tool_name not in EXTRACTORS:
        return {"persisted": False, "reason": f"{tool_name} has no findings extractor, so nothing was written"}
    normalised = normalise(tool_name, output, target)
    if not normalised:
        return {"persisted": True, "created": 0, "duplicates": 0,
                "note": "the scan returned no findings to record"}

    from gds_api.db import async_session_factory
    from gds_api.scanner_engines import store_findings
    from gds_api.tenant_binding import bind_tenant

    try:
        async with async_session_factory() as session:
            await bind_tenant(session, str(tenant_id))
            stored = await store_findings(session, str(tenant_id), tool_name.replace("_scan", "").replace("_probe", ""),
                                          target, normalised)
        return {"persisted": True, **(stored if isinstance(stored, dict) else {"stored": stored})}
    except Exception as exc:  # noqa: BLE001 - reported, never raised into the tool result
        return {"persisted": False, "reason": f"{type(exc).__name__}: {exc}"[:300]}
