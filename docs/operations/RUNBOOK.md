# GDS OS Runbook

Operational procedures for the platform as it actually runs, written against the live host on 19 Nov 2026.
Every command here has been executed on this host; anything unverified is listed in section 7 rather than
implied.

## 1. What is running

| Thing | Where |
|---|---|
| API | `uvicorn` on `127.0.0.1:8000`, supervised as `gds-os` |
| Temporal worker | supervised as `gds-worker` |
| Kernel daemon | supervised as `gds-kernel` |
| Containers | `temporal`, `nats`, `qdrant`, `minio` (all bound to loopback) |
| Database | PostgreSQL 15, `gds_os`, every tenant table FORCE RLS |
| Product surface | `app.globaldigitalsecurity.io` serving `/var/www/gds_app.html`, built by `build_client.py` |
| API surface | `api.globaldigitalsecurity.io` via nginx |

Two surfaces with different jobs: the SPA is the product, the Base44 app is the internal ops console.

## 2. First five minutes of an incident

```bash
curl -s -m 5 http://127.0.0.1:8000/health          # process alive and DB reachable
supervisorctl status                                # gds-os, gds-worker, gds-kernel
curl -s -o /dev/null -w '%{http_code}\n' -m 10 https://app.globaldigitalsecurity.io/
curl -s -o /dev/null -w '%{http_code}\n' -m 10 https://api.globaldigitalsecurity.io/health
docker ps --format '{{.Names}}\t{{.Status}}'        # containers, incl. healthchecks
df -h / | tail -1                                   # disk
```

Order matters: a dead API is the loudest symptom but often a database or disk problem. Check `/health`
first, because it reports the database connection specifically.

If `/health` is 200 but pages are blank, the fault is almost always client-side or nginx, not the API.

## 3. The RLS trap that looks like data loss

Every tenant table is FORCE RLS. **A query with no tenant bound returns zero rows and looks like an empty
database.** On 19 Nov this produced "0 findings" against a platform holding 249 open findings.

```bash
# WRONG - returns 0 rows and looks like there is no data
psql -d gds_os -c "SELECT count(*) FROM security_findings"

# RIGHT - bind the tenant first
psql -d gds_os -c "SELECT set_config('gds.tenant_id','<tenant-uuid>',false); SELECT count(*) FROM security_findings;"
```

The GDS tenant id is in `/opt/.env` as `GDS_TENANT_ID`. Before reporting any count as fact, confirm it was
measured with a tenant bound, or as the `postgres` role.

## 4. Common procedures

### Restart a service
```bash
supervisorctl restart gds-os          # or gds-worker / gds-kernel
for i in $(seq 1 15); do curl -s -o /dev/null -m 2 http://127.0.0.1:8000/health && break; sleep 1; done
```
Health takes up to ~45s after a host boot, so an immediate check false-alarms.

### Deploy a change
```bash
cd /opt/gds-os && set -a && . /opt/.env && set +a
git push "https://x-access-token:${GITHUB_TOKEN}@github.com/Al-Rabbani/shieldai-platform.git" main
bash scripts/ops/deploy.sh
```
`deploy.sh` refuses a dirty tree, runs the client build (which fails on a broken page), installs only the
built artifact, verifies the served bytes match the build manifest, and rolls back on a failed smoke gate.
A plain `git push` to `origin` fails: the remote has no credentials.

### Verify what is actually served
```bash
python3 -c "import json;print(json.load(open('web/dist/manifest.json'))['sha256'])"
sha256sum /var/www/gds_app.html
```
If these differ, the deploy installed something other than what it built.

### Run the compliance assessment
```bash
set -a; . /opt/.env; set +a
apps/api/venv/bin/python scripts/ops/assess_compliance.py
```
Runs daily at 03:15 and again after the monthly patch window. Every control starts `not_tested` and only
moves on collected facts; a collector that throws stays `not_tested` with the reason.

### Backup and off-host verification
```bash
/usr/local/bin/gds-backup.sh                       # dump, encrypt, upload to B2
tail -5 /var/log/gds-backup.log                    # look for OFFHOST_B2 ok
/usr/local/bin/gds-backup-watch.sh                 # judges freshness, alerts if stale
```

### Restore drill
```bash
/usr/local/bin/gds-restore-drill.sh                # weekly, Sun 04:45
```
Restores the newest dump into a scratch database and compares against the manifest written with the dump,
not against live production, so findings that grew since the dump do not look like corruption.

### Onboard a tenant
```bash
apps/api/venv/bin/python scripts/ops/onboard_tenant.py --tenant-slug <slug> --plan trial --sla standard --performed-by <email>
```
It runs an isolation probe as the application role and records the evidence; if the probe fails, onboarding
is recorded with `isolation_verified=false` and the script exits non-zero.

### Apply a migration
```bash
apps/api/venv/bin/python scripts/ops/migrate.py
```
Migrations run as `postgres`. The application role does not own most tables, so a manual `psql` apply as
the app role fails with "must be owner of table".

### Measure the platform
```bash
apps/api/venv/bin/python scripts/ops/measure_platform.py
```

## 5. Alert thresholds worth acting on

| Signal | Where | Act when |
|---|---|---|
| Open critical findings | `/findings?severity=critical` | any, same day |
| Open findings older than 30 days | 28 today | weekly triage |
| Pending approvals | `/approvals` (13 today, oldest 2 days) | >48h |
| Patch currency | compliance `patch_currency` control | any security-labelled update |
| Scanner silence | `check_alerts.py`, every 5 min | an alert row appears |
| Backup age | `gds-backup-watch.sh`, every 30 min | off-host copy older than 36h |

