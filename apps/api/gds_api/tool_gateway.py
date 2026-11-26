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
        # MEASURED 26 Nov 2026: the child inherited an open stdin, and the projectdiscovery tools (httpx, nuclei,
        # subfinder) read targets from stdin when it is not a terminal - so a run that takes 25ms from a shell hung
        # until the tool's own timeout when launched from here, and every probe came back empty. DEVNULL makes stdin
        # closed and unambiguous for every tool this gateway runs.
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.DEVNULL,
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
    # The persistence contract is a `findings` list (scanner_persistence.normalise reads only that). Measured 26 Nov
    # 2026: nmap_scan returned open_ports alone, so every nmap result was unpersistable and the sweep reported
    # "nmap_scan has no findings extractor" while nmap had in fact found things.
    result["findings"] = open_ports
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


# ----------------------------------------------------------------------------------------------------------------
# Secrets in the source tree (gitleaks). Added 26 Nov 2026, after measuring that the platform had NO secrets scanner
# at all while its own repository once carried a live GitHub token in .git/config and a stale apps/api/.env holding the
# production JWT signing key. Both were found by hand; nothing here would have found them.
#
# TWO RULES THAT MAKE THIS SCANNER USABLE RATHER THAN NOISY:
#   1. THE SECRET IS NEVER RETURNED OR STORED. A finding carries the rule, the file, the line, the entropy and a
#      masked prefix - enough to act on, nothing that re-leaks the credential into a register, a report or a log.
#   2. KNOWN FIXTURES ARE SUPPRESSED WITH A REASON, NOT DROPPED. The repo's own tests contain strings like
#      "sk-abc123def" and the docs contain "YOUR_API_KEY"; reporting those as findings is how a scanner teaches its
#      readers to ignore it. They are counted and named in the result instead.
#: NOTE "REDACTED" IS DELIBERATELY ABSENT. The scan runs with --redact, so gitleaks writes the literal string
#: "REDACTED" as the value of EVERY finding; an allowlist containing it suppressed 100% of real findings and reported a
#: clean estate - the silent-zero failure this platform has been bitten by repeatedly, this time inside my own patch.
GITLEAKS_FIXTURE_MARKERS = (
    "YOUR_API_KEY", "abc123", "example", "placeholder", "xxxx", "changeme",
    "gds_live_ab1", "lin_api_key", "ABCDEF234567", "compliance_i", "p95_duration", "dummy",
)


def _gitleaks_config_args(path: str) -> list[str]:
    """Use the scanned tree's own allowlist when it has one, so suppressions are reviewable in the repo."""
    import os as _os

    for candidate in (_os.path.join(path, ".gitleaks.toml"), _os.path.join(path, ".gitleaksignore")):
        if _os.path.isfile(candidate):
            return ["--config", candidate]
    return []


def _gitleaks_allowlisted(secret: str) -> bool:
    lowered = (secret or "").strip().lower()
    if not lowered or lowered == "redacted":
        return False            # withheld is not a placeholder: it is an unknown real value
    return any(marker.lower() in lowered for marker in GITLEAKS_FIXTURE_MARKERS)


def _mask_secret(secret: str) -> str:
    """Never return a usable credential. --redact already withholds it, so say so rather than masking the word."""
    s = secret or ""
    if s.strip().upper() in ("REDACTED", ""):
        return "<withheld: the scanner was told not to report the value>"
    if len(s) <= 8:
        return "*" * len(s)
    return f"{s[:4]}{'*' * (len(s) - 8)}{s[-4:]}"


