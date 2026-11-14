#!/usr/bin/env bash
# Keep 7 days of WAL. PITR window = 7 days; older segments are pruned.
set -uo pipefail
find /var/lib/postgresql/wal_archive -type f -mtime +7 -delete 2>/dev/null
echo "[$(date -u +%FT%TZ)] wal prune: $(ls /var/lib/postgresql/wal_archive | wc -l) segments retained" >> /var/log/gds-backup.log
