---
title: Production readiness — measured state, 25 November 2026
summary: What has been proved since the 23 November review, what is still open, and the evidence for each. Supersedes the P0 list in PRODUCTION-READINESS-REVIEW-2026-11-23.md where the two disagree.
---

# Production readiness — 25 November 2026

Every line below was measured against the live platform. Releases are the `GDS_RELEASE_SHA` values the deploy gate printed.

## Closed and proved

| Item | Release | Evidence |
|---|---|---|
| Scanner liveness visible in the product | `22e9c9e` | `GET /scan/health` + SOC panel; 7 scanners report interval, last run, verdict, and the register's own newest finding. Two real schedule defects found on its first live call. |
| Schedules live in the repo | `0b781fe` | `config/cron/root.crontab` is reinstalled by every deploy. Container CVE watch daily, OSV daily; all 7 schedules stamped. |
| Tenant isolation complete | `3096350d` | 100 of 103 tables FORCE-RLS; the 3 without `tenant_id` are `compliance_frameworks`, `compliance_controls`, `schema_migrations`. Unbound session reads 0 from all five migrated tables. |
| Customer lifecycle runs end to end | `4cacaf32` | `POST /admin/tenants` → owner login → own empty estate → report → API key. Runbook: `docs/runbooks/customer-onboarding.md`. |
| MFA default cannot be omitted | `4cacaf32` (mig 079) | `roles.requires_mfa` defaults true; 0 of 7 roles without it. Before: every provisioned tenant opted out by omission. |
| API key scopes | `ef63298` | Scoped key reads `/findings`, refused on `/admin/users`. Empty and unknown scopes now 400. |
| Stripe webhook accepts real events | `fb18d54a` | Valid signature → 200, entitlement promoted (quota starter → professional, `plan_tier` NULL → professional). Forged and missing signatures 400. Replay `duplicate:true`. |
| Absent-store wording | `a9a5b2b`, `3f333dd`, `64bb732` | 16 modules worded from one shipped reason map; queue re-baselined to 35 entries with 0 unresolved. Fabricated incident milestones removed. |
| Refused writes are visible | `d9d57ed` | Eight sites converted; guard `tests/test_write_failure.py`. |
| Co-Pilot usable by analysts | `48f10dc` (mig 080) | `copilot:orchestrate` was in no role list, so only wildcard roles passed. Analyst mission: 200 in 7.96s, 2 agents, $0.0185, correct answer. |
| Voice loop | measured, no code change needed | `POST /copilot/voice/speak` → 61,824 bytes `audio/mpeg`; that MP3 into `POST /copilot/voice/transcribe` → exact transcript, whisper-1, $0.000386. UI already wires both (`ChatInputBar` mic, `ChatMessage.speak`). |

## Still open

1. **Stripe card entry.** Needs one deliberate low-value live transaction and an immediate refund. Both webhook
   branches are proved (25 Nov: a signed `invoice.payment_succeeded` wrote a real `billing_payments` row at £399/GBP
   and was cleaned up); only the card entry itself needs a person with a card. Only live keys are configured.
2. **Owner MFA enrolment** — due Thursday 26 November 14:49 UTC. Owner-only: enrolling a factor he does not hold
   would lock him out. If he misses it, `scripts/ops/mfa-break-glass.sh` grants a 1–24 hour window (built and proved
   25 Nov, fails closed if it cannot write its audit row).
3. **GitHub PAT revocation** — ✅ CLOSED 25 Nov 04:20 UTC, verified 401. Was owner-only. Measured 25 Nov: the token in `/opt/.env` is **still live** (`GET
   https://api.github.com/user` returns 200 as `AI-Rabbani000`). It is out of `.git/config`, but a classic PAT can
   only be revoked in GitHub's settings by its owner.
4. **35 modules still name an unserved store**, each with a recorded reason and 0 unresolved. 23 name it only
   (picker/dropdown), 6 already state the absence, 5 make a claim about a *served* store, 1 partly settled.
5. **Voice: the API and the browser's own format are proved, a physical microphone is not.** 25 Nov: the spoken MP3
   was transcoded to webm/opus — what `MediaRecorder` actually sends — and transcribed back word for word
   (whisper-1, $0.000465). The remaining unknown is hardware, not code.

6. **Alert delivery is configured but has never been proved to deliver.** `GET /alerts/channels` (added 25 Nov)
   reports what the serving process actually has: **email and Slack configured** (`RESEND_API_KEY`,
   `SLACK_WEBHOOK_URL`, `ALERT_EMAIL_TO` are set), Teams and PagerDuty not configured. No delivery has ever been
   recorded — `notification_dispatches` has no table, so nothing records an attempt. The next step is one deliberate
   alert delivered to a real channel and recorded, not another status endpoint.

Closed since the list above was written: the neutralised probe account was purged (5 test missions and their
children, deepest-first); `invoice.payment_succeeded` proved; the webm/opus voice leg proved; the MFA break-glass
built.

## GitHub PAT revocation — CLOSED 2026-11-25 04:20 UTC

Revoked in the live browser while signed in as AI-Rabbani000. The account held exactly one classic token,
"Agentic AI Security Operating System" (admin:enterprise, admin:org, delete_repo, workflow, write:packages,
delete:packages, repo, user, project, copilot, codespace; expired 2027-08-01). Deleted via Delete ->
"I understand, delete this token".

Proof: GET api.github.com/user returns 401 "Bad credentials".

Consequence, proved with `git push --dry-run`: push from the VPS now fails with "Invalid username or token.
Password authentication is not supported for Git operations." Reads still work only because
Al-Rabbani/shieldai-platform is a public repository, so `git ls-remote` is not proof of authentication.

