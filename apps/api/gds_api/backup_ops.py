"""Backup operations that must be honest: prove a restore, and raise an alert that leaves the host.

Two gaps measured on 17 Nov 2026:
  * gds-backup-watch.sh wrote a notifications row and NOTHING dispatched it, so a backup fault
    reached an in-app list the owner had to go looking for. check_alerts.py never sees these rows.
  * no dump had ever been restored. "Verified" meant "pg_restore -l could list the objects".

Nothing here invents a destination or a result: if no off-host target is configured the caller says
so, and a restore is only called good when its row counts match the counts captured with the dump.
Comparing against live production would be wrong - findings legitimately grow between dumps - so the
manifest written at dump time is the reference.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any

# Tables that must come back with the same number of rows. Chosen because they cover the
# tenant anchor (users), the authoritative findings store, mission history, cloud assets,
# remediation work and the knowledge base.
MANIFEST_TABLES = (
    "security_findings",
    "missions",
    "users",
    "cloud_assets",
    "remediation_plans",
    "knowledge_documents",
)


def compare_counts(expected: dict[str, int], restored: dict[str, int]) -> tuple[bool, list[str]]:
    """A restore is proven only when every manifest table comes back with the same row count.

    A missing table is a failure in both directions: it means either the dump did not contain it
    or the restore did not create it, and either way the backup cannot be trusted for that table.
    """
    problems: list[str] = []
    for table in sorted(set(expected) | set(restored)):
        want = expected.get(table)
        got = restored.get(table)
        if want is None:
            problems.append(f"{table}: absent from the dump manifest")
        elif got is None:
            problems.append(f"{table}: absent after restore")
        elif want < 0 or got < 0:
            # A negative count means the query failed - usually a table that does not exist. Two
            # unreadable counts must never compare equal and be called a verified restore.
            side = "manifest" if want < 0 else "restored database"
            problems.append(f"{table}: unreadable count ({want} manifest, {got} restored) - {side}")
        elif want != got:
            problems.append(f"{table}: manifest {want} vs restored {got}")
    return (not problems, problems)


async def send_backup_alert(reason: str, severity: str = "high") -> dict[str, Any]:
    """Record the alert and deliver it off-platform: in-app row, email, Slack.

    Each channel is reported separately so a silent delivery failure cannot be mistaken for a
    delivered alert. The email and Slack paths are the platform's own dispatchers, already proven
    against live findings alerts.
    """
    from sqlalchemy import create_engine, text

    result: dict[str, Any] = {"reason": reason, "notification": False, "email": None, "slack": None}

    tenant = os.environ.get("SECURITY_ALERT_TENANT_ID")
    recipient = os.environ.get("SECURITY_ALERT_RECIPIENT_USER_ID")
    if tenant and recipient:
        engine = create_engine(os.environ["DATABASE_URL"])
        with engine.connect() as conn:
            conn.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": tenant})
            conn.execute(
                text(
                    "INSERT INTO notifications (id, tenant_id, user_id, type, message, read_at, created_at) "
                    "VALUES (:i,:t,:u,'alert',:m,NULL,NOW())"
                ),
                {"i": str(uuid.uuid4()), "t": tenant, "u": recipient, "m": f"BACKUP ALERT: {reason}"},
            )
            conn.commit()
        result["notification"] = True

    stamp = datetime.now(timezone.utc).isoformat()
    body = (
        f"Backup subsystem alert from GDS OS.\n\n{reason}\n\n"
        f"Host: {os.uname().nodename}\nRaised: {stamp}\n\n"
        "Backups live in /var/backups/gds/daily on that host. Check /var/log/gds-backup.log, "
        "/var/log/gds-backup-watch.log and /var/log/gds-restore-drill.log."
    )

    to_email = os.environ.get("ALERT_EMAIL_TO")
    if to_email:
        from gds_api.alerts.dispatch import dispatch_email

        result["email"] = await dispatch_email(
            to_email, f"[GDS OS] Backup alert: {reason[:80]}", body
        )
    hook = os.environ.get("SLACK_WEBHOOK_URL")
    if hook:
        from gds_api.alerts.dispatch import dispatch_slack

        result["slack"] = await dispatch_slack(
            hook,
            {
                "severity": severity,
                "rule_name": "Backup subsystem",
                "title": reason,
                "message": body,
            },
        )
    return result


def _load_counts(path: str) -> dict[str, int]:
    with open(path) as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise SystemExit(f"{path} must hold a JSON object of table -> count")
    return {str(k): int(v) for k, v in payload.items()}


def _cli() -> int:
    parser = argparse.ArgumentParser(description="GDS OS backup operations")
    sub = parser.add_subparsers(dest="command", required=True)

    alert = sub.add_parser("alert", help="deliver a backup alert off-platform")
    alert.add_argument("--reason", required=True)
    alert.add_argument("--severity", default="high")

    verify = sub.add_parser("verify", help="compare a restore against its dump manifest")
    verify.add_argument("--manifest", required=True)
    verify.add_argument("--restored", required=True)

    args = parser.parse_args()

    if args.command == "alert":
        outcome = asyncio.run(send_backup_alert(args.reason, args.severity))
        print(json.dumps(outcome, default=str))
        delivered = bool(outcome["notification"]) or bool(
            isinstance(outcome["email"], dict) and outcome["email"].get("success")
        ) or bool(isinstance(outcome["slack"], dict) and outcome["slack"].get("success"))
        return 0 if delivered else 1

    ok, problems = compare_counts(_load_counts(args.manifest), _load_counts(args.restored))
    if ok:
        print(f"RESTORE VERIFIED: {len(_load_counts(args.manifest))} tables match the dump manifest")
        return 0
    print("RESTORE FAILED:")
    for problem in problems:
        print(f"  - {problem}")
    return 1


if __name__ == "__main__":
    sys.exit(_cli())
