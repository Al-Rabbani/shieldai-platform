#!/usr/bin/env python3
"""Scheduled alert worker — Phase C scoped variant.

Provisioned, explicit job identity only (Phase C, plan path 4/7):
- NO first-tenant / first-user selection (no LIMIT 1 ambient picks).
- Finding counts come from the tenant-scoped runtime role connection
  (fail closed when the service scope is not configured).
- The notification recipient is provisioned for the SAME tenant and the
  provisioned tenant must equal the verified scope tenant; mismatch or
  missing configuration fails closed with no fallback.

Two defects fixed here, both measured before the change:
1. DUPLICATE ALERTS. The notification id was uuid4(), so `ON CONFLICT DO NOTHING` could never
   conflict and every 5-minute run inserted a fresh row for the same condition: 14 alert rows in
   two hours carried only 2 distinct messages. The id is now a deterministic uuid5 of
   (tenant, severity, UTC hour), so one condition produces one notification per hour and later runs
   in that hour conflict on the primary key and are skipped.
2. ALERTS NEVER LEFT THE PLATFORM. This job only ever wrote a database row; the Slack, email,
   PagerDuty, Teams and webhook senders in gds_api/alerts/dispatch.py were reachable only from the
   alerts API route and the Temporal monitoring activity. Delivery is now attempted from this
   cron the first time a condition is recorded, through whichever channels the environment
   configures (Slack via SLACK_WEBHOOK_URL, email via RESEND_API_KEY + ALERT_EMAIL_TO), and the
   real per-channel result is printed. A channel that is not configured is reported as not
   configured rather than counted as delivered.
"""
import asyncio
import os, sys, uuid
sys.path.insert(0, '/opt/gds-os/apps/api')
for line in open('/opt/.env').read().split('\n'):
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        os.environ[k.strip()] = v.strip()

from datetime import datetime, timezone, timedelta

from gds_api.security_scope import (SecurityScopeError,
                                     resolve_service_scope,
                                     scoped_finding_counts,
                                     service_scope_configured)

alert_tenant = os.environ.get("SECURITY_ALERT_TENANT_ID", "").strip()
recipient = os.environ.get("SECURITY_ALERT_RECIPIENT_USER_ID", "").strip()

if not (service_scope_configured() and alert_tenant and recipient):
    # Fail closed: unprovisioned jobs never fall back to ambient identity.
    print(f"[{datetime.now(timezone.utc).isoformat()}] Alert job failed closed: "
          "provisioned job identity (scope, tenant, recipient) not fully configured")
    sys.exit(0)

scope = resolve_service_scope()
if str(scope.tenant_id) != alert_tenant:
    # Provisioned job and verified scope must agree.
    print(f"[{datetime.now(timezone.utc).isoformat()}] Alert job failed closed: "
          "provisioned tenant does not match verified service scope")
    sys.exit(0)

# Window is configurable so the alerting path can be exercised against real data without
# waiting for an incident to happen inside the default hour. Default stays 60 minutes.
try:
    window_minutes = int(os.environ.get("ALERT_WINDOW_MINUTES", "60"))
except ValueError:
    window_minutes = 60

try:
    window = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    windowed = scoped_finding_counts(scope, since=window,
                                     statuses=("open",),
                                     )
    totals = scoped_finding_counts(scope, statuses=("open",))
except SecurityScopeError as e:
    print(f"[{datetime.now(timezone.utc).isoformat()}] Alert job failed closed: {e}")
    sys.exit(0)

# Severity counts restricted to alert-worthy levels within the window.
alert_levels = {"critical", "high"}
window_alerts = {sev: n for sev, n in windowed["by_severity"].items() if sev in alert_levels}

_ALERT_NAMESPACE = uuid.UUID("6f1d4f2b-3c7a-5e21-9a54-0c9f2f4b8d11")


def _hour_bucket(now: datetime) -> str:
    return now.strftime("%Y-%m-%dT%H")


def _channels() -> list[dict]:
    """Only channels that are actually configured; never a channel that cannot work."""
    channels: list[dict] = []
    if os.environ.get("SLACK_WEBHOOK_URL", "").strip():
        channels.append({"type": "slack"})
    if os.environ.get("RESEND_API_KEY", "").strip() and os.environ.get("ALERT_EMAIL_TO", "").strip():
        channels.append({"type": "email"})
    if os.environ.get("PAGERDUTY_INTEGRATION_KEY", "").strip():
        channels.append({"type": "pagerduty"})
    return channels


def _deliver(alert_data: dict) -> None:
    channels = _channels()
    if not channels:
        print(f"[{datetime.now(timezone.utc).isoformat()}] Delivery skipped: no channel configured "
              "(SLACK_WEBHOOK_URL, or RESEND_API_KEY + ALERT_EMAIL_TO)")
        return
    from gds_api.alerts.dispatch import dispatch_all

    try:
        result = asyncio.run(dispatch_all([c["type"] for c in channels], alert_data))
    except Exception as exc:  # delivery must never break the counts job
        print(f"[{datetime.now(timezone.utc).isoformat()}] Delivery error: {type(exc).__name__}: {exc}")
        return
    for item in result.get("results", []):
        state = "delivered" if item.get("success") else f"FAILED ({item.get('error')})"
        print(f"[{datetime.now(timezone.utc).isoformat()}] Delivery {item.get('channel')}: {state}")


# Notification dispatch: notifications IS tenant-isolated (RLS policy from migration 006,
# enforced from 009). The recipient and tenant remain the provisioned, verified values -
# never selected by LIMIT 1 - and the tenant is bound on the connection below so the
# insert satisfies the policy.
if window_alerts:
    from sqlalchemy import create_engine, text
    DB_URL = os.getenv("DATABASE_URL", "")
    if DB_URL:
        now = datetime.now(timezone.utc)
        engine = create_engine(DB_URL)
        with engine.connect() as conn:
            # RLS: bind the provisioned tenant before the first write. Session-level
            # (is_local=false) so it survives the commit below; the connection is closed
            # when this block ends, so the context cannot outlive the job.
            conn.execute(text("SELECT set_config('gds.tenant_id', :tid, false)"),
                         {"tid": alert_tenant})
            for severity, count in sorted(window_alerts.items()):
                notification_id = str(uuid.uuid5(_ALERT_NAMESPACE, f"{alert_tenant}:{severity}:{_hour_bucket(now)}:{window_minutes}"))
                message = f"{count} {severity} findings in last {window_minutes} minutes"
                inserted = conn.execute(text(
                    "INSERT INTO notifications (id, tenant_id, user_id, type, message, read_at, created_at) "
                    "VALUES (:id, :tid, :uid, 'alert', :msg, NULL, NOW()) ON CONFLICT DO NOTHING"),
                    {"id": notification_id, "tid": alert_tenant, "uid": recipient, "msg": message}).rowcount
                if inserted:
                    print(f"[{datetime.now(timezone.utc).isoformat()}] Alert recorded: {message}")
                    _deliver({
                        "severity": severity,
                        "rule_name": f"{count} {severity} findings in the last {window_minutes} minutes",
                        "entity_type": "findings",
                        "entity_id": alert_tenant,
                        "entity_title": message,
                    })
                else:
                    print(f"[{datetime.now(timezone.utc).isoformat()}] Already alerted this hour: {message}")
            conn.commit()

print(f"[{datetime.now(timezone.utc).isoformat()}] Open findings (tenant-scoped): {totals['total']}")
