# GDSA Radar / GDS OS — Production Readiness Handover

**Audited:** Monday 23 November 2026, 14:25 UTC
**Release:** `5e559ca95162c6b8b5cd3426b82bd235483126df` (branch `gdsa-radar-live`, tree clean)
**Host:** Hostinger KVM 4, `2.24.141.108`, Ubuntu 22.04, repo at `/opt/gds-os`
**Audience:** an external coding agent (Codex) plus the owner. Every claim below was measured on the host at the time stated, or is explicitly marked NOT VERIFIED.

---

## 0. How to use this document

1. Read §1 (verified state) and §3 (conventions) before touching anything. The conventions are not style preferences; each one exists because ignoring it shipped a defect.
2. Work §4 (P0) first and do not start P1 until every P0 item has an acceptance test that fails before the fix and passes after.
3. Each item carries **Evidence** (how it was measured), **Why it blocks**, **Do** (the change), and **Accept** (the proof that closes it). A green build is not acceptance: this platform has shipped six defects that passed the full suite and only appeared when the live route or the rendered page was called.
4. Never write a number you have not queried. Never write a refusal for something you have not grepped the whole file for. Both have already happened here.

---

## 1. Verified state (measured 23 Nov 2026 14:22–14:25 UTC)

### 1.1 Runtime

| Thing | Measured |
|---|---|
| API paths / operations | 409 / 457 (`GET /openapi.json`) |
| Health | `healthy`; postgres, redis, neo4j, qdrant, temporal all report detail + latency |
| Supervisor | `gds-os`, `gds-worker`, `gds-kernel` all `RUNNING` |
| Containers | neo4j, qdrant, temporal, minio, nats — all up |
| Migrations applied | 73 (`migrations/security_isolation/`) |
| Python tests | 1,238 collected (`pytest --collect-only`) |
| Web adapter tests | 42 files, `node --test tests/` |
| Release | `/health/version` returns sha `5e559ca…`, branch `gdsa-radar-live`, `tree_clean: true` |

### 1.2 Data (live Postgres `gds_os`)

| Table | Rows |
|---|---|
| security_findings | 1,002 (849 open) |
| users / tenants | 5 / 5 |
| missions / cost_records | 220 / 246 |
| cloud_assets | 145 |
| compliance_assessments / controls / frameworks | 315 / 297 / 9 |
| knowledge_documents | 24 |
| incidents | 2 |
| copilot_scheduler_log | 5 |
| api_keys | **0** |
| mfa_recovery_codes | **0** |
| copilot_memory | **0** |

### 1.3 Database hardening

- **102 tables.** 92 have RLS **enabled and forced**.
- **11 tables have no `tenant_id`** and therefore cannot be row-scoped: `compliance_assessments` (315), `compliance_controls` (297), `compliance_frameworks` (9), `compliance_scope_determinations` (1), `incident_findings` (20), `repository_policies` (1), `security_incidents` (1), `workspace_policies` (1), `schema_migrations` (73), `tenants` (5), `engagement_targets` (0). Some are legitimately platform-wide; the compliance trio is not (see P0-3).

### 1.4 Frontend surface

- `App.jsx` declares **106 `<Route>`** elements importing **102 page modules**.
- **785 page files exist on disk** → ~683 are unreachable dead code.
- Adapter (`apps/web/src/api/base44Client.js`) serves **73** entity/function names.
- Walking the routed graph (317 modules, depth 2 from `App.jsx`), routed pages ask for **96 entity names across 382 call sites**; **44 of those names are unserved across 74 call sites** (list in §4.2).
- Fixture markers still in source: `Math.random` **99**, `FALLBACK_` **6**, `MOCK` **12**, `"coming soon"` **12**, `"Coming Soon"` **13**.

### 1.5 Ops

