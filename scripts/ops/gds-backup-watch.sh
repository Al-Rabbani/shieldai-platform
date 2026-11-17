#!/usr/bin/env bash
# Backup freshness, integrity, manifest and off-host watcher.
#
# Gaps this closes, measured 17 Nov 2026:
#   * the notification row this script wrote was never dispatched - check_alerts.py does not look at
#     it - so a backup fault sat in an in-app list the owner had to go looking for. Alerts now go
#     out through gds_api.backup_ops (in-app row + email + Slack).
#   * nothing checked whether a copy existed anywhere other than this host.
#   * one state file served every condition, so a second condition could mask or replay the first.
set -uo pipefail

BACKUP_DIR=${BACKUP_DIR:-/var/backups/gds/daily}
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"
MIN_BYTES="${MIN_BYTES:-100000}"
STATEDIR=/var/lib/gds-backup-watch.state
mkdir -p "$STATEDIR"

# alert <slug> <reason>: one notification per distinct condition, cleared when it recovers.
alert() {
    local slug="$1" reason="$2"
    echo "[$(date -Is)] ALERT[$slug]: $reason"
    if [ -f "$STATEDIR/$slug" ] && [ "$(cat "$STATEDIR/$slug")" = "$reason" ]; then
        echo "[$(date -Is)] (already reported: $reason)"
        return 0
    fi
    echo "$reason" > "$STATEDIR/$slug"
    ( cd /opt/gds-os/apps/api && set -a && . /opt/.env && set +a && PYTHONPATH=. \
        venv/bin/python -m gds_api.backup_ops alert --reason "$reason" ) >> /var/log/gds-backup-watch.log 2>&1
}

rc=0

if [ ! -d "$BACKUP_DIR" ]; then
    alert dir "backup directory $BACKUP_DIR is missing"
    exit 1
fi

NEWEST=$(ls -t "$BACKUP_DIR"/*.dump 2>/dev/null | head -1)
if [ -z "$NEWEST" ]; then
    alert nodump "no dump files in $BACKUP_DIR"
    exit 1
fi

SIZE=$(stat -c%s "$NEWEST" 2>/dev/null || echo 0)
AGE_H=$(( ( $(date +%s) - $(stat -c %Y "$NEWEST" 2>/dev/null || echo 0) ) / 3600 ))

if [ "$SIZE" -lt "$MIN_BYTES" ]; then
    alert trunc "newest dump $(basename "$NEWEST") is only ${SIZE}B (min ${MIN_BYTES}B)"
    rc=1
else
    rm -f "$STATEDIR/trunc"
fi

if [ "$AGE_H" -ge "$MAX_AGE_HOURS" ]; then
    alert stale "newest dump $(basename "$NEWEST") is ${AGE_H}h old (max ${MAX_AGE_HOURS}h)"
    rc=1
else
    rm -f "$STATEDIR/stale"
fi

if [ ! -f "$NEWEST.counts.json" ]; then
    alert manifest "no count manifest beside $(basename "$NEWEST"): the restore drill cannot verify it"
    rc=1
else
    rm -f "$STATEDIR/manifest"
fi

set -a; . /opt/.env 2>/dev/null || true; set +a
if [ -z "${OFFHOST_TARGET:-}" ]; then
    alert offhost "no off-host backup target configured (OFFHOST_TARGET unset): every dump exists only on this host"
    rc=1
else
    if [ -f /var/lib/gds-offhost.last ]; then
        OH_AGE=$(( ( $(date +%s) - $(stat -c %Y /var/lib/gds-offhost.last) ) / 3600 ))
        if [ "$OH_AGE" -ge "$MAX_AGE_HOURS" ]; then
            alert offhost "off-host copy is ${OH_AGE}h old (max ${MAX_AGE_HOURS}h)"
            rc=1
        else
            rm -f "$STATEDIR/offhost"
        fi
    else
        alert offhost "OFFHOST_TARGET is configured but no successful copy has ever been recorded"
        rc=1
    fi
fi

echo "[$(date -Is)] done rc=$rc newest=$(basename "$NEWEST") ${SIZE}B ${AGE_H}h old"
exit $rc
