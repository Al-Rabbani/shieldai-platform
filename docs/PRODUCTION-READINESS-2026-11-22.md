# Production readiness — 22 November 2026

Release **358f065** (plus the commit that carries this file), branch `gdsa-radar-live` = `main` after the
owner's merge ruling. Every figure below was read from the running system on 22 Nov 2026 between 06:45 and 07:05
UTC, not copied from an earlier report.

The six states are reported separately on purpose. A service that is registered is not necessarily reachable; a
service that is reachable is not necessarily heartbeating; a heartbeat proves reporting, not capability; a tool
that ran is not an outcome that was verified.

---

## 1. Registered

| Thing | Count | How read |
|---|---|---|
| API paths / operations | 341 / 373 | `/openapi.json` |
| Database tables | 86 | `information_schema.tables` |
| Migrations applied | 53 | `schema_migrations` |
| Agents in the code registry | 23 | `agents/registry.py` (no DB table) |
| Cron entries | 23 | `crontab -l` |
| Scan schedules with a recorded run | 6 | `scan_schedules.last_run_at is not null` |

## 2. Reachable

| Target | Result |
|---|---|
| `GET /api/health` | 200, `status: healthy` |
| Frontend `/v2/` | 200, serves the current hashed bundle |
| Postgres | connected, `SELECT 1` ok, 84.6 ms |
| Redis | ping ok, 63.5 ms |
| Neo4j | bolt connectivity verified, 82.5 ms |
| Qdrant | healthz ok, 63.3 ms |
| Temporal | WorkflowService gRPC health serving, 60.3 ms — **worker execution unverified** |
| NATS | PING/PONG verified, 60.2 ms |
| MinIO | health/live ok, 63.3 ms |

## 3. Heartbeat

- supervisor: `gds-os`, `gds-worker`, `gds-kernel` all **RUNNING**.
- Containers: neo4j, qdrant, minio (31 h), temporal (6 h), nats (30 h) — all up, four reporting healthy.
- Six scan schedules carry a real `last_run_at`; the daily container watch and the 04:40 OSV check have both
  been observed running on their own.
- **No agent heartbeat exists today.** The 23 agents are registry entries; the fleet is idle and there is no
  heartbeat table populated. Do not read "23 agents" as "23 agents alive".

## 4. Tool executed

Proven today:

- `nuclei` executed against a served `.git/config` exposure and **detected it** (the DAST positive control inside
  the test suite, ~25 s per run).
- `pg_dump` / `pg_restore` executed against the live database (see outcome verification).
- The deploy pipeline executed end to end: 832 tests, 37 adapter tests, vite build, rsync, served-sha check.

Not proven today: any tool executed by the agent runtime. The last agent-runtime tool execution on record is the
Linear read/write proof from the previous release.

## 5. Outcome verified

| Claim | Evidence |
|---|---|
| Estate size | `security_findings` = 1002 total, 849 open, **0 open critical**, 14 `accepted_risk`, newest 19 Nov |
| Dashboard figures | On screen: 849 open / 0 critical / 330 high / 0 KEV / 14 accepted — matches SQL |
| Compliance | 297 catalogued controls; verdicts `not_tested` 178, `pass` 103, `fail` 23, `not_applicable` 11; the page shows 103 passing and 23 failing across 9 frameworks |
| Backup | `/var/backups/gds/daily/gds_os_20261122T023001Z.dump`, 1.26 MB, taken 02:30 today; `sha256sum -c` **OK**; `pg_restore --list` reads 85 table-data sections; its counts file agrees with the live estate (1002 findings, 182 missions) |
| Deploy integrity | smoke compares the served bundle hash with the built one; `DEPLOY OK: 358f065…` |
| Tenant isolation | 76 tables with RLS enabled, **76 of them FORCE** |

## 6. Production ready — with the absences stated

Ready: the read and report surface (dashboard, vulnerabilities, compliance tracking, executive figures), the
admin surface, authentication with MFA, billing against live Stripe prices, and the deploy path itself.

Not ready, and not to be described as such:

1. **82 entity names across the 108 imported page modules have no resource on this platform.** The shell banner
   names them per page. The largest are `FixScheduleItem` (11 sites), `TeamMember` (7), `FixStrategy` (5),
   `VulnEscalationRule` (5), `DepartmentRiskThreshold` (5), `AssignmentRule` (5). They are not wired because the
   platform holds no such data — mapping them would be fabrication.
2. **No pentest has ever run through the authorisation path**: `pentest_agreements` 0 rows,
   `pentest_authorizations` 0 rows. Red Team pages therefore have nothing real to show.
3. **Cloud posture findings are 0.** `cspm` has produced no rows; the AWS account is connected but no posture
   finding is stored. The dashboard reads 0 because 0 is true, not because the tile is broken.
4. **The newest finding is 19 November.** The deterministic scan re-detects an already-registered estate
   (idempotency), so a flat count is expected — but it also means no new exposure has been discovered in three
   days.
5. **No paying customer.** Billing is proven with a real Stripe Checkout session created and expired; no
   subscription has completed, `billing_subscriptions` is 0.
6. **0 API keys in use.** The mechanism works (issue, list, revoke proven); nobody holds one.
7. **Agent fleet idle.** No heartbeat, no scheduled agent work beyond the cron scans.

## Verification suite

832 tests passed, 8 skipped (the skips are the closed-sign-up registration tests), 104 subtests; 37 adapter
tests. The deploy gate refuses a red suite, a missing client build, and a served bundle that does not match its
manifest.
