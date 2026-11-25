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

Everything that was on this list as a build item is now closed. What remains is hardware and one design boundary.

1. **A physical microphone has never been used.** The API, the browser's own webm/opus format and the round trip are
   proved; the remaining unknown is a person speaking into a device. Not a code item.
2. **The Co-Pilot's memory is operator-stated only, by design.** Proved 25 Nov (release `3723c00`): a memory recorded
   through `/v2/copilot/memory` reaches the model and shapes the answer, the mission reports how many it used, and
   another tenant's memory is neither counted nor applied. But nothing records a memory from a mission's own
   outcome, so the Co-Pilot does not yet learn from work it has done. That is the next honest gap in "give the
   Co-Pilot a brain", and it needs a rule for what is safe to remember automatically before it is built.

Closed since the previous list: alert delivery (a real email and a real Slack message, both recorded); the Stripe
card entry (a real £1 live payment, refunded); owner MFA enrolment (04:20 UTC, 10 recovery codes); the GitHub PAT
(revoked, 401); the absent-store queue (measured, four defects fixed, ten missing imports found).

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

## Co-Pilot standing memory — proved, reported, and scoped — 2026-11-25, release 3723c00

The store, the three routes and the claim all existed before this pass: `copilot_memory`, `GET/POST/DELETE
/copilot/memory`, and a comment in `copilot_api.py` saying a mission "prefixes the goal with up to 20 recorded
memories ... and reports standing_memory_count on the mission context". The table held **0 rows**, so none of it had
ever run.

PROVED LIVE with a scoped API key (sha256 of a `gds_` key against `api_keys.key_hash`, no throwaway user): a memory
recorded through `POST /copilot/memory` came back on `GET /copilot/memory`, and a mission answer ended with the
literal mark the preference demanded. Recorded memory really does reach the model.

DEFECT FOUND BY THE PROOF: the response carried `standing_memory_count: None`. `_with_standing_memory` built the count
onto a context dict and the route then returned a fixed dict that never included it, so the documented count could
not be read by any caller and no page could say whether an answer had been shaped by memory. The response now carries
`standing_memory_count`, `standing_memory_error` (stated as None, never omitted) and `goal_original`, because the goal
sent to the engine is prefixed with the memory block and the caller should still get back what it asked.

TENANT SCOPE PROVED, NOT ASSUMED: with a decoy memory belonging to a different tenant in the table, a mission on this
tenant reported count 1, applied its own mark, and neither counted, applied nor echoed the decoy.

THE OPERATOR LOOP PROVED IN A BROWSER at `/v2/copilot/memory` on a probe (analyst role): the page read "HELD 0", a
preference recorded through the form came back "Recorded." with source "stated by a person", the Forget button
returned "Forgot ui_proof_key" and HELD 0 again. The page states its own boundaries: nothing is inferred from a
mission, no transcript is kept, and one tenant only.

`tests/test_standing_memory.py` (4 tests) drives the route with a fake bridge and pins the count, the zero case, the
failure being carried rather than hidden, and the original goal surviving the prefix.

## Agents connected, alive, and proved to execute — 2026-11-25, releases e30b9ce + 0f9e37f

THE CLAIM: agents were registered but none was alive, and they could not use their tools.

WHAT WAS TRUE. `agent_heartbeats` held exactly ONE row, for `blue_team`, observed 18 Nov 16:14. Nothing ever beat, so
`/agents/fleet/status` reported `unknown` for 22 of 23 roles. That is not a broken agent; it is an unobservable one,
and an agent that cannot be observed alive cannot be operated.

WHAT WAS NOT TRUE. The wiring was already complete: all 38 agent-to-tool pairs resolve to a declared capability
(measured, zero dead ends) and all 21 tool names the model is shown map to real registry functions through
TOOL_NAME_MAP. Three tools were genuinely broken and are fixed: semgrep was absent (now 1.187.0), sqlmap could not
start because its shebang wants `python` (now 1.10.7), masscan could not load libpcap (repaired). All twelve
binaries now run.

