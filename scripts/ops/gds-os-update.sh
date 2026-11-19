#!/usr/bin/env bash
# gds-os-update.sh — apply pending OS package updates inside a scheduled window.
#
# Why this is not plain unattended-upgrades: three things have to happen around the upgrade that a
# package manager does not do. A running process keeps the OLD shared libraries in memory, so the
# supervised services are restarted afterwards. A kernel upgrade only takes effect on reboot, so a
# reboot is a decision that gets recorded and verified rather than silently deferred. And the result
# is written as evidence, because the patch_currency compliance control reads the pending count.
#
# Scheduled as a ONE-SHOT cron entry which this script removes itself, so it cannot re-run later by
# accident and cannot fight a future window.
set -uo pipefail

LOG=/var/log/gds-os-update.log
STATE=/var/lib/gds-os-update.state
API=http://127.0.0.1:8000
TENANT=2ec10dd0-e48e-4043-8c88-5998ba5e23b0
OWNER=5c6498b4-c6a9-403d-bc3b-7011516eeab0
MODE="${1:-apply}"

log() { printf '%s %s\n' "$(date -Is)" "$*" >> "$LOG"; }
health() { curl -s -o /dev/null -m 25 -w '%{http_code}' "$API/health"; }

notify() { # title, message
    sudo -u postgres psql -d gds_os -q -v tid="$TENANT" -v uid="$OWNER" -v t="$1" -v m="$2" >/dev/null 2>&1 <<'SQL'
SELECT set_config('gds.tenant_id', :'tid', false);
INSERT INTO notifications (id, tenant_id, user_id, type, message, read_at, created_at)
VALUES (gen_random_uuid(), :'tid'::uuid, :'uid'::uuid, 'alert', :'t' || ' — ' || :'m', NULL, now());
SQL
}

if [ "$MODE" = "verify" ]; then
    # Runs once after a reboot triggered by this script. Boot to serving takes about 45s on this host,
    # so a health check immediately after boot legitimately fails; hence the delay.
    sleep 30
    code=$(health)
    ver=$(curl -s -m 20 "$API/health/version" 2>/dev/null | head -c 220)
    log "post-boot verify: health=$code version=$ver"
    if [ "$code" = "200" ]; then
        notify "Update window complete" "post-boot health 200. $ver"
    else
        notify "Update window FAILED" "post-boot health $code — platform is not serving after the update reboot"
    fi
    crontab -l 2>/dev/null | grep -v 'gds-os-update.sh verify' | crontab - 2>/dev/null
    exit 0
fi

log "=== update window starting ==="
before=$(apt-get -s upgrade 2>/dev/null | grep -c '^Inst')
log "pending packages: $before"
if [ "$before" -eq 0 ]; then
    log "nothing to do"
    crontab -l 2>/dev/null | grep -v 'gds-os-update.sh apply' | crontab - 2>/dev/null
    notify "Update window" "no pending packages, nothing changed"
    exit 0
fi

log "pre-update backup"
if /usr/local/bin/gds-backup.sh >>"$LOG" 2>&1; then log "backup ok"; else log "WARN pre-update backup failed"; fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq >>"$LOG" 2>&1
apt-get -y -o Dpkg::Options::=--force-confold -o Dpkg::Options::=--force-confdef upgrade >>"$LOG" 2>&1
rc=$?
after=$(apt-get -s upgrade 2>/dev/null | grep -c '^Inst')
log "upgrade rc=$rc pending_before=$before pending_after=$after"

# Restart so the services actually run the upgraded libraries rather than the ones already mapped.
supervisorctl restart gds-os gds-worker gds-kernel >>"$LOG" 2>&1
sleep 15
code=$(health)
log "post-update health=$code"

printf '{"finished_at":"%s","pending_before":%s,"pending_after":%s,"rc":%s,"health":"%s"}\n' \
    "$(date -Is)" "$before" "$after" "$rc" "$code" > "$STATE"

crontab -l 2>/dev/null | grep -v 'gds-os-update.sh apply' | crontab - 2>/dev/null

if [ "$code" = "200" ]; then
    notify "OS updates applied" "$before packages upgraded, $after remaining, API healthy"
else
    notify "OS updates: API unhealthy" "$before upgraded, health $code — the service watcher will retry"
fi

if [ -f /var/run/reboot-required ]; then
    pkgs=$(tr '\n' ' ' < /var/run/reboot-required.pkgs 2>/dev/null)
    log "reboot required for: $pkgs"
    notify "Rebooting to apply kernel update" "$pkgs"
    # Register the post-boot verification BEFORE rebooting, or nothing checks the result.
    ( crontab -l 2>/dev/null; echo "@reboot sleep 120 && /usr/local/bin/gds-os-update.sh verify" ) | crontab - 2>/dev/null
    sleep 5
    log "=== rebooting ==="
    systemctl reboot
fi

log "=== update window finished ==="