## 6. Logs

| Log | Contents |
|---|---|
| `/var/log/gds-os/` | API and worker |
| `/var/log/gds-alerts.log` | alert evaluation |
| `/var/log/gds-backup.log` | backup and off-host upload |
| `/var/log/gds-compliance.log` | assessment runs |
| `/var/log/gds-autonomous.log` | scheduled missions |

## 7. What this runbook does NOT cover

Stated because a runbook that implies more coverage than exists is worse than none:

- **Paging is acknowledgement-based, not provider-based.** A notification marked `requires_ack` is
  re-delivered on a widening ladder (5 min, 15 min, 60 min) until a human acknowledges it via
  `POST /notifications/{id}/acknowledge`; after the final rung it is marked unanswered, so the record shows
  the silence rather than implying somebody handled it. `gds-page.py` runs every 5 minutes as the postgres
  user, because with 63/63 tenant tables FORCE-RLS an unbound app-role read would see zero rows and page
  nobody. Still absent: no paging provider (no PagerDuty or Opsgenie key exists in this environment), no
  phone tree, and no rota naming more than one person, so a page at 03:00 reaches whoever is watching Slack.
  MEASURED 19 Nov 2026: the Slack leg returned 200; the email leg returned 403 because the Resend account is
  still in test mode and only delivers to the account owner's address. Until a sending domain is verified the
  email leg of a page does not reach a real recipient.
- **Single host.** No failover, no standby. Host loss means downtime until rebuild, bounded by the off-host
  backup and the restore drill.
- **No staging environment.** Deploys go to production behind a smoke gate and rollback, not through a
  pre-production stage.
- **NIS2 mapping is a technical decomposition**, not a legal opinion. Any regulatory statement needs legal
  review first.
- **RTO and RPO are measured for the data, not committed for the service.** MEASURED 19 Nov 2026:
  restoring the latest off-host dump (944 KB; 380 findings, 4 tenants, 126 missions) into a scratch database
  took 1964 ms. RPO against host loss is up to 24 hours, because the off-host copy is the 02:30 daily; the
  continuous WAL archive that gives minute-level recovery lives on the same host and is lost with it. A
  contractual RTO cannot be stated: there is no standby, so the unmeasured part of recovery is provisioning a
  host, not restoring the data.

## 5. Controls that measure instead of asserting (added 20 Nov 2026)

Each of these was previously a hardcoded `False` in `scripts/ops/assess_compliance.py`. A control that asserts a
constant cannot notice when the situation changes, in either direction.

### Second factor (mfa_enforced)
Mechanism: migration 033 adds `users.mfa_secret` (Fernet-encrypted), `mfa_enabled`, `mfa_enrolled_at` and
`mfa_recovery_codes` (FORCE-RLS, sha256-hashed, single use). `apps/api/gds_api/mfa.py` is TOTP per RFC 6238 with no
extra dependency. Routes: `POST /auth/mfa/enrol`, `/confirm`, `/disable`. Once enabled, login returns
`401 mfa_required` without a code, and a recovery code is burned on first use.
The control reports columns, routes and the enrolled count. It passes only when every active user is enrolled.

### Access reviews (access_review)
Migration 034. `POST /access/reviews` snapshots active users with role and last session; `POST
/access/reviews/{id}/decide` records retain or revoke, and **revoke genuinely sets `is_active = false` and revokes
that user's sessions**. Self-revocation returns 409, because with one administrator the tenant would lose the
ability to finish its own review. A review is not self-decided by the platform: the reviewer decides.

### NIS2 Article 23 (incident_reporting)
Migration 035 adds `regulatory_notifications`, and `gds_api/regulatory.py` computes the 24-hour early warning,
72-hour notification and 30-day final report deadlines **from detection and stores them**, so "are we late on a
regulator?" is `GET /regulatory-notifications/overdue`. It never sends anything: notifying an authority is a legal
act, so `POST /regulatory-notifications/{id}/submit` records that a person sent it and when. The control passes
only once a real incident has been assessed, because an unexercised procedure is a plan, not evidence.

### Patch window (patch_currency)
`config/cron/root.crontab` is the source of truth for all 16 scheduled jobs and `deploy.sh` installs it, so a
rebuild no longer loses backups, scans, reapers or the paging watchers. The window runs weekly on Friday at 05:00
(`0 5 * * 5`). Two defects were fixed to make that true: the schedule was a one-shot date (`0 5 20 11 *`, which had
already fired and would never recur), and `gds-os-update.sh` deleted its own crontab entry after running, which
would have erased a recurring schedule on its first run. Security updates are handled independently by
`unattended-upgrades`; the pending packages this control reports are non-security ones.

## 6. Findings that are recorded as accepted risk rather than fixed

- **MinIO (7 critical CVEs).** The image is unobtainable: `minio/minio` returns pull access denied on Docker Hub,
  quay.io, ghcr.io and bitnami. It cannot be removed because the evidence vault stores objects in its `gds-evidence`
  bucket. All four containers are bound to 127.0.0.1 and UFW denies 9000/9001, so the CVEs are not network-reachable.
- **Temporal (7 critical CVEs).** No better image exists: `1.23.1.1` scans at 23 criticals against 22 on the running
  digest, so the newer tag is worse. Temporal stays because `mission_workflow` and `conversation_workflow` use it.
- **Volume encryption at rest.** The root filesystem is plain ext4 with no LUKS mapping. Backups are gpg AES256 and
  transport is TLS, but the live database volume is unencrypted. This needs a rebuild or a maintenance window and is
  an owner decision, not a code change.
