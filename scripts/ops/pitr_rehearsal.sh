#!/usr/bin/env bash
# Point-in-time recovery rehearsal. Proves the WAL archive can rebuild the database to a chosen
# point, and proves it by EXCLUDING a write made after that point - a cluster that merely comes up
# is not evidence that point-in-time semantics work.
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
set -euo pipefail
PORT=${PORT:-5436}
DEST=${DEST:-/var/lib/postgresql/15/pitr_rehearsal}
BASE=$(mktemp -d /var/backups/pitr/rehearsal-XXXXXX)
chown postgres:postgres "$BASE"

sudo -u postgres psql -d gds_os -qc "CREATE TABLE IF NOT EXISTS pitr_probe(id serial primary key, note text)"
sudo -u postgres pg_basebackup -D "$BASE" -Ft -z -X stream
LSN=$(sudo -u postgres psql -d gds_os -tAc "select pg_current_wal_lsn()" | tr -d ' ')
sudo -u postgres psql -d gds_os -qc "INSERT INTO pitr_probe(note) VALUES ('after target lsn')"
sudo -u postgres psql -d gds_os -qc "select pg_switch_wal()" >/dev/null
sleep 5

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

sudo -u postgres /usr/lib/postgresql/15/bin/pg_ctl -D "$DEST" -l /tmp/pitr_rehearsal.log start
for _ in $(seq 1 12); do
  sleep 5
  [ "$(sudo -u postgres psql -p "$PORT" -h /tmp -tAc 'select pg_is_in_recovery()' 2>/dev/null)" = "f" ] && break
done
PROBE=$(sudo -u postgres psql -p "$PORT" -h /tmp -d gds_os -tAc "select count(*) from pitr_probe")
sudo -u postgres /usr/lib/postgresql/15/bin/pg_ctl -D "$DEST" stop -m fast
sudo -u postgres psql -d gds_os -qc "DROP TABLE IF EXISTS pitr_probe"
if [ "$PROBE" != "0" ]; then
  echo "FAIL: recovered cluster contains a write made after the target LSN"
  exit 1
fi
echo "PASS: recovered to LSN $LSN and excluded the later write"
