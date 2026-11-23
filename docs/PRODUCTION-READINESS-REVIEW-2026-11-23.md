# GDS OS — Production Readiness Review

**Measured:** 23 November 2026, 15:00 UTC · **Release:** `f315d3f` (branch `gdsa-radar-live`, tree clean, 75 migrations)
**Method:** every number below was read from the running platform — the live API, the live database, the filesystem and a browser — not from a document. Where something could not be measured it says so.
**Audience:** an external coding agent (Codex) finishing the assessment, and the platform owner.

---

## 1. Verified state

**Runtime**
- `GET /health` healthy; supervisors `gds-os`, `gds-worker`, `gds-kernel` RUNNING; 5 containers up; uptime 2d 15h.
- Disk 25 GB of 194 GB used (13%); 13 GB RAM available of 15 GB.
- API surface: **410 paths / 458 operations**. Test suite: **1,262 python tests collected**, **43 web test files** (adapter suite 171).

**Data**
- **102 tables**; 94 with RLS enabled *and* forced; 9 without a `tenant_id` column (§3 P1-3).
- 5 users / 5 tenants / **1,002 findings (849 open)** / 2 incidents / 221 missions / 250 cost rows / 0 API keys / **0 of 5 accounts MFA-enrolled**.
- Compliance: 315 assessments / 297 controls / 9 frameworks / 1 determination, tenant-scoped since migration 074.
- 24 knowledge documents / 4 evidence rows / 5 alert rules / 6 scan schedules / 0 copilot memories.
- **5 MSSP customer rows, 0 active billing subscriptions, 0 pentest agreements.**

**Security**
- TLS: Let's Encrypt (YR1), valid to 11 Jan 2027, TLSv1.3 only, chain verified on `app.` and `api.`.
- Edge (`nginx/1.18.0`) sends HSTS, CSP, X-Frame-Options, Referrer-Policy, X-Content-Type-Options on **both** hostnames. The origin on `127.0.0.1:8000` sends none — correct only while nothing reaches the API except through the edge (port 8000 is bound to loopback).
- `ufw` active; `fail2ban` sshd jail; sshd password authentication **off**.
- GitHub token: **0 occurrences in `.git/config`** (credential helper reads `/opt/.env`, mode 600). The token itself has **not been revoked** — see P0-2.
- MFA: enforced at login for enrolled accounts, and now **required by policy for every role** (migration 075). 0 accounts have enrolled; the owner's deadline is **26 Nov 2026 14:49 UTC**.

**Operations**
- 23 cron entries: mission scheduler every 30 min, alert check every 5 min, service watch every 5 min, scan every 6 h, enrichment every 12 h, daily compliance assessment, weekly container watch and OS update.
- **Backups are real and verified**: daily 02:30 dump → gpg AES256 → Backblaze B2 bucket `gds-os-backups`, 14 retained, sha256 verified, watcher every 30 min (last run 15:00, 12 h old, rc=0), WAL prune, weekly restore drill and PITR rehearsal.
- CI: 7 workflows including `gds-pytest.yml`, `gdsa-radar-security-gate.yml` and `dependency-audit.yml` (runs on push, not only PR).

**Dependencies**
- npm: 5 advisories (1 high — `zod`, semver-major, baselined with a written reason — 4 moderate).
- `pip-audit`: clean except **`torch` 2.14.1+cpu cannot be audited** (not published on PyPI in that build), so that dependency is unaudited rather than safe.

---

## 2. Already production-grade — do not rebuild

1. Tenant isolation on the security data: 94 tables RLS enabled *and* forced, every route binds `str(current_user.tenant_id)`, compliance tables included since migration 074.
2. Backup, restore drill, PITR rehearsal, WAL pruning — proved, not promised.
3. Deploy gate: dependency audit → web build → served-bundle identity → migrations → restart → smoke, each with its own exit code.
4. Permission model with wildcard support, 403s that name the missing permission, and audit records for denials.
5. Voice round trip (tts-1 / whisper-1) writing real cost rows; multi-agent mission orchestration behind a permission and a rate limit.
6. The honesty programme: absent stores are named rather than rendered as zero (per-page banner since `f315d3f`), and 683 unreachable page files retired.

