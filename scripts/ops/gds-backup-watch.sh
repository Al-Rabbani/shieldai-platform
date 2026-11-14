#!/usr/bin/env bash
# Backup freshness + integrity watcher (R2).
#
# Gap this closes: gds-backup.sh verifies its own dump with pg_restore -l, but nothing
# reported the outcome. A nightly job that silently stops producing dumps - or produces a
# zero-byte one - leaves the platform believing it is backed up when it is not.
#
# Checks the newest dump's age and size, then raises ONE notification per condition. The
# notifications table is tenant-isolated by FORCE RLS, so the tenant is bound before the
# write, the same way check_alerts.py does.
set -uo pipefail

BACKUP_DIR=/var/backups/gds/daily
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"
MIN_BYTES="${MIN_BYTES:-100000}"
STATE=/var/lib/gds-backup-watch.last

fail() {
    local reason="$1"
    echo "[$(date -Is)] ALERT: $reason"
    # Only notify once per distinct reason, so a persistent fault does not flood the owner.
    if [ -f "$STATE" ] && [ "$(cat "$STATE")" = "$reason" ]; then
        echo "[$(date -Is)] (already reported: $reason)"
        return 0
    fi
    echo "$reason" > "$STATE"
    cd /opt/gds-os/apps/api || return 1
    set -a; . /opt/.env; set +a
    TENANT="${SECURITY_ALERT_TENANT_ID:-}"; RECIP="${SECURITY_ALERT_RECIPIENT_USER_ID:-}"
    if [ -z "$TENANT" ] || [ -z "$RECIP" ]; then
        echo "[$(date -Is)] cannot notify: SECURITY_ALERT_TENANT_ID / RECIPIENT not configured"
        return 0
    fi
    PYTHONPATH=/opt/gds-os/apps/api venv/bin/python - "$TENANT" "$RECIP" "$reason" <<'PY'
import os, sys, uuid
from sqlalchemy import create_engine, text
tenant, recip, reason = sys.argv[1], sys.argv[2], sys.argv[3]
eng = create_engine(os.environ["DATABASE_URL"])
with eng.connect() as c:
    c.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": tenant})
    c.execute(text("INSERT INTO notifications (id,tenant_id,user_id,type,message,read_at,created_at) "
                   "VALUES (:i,:t,:u,'alert',:m,NULL,NOW())"),
              {"i": str(uuid.uuid4()), "t": tenant, "u": recip,
               "m": f"BACKUP ALERT: {reason}"})
    c.commit()
print("[backup-watch] notification written")
PY
}

[ -d "$BACKUP_DIR" ] || { fail "backup directory $BACKUP_DIR is missing"; exit 1; }

NEWEST=$(ls -t "$BACKUP_DIR"/*.dump 2>/dev/null | head -1)
[ -n "$NEWEST" ] || { fail "no dump files in $BACKUP_DIR"; exit 1; }

SIZE=$(stat -c%s "$NEWEST" 2>/dev/null || echo 0)
AGE_H=$(( ( $(date +%s) - $(stat -c%Y "$NEWEST" 2>/dev/null || echo 0) ) / 3600 ))

if [ "$SIZE" -lt "$MIN_BYTES" ]; then
    fail "newest dump $(basename "$NEWEST") is only ${SIZE}B (min ${MIN_BYTES}B)"
    exit 1
fi
if [ "$AGE_H" -ge "$MAX_AGE_HOURS" ]; then
    fail "newest dump $(basename "$NEWEST") is ${AGE_H}h old (max ${MAX_AGE_HOURS}h)"
    exit 1
fi

# Healthy: clear the de-duplication marker so a future failure notifies again.
rm -f "$STATE"
echo "[$(date -Is)] ok: $(basename "$NEWEST") ${SIZE}B ${AGE_H}h old"
