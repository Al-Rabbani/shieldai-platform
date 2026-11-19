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