---

## 3. What is left, in the order it blocks production

### P0 — blocks launch

**P0-1. The owner is three days from locking himself out.**
*Evidence:* `roles.requires_mfa = true` for every role; `users.mfa_enrolment_deadline = 2026-11-26 14:49 UTC` for every existing account; 0 of 5 enrolled. After the deadline `POST /auth/login` returns `403 mfa_enrolment_required`.
*Do:* enrol at `/settings/mfa` (two-step: secret + recovery codes shown once, then a code proves the authenticator), store the 10 recovery codes offline, then confirm `GET /auth/mfa/policy` reports `mfa_enabled: true`.
*Accept:* policy card reads "Required by your role · satisfied"; a fresh browser session signs in with password + code.

**P0-2. The exposed GitHub token is still valid.**
*Evidence:* removed from `.git/config`, but a PAT that sat in a repo config for months is a credential that must be assumed compromised. Only the owner can revoke it.
*Do:* revoke at GitHub → issue a fine-grained token scoped to this repository → update `/opt/.env` → confirm `git fetch` still authenticates.
*Accept:* the old token returns `401` from `api.github.com`; a fetch succeeds with the new one.

**P0-3. No customer has ever completed the lifecycle.**
*Evidence:* 0 active subscriptions, 5 MSSP customer rows (a read view, not paying tenants), 0 pentest agreements, 0 API keys issued. Nothing has proved signup → provisioning → scan → report → invoice end to end with a real second party.
*Do:* run one complete lifecycle against a throwaway tenant, then write it up as `docs/runbooks/customer-onboarding.md`: signup, email verification, tenant provision, first authenticated scan, a generated report, and a Stripe checkout to the point of payment (test mode first, then one live transaction, refunded).
*Accept:* a runbook that a second person can follow without the author, plus the tenant and report it produced.

**P0-4. The finding register has not moved since 19 November.**
*Evidence:* findings per day — 14 Nov 61, 17 Nov 225, 19 Nov 624, nothing since; newest mission 23 Nov 14:31 (the platform is alive), newest finding 19 Nov 20:28. A scanner that silently stopped looks identical to an estate with nothing new.
*Do:* prove the 6-hourly scan executes and writes: run it by hand, compare the row count before and after, and record the scanner's own output. If the estate genuinely has nothing new, make that a monitored fact ("N runs, 0 new findings, last checked HH:MM") rather than an unexplained silence.
*Accept:* either new rows with a timestamp today, or a recorded 0-new-findings result naming the run and its log.

