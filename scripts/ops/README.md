# Operational scripts

These are installed to `/usr/local/bin` and driven by root cron. They exist in the
repo so the platform can be rebuilt rather than depending on hand-typed server state.

| Script | Cron | Purpose |
|---|---|---|
| `gds-backup.sh` | `30 2 * * *` | Nightly `pg_dump -Fc` to `/var/backups/gds/daily`, verifies the dump by listing its objects with `pg_restore -l`, keeps 14 days. A dump that cannot be listed is treated as a failure. |
| `gds-wal-prune.sh` | `15 3 * * *` | Prunes WAL archive segments older than 7 days. PITR window is therefore 7 days. |
| `gds-service-watch.sh` | `*/5 * * * *` | Functional probes for qdrant, minio, nats, temporal, api, worker. Two consecutive failures trigger a restart. |
| `gds-temporal-probe.py` | via watch | Real gRPC `get_system_info` round-trip. A TCP probe previously reported Temporal healthy while it was wedged. |

## Install

```bash
install -m 750 scripts/ops/gds-backup.sh scripts/ops/gds-wal-prune.sh scripts/ops/gds-service-watch.sh /usr/local/bin/
install -m 755 scripts/ops/gds-temporal-probe.py /usr/local/bin/
```

Then add the four cron lines above for root. The backup destination must be owned by
`postgres` (the dump runs as that user) and its parent must be traversable by it.

## Restore drill

```bash
NEWEST=$(ls -t /var/backups/gds/daily/*.dump | head -1)
sudo -u postgres createdb gds_restore_verify
sudo -u postgres pg_restore -d gds_restore_verify "$NEWEST"
sudo -u postgres psql -d gds_restore_verify -tAc "SELECT count(*) FROM security_findings;"
sudo -u postgres psql -d postgres -c "DROP DATABASE gds_restore_verify;"
```