async def _gitleaks_scan(params: dict) -> dict:
    """Scan a local path for hardcoded secrets, in the working tree and optionally the full git history."""
    import asyncio as _asyncio
    import json as _json
    import os as _os
    import shutil as _shutil
    import tempfile as _tempfile

    path = (params.get("target") or params.get("path") or "/opt/gds-os").strip()
    scope = (params.get("scope") or "tree").strip().lower()
    if scope not in ("tree", "history", "both"):
        return {"success": False, "error": "scope must be 'tree', 'history' or 'both'"}
    if not _os.path.isdir(path):
        return {"success": False, "error": f"target must be a directory that exists (got {path!r})"}
    binary = _shutil.which("gitleaks") or "/usr/local/bin/gitleaks"
    if not _os.path.exists(binary):
        return {"success": False, "error": "gitleaks is not installed on this host"}

    runs = ["dir", "git"] if scope == "both" else (["git"] if scope == "history" else ["dir"])
    findings: list[dict] = []
    suppressed = 0
    errors: list[str] = []
    for mode in runs:
        report = _tempfile.NamedTemporaryFile(prefix="gitleaks-", suffix=".json", delete=False)
        report.close()
        try:
            _os.chmod(report.name, 0o600)     # the report holds raw matches until it is unlinked
        except Exception:
            pass
        try:
            # NO --redact, DELIBERATELY. Redaction blanks every value to the literal "REDACTED", which makes it
            # impossible to tell the repo's own placeholders ("sk-abc123def", "YOUR_API_KEY") from a live credential -
            # so the scanner either reports 24 placeholders as findings or suppresses real ones. The report is written
            # to a 0600 tempfile owned by this process and unlinked in the finally block; the register only ever sees a
            # mask. Classifying the value is unavoidable if the answer is to mean anything.
            proc = await _asyncio.create_subprocess_exec(
                binary, mode, path,
                "--report-format", "json", "--report-path", report.name,
                "--no-banner", "--exit-code", "0",
                # the repo's own allowlist, so a true zero means zero rather than "we muted the noise"
                *_gitleaks_config_args(path),
                stdout=_asyncio.subprocess.PIPE, stderr=_asyncio.subprocess.PIPE,
            )
            _, err = await _asyncio.wait_for(proc.communicate(), timeout=600)
            raw = ""
            try:
                with open(report.name, "r", encoding="utf-8", errors="replace") as fh:
                    raw = fh.read()
            except Exception:
                raw = ""
            rows = _json.loads(raw) if raw.strip() else []
            if not isinstance(rows, list):
                errors.append(f"{mode}: report was not a list")
                rows = []
            for r in rows:
                secret = str(r.get("Secret") or r.get("Match") or "")
                if _gitleaks_allowlisted(secret):
                    suppressed += 1
                    continue
                findings.append({
                    "rule": r.get("RuleID") or "unknown-rule",
                    "file": str(r.get("File") or ""),
                    "line": r.get("StartLine"),
                    "commit": r.get("Commit"),
                    "entropy": r.get("Entropy"),
                    "masked": _mask_secret(secret),
                    "description": (r.get("Description") or "")[:200],
                    "scope": "history" if mode == "git" else "tree",
                })
            if err:
                note = err.decode("utf-8", "replace").strip()
                if note and "leaks found" not in note.lower():
                    errors.append(f"{mode}: {note[:200]}")
        except Exception as exc:  # noqa: BLE001 - reported, not raised
            errors.append(f"{mode}: {type(exc).__name__}: {exc}"[:200])
        finally:
            # overwrite before unlinking: this file held raw credential values for the length of the scan
            try:
                size = _os.path.getsize(report.name)
                with open(report.name, "r+b") as fh:
                    fh.write(b"\0" * size)
                _os.unlink(report.name)
            except Exception:
                try:
                    _os.unlink(report.name)
                except Exception:
                    pass

    result = {
        "success": True,
        "target": path,
        "scope": scope,
        "findings": findings,
        "findings_count": len(findings),
        "fixtures_suppressed": suppressed,
        "scopes_scanned": runs,
    }
    if suppressed:
        result["suppressed_note"] = (
            f"{suppressed} match(es) were placeholder strings the repo's own tests and docs contain "
            f"({', '.join(GITLEAKS_FIXTURE_MARKERS[:4])}, ...); they are counted, not silently dropped"
        )
    if errors:
        result["errors"] = errors
    return result