To restore push: either a fine-grained PAT scoped to Al-Rabbani/shieldai-platform (Contents and Pull requests
read/write) in /opt/.env, or an SSH key on AI-Rabbani000 with the remote switched to SSH, which keeps no token
in /opt/.env. The dead token remains a line in /opt/.env and the git credential helper still reads it.

## Git push restored over SSH — CLOSED 2026-11-25 04:20 UTC

The revoked PAT was the only push credential. Replaced with an SSH key rather than another token, so nothing
that can leak sits in /opt/.env.

- Key: /root/.ssh/github_gds_os (ed25519, no passphrase, comment gds-os-vps@globaldigitalsecurity.io)
- Added to the AI-Rabbani000 account as "gds-os-vps Hostinger KVM4", SHA256:0x8xvwNS5B+EXsvKsznCsvdd5AJhx/IQb/F7+Dxzaf8
- /root/.ssh/config pins github.com to that IdentityFile with IdentitiesOnly yes
- Remote switched from https:// to git@github.com:Al-Rabbani/shieldai-platform.git
- The https credential.helper that read GITHUB_TOKEN was removed

Proof: `ssh -T git@github.com` returns "Hi AI-Rabbani000! You've successfully authenticated"; `git push --dry-run`
reports `* [new branch] HEAD -> probe-auth-check` with no error, which exercises write permission.

The dead GITHUB_TOKEN line was removed from /opt/.env (backup /opt/.env.bak-20261125-041449) and the API was
restarted through supervisor (`supervisorctl restart gds-os`), because the process had loaded the old value at
boot. After restart: pid changed, GITHUB_TOKEN absent from the process environment, /health 200, 413 paths,
all three supervisor programs RUNNING, push still good.

Note: secrets_api.py decides "configured" by env presence, so a dead token would have made the secrets page
claim GitHub was configured. Removing it keeps that page truthful. security_gate_client.py now fails closed with
"GitHub read credential is not configured" if it ever runs outside CI; inside GitHub Actions it gets its own
GITHUB_TOKEN, so CI is unaffected.

## Stripe card entry and invoice.payment_succeeded — CLOSED 2026-11-25 04:33 UTC

Proved with a real £1.00 live payment entered by the owner, then reversed. Stripe: session complete/paid at
100 gbp, invoice in_1UfXseCbzy8IofOuDjdc12jo paid, subscription sub_1UfXszCbzy8IofOusPFkeFKt active. Platform:
four livemode events with signature_verified true in billing_events, including invoice.payment_succeeded
(evt_1UfXt2Cbzy8IofOuAFGdpZfl), and a real billing_payments row (amount_paid 1 gbp, status paid, live invoice
URL); tenant promoted to starter/active.

Reversed immediately: subscription cancelled, charge refunded in full (re_3UfXseCbzy8IofOu0LiVGJZ8, succeeded,
amount_refunded 100), test price/product deactivated, Stripe customer deleted, throwaway tenant and its billing
rows deleted. Details in docs/runbooks/customer-onboarding.md section 5.1.

Note for anyone repeating this: the platform's /billing/checkout accepts only starter/professional/enterprise,
so the cheapest self-serve proof is £399. A £1 proof requires creating a test price directly in Stripe and
passing the tenant in metadata, which is what was done here.

## Absent-store queue closed — 2026-11-25, release b7cf5e6

The queue was measured before anything was edited. Of its 35 modules: 23 only NAME an unserved store (a picker, or
a read never presented as a count), 6 already stated the absence in their own prose, 5 make their claim about a
SERVED store (cloud_assets 145, incidents 2, repositories 1, KPI at /executive/kpis), 1 derives its graph from
findings. Naming an unserved store is not a defect; rendering its emptiness as a value is.

FOUR REAL DEFECTS FIXED:
- ExecutiveDashboardPage rendered "No executive insights generated" and "No board reports generated" as empty
  states over ExecutiveInsight and BoardReport, neither of which has a table.
- IncidentTimelineView returned "No timeline events recorded yet." for every incident, because IncidentTimeline has
  no store: the reader was told the investigation history was empty rather than absent.
- CodeSecurityDashboardPage collapsed an empty LicenseRisk list to nothing (licenseRisks.length > 0 && ...), and
  silence about licence risk reads as no licence risk.
- AttackVectorSimulatorPage fetched AuthorizationPolicy into state on every load and never rendered it; removed.

TEN MORE MODULES WERE LATENTLY BROKEN AND NOBODY KNEW: every module converted in the earlier absent-store passes
called absentStoreReason(...) without importing it. The call sits inside an empty-branch conditional, so it only
evaluates when the panel is actually empty, which is why builds, tests and browser checks against tenants WITH data
all looked correct. Each would have thrown a ReferenceError and blanked its route on the first empty panel:
SessionHistorySidebar, GeographicThreatHeatmap, EvidenceActivityTimeline, AgentLogsDrawer, EngineerSlackList,
FleetPerformanceTab, AlertsNotificationsPage, AuditCompliancePage, DataFabricPage, AssignmentRulesPage.

THIS PASS CAUGHT ITSELF DOING IT: the first cut inserted the calls before adding the import and the helper skipped
the import because the name was already in the file. Build green, tests green, /v2/executive-dashboard rendered a
blank body. tests/test_absent_queue_closed.py now asserts that every module calling absentStoreReason also imports
it, and asserts no queue entry still claims an outstanding defect.

VERIFIED BY RENDERING on a throwaway tenant whose panels are genuinely empty (the exact condition that used to
throw): /v2/executive-dashboard reads "no insight store; insights are generated per answer" and "no board-report
store; reports are exported, not saved"; /v2/code reads "no licence store; SBOM ingestion never ran, so there is
nothing to licence-scan"; /v2/compliance reads "no gap store; gaps are derived from failing controls". Probe purged,
5 users, login 401.