- **Backups:** daily 02:30 to `/var/backups/gds/daily`, off-host encrypted to Backblaze B2 (`gds-os-backups`), 14 dumps retained, WAL pruned to 110 segments.
- **Restore drill:** weekly, last 22 Nov → `PASS … restored with matching row counts`.
- **PITR rehearsal:** weekly, last 22 Nov → `PASS recovered to LSN 0/7C000000, excluded the later write, 1002 findings present`.
- **Cron:** 20 entries — 6-hourly deterministic scan, 12-hourly CVE/KEV/EPSS enrichment, mission scheduler every 30 min, pager every 10 min, compliance assessment daily, container CVE watch weekly, OS update weekly, stale-approval expiry hourly.
- **Firewall:** ufw active; 22/80/443 public, 5432 restricted to `172.17.0.0/16`.
- **SSH:** `passwordauthentication no`, `permitrootlogin without-password`, fail2ban `sshd` jail active.
- **Capacity:** disk 25G/194G (13%), RAM 15.9G with 13.9G available.
- **Observability:** `/metrics` exposed via prometheus_client, Prometheus config present at `/etc/prometheus/gds.yml`, service-watch and container-watch cron jobs, `alert_events` + pager script.
- **TLS:** Let's Encrypt via certbot.timer; one cert covering 4 hostnames, auto-renew on.
- **CI:** 7 workflows in `.github/workflows/` (`gds-pytest`, `gdsa-radar-security-gate`, `runtime-boundaries`, `security-scope-contracts`, 3 publish workflows).

### 1.6 Security posture of the app itself

- JWT: HS256, secret from settings; CORS from `settings.cors_origins_list`.
- `gds_api/mfa.py` exists (TOTP); **0 recovery codes enrolled** → MFA is implemented and unused.
- 65 environment variables in `/opt/.env` (OpenAI, Anthropic, AWS, Azure, Stripe, Linear, Slack, Resend, B2, MinIO, Neo4j, Redis, Postgres, JWT, bridge, backup).
- Dependency audit: `npm audit` → **19 vulnerabilities: 9 high, 10 moderate, 0 critical**. `pip-audit` is **not installed**, so Python dependencies have never been audited on this host.

---

## 2. Definition of "production ready" for this platform

A customer is onboarded, isolated, monitored and recoverable when all of the following hold:

Status of the six P0 items on 23 Nov 2026: P0-1, P0-3, P0-5, P0-6 closed and deployed; P0-2 guarded by a test that fails in both directions, with the 74 call sites still to work; P0-4 closed in code with the owner's enrolment outstanding.

1. **Isolation** — no tenant can read, infer or affect another tenant's data through any route or page, including aggregate and compliance surfaces.
2. **Truth** — no page, route or document states a number or a fact that was not measured. Absence is stated as absence, never as zero.
3. **Access** — every route is authenticated, authorised by permission, and rate-limited; the operator account is not the only account with a working credential; MFA is available and enforced for privileged roles.
4. **Recoverability** — proven restore and PITR (already true), plus a proven rollback of an application release.
5. **Change safety** — no change reaches customers without an automated gate that has been proved to fail (already true for the deploy script; not true for CI).
6. **Operability** — SLOs defined, alerts routed to a human and proved to arrive, capacity and cost bounded.
7. **Supply chain** — dependencies audited and updated, secrets rotated, no long-lived credential in a config file.

---

## 3. Conventions that must be honoured (each learned the hard way)

