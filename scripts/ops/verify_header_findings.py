#!/usr/bin/env python3
"""Close header findings on proof, with a re-scan reference (P3 / B15).

Two kinds of open finding in the register are not what they claim:

  * "Missing HSTS header ..." on a host that now sends HSTS.
  * nikto's "Uncommon header '<name>' found" - an INFORMATIONAL observation that the
    header is present, recorded as if it were a defect.

Both are re-checked here against the live host. A finding closes only when the live
response proves it: for a "missing" claim the header must now be present, and for an
"uncommon header" observation the header must be present as observed. Anything that
cannot be proven stays open - this script never closes a finding on age.

Every closure records raw_data.rescan = {at, verifier, observed, verdict} so the
finding carries its own evidence rather than a bare timestamp.

  python3 verify_header_findings.py            # dry run
  python3 verify_header_findings.py --apply    # writes
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import UTC, datetime

import asyncpg

HEADERS = (
    "strict-transport-security",
    "x-frame-options",
    "x-content-type-options",
    "content-security-policy",
    "referrer-policy",
)
# A finding may name the header the way people say it rather than the way it travels on the wire.
ALIASES = {
    "hsts": "strict-transport-security",
    "xfo": "x-frame-options",
    "xcto": "x-content-type-options",
    "csp": "content-security-policy",
    "referrer": "referrer-policy",
}
MISSING_RE = re.compile(r"missing\s+(?P<h>[a-z0-9-]+)\s+header", re.I)
UNCOMMON_RE = re.compile(r"uncommon header\s+'(?P<h>[a-z0-9-]+)'", re.I)


def fetch_headers(url: str) -> dict[str, str] | None:
    """Headers from a live response. A 4xx still carries them: api.<domain>/ answers 404
    at the root and that response is exactly what a browser sees, so it must count."""
    req = urllib.request.Request(url, method="GET", headers={"User-Agent": "gds-verify/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return {k.lower(): v for k, v in resp.headers.items()}
    except urllib.error.HTTPError as exc:
        if exc.headers is not None:
            return {k.lower(): v for k, v in exc.headers.items()}
        print(f"  ! {url} returned {exc.code} with no headers")
        return None
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"  ! could not reach {url}: {exc}")
        return None


def url_for(target: str) -> str:
    t = (target or "").strip()
    if t.startswith("http"):
        return t
    return f"https://{t}/" if t else ""


async def main_async(a) -> int:
    dsn = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    cache: dict[str, dict[str, str] | None] = {}
    try:
        await conn.execute("SELECT set_config('gds.tenant_id', $1::text, false)", a.tenant)
        rows = await conn.fetch(
            "SELECT id, title, target, status FROM security_findings "
            "WHERE tenant_id = $1 AND status = 'open' AND (title ILIKE '%header%')",
            a.tenant,
        )
        plan = []
        for r in rows:
            title = r["title"] or ""
            m_missing = MISSING_RE.search(title)
            m_uncommon = UNCOMMON_RE.search(title)
            if not (m_missing or m_uncommon):
                continue
            header = (m_missing or m_uncommon).group("h").lower()
            header = ALIASES.get(header, header)
            if header not in HEADERS:
                continue
            url = url_for(r["target"])
            if not url:
                print(f"  skip (no target): {title[:60]}")
                continue
            if url not in cache:
                cache[url] = fetch_headers(url)
            live = cache[url]
            if live is None:
                print(f"  keep open (host unreachable): {title[:60]}")
                continue
            observed = live.get(header)
            if m_missing and observed:
                plan.append((r["id"], title, "resolved",
                             f"{header} is present: {observed}"))
            elif m_uncommon and observed:
                plan.append((r["id"], title, "resolved",
                             f"informational observation, header present: {observed}"))
            else:
                print(f"  keep open (not proven): {title[:60]}")
        for _, title, _, why in plan:
            print(f"  close: {title[:66]}\n         {why}")
        print(f"{len(plan)} findings to close")
        if not a.apply:
            print("dry run - pass --apply to write")
            return 0
        now = datetime.now(UTC)
        async with conn.transaction():
            for fid, _title, _status, why in plan:
                await conn.execute(
                    "UPDATE security_findings SET status = 'resolved', resolved_at = $1::timestamptz, "
                    "raw_data = coalesce(raw_data, '{}'::jsonb) || jsonb_build_object("
                    "'rescan', jsonb_build_object('at', $2::text, "
                    "'verifier', 'verify_header_findings.py', 'observed', $3::text, "
                    "'verdict', 'header present on live host')) "
                    "WHERE id = $4 AND tenant_id = $5 AND status = 'open'",
                    now, now.isoformat(), why, fid, a.tenant,
                )
        print(f"closed {len(plan)} findings with a re-scan reference")
        return 0
    finally:
        await conn.close()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--tenant", default=os.environ.get("GDS_TENANT_ID"))
    a = ap.parse_args()
    if not a.tenant:
        print("GDS_TENANT_ID not set", file=sys.stderr)
        return 2
    return asyncio.run(main_async(a))


if __name__ == "__main__":
    raise SystemExit(main())