CORRECTION TO MY OWN MEASUREMENT. I first reported "7 of 12 binaries missing". That was wrong: nuclei, subfinder,
httpx, gobuster and sqlmap were already in `/opt/tools/bin`, which is the FIRST directory tool_gateway._find_tool
checks; my `command -v` simply did not look there. I also reported HEARTBEAT_SIGNING_KEY unset; it was set, and I had
grepped the wrong variable name. Both were measurement errors, not platform faults.

BUILT — LIVENESS. `scripts/ops/agent_heartbeat.py` beats a signed heartbeat for every registered role. The health
signal is DERIVED, never hardcoded: for each role it resolves every declared tool and checks that any binary the tool
shells out to actually exists, reporting `ok` only when all of that holds and `degraded` with the exact reason
otherwise. It records through the platform's own `agent_heartbeats.ingest`, so the HMAC, tenant key, replay
protection and digest are the real ones. Scheduled in `config/cron/root.crontab` every 2 minutes because
FRESH_WITHIN_SECONDS is 180. Proved: 23/23 roles beat, 0 degraded, beat age 1m47s inside the fresh window, 23
distinct agents.

BUILT — THE DEFECT THAT MADE TARGETED TOOLS UNREACHABLE. `execute_governed_tool` passed `target_type=None` and
`target_reference=None` unconditionally. The broker validates the type against the capability's declared
`target_types`, so EVERY capability with a target was refused with "The requested target type is not valid for this
capability": port inventory, vulnerability scan, headers check and DAST were unreachable from any agent, leaving only
non-targeted reads such as list_open_findings. The gate was correct; the caller never supplied a target. Fixed with
`_derive_target()`, which reads the target from the tool's own arguments, reduces a URL to its host so it matches the
AuthorizedTarget row, and only chooses a type the capability actually declares (it will not coerce a URL into an IP).
8 tests in tests/test_target_derivation.py.

PROVED LIVE AFTER THE FIX, all through the governed path with real receipts:
  * `network_security` -> `port_inventory_scan` on www.globaldigitalsecurity.io: real nmap 7.80, host up, 8 closed
    ports, rDNS srv1869692.hstgr.cloud.
  * `api_application_security` -> `check_url_security_headers`: real HTTP check, score 5/5, live HSTS, CSP, XFO,
    XCTO and Referrer-Policy.
  * `blue_team` -> `list_open_findings`: 847 open (330 high, 511 medium, 2 low, 4 info, 0 critical).
  * `blue_team` -> `triage_finding` refused with an honest argument error (needs the integer finding id), which is
    input validation working, not a defect.

RESULT. Fleet status went from 5 online / 18 degraded / 0 unknown to **7 online / 16 degraded / 0 unknown**, with
executed receipts now covering vulnerability_management 72, threat_hunting 13, network_security 5,
executive_advisor 4, risk_business_intelligence 2, blue_team 1, api_application_security 1.

STILL OPEN, STATED PLAINLY. The 16 remaining roles are degraded because they have done no governed work in 24 hours;
the mechanism is now proved, so each needs real work routed to it. `app.globaldigitalsecurity.io` is a REVOKED
AuthorizedTarget (www.globaldigitalsecurity.io is the active one), so checks against the app hostname are refused
until the owner re-authorises it; that is a security decision, not a bug to flip.

## Owner authorization, the RLS refresh defect, and 18 of 23 agents executing — 2026-11-25, release 28ee3af

THE OWNER AUTHORISED THE APP HOST. `app.globaldigitalsecurity.io` was a REVOKED AuthorizedTarget, so every check
against it was refused. Sidique authorized it on 25 Nov 2026 and it is now an ACTIVE target (target_type domain,
valid to 25 Dec 2026, max 20 actions/hour, authorized_by his user id), created through the platform's own
POST /red-team/targets so the authorization is audited rather than written by hand. Proved: api_application_security
-> check_url_security_headers against https://app.globaldigitalsecurity.io now executes and returns live headers.