1. **Migrations** live only in `migrations/security_isolation/` and must take the next free number. `scripts/ops/migrate.py` reads that one directory and identifies a migration by numeric prefix; a file elsewhere is never applied and a reused number is skipped as "already applied", both while printing `DEPLOY OK`.
2. **`apps/api/gds_api/main.py`** is the app entry point (not `apps/api/main.py`). Routers are registered on the shared import line plus `app.include_router(...)`.
3. **`deploy.sh` runs `set -uo pipefail` with no `-e`, and `fail()` only prints.** Every call site needs its own `exit`. Do not "fix" `fail()` to exit: the migration failure path calls it and then performs a rollback.
4. **Never claim absence without grepping the whole file.** A capability was declared missing after reading only the first 240 lines of a 300-line module; it was implemented at line 251.
5. **Never declare a store exists because a table exists.** An empty store must render as "exists · 0 rows … nothing is configured", never as a configured one.
6. **Empty state must be gated on load completion.** `initialData` makes React Query report not-loading while the first fetch is in flight; an ungated empty message states a false absence. Gate on `loaded`/`isLoading` and word it "this read returned none", never "the register holds none".
7. **Count from the API, never from a fetched page.** Page length has been reported as the estate total three times (500 vs 1,002; 487 vs 849; 200 vs 314).
8. **Vocabulary:** findings are stored `observed → triaged → in_progress → resolved / accepted_risk / false_positive`; `security_findings` uses only `open / resolved / accepted_risk`. "In remediation" is derived (`status='open' AND remediation_started_at IS NOT NULL`), not a status. Active incidents are everything not `closed/resolved/false_positive`.
9. **SQL:** never write `:param::text IS NULL` (unparseable). Append the predicate in Python. Cast every optional filter (`cast(:x AS text) IS NULL OR col = cast(:x AS text)`) or asyncpg raises `AmbiguousParameterError`.
10. **Pydantic v2 does not coerce int→str.** Scanner ids are integers, governed ids are UUIDs; declare `str | int` and `str()` it.
11. **Probe accounts:** create a probe user to prove role gating, then delete in FK order `cost_records (mission_id) → capability_decisions → capability_requests → mission_tasks → missions → audit_events (user_id) → user_sessions → users`.
12. **Verification discipline:** `supervisorctl status`, never `systemctl`, for the API/worker/kernel. A batch browser capture can read empty mid-render; re-read before diagnosing. Prove with the page's own call, not a curl you compose.
13. **Strip `/* */` comments before asserting on component text** — tests have failed on the prose that names the removed claim.

---

## 4. P0 — blocks any external customer

### P0-1. A GitHub personal access token is stored in plaintext in `.git/config` — FIXED 23 Nov 2026 (revocation still owner-only)
- **Evidence:** `grep -c "ghp_" /opt/gds-os/.git/config` → `1`. The remote URL embeds `https://x-access-token:ghp_…@github.com/Al-Rabbani/shieldai-platform.git`. It is visible in `git remote -v` to anyone with shell access and would be captured by any log or screen share.
- **Why it blocks:** repo write access to the whole platform, revocable only by GitHub.
- **Do:** revoke that token at GitHub. Replace with a read-only deploy key or a machine user with a fine-grained token injected at deploy time (`GIT_ASKPASS`/credential helper), never persisted in `.git/config`. Confirm the token is not also in `.env`, any doc, or shell history.
- **Accept:** `grep -rc "ghp_\|x-access-token" /opt/gds-os/.git/config` → 0; a fresh clone from the repo works with the new mechanism; the old token shows as revoked in GitHub.

### P0-2. 44 entity names requested by routed pages have no route behind them — GUARDED, 74 call sites still open
- **Evidence:** routed graph (317 modules reachable from `App.jsx`) asks for 96 entity names at 382 call sites; the adapter serves 73 names; **44 unserved at 74 call sites**. Top offenders by call sites: `IncidentTimeline` (4), `CopilotTask` (4), `EvidenceActivity` (4), `EvidenceLibrary` (3), `SlackAlertSetting` (3), `FleetScalingConfig` (3), `SlaTarget` (3), `PostureAlertConfig` (3), `IncidentComment` (3), `AutoRemediationPolicy` (3). Full list of the remaining 34: `RiskScoringConfig`, `NationalThreat`, `AttackSimulation`, `Team`, `CopilotAuditLog`, `CopilotReport`, `LicenseRisk`, `RegulatoryNotification`, `ComplianceEvidenceAudit`, `PentestCampaign`, `AttackFinding`, `Organization`, `BusinessUnit`, `MSSPClientOrganization`, `OrganizationRiskProfile`, `DataSource`, `DataCatalog`, `DataLake`, `DataQualityRule`, `CopilotSession`, `SelfHealingEvent`, `ContainmentAction`, `ComplianceGap`, `ComplianceRecommendation`, `FleetScalingRun`, `AuthorizationPolicy`, `IdentityThreat`, `SBOM`, `NotificationDispatch`, `EscalationPolicy`, `NotificationPreference`, `ExecutiveInsight`, `BoardReport`, `ZeroTrustPolicy`.
- **Why it blocks:** an unserved read returns `[]`, so each of these renders as "none / 0", which reads as a measured clean state. This is the platform's most repeated defect class.
- **Do:** for each name decide one of three outcomes, and record the decision in `docs/MODULE_DECISIONS.md`:
  (a) **build the route** against a real store (the pattern in `apps/api/gds_api/*_api.py`, permission-gated, tenant-bound, `FORCE RLS` migration in `migrations/security_isolation/`);
  (b) **map to an existing route** if the data already exists under another name;
  (c) **refuse by name** in the adapter with a reason the page renders, plus an honest empty state.
