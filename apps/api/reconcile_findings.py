"""Re-check open findings and retire the ones that a live test proves are gone.

The register only ever grows: 119 open findings on 17 Nov, oldest dated 2026-08-01, because
nothing ever re-tested a finding and nothing ever closed one. This job changes that without
inventing verdicts:

  * a dependency finding (the majority of the register: scanner "osv", target "pkg==version") is
    re-checked against OSV for the version actually installed right now. It is resolved only if
    OSV no longer reports that advisory for the installed version, which is exactly the test
    that created it;
  * a finding whose subject is an HTTP response header is re-fetched, and is resolved ONLY if
    the header the finding named is now actually present (the observation is recorded);
  * every other finding keeps its status and gains a verification record saying what was and
    was not checked, plus an age. Past --stale-days it is flagged stale_unverified in details,
    which is a statement about evidence, not a claim that the risk disappeared.

Run:  python reconcile_findings.py [--tenant-id UUID] [--stale-days 90] [--apply]
Cron: daily.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone

import httpx
from importlib import metadata
from sqlalchemy import text

OSV_QUERY = "https://api.osv.dev/v1/query"

HEADER_PATTERNS = {
    "strict-transport-security": "Strict-Transport-Security",
    "content-security-policy": "Content-Security-Policy",
    "x-frame-options": "X-Frame-Options",
    "x-content-type-options": "X-Content-Type-Options",
    "referrer-policy": "Referrer-Policy",
    "permissions-policy": "Permissions-Policy",
    "hsts": "Strict-Transport-Security",
    "csp": "Content-Security-Policy",
}


def header_target(title: str) -> str | None:
    """Pure helper, unit tested: which response header a finding title is about, if any."""
    if not title:
        return None
    low = title.lower()
    if not any(w in low for w in ("missing", "absent", "weak", "not set", "no ")):
        return None
    for key, header in HEADER_PATTERNS.items():
        if key in low:
            return header
    return None


def parse_requirement(target: str) -> tuple[str, str] | None:
    """Pure helper, unit tested: ("mcp","1.23.3") out of "mcp==1.23.3"."""
    if not target or "==" not in target:
        return None
    name, _, version = target.partition("==")
    name, version = name.strip(), version.strip()
    return (name, version) if name and version else None


_installed_cache: dict[str, str | None] = {}


def installed_version(package: str) -> str | None:
    if package not in _installed_cache:
        try:
            _installed_cache[package] = metadata.version(package)
        except Exception:
            _installed_cache[package] = None
    return _installed_cache[package]


_osv_cache: dict[tuple[str, str], set[str] | None] = {}


def osv_advisories(package: str, version: str) -> set[str] | None:
    """Advisory ids OSV still reports for this exact installed version; None if the query failed."""
    key = (package, version)
    if key in _osv_cache:
        return _osv_cache[key]
    try:
        with httpx.Client(timeout=30) as c:
            r = c.post(OSV_QUERY, json={"package": {"name": package, "ecosystem": "PyPI"},
                                        "version": version})
            r.raise_for_status()
        ids = {v.get("id", "").upper() for v in r.json().get("vulns", [])}
        _osv_cache[key] = ids
        return ids
    except Exception:
        _osv_cache[key] = None
        return None


def dependency_verdict(target: str, details: dict) -> tuple[str, str] | None:
    """Resolve/still-present verdict for a dependency finding, or None if not that kind of finding."""
    parsed = parse_requirement(target or "")
    advisory = str((details or {}).get("id") or "").upper()
    if not parsed or not advisory:
        return None
    package, recorded = parsed
    current = installed_version(package)
    if current is None:
        return None  # package not installed at all: not this job's call to make
    advisories = osv_advisories(package, current)
    if advisories is None:
        return ("unverifiable", f"OSV query failed for {package} {current}")
    if advisory in advisories:
        return ("still_present", f"OSV still reports {advisory} for {package} {current}")
    if current == recorded:
        return ("still_present", f"OSV no longer lists {advisory} for {package} {current}")
    return ("resolved", f"{package} {recorded} -> {current}; OSV does not list {advisory} for it")


def age_days(detected, now=None) -> int | None:
    if not detected:
        return None
    now = now or datetime.now(timezone.utc)
    if detected.tzinfo is None:
        detected = detected.replace(tzinfo=timezone.utc)
    return max(0, (now - detected).days)


async def check_header(url: str, header: str) -> tuple[bool, str]:
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
            r = await c.get(url)
        present = header.lower() in {k.lower() for k in r.headers}
        return present, f"HTTP {r.status_code}, header {'present' if present else 'absent'}"
    except Exception as exc:
        return False, f"unreachable ({type(exc).__name__})"


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tenant-id", default=os.environ.get("GDS_TENANT_ID"))
    ap.add_argument("--stale-days", type=int, default=90)
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    if not args.tenant_id:
        print("no tenant id (pass --tenant-id or set GDS_TENANT_ID)", file=sys.stderr)
        return 2

    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    tenant = args.tenant_id
    async with async_session_factory() as s:
        await bind_tenant(s, tenant)
        rows = (await s.execute(text(
            "SELECT id, title, target, details, detected_at FROM security_findings "
            "WHERE tenant_id = :t AND status = 'open' ORDER BY detected_at"), {"t": tenant})).mappings().all()

    resolved, still_present, unreachable, annotated = [], [], [], 0
    now = datetime.now(timezone.utc)
    for row in rows:
        details = dict(row["details"] or {})
        header = header_target(row["title"])
        record = {"checked_at": now.isoformat(), "age_days": age_days(row["detected_at"], now)}
        status = None
        dep = dependency_verdict(str(row["target"] or ""), details)
        if dep:
            verdict, note = dep
            record.update({"method": "osv_recheck", "observation": note})
            if verdict == "resolved":
                status = "resolved"
                resolved.append(row["id"])
            elif verdict == "unverifiable":
                unreachable.append(row["id"])
            else:
                still_present.append(row["id"])
        elif header and row["target"] and str(row["target"]).startswith(("http://", "https://")):
            present, note = await check_header(row["target"], header)
            record.update({"method": "http_header", "header": header, "observation": note})
            if present:
                status = "resolved"
                resolved.append(row["id"])
            elif "unreachable" in note:
                unreachable.append(row["id"])
            else:
                still_present.append(row["id"])
        else:
            record["method"] = "not_automatically_verifiable"
            annotated += 1
        details["verification"] = record
        details["stale_unverified"] = bool(
            record["age_days"] is not None and record["age_days"] > args.stale_days
        )

        if not args.apply:
            continue
        async with async_session_factory() as s:
            await bind_tenant(s, tenant)
            if status == "resolved":
                await s.execute(text(
                    "UPDATE security_findings SET status = :st, resolved_at = now(), details = CAST(:d AS jsonb) "
                    "WHERE id = :id AND tenant_id = :t"),
                    {"st": status, "d": json.dumps(details), "id": row["id"], "t": tenant})
            else:
                await s.execute(text(
                    "UPDATE security_findings SET details = CAST(:d AS jsonb) "
                    "WHERE id = :id AND tenant_id = :t"),
                    {"d": json.dumps(details), "id": row["id"], "t": tenant})
            await s.commit()

    print(f"open={len(rows)} proved_resolved={len(resolved)} still_present={len(still_present)} "
          f"unreachable={len(unreachable)} not_verifiable={annotated}")
    if resolved:
        print("resolved ids:", resolved[:10])
    if not args.apply:
        print("dry run: pass --apply to write")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