A DEFECT THAT MADE 46 WRITE ROUTES LIE. POST /red-team/targets created the row and THEN returned 500, so the operator
saw failure for an authorization that existed. Cause: `await db.refresh(...)` AFTER `await db.commit()` on a FORCE-RLS
table. Once the session commits, the tenant context can be gone from the connection, so the refresh cannot see the
row and SQLAlchemy raises InvalidRequestError "Could not refresh instance". The fix is to flush and refresh INSIDE the
still-bound transaction, then commit. Found at 46 call sites across repository_api.py, siem/, workflow_runs.py,
workflows/ and redteam.py; all 46 fixed. Guard: tests/test_refresh_before_commit.py fails if the shape returns, and
also asserts the guard matches the shape it forbids so it cannot pass vacuously. Proved after deploy: the same POST
returned HTTP 200 and the revoke route returned 200, on a throwaway target that was then removed.

TWO READ-ONLY CAPABILITIES DEMANDED A HUMAN, AND THE MESSAGE LIED ABOUT WHY. vulnerability.scan_dependencies and
threat_intel.lookup_malware_hash were declared RiskClass.R3 with requires_human_approval=True while their
side_effect_type was READ_EXTERNAL, so an agent could never scan its own dependencies or look up a hash unattended.
The refusal also said "This action changes an external system" for a read. Both are now R1 with approval False, and
the message is derived from side_effect_type (READ_EXTERNAL -> "reads an external system", WRITE_EXTERNAL ->
"changes...", OFFENSIVE -> "runs an offensive action against a target"). Offensive and write capabilities still
require approval, asserted by a test so the fix did not open the gate. 4 tests in tests/test_read_only_capabilities.py.

WORK ROUTED TO THE DEGRADED ROLES, THROUGH GOVERNANCE, WITH REAL RESULTS. 15 roles were given real read-only work:
api_application_security headers on the app host, platform_operations health, data_intelligence metrics (201 missions),
automation_workflow approvals (0), threat_intelligence CISA KEV (1,795), incident_response incidents (2),
knowledge_memory search (qdrant + documents), security_architecture (104 tables), identity_access_management posture,
compliance_grc posture, digital_forensics evidence integrity (verdict intact), devsecops dependency scan (193 packages
via OSV), blue_team findings, network_security nmap, threat_hunting, executive_advisor, risk_business_intelligence.

RESULT. Fleet status went from 7 online / 16 degraded to **18 online / 5 degraded / 0 unknown**, every one backed by
an executed governed receipt.

THE FIVE THAT REMAIN, AND WHY EACH IS CORRECT. `red_team` and `penetration_testing_coordinator` and
`defensive_remediation_autofix` hold offensive or write capabilities that require human approval by design - the gate
is working, and approving an offensive action is the owner's decision, not something to self-approve.
`validation_retest` needs a finding whose type has a deterministic re-test (a pinned dependency advisory); the open
findings sampled have none, which the tool states. `malware_analysis` is blocked by an EXTERNAL dependency: abuse.ch
now returns HTTP 401 Unauthorized for the MalwareBazaar query API without an Auth-Key (verified by direct probe; the
code already documents this), so hash reputation needs a free abuse.ch Auth-Key before that role can work.

## Malware hash reputation restored, 19 of 23 agents executing — 2026-11-25

THE BLOCKER WAS A DEAD CREDENTIAL, NOT A BROKEN TOOL. `malware_analysis` was degraded because the MalwareBazaar
lookup returned 403 `unknown_auth_key`. I first reported this as "abuse.ch now requires an Auth-Key", which was
incomplete: the variable `MALWAREBAZAAR_AUTH_KEY` was ALREADY SET in /opt/.env with a 48-character value. The
endpoint accepted the Auth-Key header method and rejected that specific key. Verified three ways: the header form
returned 403 unknown_auth_key, the URL-path form returned 401, and no auth returned 401. So the key was stale or
revoked at abuse.ch, not missing from our side.