async def _nuclei_scan(params: dict) -> dict:
    """Run nuclei. params: target, templates.

    nuclei v3.11 removed -json; the JSONL flag is -jsonl (alias -j). Measured 25 Nov 2026: the stale flag made
    every run exit 2 with "flag provided but not defined: -json" and return zero findings. Malformed JSONL lines
    are counted rather than swallowed, and a run that failed does not report an empty finding list as success.
    """
    target = params.get("target", "localhost")
    templates = params.get("templates", "")

    cmd = [_find_tool("nuclei"), "-u", target, "-jsonl"]
    if templates:
        cmd.extend(["-t", templates])

    result = await _run_tool(cmd, timeout=600)
    findings = []
    malformed = 0
    for line in (result.get("stdout") or "").split("\n"):
        if line.strip().startswith("{"):
            try:
                findings.append(json.loads(line))
            except Exception:
                malformed += 1
    result["findings"] = findings
    result["tool"] = "nuclei"
    result["target"] = target
    result["malformed_lines"] = malformed
    result["summary"] = {"findings": len(findings), "malformed_lines": malformed,
                         "exit_code": result.get("exit_code")}
    if result.get("exit_code") not in (0, None):
        result["success"] = False
        result["error"] = (f"nuclei exited {result.get('exit_code')}: "
                           f"{(result.get('stderr') or '')[-200:]}")
    elif not findings and malformed:
        result["success"] = False
        result["error"] = f"nuclei output could not be parsed ({malformed} malformed line(s))"
    else:
        result["success"] = True
    return result


async def _semgrep_scan(params: dict) -> dict:
    """Run semgrep. params: target (or path), rules.

    Findings and ERRORS are reported separately. An earlier version filed semgrep's errors under a key named
    "summary" and turned any parse failure into findings=[], so a semgrep that could not run looked exactly like
    a clean scan. Measured 25 Nov 2026.
    """
    path = params.get("target") or params.get("path") or "."
    rules = params.get("rules", "auto")

    cmd = [_find_tool("semgrep"), "--json", "--config", rules, path]
    result = await _run_tool(cmd, timeout=600)
    result["tool"] = "semgrep"
    result["target"] = path

    raw = result.get("stdout") or ""
    try:
        data = json.loads(raw)
    except Exception:
        result["success"] = False
        result["findings"] = []
        result["errors"] = []
        result["error"] = (f"semgrep produced no parseable JSON (exit {result.get('exit_code')}); "
                           f"stderr: {(result.get('stderr') or '')[-300:]}")
        return result

    findings = data.get("results") or []
    errors = data.get("errors") or []
    result["findings"] = findings
    result["errors"] = errors
    result["summary"] = {
        "findings": len(findings),
        "errors": len(errors),
        "rules_run": len(data.get("paths", {}).get("scanned") or []),
        "exit_code": result.get("exit_code"),
    }
    # a run that errored and produced nothing is a failure, not a clean bill of health
    if not findings and errors:
        result["success"] = False
        result["error"] = "semgrep errored and returned no findings: " + str(
            (errors[0] or {}).get("message", ""))[:200]
    elif result.get("exit_code") not in (0, None):
        result["success"] = False
        result["error"] = (f"semgrep exited {result.get('exit_code')}: "
                           f"{(result.get('stderr') or '')[-200:]}")
    else:
        result["success"] = True
    return result


