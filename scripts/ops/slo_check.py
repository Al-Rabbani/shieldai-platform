#!/usr/bin/env python3
"""Alert when a service level objective is breached, so the number is not just a page nobody opens.

MEASURED BEFORE THIS (25 Nov 2026): GET /slo reported five objectives with two breached, and nothing in the platform
read it. A status page that only speaks when asked is a status page that speaks after the incident review. The
delivery ladder already existed (gds-raise-alert.py inserts an acknowledgeable notification with a 30 minute dedupe,
gds-page.py delivers and escalates it on a 5/15/60 minute ladder), so this script only decides WHAT to say and hands
it to that one path. It computes nothing itself: it calls slo_api.build_report, the same function the route serves, so
the alert and the page can never disagree.

Deliberately silent about `at_risk` and `unmeasured`. An alert that fires on a number still inside its target trains
people to ignore the channel, and an objective the platform could not measure already says so on the page; turning
"Prometheus was unreachable" into a page would mean a monitoring outage wakes somebody up as if a promise had been
broken.

Runs from cron as root and invokes the raiser as postgres, because notifications is a FORCE RLS table and the raiser
connects over peer auth as the database owner.
"""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys

sys.path.insert(0, os.environ.get("GDS_API_PATH", "/opt/gds-os/apps/api"))

RAISER = "/usr/local/bin/gds-raise-alert.py"
DEDUPE_MINUTES = "120"


def _load_env() -> None:
    for path in ("/opt/.env", "/opt/gds-pager.env"):
        try:
            with open(path, encoding="utf-8") as handle:
                lines = handle.readlines()
        except OSError:
            continue
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


async def measure(tenant_id: str) -> dict:
    from gds_api.db import async_session_factory
    from gds_api.slo_api import build_report

    async with async_session_factory() as db:
        return await build_report(db, tenant_id)


def main() -> int:
    _load_env()
    tenant_id = os.environ.get("GDS_TENANT_ID")
    if not tenant_id:
        print("slo_check: GDS_TENANT_ID is not set, so no tenant's objectives can be measured", file=sys.stderr)
        return 2

    from gds_api.slo_api import breach_alerts

    try:
        report = asyncio.run(measure(tenant_id))
    except Exception as exc:  # noqa: BLE001 - the cron log is the only observer
        print(f"slo_check: could not measure the objectives: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    objectives = report.get("objectives") or []
    summary = ", ".join(f"{o.get('id')}={o.get('status')}" for o in objectives)
    print(f"slo_check: {len(objectives)} objectives: {summary}")

    alerts = breach_alerts(report)
    if not alerts:
        print("slo_check: no objective is breached, so nothing was raised")
        return 0

    failures = 0
    for alert in alerts:
        result = subprocess.run(
            ["sudo", "-u", "postgres", "/opt/gds-os/apps/api/venv/bin/python", RAISER,
             "--type", alert["type"], "--severity", alert["severity"],
             "--message", alert["message"], "--dedupe-minutes", DEDUPE_MINUTES,
             # The page that shows the measurement, so the alert is one click from the evidence.
             "--action-url", "/operations/slo"],
            capture_output=True, text=True,
        )
        output = (result.stdout or "").strip()
        if result.returncode == 0 and "suppressed duplicate" in output:
            # The raiser returns 0 for a suppression, so reporting "raised" here would claim a page that did not
            # happen - measured 25 Nov 2026, two consecutive runs both printed "raised" while the second was deduped.
            print(f"slo_check: {alert['type']} already open, {output}")
        elif result.returncode == 0:
            print(f"slo_check: raised {alert['type']}: {alert['message']}")
        else:
            failures += 1
            print(f"slo_check: could not raise {alert['type']}: {(result.stderr or result.stdout).strip()[:300]}",
                  file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
