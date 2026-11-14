# GDS production assessment and repair register

Updated 13 November 2026. This is a project-wide risk assessment with targeted
source review and tests, not certification that every feature or agent works.

Later evidence: [restore and identifier validation](restore-and-identifier-validation-2026-11-13.md)
records a successful isolated restore, effective two-tenant checks on the four
protected tables, and prepared guards for invalid workflow identifiers. It
supersedes the earlier untested-restore and untested-policy status below. Full
API identity/isolation and source rollout remain pending.

## Evidence and current deployment

Base44 source was inspected directly through the connected app sandbox. Its
inventory contains 137 backend functions. The JSON inventory beside this report
records static references, not effective authorization or proof of exploitation.
An `auth.me` reference can still be misused, and its absence can be legitimate for
a properly authenticated webhook. Each candidate requires semantic review.

The VPS evidence below was returned by GDS Co-Pilot through its existing server
connection. Codex has not independently logged in over SSH: this workspace's
network cannot reach that endpoint. No private key or bridge token was retrieved.

At 20:33:47 UTC Co-Pilot reported `/opt/gds-os`, clean `main`, deployed commit
`a2ff2e3fea02cc67b004e511e6eec61b9d9418a7`. PR #21 remains a separate candidate.
The protected bridge returned 401 with missing/wrong credentials and 200 with its
existing credential; the diagnostic endpoint is still absent on that release.

## Findings and disposition

| Priority | Finding | Current disposition | Acceptance needed |
|---|---|---|---|
| P0 | Bare `CurrentUser = Depends` defaults across 56 handlers in six modules; marketplace stats logged AttributeError | Corrected in candidate source to `Depends(get_current_user)` | Actual service imports, valid/invalid session and tenant integration tests in staging; permission review remains separate |
| P0 | Base44 cleanup and purge directly delete records without handler identity checks; AutoFix can use server credentials without a handler identity check | Three handlers replaced with authenticated admin-only unavailable responses; no destructive behavior retained | Governed tenant/resource authorization, durable approval, recovery and audit before replacements are enabled |
| P0 | SOAR generates random completion and audit events; AWS agentless role validation and findings are simulated | Removed fake execution branches; unsupported operations return 503 without writes | Real STS/read-only provider and SOAR connectors, verified scope and authentic evidence |
| P0 | Master orchestrator has no handler identity check and includes synthetic production seeding and legacy execution | Admin gate added; bootstrap/execute/workflow return 503 before dispatch | Governed broker integration and truthful provenance; remaining read summaries still need semantic review |
| P0 | Temporal worker repeatedly fails while TCP health claims healthy | Co-Pilot reports separately authorized infrastructure repair now applied; candidate health uses WorkflowService gRPC health | Longer worker observation, persistence across host/container restart and a benign end-to-end workflow |
| P0 | Latest identified database backup was 31 days old; no scheduler/off-host backup | Fresh protected custom-format archive created by Co-Pilot at 20:37:04 UTC | Isolated restore test, scheduled backups, encrypted off-host destination, retention, RPO/RTO ownership |
| P1 | Provider calls fail with HTTP 429 insufficient_quota/credit_balance_exhausted | Co-Pilot reported 82 affected missions; no billing changes made | Owner restores provider budget or configures an approved funded provider, followed by bounded canary |
| P1 | Prefixed mission identifiers enter UUID-only database activity path | Co-Pilot observed ValueError at activities.py:308; source has both prefixed orchestration IDs and ORM UUIDs | Trace producer/consumer boundary; explicit persisted ID mapping and regression before changing identifiers |
| P1 | RLS exists on four tables only, current allow/deny acceptance not re-run | Co-Pilot reports FORCE RLS and non-bypass roles; single tenant in protected data | Full two-tenant tests across reads/writes/counts/exports/background jobs and pool reuse |
| P1 | No tracked database migration version | Raw isolation SQL exists; no alembic_version reported | Versioned migration ledger, schema compatibility gate and isolated rollback/restore validation |
| P1 | Temporal container uses mutable latest tag; repair flag only stored in container environment | Co-Pilot reports running version changed to 1.29.3 during recreation | Capture reviewed digest and declarative configuration including SKIP_DB_CREATE; preserve storage and secret references |
| P1 | Manual checkout/restart deployment; no production rollback/smoke gate | Candidate operations docs available in PR; no VPS rollout in this work | Immutable release selection, GDS_RELEASE_SHA, staging acceptance, backup/rollback and monitored smoke tests |
| P1 | Runtime API port 8000 reported publicly allowed | No firewall change made | Verify authenticated proxy and dependencies, then restrict direct ingress without locking out service access |
| P1 | Historical Base44 records may contain fabricated evidence | Existing records preserved | Provenance-led quarantine/reconciliation with recovery; never blindly purge findings |
| P2 | Other functions contain random values, LLM narratives, suppressed read failures or privileged service-role calls | Static inventory supplied; this batch fixes confirmed paths only | Review every candidate; random IDs alone are not fabricated telemetry |
| P2 | Grok adapter, capacity and commercial claims not verified | Grok remains unconnected | Tenant-scoped redacted tools, policy boundaries, evaluation, cost limits, load/recovery evidence |