async def _trivy_scan(params: dict) -> dict:
    """Run trivy. params: image or target, scan_type.

    An earlier version turned any parse failure into vulnerabilities=[], so a trivy that could not run read
    exactly like a clean image. Measured 25 Nov 2026.
    """
    scan_type = params.get("scan_type", "fs")
    target = params.get("target", params.get("image", "."))

    cmd = [_find_tool("trivy"), scan_type, "--format", "json", target]
    result = await _run_tool(cmd, timeout=600)
    result["tool"] = "trivy"
    result["target"] = target
    try:
        data = json.loads(result.get("stdout") or "")
    except Exception:
        result["success"] = False
        result["vulnerabilities"] = []
        result["error"] = (f"trivy produced no parseable JSON (exit {result.get('exit_code')}); "
                           f"stderr: {(result.get('stderr') or '')[-300:]}")
        return result
    results = data.get("Results") or []
    total = sum(len(r.get("Vulnerabilities") or []) for r in results)
    result["vulnerabilities"] = results
    result["summary"] = {"results": len(results), "vulnerabilities": total,
                         "exit_code": result.get("exit_code")}
    if result.get("exit_code") not in (0, None):
        result["success"] = False
        result["error"] = (f"trivy exited {result.get('exit_code')}: "
                           f"{(result.get('stderr') or '')[-200:]}")
    else:
        result["success"] = True
    return result


#: Descriptions nikto uses for its own report metadata rather than for a weakness. Measured from the live register
#: on 26 Nov 2026, where all fourteen nikto rows were one of these.
NIKTO_REPORT_METADATA = (
    "target ip:", "target hostname:", "target port:", "start time:", "end time:", "server:",
)


def _parse_nikto_xml(raw: str) -> list[dict]:
    """Parse a nikto XML report into findings, and record nothing that is not a weakness.

    MEASURED 26 Nov 2026, three defects in one report format:
      * nikto writes <description>, <uri> and <namelink> as CHILD ELEMENTS, not attributes, so reading attributes gave
        every item an empty description and all five findings per host collapsed into the single title "nikto 999100:".
      * nikto also emits <item> elements carrying report metadata - Target IP, Target Hostname, Target Port, Start
        Time, End Time - which are not findings at all. Fourteen such rows sat in the register as nikto findings.
      * it reports "Uncommon header 'strict-transport-security' found" for every security header that IS present, so a
        hardened host produced five info findings per host for having HSTS, CSP and XFO.
    A header that exists is not a weakness, and a report header is not a finding.
    """
    import xml.etree.ElementTree as ET

    start = raw.find("<")
    if start < 0:
        return []

    def field(item, name: str) -> str:
        node = item.find(name)
        if node is not None and (node.text or "").strip():
            return (node.text or "").strip()
        return (item.get(name) or "").strip()

    try:
        root = ET.fromstring(raw[start:])
    except Exception:  # noqa: BLE001 - an unparsed scan is not a clean scan; the caller records parse_error
        return []

    findings: list[dict] = []
    for item in root.iter("item"):
        description = field(item, "description")
        uri = field(item, "uri")
        if not description and not uri:
            continue
        if description.lower().startswith("uncommon header"):
            continue
        if description.lower().startswith(NIKTO_REPORT_METADATA):
            # These carry a <description> and no <uri>, so the empty check above does not catch them: they are nikto
            # describing its own run (Target IP, Target Hostname, Target Port, Start/End Time, Server banner). Fourteen
            # such rows sat in the register as nikto findings.
            continue
        findings.append(
            {
                "id": item.get("id"),
                "method": field(item, "method") or item.get("method"),
                "uri": uri,
                "description": description,
                "namelink": field(item, "namelink"),
            }
        )
    return findings


