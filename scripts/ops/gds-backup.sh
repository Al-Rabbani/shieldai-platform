#!/usr/bin/env bash
# GDS OS nightly backup. Verifies the dump before declaring success.
set -uo pipefail
DEST=/var/backups/gds/daily
LOG=/var/log/gds-backup.log
mkdir -p "$DEST"
cd /tmp
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$DEST/gds_os_$TS.dump"
echo "[$(date -u +%FT%TZ)] backup start -> $OUT" >> "$LOG"
if sudo -u postgres pg_dump -Fc -d gds_os -f "$OUT" 2>>"$LOG"; then
  chmod 600 "$OUT"
  # integrity: the dump must list its objects, or it is worthless
  if sudo -u postgres pg_restore -l "$OUT" >/dev/null 2>>"$LOG"; then
    OBJ=$(sudo -u postgres pg_restore -l "$OUT" 2>/dev/null | grep -c "^[0-9]")
    SZ=$(stat -c%s "$OUT")
    echo "[$(date -u +%FT%TZ)] OK bytes=$SZ objects=$OBJ" >> "$LOG"
  else
    echo "[$(date -u +%FT%TZ)] FAIL restoring listing - dump unusable" >> "$LOG"
    exit 2
  fi
else
  echo "[$(date -u +%FT%TZ)] FAIL pg_dump" >> "$LOG"
  exit 1
fi
# retention: 14 daily dumps
find "$DEST" -name 'gds_os_*.dump' -mtime +14 -delete
echo "[$(date -u +%FT%TZ)] retention applied, keeping $(find "$DEST" -name '*.dump' | wc -l) dumps" >> "$LOG"