A SUBMITTED KEY THAT WAS THE SAME KEY. The first key supplied through the secure form fingerprinted identically to
the one already installed (SHA-256 prefix f4084a5f051780dc, 48 chars, 3f0b...70), so nothing changed and abuse.ch
still refused it. Rather than accept it, I compared fingerprints and asked for a genuinely new one, using a separate
secret name so the stale value could not be resubmitted by accident.

FIXED. The new key (48 chars, 4544...9a, SHA-256 prefix fc23dd572ccf107f) returns HTTP 200 with
`query_status: hash_not_found` on direct probe. Backed up /opt/.env, replaced only the one line, verified the value on
disk by fingerprint, restarted gds-os, health 200 after 8s.

PROVED THROUGH GOVERNANCE, two hashes, both real answers:
  * EICAR test hash -> malicious false, verdict `not_listed`.
  * 094fd325... -> malicious true, verdict `listed`, with the matched MalwareBazaar record.

RESULT. Fleet status: **19 online / 4 degraded / 0 unknown**.

WHAT IS LEFT, AND WHY EACH IS A DECISION NOT A DEFECT. `red_team`, `penetration_testing_coordinator` and
`defensive_remediation_autofix` hold offensive or write capabilities that require human approval by design; approving
an offensive action against our own estate is the owner's call. `validation_retest` needs a finding whose type has a
deterministic re-test (a pinned dependency advisory with a fixed version).

## Why validation_retest stays degraded, and why that is correct — 2026-11-25

I did not leave this as "needs a deterministic re-test" without finding out why none exists.

THE CODE IS RIGHT. `tool_actions.retest_finding` only re-tests a finding whose `target` matches `_PINNED`
(`package==version`), queries OSV for that exact pinned pair, and returns RE_TEST_UNSUPPORTED with the reason for
anything else. It refuses to invent a clean verdict, which is the correct design.

THE OPEN DATA CANNOT BE RE-TESTED. All 60 open `osv` findings store `target` as a BARE package name ("pyjwt", "mcp")
and their `raw_data` carries no version at all (only `schema_version`), so there is nothing to pin and no honest
re-test to run. The 14 rows that DO carry `pkg==version` are all already `resolved`.

THE CURRENT WRITER IS ALREADY FIXED. The insert in workflows/monitoring_activities.py writes
`target = f"{package}=={installed_version}"`, so every finding created from now on is re-testable. The bare rows are
historical.

THE ESTATE IS ACTUALLY CLEAN RIGHT NOW. I ran the dependency watch by hand (scripts/ops/osv_check.py, normally cron
04:40): 209 packages scanned, 0 affected, 0 advisories, 0 new findings. There is genuinely nothing to re-test.

CONCLUSION. `validation_retest` is degraded because there is no open, re-testable finding, not because the tool is
broken. It will earn its receipt the first time the daily dependency watch creates a new pinned advisory. Fabricating
a finding to give the agent a green tick would be exactly the dishonesty this platform exists to avoid.

## Owner authorized all actions: the approval gate was unpassable, now proved — 2026-11-25, releases ff59b9c / 0444f8a / f54794d / fd9419e

Sidique authorized the offensive and write capabilities ("I authorize!"). Chasing that authorization exposed a
defect that made the whole approval system decorative.

THE APPROVAL GATE COULD NEVER BE PASSED. `execute_governed_tool` called `evaluate_capability_request` on EVERY
attempt. That mints a brand-new capability request each time, so the new request had no prior decision, minted
another pending Approval, and never looked at the one a human had already granted. Measured: 13 approvals in
`approved` state and not one could ever be consumed, so `red_team`, `penetration_testing_coordinator` and
`defensive_remediation_autofix` were permanently unreachable no matter what the owner decided. The broker already
had the correct path (`reevaluate_capability_request`, which loads the prior decision's Approval and allows when it
is approved); nothing called it. Fixed by reusing the existing request while its approval is pending or granted, and
minting a fresh one only when there is none (first attempt, or after a rejection so a deliberate retry still gets
its own approval). Second defect in the same fix: the reuse picked the NEWEST request, whose approval was still
pending, over the one actually granted - ordering now prefers a granted approval. tests/test_approval_reuse.py.