async def _nikto_scan(params: dict) -> dict:
    """Run nikto scan. params: target, port."""
    target = params.get("target", "localhost")
    port = params.get("port", "443")
    
    # nikto has no json format (csv/htm/msf+/nbe/txt/xml only). Measured 25 Nov 2026: "-Format json" made
    # every nikto run fail its format selection and return no findings, so a web server check looked clean
    # when nothing had been parsed. XML is a real nikto format and is parsed into findings below.
    # MEASURED 26 Nov 2026: "-Format xml" WITHOUT "-output" makes nikto's XML reporter die with
    #   ERROR: Unable to open '' for write  (nikto_report_xml.plugin line 60)
    # and it still EXITS 0, so _run_tool saw success, stdout held no <item>, findings came back empty and a nikto run
    # that had errored reported as a clean scan. That is why nikto's 21 register rows are all dated 1 August and none is
    # open: the check has not really run since. The report goes to a file we own, and a missing or unparsable report is
    # recorded as a parse error rather than as "no findings".
    import tempfile

    report = tempfile.NamedTemporaryFile(prefix="nikto-", suffix=".xml", delete=False)
    report_path = report.name
    report.close()
    cmd = [
        _find_tool("nikto"), "-h", target, "-p", str(port),
        "-Format", "xml", "-output", report_path, "-nointeractive",
    ]
    result = await _run_tool(cmd, timeout=600)
    result["tool"] = "nikto"
    result["report_path"] = report_path
    findings: list[dict] = []
    raw = ""
    try:
        with open(report_path, encoding="utf-8", errors="replace") as handle:
            raw = handle.read()
    except OSError as exc:
        result["parse_error"] = f"nikto wrote no readable report: {exc}"
    if not raw.strip():
        result.setdefault("parse_error", "nikto wrote an empty report - the scan did not complete")
    findings = _parse_nikto_xml(raw)
    if not findings and raw.strip():
        # A report that exists but yields nothing is a real zero; a report that cannot be parsed is not. The
        # distinction is kept by parse_error above, which the sweep reports instead of "no findings".
        result.setdefault("parse_error", "nikto report produced no parsable findings")
    result["findings"] = findings
    return result


async def _sqlmap_scan(params: dict) -> dict:
    """Run sqlmap scan. params: url, data."""
    url = params.get("target") or params.get("url") or ""
    if not url:
        return {"success": False, "error": "target required (a URL)"}
    
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