- **Accept:** a test that walks the routed graph, extracts every `base44.entities.<Name>` and fails on any name absent from both the route map and the refusal map. That test does not exist yet; write it first (it is the only durable guard). Then every routed page renders either data or a stated refusal, verified in a browser.

### P0-3. Compliance is platform-wide, not tenant-scoped — FIXED 23 Nov 2026
- **Evidence:** `compliance_assessments` (315 rows), `compliance_controls` (297), `compliance_frameworks` (9), `compliance_scope_determinations` (1) have **no `tenant_id` column** and no RLS. `compliance_api.score_of` has no tenant predicate either.
- **Why it blocks:** with 5 tenants on the platform, every tenant reads the same compliance score. For an MSSP this is a cross-tenant disclosure and a wrong number simultaneously.
- **Do:** add `tenant_id` to the four tables, backfill to the operating tenant (`2ec10dd0-e48e-4043-8c88-5998ba5e23b0`), enable + FORCE RLS with the standard policy, add `tenant_id` to every query in `apps/api/gds_api/compliance_api.py`, and restate the header strip's `_CONTROL_SQL`. Decide explicitly whether a framework catalogue (`compliance_frameworks`) is shared reference data (keep global, read-only) while assessments and verdicts are per tenant.
- **Accept:** two tenants sign in; tenant B's `/compliance/frameworks` returns its own (empty or own) state and never tenant A's 315 assessments; a test asserts the SQL carries a tenant predicate; a probe tenant created and deleted for the proof.

### P0-4. Authentication is password-only in practice, with no MFA enrolment — FIXED 23 Nov 2026
- **Status:** closed at release `2a9ec118`. Migration 075 adds `roles.requires_mfa` (set true for every role here) and `users.mfa_enrolment_deadline`; `login` refuses an unenrolled account whose deadline has passed with `403 {code: mfa_enrolment_required, enrol_path: /settings/mfa}` and records it; `GET /auth/mfa/policy` states the requirement, the role, the deadline and hours remaining, and `/settings/mfa` renders it as a card.
- **What was measured first, and corrected the handover's own wording:** the two-step TOTP enrolment already existed (`/auth/mfa/status|enrol|confirm|disable`), login already refused a password-only sign-in for an ENROLLED account, recovery codes were honoured, and `/settings/mfa` was routed and wired. Nothing was REQUIRED: 0 of 5 accounts had enrolled. The mechanism was never the gap; the policy was.
- **Why a deadline rather than an immediate refusal:** the only account that can administer the platform would be refused at its next login, and enrolment itself needs a session. Existing accounts were given 72 hours (until 26 Nov 2026 14:49 UTC); accounts created after migration 075 carry no deadline and are refused immediately. The break-glass statement is written into the migration.
- **Proved live:** an overdue probe account → 403 `mfa_enrolment_required`; an account with no deadline → 403; an account inside the window → 200; that account then enrolled (secret, confirm 200), after which a password-only login returned 401 and a login with a TOTP code returned 200. Probes deleted, 5 users / 5 tenants.
- **Still owed by the owner:** enrolment. `GET /auth/mfa/policy` reports 0 of 5 accounts enrolled, so the deadline is the enforcement date, not a satisfied requirement. Do not read this item as "the estate is protected today".
- **Not browser-verified:** the settings card is built and the bundle serves (200, 2.7MB), but the browser session could not reach the host (`ERR_TUNNEL_CONNECTION_FAILED`) and the rendered page came back empty twice. Re-check `/settings/mfa` in a browser before calling the UI done.

