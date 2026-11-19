#!/usr/bin/env bash
# GDS OS nightly backup.
#
# Three things this must do, and did not all do before 17 Nov 2026:
#   1. dump and prove the dump lists its objects (it did);
#   2. record a count manifest AT DUMP TIME, so the restore drill has a reference that does not move
#      as production grows;
#   3. copy the dump off this host when a target is configured, and say plainly when one is not.
set -uo pipefail
DEST=/var/backups/gds/daily
LOG=/var/log/gds-backup.log
mkdir -p "$DEST"
cd /tmp
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$DEST/gds_os_$TS.dump"
MANIFEST="$OUT.counts.json"
echo "[$(date -u +%FT%TZ)] backup start -> $OUT" >> "$LOG"

if sudo -u postgres pg_dump -Fc -d gds_os -f "$OUT" 2>>"$LOG"; then
  chmod 600 "$OUT"
  # integrity: the dump must list its objects, or it is worthless
  if sudo -u postgres pg_restore -l "$OUT" >/dev/null 2>>"$LOG"; then
    OBJ=$(sudo -u postgres pg_restore -l "$OUT" 2>/dev/null | grep -c "^[0-9]")
    SZ=$(stat -c%s "$OUT")
    SHA=$(sha256sum "$OUT" | cut -d' ' -f1)
    echo "$SHA  $(basename "$OUT")" > "$OUT.sha256"
    chmod 600 "$OUT.sha256"
    # The table list comes from gds_api.backup_ops so the manifest and the drill cannot diverge.
    ( cd /opt/gds-os/apps/api && PYTHONPATH=. venv/bin/python - "$MANIFEST" <<'PY'
import json, subprocess, sys
from gds_api.backup_ops import MANIFEST_TABLES
counts = {}
for table in MANIFEST_TABLES:
    out = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "gds_os", "-tAc",
                          f"select count(*) from {table}"], capture_output=True, text=True)
    counts[table] = int(out.stdout.strip()) if out.returncode == 0 and out.stdout.strip() else -1
json.dump(counts, open(sys.argv[1], "w"), indent=2, sort_keys=True)
PY
    ) >>"$LOG" 2>&1
    chmod 600 "$MANIFEST"
    echo "[$(date -u +%FT%TZ)] OK bytes=$SZ objects=$OBJ sha256=$SHA" >> "$LOG"
  else
    echo "[$(date -u +%FT%TZ)] FAIL restoring listing - dump unusable" >> "$LOG"
    exit 2
  fi
else
  echo "[$(date -u +%FT%TZ)] FAIL pg_dump" >> "$LOG"
  exit 1
fi

# Off-host copy. A path on this host is NOT off-host, so nothing is claimed unless OFFHOST_TARGET
# names somewhere else (rsync target such as user@host:/path). The watcher alerts while it is unset.
set -a; . /opt/.env 2>/dev/null || true; set +a
if [ -n "${OFFHOST_TARGET:-}" ]; then
  if rsync -a --timeout=300 "$OUT" "$OUT.sha256" "$MANIFEST" "${OFFHOST_TARGET%/}/" >>"$LOG" 2>&1; then
    date -u +%FT%TZ > /var/lib/gds-offhost.last
    echo "[$(date -u +%FT%TZ)] OFFHOST ok -> $OFFHOST_TARGET" >> "$LOG"
  else
    echo "[$(date -u +%FT%TZ)] OFFHOST FAILED -> $OFFHOST_TARGET" >> "$LOG"
    exit 3
  fi
elif [ -n "${B2_BUCKET:-}" ]; then
  # Encrypted push to Backblaze B2. The dump is gpg-symmetric AES256 encrypted before it leaves the
  # host, so the bucket never holds readable tenant data. Exit non-zero on failure so the watcher
  # keeps alerting rather than silently reporting a copy that did not happen.
  if /opt/gds-os/apps/api/venv/bin/python /usr/local/bin/gds-b2-upload.py "$OUT" "$OUT.sha256" "$MANIFEST" >>"$LOG" 2>&1; then
    date -u +%FT%TZ > /var/lib/gds-offhost.last
    echo "[$(date -u +%FT%TZ)] OFFHOST_B2 ok -> $B2_BUCKET (encrypted)" >> "$LOG"
  else
    echo "[$(date -u +%FT%TZ)] OFFHOST_B2 FAILED -> $B2_BUCKET" >> "$LOG"
    exit 3
  fi
else
  echo "[$(date -u +%FT%TZ)] OFFHOST_NOT_CONFIGURED: dump exists only on this host" >> "$LOG"
fi

# retention: 14 daily dumps with their manifests and hashes
find "$DEST" -name 'gds_os_*.dump' -mtime +14 -delete
find "$DEST" -name 'gds_os_*.dump.counts.json' -mtime +14 -delete
find "$DEST" -name 'gds_os_*.dump.sha256' -mtime +14 -delete
echo "[$(date -u +%FT%TZ)] retention applied, keeping $(find "$DEST" -name '*.dump' | wc -l) dumps" >> "$LOG"