**P0-5. One operator.**
*Evidence:* 5 users, one `admin` (the owner), no second administrator, no API keys.
*Do:* create a second administrator, enrol them in MFA, and prove break-glass from the migration 075 procedure (clearing one account's deadline for an hour) on a throwaway account.
*Accept:* two MFA-enrolled administrators; a written break-glass test with its result.

### P1 — blocks scale and trust

**P1-1. 44 entity names are still asked for with no route behind them** (58 call sites across 40 modules: 22 pages, 18 components). The per-page banner now states the absence, so nothing reads as a measured zero, but each page still renders an empty panel instead of its own sentence. *Do:* work the list page by page — either serve the name from a real route or state the absence in the panel. *Accept:* the baseline file shrinks; the guard test fails if it grows.

**P1-2. Two routed components still generate random numbers.** `components/copilot/MissionControlPanel.jsx` (via `/copilot`) and `components/home/GlobeHero.jsx` (via `/`) call `Math.random`. Nine further components do too but are imported by nothing routed — they are dead code of the same family P0-6 retired. *Do:* confirm what the two live ones drive (a starfield is acceptable, a score is not), remove any that reach a displayed number, and retire the nine orphans. *Accept:* no routed module calls `Math.random`; a guard test enforces it.

**P1-3. Five tenant-data tables have no `tenant_id`.** `incident_findings` (20 rows), `security_incidents` (1), `repository_policies` (1), `workspace_policies` (1), `engagement_targets` (0). The other four without the column are correctly global (`compliance_frameworks`, `compliance_controls`, `schema_migrations`, `tenants`). *Do:* add `tenant_id` + RLS to the five, or document why they are global and prove no route can read another tenant's rows. *Accept:* 94 → 99 forced-RLS tables, or a written justification with a test.

**P1-4. No SLOs, no alert-delivery proof, no staging, no application rollback.** Alerts are configured but nothing has shown one arriving; migrations have no down path, so rolling back the API to the previous commit against a newer schema is untested. *Do:* define 3–5 SLOs with measurement, send one real alert to each channel and record the arrival, and rehearse `git checkout <prev> && deploy` against the current schema. *Accept:* an SLO file, delivery timestamps, and a recorded rollback rehearsal.

**P1-5. Dependency posture has two holes.** `torch` 2.14.1+cpu cannot be audited at all; the one high npm advisory (`zod`) is baselined on a written argument rather than fixed. *Do:* audit or remove `torch` (it is only needed if a local embedding model is used — check whether anything imports it), and schedule the `zod` 4 migration as its own item. *Accept:* `pip-audit` reports no unauditable packages; the npm high is either fixed or the baseline entry carries a review date.

**P1-6. 66 secrets live in one file with no rotation register.** `/opt/.env` (mode 600) holds every credential; none has a rotation date. *Do:* create a rotation register naming each key, its owner, its last rotation and its next, and rotate the highest-value ones (OpenAI, Stripe, GitHub, database). *Accept:* the register exists, at least the four named keys have been rotated once with proof the platform still works.

**P1-7. No coverage gate.** 1,262 tests exist and none of them measures coverage, so "the suite is green" says nothing about what is untested. *Do:* add `--cov` with a floor set just below today's measured number, and raise it deliberately. *Accept:* CI fails on a coverage drop.

### P2 — operational maturity

1. **API keys: 0 issued.** Customer machine access is built and unproven — issue one, use it, revoke it.
2. **Edge rate limiting absent.** `nginx` has no `limit_req`; the API rate-limits internally per tenant. Add a coarse edge limit for unauthenticated paths.
3. **Copilot memory unused** (0 rows) and the scheduler's $1.50 cap is tuned to a cadence that has not run for weeks — re-measure after P0-4.
4. **Nine orphan components** with invented data (see P1-2) and 683 retired page files still in the tree: archive or delete.
5. **Notification semantics** — 323 rows, unread tracked by `read_at`; verify the bell's count after the schema change rather than trusting the older `is_read` assumption.
6. **No load test.** One concurrent-user rehearsal against `/findings` and `/reasoning/mission` would establish the real ceiling.
7. **Evidence store nearly empty** (4 rows) — the audit trail depends on it.

### P3 — polish

1. Runbooks index; on-call rota and escalation contacts.
2. `docs/RETIRED_PAGES.json` reviewed and the retired tree archived out of the build.
3. A quarterly restore-and-rollback rehearsal calendar (the weekly drill already runs).

---

## 4. Order of work

1. **P0-1 today** — it is time-boxed and it locks the owner out.
2. **P0-2** — revoke the token; nothing else depends on it.
3. **P0-4** — establish whether the scanner is alive; every other security claim rests on the register being current.
4. **P0-5 then P0-3** — a second operator before a first customer.
5. **P1-3, P1-2, P1-1** — isolation, then honesty in the UI, then the page-by-page queue.
6. **P1-4 → P1-7** — the operational scaffolding that makes the above sustainable.

## 5. Absences that are stated, not defects

These are named in the product because the data does not exist. Do not "fix" them by inventing data:
no A2A protocol, no MCP transport, no token streaming, no per-department risk dimension, no eBPF sensor, no secret scanner, no access-policy or rotation store, no dark-web collector, no APT actor feed, no narrative report store, no CVE exploit-maturity field, and no scan-job queue.

---
*Superseded by this review: `docs/PRODUCTION-READINESS-HANDOVER-2026-11-23.md` (the pre-P0 document). Keep it for history; use this one.*