### P0-5. CI does not gate the deploy, and dependency vulnerabilities are unaudited — FIXED 23 Nov 2026
- **Evidence:** the security gate workflow triggers on `pull_request` only (`branches: [main, master, develop]`); the deploy is a manual `scripts/ops/deploy.sh` on the VPS that runs the pytest suite and the web tests locally but does not require a GitHub check. `npm audit` reports **9 high, 10 moderate**; `pip-audit` is **not installed**, so the Python tree (including torch, fastapi, asyncpg) has never been audited here.
- **Why it blocks:** a change can reach production without any reviewer or remote gate, and known-vulnerable dependencies are shipping inside a security product.
- **Do:** install `pip-audit` and add it to CI plus the deploy gate with a severity threshold; triage and fix or formally accept the 9 npm highs (record each acceptance in `docs/decisions/`); make `main` protected and require the CI check; keep the deploy script as the *only* writer to the host but have it refuse a commit that is not green on the remote.
- **Accept:** `pip-audit` and `npm audit --audit-level=high` both run in CI and in `deploy.sh`; a deliberately introduced high-severity dependency blocks the deploy (prove both ways, as the existing web gate was proved); GitHub shows the check required on `main`.

### P0-6. ~683 unreachable page files contain fabricated data — FIXED 23 Nov 2026
- **Evidence:** 785 page files on disk, 102 imported by `App.jsx`. The dead ones still carry `Math.random`, `FALLBACK_*` arrays and "coming soon" strings. Two of these were already caught pretending in production (`RansomwareTrackerPage` with invented gangs and victim counts; `ThreatIntelPage` with a `CANONICAL_THREAT` object claiming 15,847 IOCs and named CVEs against named assets).
- **Why it blocks:** they are one import away from lying to a customer, and they make every audit of "what does this platform actually show" twice as expensive.
- **Do:** move unreachable page modules and their exclusive components to `apps/web/src/_retired/` (or delete, with the list recorded in `docs/RETIRED_MODULES.md`), keeping anything imported by a routed module. Add a test that fails when a file under `pages/` is not reachable from `App.jsx` and not on the retired list.
- **Accept:** the test passes with 0 unclassified files; the production build size drops; `docs/RETIRED_MODULES.md` names every retired module and why.

---

## 5. P1 — blocks a paying customer

### P1-1. Fixture and randomness markers inside routed code
- **Evidence:** 99 `Math.random` sites, 6 `FALLBACK_`, 12 `MOCK`, 25 "coming soon" strings, all still in `src/`.
- **Do:** triage every hit that is reachable from a routed module. Each is either a real calculation (keep, and name the source), a placeholder that must become a refusal, or dead code (retire per P0-6).
- **Accept:** zero `Math.random` and zero `FALLBACK_` reachable from a routed page, pinned by the reachability test from P0-6 plus a marker scan that reports the count and the files.

### P1-2. Alert delivery is configured but not proved
- **Evidence:** `SLACK_WEBHOOK_URL` present in `/opt/.env`, `alert_rules`/`alert_events` tables exist, `check_alerts.py` runs every 5 minutes, `gds-pager.py` every 10. No evidence in this audit that a message was ever delivered to a human.
- **Do:** prove one end-to-end delivery for each channel that is claimed (Slack, email via Resend, PagerDuty if present): fire a synthetic event, confirm arrival, record the timestamp. Where a channel is not configured, the UI must say so rather than showing a green "connected".
- **Accept:** a dated proof per channel (screenshot or message id) in `docs/operations/alerting.md`, and a page that states the last successful delivery per channel.