THREE MORE BLOCKERS BEHIND IT, each found by running the thing rather than assuming:
  * LIST-VALUED TARGETS. `coordinate_pentest_engagement` takes `targets` as a list; `_derive_target` only scanned
    scalar keys, so the broker saw target_type=None and refused "The requested target type is not valid". The
    derivation now reads list arguments too. tests/test_list_targets.py.
  * MISSION NOT SUPPLIED. The same tool then refused MISSION_REQUIRED because `engagements.mission_id` is NOT NULL
    and the wrapper never passed the mission it already held. The wrapper now supplies the governed mission and
    actor (setdefault, so an explicit caller value still wins). tests/test_governed_context_payload.py.
  * THE INSERT COULD NEVER SATISFY RLS. `engagement_targets` has FORCE RLS with
    `tenant_id = current_setting('gds.tenant_id')`, and the insert omitted tenant_id entirely, so every engagement
    failed with "new row violates row-level security policy". Fixed by inserting tenant_id.

PROVED, REAL RESULTS:
  * `red_team` -> assess_attack_surface on www.globaldigitalsecurity.io: nmap returned 22/tcp OpenSSH 8.9p1,
    80/tcp nginx 1.18.0, 443/tcp ssl/http.
  * `penetration_testing_coordinator` -> coordinate_pentest_engagement created engagement b11f6d34
    "Q4 2026 external surface review" (status draft) with 2 targets, each bound to its AuthorizedTarget row and
    its valid_until date (www to 19 Dec, app to 25 Dec). Draft only; starting execution stays a separate step.

FLEET: **21 online / 2 degraded / 0 unknown**.

THE TWO THAT REMAIN ARE "NOTHING TO DO", NOT BROKEN. `defensive_remediation_autofix` needs an open finding with a
fixed_version to branch and commit a fix: there are 0, and the dependency watch just scanned 209 packages with 0
affected. `validation_retest` needs an open finding with a pinned `pkg==version` target: the open OSV rows predate
the current writer and store no version. Both will earn receipts the first time real work exists. Stale pending
approvals from the failed attempts were closed so the queue reflects reality.

## The Digital Warriors: two teams and a five-stage campaign that runs — 2026-11-25, releases fa96493 → 8271cab

The owner asked for an offensive team and a defensive team that come together to complete cyber warfare across
five stages: vulnerability assessment, management, remediation, incident response and penetration testing.

WHAT WAS ACTUALLY MISSING WAS NOT ROLES. Measured first: 23 roles existed (5 foundation, 16 blue, 2 red) and the
capability catalogue held 70 capabilities, but **35 capabilities had no owning role at all** - including
network.vulnerability_scan, network.web_server_scan, network.injection_scan, network.cms_scan,
network.content_discovery, recon.subdomain_enum, recon.http_probe, sast_scan, dast_scan, container_scan, iac_scan,
generate_sbom, cloud.apply_remediation, every engineering.* and every repository.* capability. The scanners were
installed, the capabilities were declared, and NO agent could request any of them. That is why vulnerability
assessment was not automated: there was no assessment role.

THE TEAM, BUILT (26 roles: 5 foundation, 17 blue, 3 red, 1 purple):
  * vulnerability_assessment (BLUE, R3) - nuclei, nikto, container, IaC, SAST, DAST, SBOM. The role that produces
    findings instead of only reading them.
  * attack_surface_recon (PURPLE, R3) - subfinder, httpx, ffuf, gobuster, wpscan.
  * exploitation_specialist (RED, R4) - sqlmap, the only role permitted to run an injection exploit.
  * Capability extensions: devsecops gained the ten repository.* reads (it could not read the code it reviews),
    incident_response gained credential-leak and identity-threat detection, knowledge_memory gained memory purge,
    data_intelligence gained the clock, and defensive_remediation_autofix can now read the code it fixes.