## Temporal repair reconciliation

The initial read-only assessment at 20:25 UTC found an actual worker failure.
Co-Pilot subsequently reported the owner separately authorized its repair. A fresh
read at 20:33:47 UTC reported the PostgreSQL bridge listener reachable, Temporal
gRPC and namespace listing successful, container restarts zero, and the worker
running for approximately two minutes with metrics responding. This short window
does not demonstrate sustained reliability or successful mission execution.

Reported cause: PostgreSQL started before Docker created its bridge, so the
configured 172.17.0.1 listener was absent. Applied separately by Co-Pilot:
PostgreSQL restart, `/etc/systemd/system/postgresql.service.d/10-after-docker.conf`,
Temporal recreation with `SKIP_DB_CREATE=true`, and worker restart. The mutable
image tag resolved to server 1.29.3. Codex did not execute those repairs.

## New backup evidence

Co-Pilot created `/root/gds-backups/gds_os_20261113T203703Z.dump`, root-owned mode
600 under a mode-700 directory, completed 20:37:04 UTC, 293241 bytes. SHA256:
`c7abdaa99f3bc385e2a2aa54830820f8bf396b557cd7297576ee13719a700e94`.
It reported `pg_restore --list` succeeded and table schema/data entry counts
matched the 64 live tables. Prior backups were preserved. No restore or off-host
copy was performed; archive parsing is not proof of restoration or full recovery.

## Changes and verification in this batch

Base44 checkpoint `6af7763541897aacb7413b99`, source commit
`74dd029ae9fb53bec4f32d63867a0394ddc6830d`, contains the additional six function
safeguards. A build and 46 contracts passed in the actual sandbox: 28 hardening,
8 diagnostic transport, 10 existing AgentOS contracts. SDK/providers are mocked;
hosted denied/allowed authorization must still be verified. Source snapshots are
under `deploy/base44-hardening/`; merging GitHub does not redeploy Base44.

The VPS candidate corrects identity resolution in marketplace, AI security,
attack graph, AutoFix, digital twin and red-team simulation routes. It does not
grant route-specific permissions or certify those features' semantics. The
Temporal health probe uses the existing client helper and
`client.service_client.check_health()`; a positive result proves server protocol
health, not worker polling or mission success. Public health errors now omit raw
driver messages, which can carry connection strings. SDK reference:
https://python.temporal.io/temporalio.client.ServiceClient.html#check_health

Local verification: 91 offline contracts and four FastAPI route/dependency tests
passed. The HTTP tests use the actual stats handler and fixture identity/data
providers; they prove dependency resolution and tenant forwarding, not production
JWT verification, ORM access or RLS. CI run 43503762805 passed all four jobs, including four real-PostgreSQL claim
tests. The separate security gate correctly blocked a synthetic password-shaped
DSN in a new error-redaction fixture; the fixture now uses generic sensitive
detail text. Gate policy is unchanged. The follow-up head must pass independently.

## Delivery order

1. Verify the new backup restores into an isolated database and preserve recovery
   evidence. Configure scheduled/off-host copies without exposing dump content.
2. Keep unsafe legacy Base44 actions unavailable; review the remaining inventory
   and reconcile historical provenance without deleting authentic evidence.
3. Trace the mission ID mismatch, persist Temporal configuration and observe the
   repaired worker. Provider quota is a separate owner/account dependency.
4. Complete staging imports, real authenticated route tests, legitimate broker
   execution, concurrent/replayed requests, failure/restart and two-tenant RLS.
5. Release an exact reviewed SHA, set runtime release metadata, verify proxies and
   smoke tests, and restrict direct ingress after connectivity checks.
6. Connect Grok only through restricted tools after the earlier gates pass; then
   measure costs, capacity, detection quality and recovery before onboarding.

No production merge, VPS source deployment, customer notification, security scan,
offensive action or model-provider charge was executed by Codex in this batch.
