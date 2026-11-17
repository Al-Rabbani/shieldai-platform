#!/usr/bin/env bash
# Restore drill: prove the newest dump restores, by actually restoring it into a scratch database.
#
# Why this exists: until now a backup was "verified" if pg_restore could LIST its objects. Nobody had
# ever restored one, so a dump that lists cleanly but fails to load - or loads without its data -
# would have been discovered during a real incident.
#
# The comparison is against the manifest written with the dump, not live production: findings grow
# between dumps, so a live comparison would report a false failure and hide a real one.
set -uo pipefail

DEST=/var/backups/gds/daily
LOG=/var/log/gds-restore-drill.log
SCRATCH=gds_restore_drill
APP=/opt/gds-os/apps/api

log() { echo "[$(date -u +%FT%TZ)] $*" >> "$LOG"; }

alert() {
    ( cd "$APP" && set -a && . /opt/.env && set +a && PYTHONPATH=. venv/bin/python -m gds_api.backup_ops alert --reason "$1" ) >>"$LOG" 2>&1
}

NEWEST=$(ls -t "$DEST"/*.dump 2>/dev/null | head -1)
if [ -z "$NEWEST" ]; then
    log "FAIL no dump file in $DEST"
    alert "restore drill: no dump file present in $DEST"
    exit 1
fi
MANIFEST="$NEWEST.counts.json"
if [ ! -f "$MANIFEST" ]; then
    log "FAIL manifest missing for $(basename "$NEWEST")"
    alert "restore drill: no count manifest beside $(basename "$NEWEST") - cannot prove the restore"
    exit 1
fi

log "drill start dump=$(basename "$NEWEST")"
sudo -u postgres dropdb --if-exists "$SCRATCH" >>"$LOG" 2>&1
if ! sudo -u postgres createdb -T template0 "$SCRATCH" >>"$LOG" 2>&1; then
    log "FAIL cannot create scratch database"
    alert "restore drill: cannot create scratch database $SCRATCH"
    exit 1
fi

# --no-owner: the dump belongs to the app role, but the drill runs as postgres in a throwaway DB.
sudo -u postgres pg_restore -d "$SCRATCH" --no-owner --no-privileges "$NEWEST" >>"$LOG" 2>&1
RESTORE_RC=$?
[ $RESTORE_RC -ne 0 ] && log "note pg_restore exit=$RESTORE_RC (verified by row counts below)"

python3 - "$MANIFEST" "$SCRATCH" > /tmp/gds_drill_restored.json <<'PY'
import json, subprocess, sys
manifest_path, scratch = sys.argv[1], sys.argv[2]
tables = list(json.load(open(manifest_path)).keys())
counts = {}
for table in tables:
    out = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", scratch, "-tAc",
                          f"select count(*) from {table}"], capture_output=True, text=True)
    counts[table] = int(out.stdout.strip()) if out.returncode == 0 and out.stdout.strip() else -1
print(json.dumps(counts))
PY

( cd "$APP" && set -a && . /opt/.env && set +a && PYTHONPATH=. venv/bin/python -m gds_api.backup_ops verify \
    --manifest "$MANIFEST" --restored /tmp/gds_drill_restored.json ) >>"$LOG" 2>&1
VERDICT=$?

sudo -u postgres dropdb --if-exists "$SCRATCH" >>"$LOG" 2>&1
if [ $VERDICT -eq 0 ]; then
    log "PASS $(basename "$NEWEST") restored with matching row counts"
else
    log "FAIL $(basename "$NEWEST") did not match its manifest"
    alert "restore drill FAILED for $(basename "$NEWEST"): restored row counts do not match the dump manifest. See /var/log/gds-restore-drill.log"
fi
rm -f /tmp/gds_drill_restored.json
exit $VERDICT