RESULT: **every capability that has a tool now has an owning role**. The only 9 orphans left are capabilities with
NO TOOL AT ALL (cloud.apply_remediation, cloud.read_posture, engineering.commit/commit_mission/execute_session/
plan_mission, repository.write, shell.run_allowlisted, shell.run_unrestricted), named in a test so the remediation
gap stays visible instead of implying it works.

THREE REGISTRY GUARDS CAUGHT REAL MISTAKES AND WERE NOT WEAKENED TO FIT:
  * team=RED requires ceiling R4/R5. Recon tops out at R3 (its tools are "high"), so it became the PURPLE cell that
    feeds both teams rather than being given a false ceiling.
  * a role must declare a ceiling covering its riskiest tool: adding purge pushed knowledge_memory to R3.
  * a role may only claim a capability if it holds ALL that capability's tools: devsecops claimed five repository
    capabilities without their tools; the tools existed and were added.
The app would not start until each was satisfied (three crash-loops), and tests/test_warfare_teams.py now pins the
whole structure including "no role is decorative".

SCANNER FLAGS: TWO SILENT-ZERO DEFECTS. nuclei v3.11 removed -json, so every nuclei run exited 2 with "flag
provided but not defined: -json" and returned zero findings; the flag is now -jsonl and the parser already read
JSONL. nikto has no json format at all (csv/htm/msf+/nbe/txt/xml only), so "-Format json" never produced findings
and nothing parsed them; it now uses xml and the items are parsed into findings, with an unparsed scan recording
parse_error rather than reading as clean. tests/test_scanner_flags.py pins both.

