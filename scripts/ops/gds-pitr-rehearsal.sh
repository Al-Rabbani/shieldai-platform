#!/usr/bin/env bash
# Point-in-time recovery rehearsal. Proves the WAL archive can rebuild the database to a chosen
# point, and proves it by EXCLUDING a write made after that point - a cluster that merely comes up
# is not evidence that point-in-time semantics work.
#
# Why this is scheduled: scripts/ops/README.md states the PITR window is seven days because the WAL archive is
# pruned at seven. Until 20 Nov 2026 nothing had ever replayed a single segment, so that was a claim about a
# directory's contents, not about recoverability. A weekly rehearsal turns it into a measured property, and a
# failure now pages instead of waiting to be noticed during an incident.
#
# Three traps this script exists to avoid, each hit for real on 19 Nov 2026:
#  1. Ubuntu keeps postgresql.conf in /etc/postgresql, so a pg_basebackup contains NO config file.
#     The rehearsal cluster needs its own minimal postgresql.conf and pg_hba.conf.
#  2. A timestamp target must fall after the backup's consistent recovery point or postgres refuses
#     with "requested recovery stop point is before consistent recovery point". An LSN captured
#     immediately after the backup removes the guesswork.
#  3. The base backup carries the primary's postgresql.auto.conf INCLUDING archive_command. A
#     promoted rehearsal cluster then archives its own new timeline into the production WAL archive
#     and contaminates it. Always set archive_mode = off and strip archive_command.
#
# The rehearsal leaves nothing behind: the scratch cluster is stopped and both directories removed on every
# path, because a weekly job that keeps a full copy of the database grows without bound.
set -euo pipefail

# cron starts with cwd $HOME, which is /root, and `sudo -u postgres` then warns it cannot enter it. Start from a
# directory postgres can reach so the only thing in the log is the rehearsal.
cd /tmp

PORT=${PORT:-5436}
DEST=${DEST:-/var/lib/postgresql/15/pitr_rehearsal}
LOG=${LOG:-/var/log/gds-pitr.log}
APP=/opt/gds-os/apps/api
BASE=""

log() { echo "[$(date -u +%FT%TZ)] $*"; }

alert() {
    ( cd "$APP" && set -a && . /opt/.env && set +a && PYTHONPATH=. venv/bin/python -m gds_api.backup_ops alert --reason "$1" ) >>"$LOG" 2>&1 || true
}

cleanup() {
    sudo -u postgres psql -d gds_os -qc "DROP TABLE IF EXISTS pitr_probe" >/dev/null 2>&1 || true
    if [ -d "$DEST" ]; then
        sudo -u postgres /usr/lib/postgresql/15/bin/pg_ctl -D "$DEST" stop -m immediate >/dev/null 2>&1 || true
        rm -rf "$DEST"
    fi
    [ -n "$BASE" ] && rm -rf "$BASE"
    return 0
}

on_failure() {
    local code=$?
    log "FAIL rehearsal aborted (exit $code)"
    alert "point-in-time recovery rehearsal failed (exit $code) - the WAL archive could not be replayed"
    cleanup
    exit 1
}
trap on_failure ERR

log "rehearsal start"
BASE=$(mktemp -d /var/backups/pitr/rehearsal-XXXXXX)
chown postgres:postgres "$BASE"

# Start from an empty probe table. A row left behind by an earlier aborted run sits BEFORE this run's target LSN,
# so recovery would restore it and the check would report a post-target write that was never written. That false
# failure happened on the first scheduled attempt.
sudo -u postgres psql -d gds_os -qc "DROP TABLE IF EXISTS pitr_probe"
sudo -u postgres psql -d gds_os -qc "CREATE TABLE pitr_probe(id serial primary key, note text)"
sudo -u postgres pg_basebackup -D "$BASE" -Ft -z -X stream
LSN=$(sudo -u postgres psql -d gds_os -tAc "select pg_current_wal_lsn()" | tr -d ' ')
SEG=$(sudo -u postgres psql -d gds_os -tAc "select pg_walfile_name('$LSN')" | tr -d ' ')
sudo -u postgres psql -d gds_os -qc "INSERT INTO pitr_probe(note) VALUES ('after target lsn')"
sudo -u postgres psql -d gds_os -qc "select pg_switch_wal()" >/dev/null

# Wait for the segment that CONTAINS the target LSN to reach the archive. A fixed sleep is not enough: the
# switch closes the current segment, and the archiver copies it asynchronously, so recovery could start while the
# one file it needs was still in pg_wal. That is exactly how the first scheduled run failed - replay stopped with
# "cannot stat .../00000001000000000000005A", a harness timing bug that looks identical to an unrecoverable archive.
ARCHIVED=0
for _ in $(seq 1 30); do
  if [ -f "/var/lib/postgresql/wal_archive/$SEG" ]; then ARCHIVED=1; break; fi
  sleep 2
done
if [ "$ARCHIVED" != "1" ]; then
  log "FAIL segment $SEG holding LSN $LSN never reached the WAL archive within 60s"
  alert "point-in-time recovery rehearsal failed: WAL segment $SEG never reached the archive"
  cleanup
  exit 1
fi

install -d -o postgres -g postgres "$DEST"
tar -xzf "$BASE/base.tar.gz" -C "$DEST"
install -d -o postgres -g postgres "$DEST/pg_wal"
tar -xzf "$BASE/pg_wal.tar.gz" -C "$DEST/pg_wal"
cat > "$DEST/postgresql.conf" <<CONF
port = $PORT
unix_socket_directories = '/tmp'
listen_addresses = ''
archive_mode = off
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_lsn = '$LSN'
recovery_target_action = 'promote'
CONF
printf 'local all postgres trust\n' > "$DEST/pg_hba.conf"
touch "$DEST/pg_ident.conf" "$DEST/recovery.signal"
sed -i '/archive_command/d' "$DEST/postgresql.auto.conf"
chown -R postgres:postgres "$DEST"; chmod 700 "$DEST"

sudo -u postgres /usr/lib/postgresql/15/bin/pg_ctl -D "$DEST" -l /tmp/pitr_rehearsal.log start >/dev/null
for _ in $(seq 1 12); do
  sleep 5
  [ "$(sudo -u postgres psql -p "$PORT" -h /tmp -tAc 'select pg_is_in_recovery()' 2>/dev/null)" = "f" ] && break
done
PROBE=$(sudo -u postgres psql -p "$PORT" -h /tmp -d gds_os -tAc "select count(*) from pitr_probe")
FINDINGS=$(sudo -u postgres psql -p "$PORT" -h /tmp -d gds_os -tAc "select count(*) from security_findings")
sudo -u postgres /usr/lib/postgresql/15/bin/pg_ctl -D "$DEST" stop -m fast >/dev/null
trap - ERR

if [ "$PROBE" != "0" ]; then
  log "FAIL recovered cluster contains a write made after the target LSN"
  alert "point-in-time recovery rehearsal failed: the recovered cluster contained a write made after the target LSN"
  cleanup
  exit 1
fi
if [ "${FINDINGS:-0}" -lt 1 ]; then
  log "FAIL recovered cluster came up with no security_findings - it replayed WAL but holds no data"
  alert "point-in-time recovery rehearsal failed: recovered cluster contains no findings, so the replay restored nothing"
  cleanup
  exit 1
fi

cleanup
log "PASS recovered to LSN $LSN, excluded the later write, $FINDINGS findings present"
echo "PASS: recovered to LSN $LSN and excluded the later write ($FINDINGS findings present)"
