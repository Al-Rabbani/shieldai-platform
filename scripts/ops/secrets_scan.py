"""Nightly hardcoded-secret scan of the platform's own source tree and git history.

The platform had no secrets scanner until 26 Nov 2026. Both real exposures in this estate - a live GitHub token in
.git/config and a stale apps/api/.env carrying the production JWT signing key - were found by hand, and the second was
found today only because this scan was being built.

Runs the governed handler itself rather than shelling out to gitleaks directly, so the nightly run and an agent's
request execute the same code with the same allowlist.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, "/opt/gds-os/apps/api")

from sqlalchemy import text  # noqa: E402

from gds_api.db import async_session_factory  # noqa: E402
from gds_api.scan_schedules import stamp_schedule  # noqa: E402
from gds_api.scanner_persistence import persist_scan_output  # noqa: E402
from gds_api.tenant_binding import bind_tenant  # noqa: E402
from gds_api.tool_gateway import _gitleaks_scan  # noqa: E402

TARGET = os.environ.get("GDS_SECRETS_SCAN_PATH", "/opt/gds-os")
SCANNER_LABEL = "Hardcoded secret scan (gitleaks, tree + history)"


async def main() -> int:
    tenant = os.environ.get("GDS_TENANT_ID", "")
    if not tenant:
        print("GDS_TENANT_ID is not set")
        return 2
    started = datetime.now(timezone.utc)
    began = time.time()

    result = await _gitleaks_scan({"target": TARGET, "scope": "both"})
    if not result.get("success"):
        print(f"FAILED: {result.get('error')}")
        return 1

    before = await _register_count(tenant)
    stored = await persist_scan_output(tenant, "gitleaks_scan", TARGET, result)
    after = await _register_count(tenant)
    duration_ms = int((time.time() - began) * 1000)

    created = stored.get("findings_created", 0) if isinstance(stored, dict) else 0
    dupes = stored.get("duplicates_skipped", 0) if isinstance(stored, dict) else 0
    failed = len(stored.get("failures", [])) if isinstance(stored, dict) else 0
    print(f"found {result.get('findings_count', 0)}, new {created}, duplicate {dupes}, "
          f"placeholders suppressed {result.get('fixtures_suppressed', 0)}, {duration_ms}ms")
    if stored.get("suppressed_note"):
        print(f"  {stored['suppressed_note']}")
    for f in result.get("findings", []):
        print(f"  {f['scope']:<8} {f['rule']:<20} {f['file'].replace(TARGET + '/', '')}:{f['line']}  {f['masked']}")

    await _record_run(tenant, started, duration_ms, result, created, dupes, failed, before, after)
    # A nightly scan whose silence nobody can see is not coverage. This row is what scan_health and the "scanner
    # silent" alert read, so a night that does not run is reported as overdue instead of assumed clean.
    async with async_session_factory() as session:
        await bind_tenant(session, tenant)
        await stamp_schedule(session, tenant, SCANNER_LABEL, "secrets_scan", 1440,
                             findings=created, error=None if not failed else f"{failed} finding(s) failed to persist")
        await session.commit()
    return 0


async def _register_count(tenant: str) -> int:
    async with async_session_factory() as session:
        await bind_tenant(session, tenant)
        rows = await session.execute(text("SELECT count(*) FROM security_findings WHERE tenant_id = :t"),
                                     {"t": tenant})
        return int(rows.scalar() or 0)


async def _record_run(tenant, started, duration_ms, result, created, dupes, failed, before, after) -> None:
    outcome = "clean" if not result.get("findings_count") else "findings"
    detail = {
        "scopes": result.get("scopes_scanned"),
        "placeholders_suppressed": result.get("fixtures_suppressed"),
        "errors": result.get("errors", []),
    }
    try:
        async with async_session_factory() as session:
            await bind_tenant(session, tenant)
            await session.execute(
                text(
                    "INSERT INTO scan_runs (tenant_id, scanner, started_at, duration_ms, targets, new_findings, "
                    "duplicates, failed, register_before, register_after, outcome, detail) VALUES "
                    "(:tid, :scanner, :started, :dur, :targets, :new, :dupe, :failed, :before, :after, :outcome, "
                    "CAST(:detail AS jsonb))"
                ),
                {"tid": tenant, "scanner": SCANNER_LABEL, "started": started, "dur": duration_ms,
                 "targets": 1, "new": created, "dupe": dupes, "failed": failed,
                 "before": before, "after": after, "outcome": outcome, "detail": json.dumps(detail)},
            )
            await session.commit()
    except Exception as exc:  # noqa: BLE001 - the run itself succeeded; say so rather than pretending it failed
        print(f"  (run recorded nothing: {type(exc).__name__}: {exc})")


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
