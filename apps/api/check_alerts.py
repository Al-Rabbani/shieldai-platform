#!/usr/bin/env python3
"""Scheduled alert worker — Phase C scoped variant.

Provisioned, explicit job identity only (Phase C, plan path 4/7):
- NO first-tenant / first-user selection (no LIMIT 1 ambient picks).
- Finding counts come from the tenant-scoped runtime role connection
  (fail closed when the service scope is not configured).
- The notification recipient is provisioned for the SAME tenant and the
  provisioned tenant must equal the verified scope tenant; mismatch or
  missing configuration fails closed with no fallback.
"""
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

try:
    window = datetime.now(timezone.utc) - timedelta(hours=1)
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

# Notification dispatch: the notifications table is not RLS-managed, so the
# recipient and tenant are the provisioned, verified values — never selected
# by LIMIT 1. Scoped reads and the recipient share the same tenant.
if window_alerts:
    from sqlalchemy import create_engine, text
    DB_URL = os.getenv("DATABASE_URL", "")
    if DB_URL:
        engine = create_engine(DB_URL)
        with engine.connect() as conn:
            for severity, count in sorted(window_alerts.items()):
                conn.execute(text(
                    "INSERT INTO notifications (id, tenant_id, user_id, type, message, read_at, created_at) "
                    "VALUES (:id, :tid, :uid, 'alert', :msg, NULL, NOW()) ON CONFLICT DO NOTHING"),
                    {"id": str(uuid.uuid4()), "tid": alert_tenant, "uid": recipient,
                     "msg": f"{count} {severity} findings in last hour"})
                print(f"[{datetime.now(timezone.utc).isoformat()}] Alert: {count} {severity}")
            conn.commit()

print(f"[{datetime.now(timezone.utc).isoformat()}] Open findings (tenant-scoped): {totals['total']}")
