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

1. **Stripe card entry and `invoice.payment_succeeded`.** Needs one deliberate low-value live transaction and an immediate refund. Only live Stripe keys are configured, so there is no test mode to fall back on. The handler writes `billing_payments` and has never run on a real charge.
2. **Owner MFA enrolment** — due Thursday 26 November 14:49 UTC. Owner-only.
3. **GitHub PAT revocation** — owner-only.
4. **Neutralised probe account** `probe-copilot@example.com`: inactive, password hash replaced, sessions removed, login returns 401. A full delete needs the `capability_requests → capability_decisions` children purged first.
5. **35 modules still name an unserved store**, each with a recorded reason and 0 unresolved. 23 name it only (picker/dropdown), 6 already state the absence, 5 make a claim about a *served* store, 1 partly settled (`AttackVectorSimulator` derives its graph from findings; `AttackPath` has no store).
6. **Voice is proved at the API and wired in the UI, but not exercised through the browser microphone.** A manual recording in a real browser is the last mile.