def _registrable_root(host: str) -> str:
    """The registrable root of a host, so enumeration runs at the right scope.

    Measured 25 Nov 2026: subfinder_scan("www.globaldigitalsecurity.io") returned an empty list while the
    root domain returned app/www/api. An empty list reads as "no subdomains exist", which is the silent-zero
    trap; the scope was simply too narrow.
    """
    h = host.strip().lower()
    for prefix in ("https://", "http://"):
        if h.startswith(prefix):
            h = h[len(prefix):]
    h = h.split("/")[0].split(":")[0]
    labels = [x for x in h.split(".") if x]
    two_part = {"co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "co.za", "com.br", "co.nz", "co.in"}
    if len(labels) >= 3 and ".".join(labels[-2:]) in two_part:
        return ".".join(labels[-3:])
    if len(labels) >= 2:
        return ".".join(labels[-2:])
    return h


async def _subfinder_scan(params: dict) -> dict:
    """Passive subdomain enumeration, run at the registrable root so the scope is never too narrow."""
    import asyncio as _asyncio
    import os as _os
    import shutil as _shutil

    domain = params.get("target") or params.get("domain") or ""
    if not domain:
        return {"success": False, "error": "target required (a domain)"}
    root = _registrable_root(domain)
    binary = _shutil.which("subfinder") or "/opt/tools/bin/subfinder"
    if not _os.path.exists(binary):
        return {"success": False, "error": "subfinder is not installed on this host"}
    try:
        proc = await _asyncio.create_subprocess_exec(
            binary, "-d", root, "-silent",
            stdout=_asyncio.subprocess.PIPE, stderr=_asyncio.subprocess.PIPE,
        )
        out, err = await _asyncio.wait_for(proc.communicate(), timeout=180)
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": f"subfinder could not run: {type(exc).__name__}"}
    text_out = out.decode("utf-8", "replace")
    subs = [ln.strip() for ln in text_out.splitlines() if ln.strip()]
    stderr_text = err.decode("utf-8", "replace")
    note = None
    if not subs:
        note = (f"passive sources returned no subdomains for {root}. An empty result means the sources had "
                f"nothing to report, not that none exist; a keyed provider or an active scan is needed for more")
    return {
        "success": True,
        "tool": "subfinder",
        "target": domain,
        "enumerated_scope": root,
        "scope_widened": root != domain.lower().strip(),
        "subdomains": subs,
        # The persistence contract: a discovered subdomain is an asset, so it is a finding at info. Without this list
        # the handler was unpersistable and enumeration never reached the register.
        "findings": [{"subdomain": name, "root_domain": root} for name in subs],
        "count": len(subs),
        "note": note,
        "exit_code": proc.returncode,
        "stderr_tail": stderr_text[-400:],
    }


async def _httpx_probe(params: dict) -> dict:
    """Run httpx. params: target, ports."""
    target = params.get("target", "localhost")
    
    # MEASURED 26 Nov 2026: this httpx build (v1.10.0) IGNORES -u. It printed its banner, probed nothing and exited 0,
    # so every probe returned zero findings - and "no live endpoint" is indistinguishable from "never looked". The same
    # target given on stdin produces a full JSON record. Targets go through -l, with -silent to keep the banner out of
    # the JSONL and an explicit timeout so a dead host cannot hold the tool for five minutes.
    import tempfile

    targets = tempfile.NamedTemporaryFile(prefix="httpx-", suffix=".txt", delete=False, mode="w")
    targets.write(target.rstrip("\n") + "\n")
    targets.close()
    cmd = [
        _find_tool("httpx"), "-l", targets.name, "-json", "-silent",
        "-timeout", "10", "-retries", "1",
    ]
    result = await _run_tool(cmd, timeout=180)
    result["tool"] = "httpx"
    result["targets_file"] = targets.name
    # MEASURED 26 Nov 2026: this handler returned raw stdout with no findings list, so every httpx result was
    # unpersistable by ANY caller and a live endpoint could never reach the register. httpx emits JSONL, one object per
    # probed host.
    import json

    findings: list[dict] = []
    for line in (result.get("stdout") or "").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            item = json.loads(line)
        except ValueError:
            continue
        findings.append(
            {
                "host": item.get("host") or item.get("input") or target,
                "url": item.get("url"),
                "status_code": item.get("status_code"),
                "title": item.get("title"),
                "webserver": item.get("webserver"),
                "tech": item.get("tech") or [],
            }
        )
    if not findings and (result.get("stdout") or "").strip():
        result["parse_error"] = "httpx returned output that was not JSONL"
    result["findings"] = findings
    return result


#: MEASURED 26 Nov 2026: both handlers defaulted to /opt/tools/wordlists/directory-list-2.3-medium.txt, a file that
#: did not exist because the directory did not exist - so ffuf and gobuster failed instantly and returned no findings,
#: which reads exactly like a web server with nothing on it. common.txt (4,751 entries) is installed and finishes well
#: inside the 600s tool budget; the 220k-entry medium list does not.
DEFAULT_WORDLIST = "/opt/tools/wordlists/common.txt"


def _require_wordlist(path: str) -> str | None:
    """Return an error string when the wordlist cannot be read, so an absent list is never reported as a clean target."""
    import os

    if not path:
        return "no wordlist given and no default installed"
    if not os.path.isfile(path):
        return f"wordlist not found: {path}"
    if os.path.getsize(path) == 0:
        return f"wordlist is empty: {path}"
    return None


async def _ffuf_scan(params: dict) -> dict:
    """Run ffuf. params: url, wordlist."""
    url = params.get("target") or params.get("url") or ""
    wordlist = params.get("wordlist", DEFAULT_WORDLIST)
    
    if not url:
        return {"success": False, "error": "target required (a URL)"}
    
    problem = _require_wordlist(wordlist)
    if problem:
        return {"success": False, "tool": "ffuf", "error": problem}

    # -ac auto-calibrates against the host's catch-all so a host that answers 200 to every path does not fill the
    # register with invented directories. -of json -o writes a parseable report; the handler previously returned raw
    # stdout with no findings list at all, so nothing ffuf found could be recorded by any caller.
    import json
    import tempfile

    report = tempfile.NamedTemporaryFile(prefix="ffuf-", suffix=".json", delete=False)
    report_path = report.name
    report.close()
    cmd = [
        _find_tool("ffuf"), "-u", url.rstrip("/") + "/FUZZ", "-w", wordlist,
        "-ac", "-of", "json", "-o", report_path, "-s",
    ]
    result = await _run_tool(cmd, timeout=600)
    result["tool"] = "ffuf"
    result["report_path"] = report_path
    findings: list[dict] = []
    try:
        with open(report_path, encoding="utf-8", errors="replace") as handle:
            payload = json.load(handle)
        for item in payload.get("results") or []:
            status = item.get("status")
            if status in (404, 400):
                continue
            findings.append(
                {
                    "url": item.get("url") or "",
                    "status": status,
                    "length": item.get("length"),
                    "words": item.get("words"),
                    "content_type": item.get("content-type"),
                }
            )
    except Exception as exc:  # noqa: BLE001 - an unparsed scan is not a clean scan
        result["parse_error"] = f"ffuf report unreadable: {exc}"
    result["findings"] = findings
    return result


async def _gobuster_scan(params: dict) -> dict:
    """Run gobuster. params: url, mode, wordlist."""
    url = params.get("target") or params.get("url") or ""
    mode = params.get("mode", "dir")
    wordlist = params.get("wordlist", DEFAULT_WORDLIST)
    
    if not url:
        return {"success": False, "error": "target required (a URL)"}
    
    problem = _require_wordlist(wordlist)
    if problem:
        return {"success": False, "tool": "gobuster", "error": problem}

    # MEASURED 26 Nov 2026: gobuster REFUSED to run against www.globaldigitalsecurity.io - "the server returns a status
    # code that matches the provided options for non existing urls ... (Length: 139)" - because that host answers every
    # unknown path with 200 and a placeholder. So the tool was not merely finding nothing, it was declining to look.
    # The placeholder length is measured and excluded, and the text output is parsed into findings (gobuster has no
    # JSON output at all).
    import re
    import secrets

    exclude_len = None
    try:
        import httpx

        probe = f"{url.rstrip('/')}/{secrets.token_hex(8)}"
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            resp = await client.get(probe)
        if resp.status_code < 400:
            exclude_len = len(resp.content)
    except Exception:  # noqa: BLE001 - if the baseline cannot be measured, scan without the exclusion
        exclude_len = None

    cmd = [_find_tool("gobuster"), mode, "-u", url, "-w", wordlist, "-q", "--no-error"]
    if exclude_len is not None:
        cmd.extend(["--exclude-length", str(exclude_len)])
    result = await _run_tool(cmd, timeout=600)
    result["tool"] = "gobuster"
    result["catch_all_length_excluded"] = exclude_len
    findings: list[dict] = []
    # gobuster's dir mode prints the path WITHOUT a leading slash ("health               (Status: 200) [Size: 700]"),
    # so a pattern anchored on "/" matched nothing and a successful run reported zero findings. Both forms are accepted
    # and the path is normalised.
    line_re = re.compile(
        r"^(?P<path>\S*)\s+\(Status:\s*(?P<status>\d+)\)(?:\s+\[Size:\s*(?P<size>\d+)\])?"
    )
    for line in (result.get("stdout") or "").splitlines():
        match = line_re.match(line.strip())
        if not match:
            continue
        findings.append(
            {
                "path": match.group("path") if match.group("path").startswith("/") else "/" + match.group("path"),
                "status": int(match.group("status")),
                "size": int(match.group("size")) if match.group("size") else None,
            }
        )
    if not findings and "wildcard" in (result.get("stdout") or "").lower():
        result["parse_error"] = "gobuster reported a wildcard response it could not exclude"
    result["findings"] = findings
    return result


async def _wpscan_scan(params: dict) -> dict:
    """Run wpscan. params: url."""
    url = params.get("target") or params.get("url") or ""
    if not url:
        return {"success": False, "error": "target required (a URL)"}
    
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
    url = params.get("target") or params.get("url") or ""
    if not url:
        return {"success": False, "error": "target required (a URL)"}
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
        missing = [name for name, value in security_headers.items() if value == "MISSING"]
        return {
            "success": True,
            "tool": "security_headers",
            "headers": security_headers,
            "score": f"{score}/5",
            "status_code": resp.status_code,
            # Same contract as every other scanner handler: a findings list, so the result can be persisted at all.
            "findings": [
                {
                    "header": name,
                    "description": f"The response does not set {name} (score {score}/5).",
                    "score": f"{score}/5",
                }
                for name in missing
            ],
        }
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

async def _get_findings(params: dict) -> dict:
    """Read findings from the live register.

    Advertised to the reasoning layer and named by fifteen bridge agents, but never registered, so every agent
    that tried to read its own findings was refused. Measured 25 Nov 2026.
    """
    return await _list_open_findings(params)


async def _store_finding(params: dict) -> dict:
    """Persist one finding into the live register.

    Advertised and named by fifteen bridge agents but never registered. Refuses rather than pretending when the
    tenant or the minimum fields are missing.
    """
    import json as _json

    from sqlalchemy import text as _text

    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    tenant = params.get("_tenant_id") or params.get("tenant_id")
    if not tenant:
        return {"success": False, "error": "tenant context is required", "code": "MISSING_TENANT"}
    title = str(params.get("title") or "").strip()
    severity = str(params.get("severity") or "").strip().lower()
    if not title:
        return {"success": False, "error": "title is required", "code": "MISSING_ARGUMENT"}
    if severity not in {"critical", "high", "medium", "low", "info"}:
        return {"success": False, "code": "INVALID_ARGUMENT",
                "error": "severity must be critical, high, medium, low or info"}
    scanner = str(params.get("scanner") or params.get("source") or "agent").strip()[:80]
    target = str(params.get("target") or "").strip() or None
    details = params.get("details")
    if details is not None and not isinstance(details, str):
        details = _json.dumps(details)

    async with async_session_factory() as session:
        await bind_tenant(session, str(tenant))
        row = (await session.execute(_text(
            "INSERT INTO security_findings (tenant_id, scanner, title, severity, status, cve, cvss, details) "
            "VALUES (:t, :s, :ti, :sev, 'open', :cve, :cvss, CAST(:d AS jsonb)) RETURNING id"),
            {"t": str(tenant), "s": scanner, "ti": title, "sev": severity,
             "cve": params.get("cve"), "cvss": params.get("cvss"),
             "d": details or (_json.dumps({"target": target}) if target else None)})).mappings().first()
        await session.commit()
    return {"success": True, "tool": "store_finding", "finding_id": row["id"] if row else None,
            "tenant_id": str(tenant), "title": title, "severity": severity, "scanner": scanner,
            "target": target, "status": "open"}


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
    """Check URL security headers (the name the reasoning schema advertises for check_url_headers)."""
    target = params.get("target") or params.get("url") or ""
    if not target:
        return {"success": False, "error": "target required (a URL)", "code": "MISSING_ARGUMENT"}
    return await _check_url_headers({**params, "target": target})

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
    "gitleaks_scan": _gitleaks_scan,
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
    "remediation_apply_config_fix": _ops_tools.remediation_apply_config_fix,
    "remediation_apply_host_hardening": _ops_tools.remediation_apply_host_hardening,
    "get_findings": _get_findings,
    "store_finding": _store_finding,
    "httpx_scan": _httpx_probe,
    "security_headers_check": _check_url_security_headers,
    "osv_check": _search_osv_vulnerabilities,
    "cisa_kev_check": _check_cisa_kev,
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
    "gitleaks_scan": ("medium", "Hardcoded-secret scan of a local source tree and its git history (gitleaks)."),
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