### P1-3. Scan freshness is unproven
- **Evidence:** the 6-hourly deterministic scan and the DAST/container schedules are registered, but the register has not gained a row since 19 Nov (per the 22 Nov readiness audit) and dedupe may be masking a broken ingest.
- **Do:** instrument one scan run end to end: count rows read, rows deduped, rows created, and write the result to a log the operator can read. If a scan genuinely finds nothing new, say so with the counts.
- **Accept:** the next two scheduled runs produce a log line with `considered / new / deduped / failed` and a matching row delta (or an explicit "0 new, N deduped").

### P1-4. No application-level rollback
- **Evidence:** `deploy.sh` keeps the previous frontend bundle at `/var/www/app-v2.prev`, but the API rollback path is "check out the previous commit and redeploy". Migrations have no down path.
- **Do:** document and rehearse a rollback: previous commit redeploy with the migration compatibility rule (every migration must be additive and backward compatible for one release), plus a written procedure with timings.
- **Accept:** a rehearsed rollback to `5e559ca`'s predecessor on a staging clone with the measured time, recorded in `docs/operations/rollback.md`.

### P1-5. No staging environment
- **Evidence:** one host, one database, one branch (`gdsa-radar-live`) that serves production.
- **Do:** either a second VPS or a compose stack with a restored dump; deploys land there first and are smoke-tested before production. This is also where P1-4 is rehearsed.
- **Accept:** a documented staging URL and the promotion procedure, with one release promoted through it.

### P1-6. Secrets live only in `/opt/.env` with no rotation
- **Evidence:** 65 variables, no vault, no rotation policy, no record of when each was last changed.
- **Do:** a rotation register (name, owner, last rotated, rotation interval, blast radius if leaked) in `docs/operations/secrets.md`; rotate the highest-blast-radius keys first (AWS, OpenAI, Stripe, GitHub, JWT secret — note that rotating the JWT secret invalidates all sessions).
- **Accept:** the register exists with real dates; at least the GitHub token (P0-1) and one provider key rotated with the procedure written down.

### P1-7. Security headers incomplete
- **Evidence:** previously measured HSTS, X-Frame-Options and X-Content-Type-Options present; **Content-Security-Policy and Referrer-Policy absent** (re-verify before changing).
- **Do:** add CSP (report-only first, then enforcing) and `Referrer-Policy: strict-origin-when-cross-origin`, plus `Permissions-Policy`. A security platform without CSP is an easy finding against itself.
- **Accept:** `curl -sI https://app.globaldigitalsecurity.io/v2/` shows both headers; a browser load of `/v2/` produces no CSP violation in the console.

### P1-8. Customer onboarding is unproven end to end
- **Evidence:** `api_keys` holds 0 rows; there is 1 real customer tenant among 5 and no paying subscription in this audit.
- **Do:** create a tenant through the real path (`POST /admin/tenants`), issue an API key, authenticate a machine client with it, run one read, then revoke the key. Prove isolation at every step.
- **Accept:** a written walkthrough with the request/response of each step and the revocation returning 401 afterwards.

---

## 6. P2 — should fix before scale

1. **RLS coverage:** 92/102 tables forced. For each of the 11 without `tenant_id`, record whether it is legitimately global (catalogue/reference/migration bookkeeping) or a gap (P0-3 is the compliance case).
2. **No coverage gate or mutation testing.** 1,238 tests exist but nothing fails on a coverage drop. Set a floor on `gds_api/` and enforce in CI.
3. **No load or soak testing.** No measured p95 for the API, no concurrency ceiling. `/metrics` exists, so measure before optimising.
4. **No SLOs.** Define availability and latency targets for the API and the Co-Pilot mission path, and alert on error budget.
5. **Retention.** 220 missions, 246 cost rows, 1,002 findings, growing scan history: define retention per table and enforce it with a job (WAL and qdrant pruning already exist as the pattern to copy).
6. **Data protection.** No documented retention/erasure path for tenant data, no DPA template, no record of processing. Required the moment an EU customer signs.
7. **Platform's own incident response.** The product sells IR; it has no runbook for its own outage. Write one: who is paged, how to fail over, how to communicate.
8. **Adapter drift.** 73 hand-maintained mappings against 409 API paths. Generate the route map from `/openapi.json` and fail the build when a page asks for a name that is not in the spec.
9. **API versioning.** No `/v1` prefix, no deprecation policy; a breaking change today breaks every deployed client silently.
10. **Docs single source of truth.** 12 documents in `docs/` describe different eras of the platform. Consolidate into: architecture, operations, security model, decisions register.