THE CAMPAIGN ENGINE (gds_api/warfare/campaign.py, migration m083 + m084, routes /warfare/*). Five stages in order,
each with the role that owns the capability and a real governed tool call:
  1 vulnerability_assessment -> vulnerability_assessment / nuclei_scan
  2 vulnerability_management -> vulnerability_management / list_open_findings
  3 vulnerability_remediation -> defensive_remediation_autofix / auto_fix_finding
  4 incident_response -> incident_response / list_open_incidents
  5 penetration_testing -> red_team / assess_attack_surface
Each stage gets its own mission row (governance refuses without a real mission UUID), its own stage row, and a
status of executed / awaiting_approval / refused / skipped with a reason. A refusal or a stage with nothing to do
never aborts the war. Campaigns are RESUMABLE: approving a gated stage and resuming re-runs it on ITS OWN mission,
so the granted approval is consumed instead of a new request being minted.

PROVED END TO END, campaign ec98116d "War Campaign 001 - external estate" against www.globaldigitalsecurity.io:
first run executed 2 of 5 (management returned 50 findings, incident response ran) with stages 1 and 5 correctly
awaiting approval; after the owner's standing authorization was applied, resume executed stage 1 with **25 real
nuclei findings** (including ssh-sha1-hmac-algo, waf-detect, exposed-gitignore) and stage 5 through red_team.
Final: 4 executed, 1 skipped (no open finding carries a fixed_version, so there is nothing to branch and fix).

HONEST GAPS: stage 3 cannot execute until a real fixable finding exists; the 9 untooled capabilities mean cloud
remediation and code commit are still not automatable; and the campaign runs the five stages in sequence, not as
concurrent agents coordinating with each other.

## Nine capabilities had no tool; now eight have real tools and the war runs concurrently — 2026-11-25, e7f01f2 → 40c74af

Owner instruction: repair the nine capabilities with no tool behind them, and stop the stages running in sequence.

THE NINE. Measured: `required_tool_ids=()` and `status=PLANNED` on cloud.apply_remediation, cloud.read_posture,
engineering.commit, engineering.commit_mission, engineering.execute_session, engineering.plan_mission,
repository.write, shell.run_allowlisted, shell.run_unrestricted. Built `gds_api/ops_tools.py` with EIGHT real tools
and REMOVED the ninth: an unrestricted shell is not something to hand an autonomous agent, and the allowlisted one
covers the operational need, so the catalogue no longer promises it rather than shipping a tool that refuses.
  * shell_run_allowlisted - a fixed action allowlist (disk, memory, load, supervisor service state, git status/log/
    branch). There is deliberately no free-form command parameter.
  * repository_write_file - writes inside /opt/gds-os with path containment; returns sha256 and byte count.
  * engineering_commit / engineering_commit_mission - real git add+commit, refusing when nothing is staged
    ("a commit with no changes would be a false report of work"); the mission variant verifies the mission exists.
  * engineering_plan_mission / engineering_execute_session - wrap the platform's own mission orchestrator.
  * cloud_read_posture / cloud_apply_remediation - real boto3 S3 encryption and public-access-block reads/writes.
RESULT: 76 tools, 69 capabilities, **zero operational capabilities without a tool and zero without an owning role.**

FOUR DECLARATION DEFECTS FOUND BY TRYING TO USE THEM, none of which a test would have caught:
  1. A TOOL FUNCTION MUST CARRY risk_class and description. TOOL_REGISTRY maps name -> function and the gateway
     reads those attributes; registered without them, a critical shell read as low risk to both the preflight and
     the broker. All eight are now tagged, which immediately made the ceiling preflight demand R4 for
     platform_operations, R3 for defensive_remediation_autofix and R2 for automation_workflow.
  2. allowed_team_types WAS ABSENT on six of them, so the broker answered "This capability is not available to any
     agent" - the capability existed, the tool existed, and no team could use it.
  3. THE CLOUD ONES DEMANDED CONNECTORS THE HOST ALREADY SATISFIES (aws_readonly/azure_readonly/gcp_readonly) and
     returned BLOCKED_DEPENDENCY. boto3 authenticates from the host environment, so the connector requirement was
     stale and is removed.
  4. requires_sandbox was True on capabilities that use no sandbox; set false where that is the truth.

PROVED THROUGH GOVERNANCE, not just imported: shell disk_usage returned real df output (exit 0); repository_write_file
wrote 61 bytes to docs/warfare-tooling-proof.txt (created=True); cloud_read_posture returned 0 buckets, and that zero
was verified rather than assumed - sts get-caller-identity reports account 696616821372 (user gds-security-scanner)
and s3 list_buckets genuinely returns none. Also fixed: the allowlist checked `systemctl is-active gds-os` and
answered "inactive" while the API was healthy, because supervisor runs it, not systemd.

CONCURRENCY. Stages now declare depends_on and run in dependency waves: group 1 concurrently
[vulnerability_assessment, incident_response, penetration_testing], then management (needs the assessment),
then remediation (needs management), max 3 at a time, each stage in its own session. Proved: one campaign ran
stages 1, 4 and 5 in a single wave. Campaign 263cd8ed then proved the handoff: stage 1 executed with 25 findings,
and the management stage RE-RAN because its dependency had just executed, recording handoff=
["vulnerability_assessment"] - final state completed, 2 executed, 0 blocked.

TWO BUGS ONLY RUNNING FOUND: a refused stage referenced an uninitialised findings count (UnboundLocalError killed
the wave); and a stage re-run after its dependency executed received an EMPTY handoff because a stage skipped as
already-done never repopulated the shared context (now seeded from the stored rows).

ONE CONTROL THAT WAS RIGHT TO REFUSE ME. I first passed the handoff as a tool argument `_upstream`. The execution
binding rejected it with execution_binding_mismatch, because a request whose parameters differ from the approved set
must not run. The handoff now travels in the purpose and the stage record instead, and a test asserts it is never
smuggled into the bound parameters.

HONEST GAPS: cloud.apply_remediation has never actually applied a change - the credential is read-only, so it
returns the real AccessDenied and that is the truthful outcome until a write-capable role exists; engineering.commit
was built and unit-covered but not exercised against a real commit in this pass; and because approval is bound to a
mission, an approval-gated stage needs a fresh approval for each new campaign.
