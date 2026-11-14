#!/usr/bin/env python3
"""Deterministic OSV advisory check over the installed environment.

Queries https://api.osv.dev/v1/querybatch with the exact installed versions, so the result
reflects what is actually running, not what a manifest claims. No sampling, no estimates.
"""
import json, subprocess, sys, urllib.request

VENV = "/opt/gds-os/apps/api/venv/bin/pip"

def installed() -> list[tuple[str, str]]:
    out = subprocess.run([VENV, "freeze"], capture_output=True, text=True).stdout
    pkgs = []
    for line in out.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "==" not in line:
            continue
        name, ver = line.split("==", 1)
        pkgs.append((name.strip(), ver.strip()))
    return pkgs

def query(pkgs, chunk=250):
    results = []
    for i in range(0, len(pkgs), chunk):
        part = pkgs[i:i + chunk]
        body = json.dumps({"queries": [
            {"package": {"name": n, "ecosystem": "PyPI"}, "version": v} for n, v in part
        ]}).encode()
        req = urllib.request.Request(
            "https://api.osv.dev/v1/querybatch", data=body,
            headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=90) as r:
            results.extend(json.load(r).get("results", []))
    return results

def main() -> int:
    pkgs = installed()
    res = query(pkgs)
    affected = []
    for (name, ver), r in zip(pkgs, res):
        vulns = r.get("vulns") or []
        if vulns:
            ids = [v.get("id") for v in vulns]
            sev = []
            for v in vulns:
                for s in v.get("severity", []) or []:
                    sev.append(s.get("score", ""))
            affected.append({"package": name, "version": ver,
                             "count": len(ids), "ids": ids})
    total = sum(a["count"] for a in affected)
    print(json.dumps({
        "packages_scanned": len(pkgs),
        "affected_packages": len(affected),
        "total_advisories": total,
        "detail": sorted(affected, key=lambda a: -a["count"]),
    }, indent=2))
    return 0

if __name__ == "__main__":
    sys.exit(main())