---

## 7. P3 — hygiene

1. Branding inconsistency in code and copy: `shieldai-platform`, `ShieldAI`, `GDS OS`, `GDSA Radar`, `GDS Agent OS` all appear. Pick one per context (product name vs repo name) and sweep.
2. `apps/api/venv` is inside the repo tree (a `torch` RECORD file matched a secret scan). Exclude virtualenvs from scans and from the repo.
3. Dead dependency weight: `torch` is installed in the API venv; confirm whether inference is actually used before keeping ~2GB of dependencies in a security API.
4. `Math.random` in non-security UI animation is acceptable; document the rule so a future audit does not have to re-adjudicate 99 sites.
5. Cron density: 20 entries on one host, several overlapping every 5 minutes. Consolidate into a scheduler with a lock and a single run log.

---

## 8. What is already done — do not rebuild

- Backups, off-host encrypted copies, WAL pruning, weekly restore drill **PASS**, weekly PITR rehearsal **PASS**.
- 92/102 tables with RLS **forced**; tenant isolation proved repeatedly (probe tenants, cross-tenant reads returning 0).
- Health with per-dependency latency; `/metrics`; Prometheus config; service and container watchdogs; pager.
- Deploy gate that refuses a broken frontend or a failing adapter test, proved both ways; migrations versioned and audited.
- Co-Pilot: capability map (23 agents, 70-entry catalogue), memory store with RLS, scheduler with pause/resume and run log, multi-agent orchestration with per-agent cards and real cost, voice round trip (whisper-1 → tts-1) with cost recorded.
- Honesty sweep already applied to: threat-intel feed, dark web, ransomware, APT, CVE tracker, VM security, container security, cloud posture, attack paths, incident playbooks, fix strategies, remediation templates, custom reports, assignment rules, platform settings, secrets posture, scheduler, Co-Pilot rail.

---

## 9. Reproduction commands (run on the host)

```bash
cd /opt/gds-os
git log -1 --format='%H %ad %s' --date=iso && git status --porcelain | wc -l
curl -s localhost:8000/health | python3 -m json.tool | head -40
curl -s localhost:8000/health/version
curl -s localhost:8000/openapi.json | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d['paths']))"
sudo supervisorctl status; docker ps --format '{{.Names}} {{.Status}}'
sudo -u postgres psql -d gds_os -tAc "select count(*) from security_findings"
sudo -u postgres psql -d gds_os -tAc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relforcerowsecurity"
PYTHONPATH=apps/api apps/api/venv/bin/python -m pytest tests/ -q
cd apps/web && node --test tests/ && npm audit --audit-level=high
```

For the routed-graph coverage measurement (P0-2), the working script walks `App.jsx` imports to depth 2 and compares every `base44.entities.<Name>` against the keys in `base44Client.js` that carry a `path:`. A regex on the adapter alone is not enough: entries span multiple lines, so brace-match each top-level object.

---

## 10. Suggested order of work

1. P0-1 (token) — minutes, and it is a live credential.
2. P0-2 guard test, then work the 44 names by call-site count (the test protects every later fix).
3. P0-3 compliance tenancy — needs a migration, a backfill and a two-tenant proof.
4. P0-4 MFA enforcement.
5. P0-5 dependency audit in CI + protected `main`.
6. P0-6 retire unreachable pages (shrinks the P1-1 surface immediately).
7. P1-2, P1-3, P1-7 — cheap proofs that remove three unknown states.
8. P1-4, P1-5, P1-8 — the release and onboarding machinery.
9. P2/P3 as capacity allows.
