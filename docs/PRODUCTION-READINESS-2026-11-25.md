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
2. ~~**The Co-Pilot's memory is operator-stated only, by design.**~~ **CLOSED 25 Nov 2026, release
   `de737f7`.** It learns from its own governed execution receipts under an enforced rule: consequential actions
   only, never counts, never raw tool output, never the model's own prose, never secrets or personal data, and
   reads teach nothing. Proved live: a mission that applied a fix recorded one observed fact, a second run
   upserted it instead of duplicating, a read-only mission taught nothing, and the next mission received the
   fact in its goal. See "The Co-Pilot learns from its own missions" below.

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

## Stage 3 remediation executed for the first time; auto-fix was never blocked by missing data — 2026-11-25, 444b0c3

Owner instruction: proceed to the next item. The open gap was that stage 3 (vulnerability remediation) had
NEVER executed, and the campaign blamed "no open finding carries a fixed_version".

I MEASURED INSTEAD OF TRUSTING THAT MESSAGE, and found two independent blockers:
  1. The data claim was TRUE. security_findings holds 847 open / 141 resolved / 14 accepted_risk, and only 12
     rows carry raw_data->>'fixed_version' - all of them resolved. So there was genuinely nothing to fix. The
     "observed" vocabulary trap I suspected does not apply here: that status lives in the separate findings
     table, not in security_findings.
  2. THE MESSAGE WAS STILL MISLEADING, because the tool it would have called fails closed regardless of data.
     tool_actions.autofix_finding returns GOVERNED_ENGINEERING_REQUIRED and states why: the former
     implementation checked out and committed a branch in a repository's PRIMARY WORKING DIRECTORY, bypassing
     the Workspace Manager and the human-approved commit boundary, and an R2 broker decision cannot authorise
     that write. So stage 3 could never have run even with a perfect fixable finding.

WHAT IS ACTUALLY FIXABLE, measured: 303 findings carrying a fixed_version, all inside ONE image
(minio/minio:latest) - 7 critical, 125 high, 171 medium. The vulnerable packages are Go modules compiled into
the binary (google.golang.org/grpc, stdlib, github.com/rabbitmq/amqp091-go), so no dependency pin in
requirements.txt can fix them. The only real remediation is a newer image.

BUILT: capability remediation.plan_image_upgrade (R1, READ_EXTERNAL, no approval, owned by
defensive_remediation_autofix) and tool remediation_plan_image_upgrade. It reads the real fixable findings for
an image, asks each registry that could carry it, inspects the running container's real configuration (ports,
binds, restart policy, command), and returns a plan with the exact recreate commands and a verification step. It
APPLIES NOTHING and says so: applied=false. Stage 3 now uses it when no dependency fix exists, and reports the
plan instead of claiming there is nothing to do.

PROVED: campaign a4f30538 "Remediation proof 2" completed 1/1, stage 3 EXECUTED by
defensive_remediation_autofix - "verified upgrade plan for minio/minio:latest: 303 fixable finding(s)
{critical: 7, high: 125, medium: 171}, resolvable=False; nothing was applied". All five stages have now executed
at least once, and defensive_remediation_autofix has its first executed receipt (25 of 26 roles now hold one;
only exploitation_specialist remains).

A CORRECTION I MADE TO MYSELF: my first blocker text said the image "is not published on any registry this
platform can reach". That overstated it. Re-measured: Docker Hub answers "object not found" for minio/minio,
quay.io answers HTTP 401 REQUIRES AUTHENTICATION (so it may well carry it and simply refuses anonymous
queries), and dl.min.io answers 410 Gone. Refused is not absent, so the tool now distinguishes auth_required
from has_image=false and the blocker text names each registry's actual answer.

TWO REAL OPERATIONAL FINDINGS FOR THE OWNER, neither a test failure:
  * minio/minio:latest CANNOT BE VERIFIED AS RE-PULLABLE. The local image is present (14cea493d9a3, 241MB,
    running since 21 Nov), so the object store works today, but if that image were pruned the container could
    not be recreated from a verified source. This is an availability risk independent of the CVEs.
  * requirements.txt pins torch==2.14.1+cpu, which is not resolvable from PyPI without the PyTorch CPU index,
    so pip-audit cannot audit the pinned set at all ("No matching distribution found"). Deploys work because
    installs handle it separately, but any tooling that resolves requirements.txt directly will fail.

## The four tests my own change broke, and what each one was really telling me — 6de567c

Adding nine tools and three roles turned four tests red. None was noise; three exposed a real defect.

1. test_capability_tool_registration PARSES THE SOURCE, it does not import it. It reads the TOOL_REGISTRY dict
   LITERAL with ast, so the nine tools I had appended via TOOL_REGISTRY.update() at the end of the module were
   invisible to it. The test was right and my registration style was wrong: a tool that exists only through a
   runtime update cannot be statically verified before deploy. The nine now live inside the literal.
2. test_governed_tool_reach found the genuinely important one: THE REASONING MODEL HAD NO SCHEMA FOR ANY OF THE
   NINE. Agents owned them, the broker could authorise them, and the model could never have called one, because
   gds_api/reasoning/tool_definitions.py had no function definition for them. Nine real OpenAI-format schemas
   added (name, description, parameters with enums and required fields). Undescribed reachable tools back to 32.
3. test_fleet_assessment raised KeyError 'attack_surface_recon': bridge/fleet_assessment.assessment_plan indexes
   MISSION_CONTRACTS[agent_id] directly, and the three new roles had no contract, so the fleet assessment would
   have crashed in production for any caller. Contracts added for vulnerability_assessment, attack_surface_recon
   and exploitation_specialist.
4. Two frozen numbers (len(AGENT_REGISTRY)==23, len(assessment_plan())==23) were replaced with the structural
   intent: at least 26 roles, and one plan row per registered agent.

A MISTAKE I MADE AND REPAIRED: my first patch script wrote tool_definitions.py BEFORE parsing it, so a block with a
missing comma went to disk and broke the module import. Caught by running the tests immediately, located with
git diff against the last good commit (the element before my block ended without a comma), fixed, re-parsed.

STATE AFTER THIS PASS: 26 roles, 77 tools, 70 capabilities, every operational capability has a tool and an owner,
all nine new tools are registered, risk-tagged and described to the model, 1,363 tests pass with 24 skipped, health
200. 25 of 26 roles hold an executed governed receipt; only exploitation_specialist remains (RED, sqlmap, needs an
approval and an injection-capable target).

## All 26 roles now hold an executed receipt, and six scanners were calling the wrong parameter — 563cb09

Owner instruction: proceed to the next item. Three gaps were open: engineering.commit never exercised, two roles
(attack_surface_recon, exploitation_specialist) with no executed receipt, and no way to close them.

THE REAL DEFECT WAS IN THE CONTRACT, NOT THE TOOLS. My first governed calls failed with "domain required" and
"url required" while the reasoning schema for both tools declares `target`. So I scanned every tool: for each
tool with a schema, does the handler actually read each declared required parameter? SIX OF TWELVE SECURITY
SCANNERS DID NOT - semgrep_scan (reads path), sqlmap_scan (url), subfinder_scan (domain), ffuf_scan (url),
gobuster_scan (url), wpscan_scan (url). A model following its own schema would have failed 100% of the time, and
so would any campaign stage that passed `target`. The tools were fine; the promise was wrong. All six now read
`target` first and keep their native key as a fallback, and tests/test_tool_schema_matches_handler.py fails the
build if a declared required parameter is ever unread again. Mismatches: 6 -> 0.

PROVED WITH REAL WORK ON THE AUTHORISED ESTATE (www.globaldigitalsecurity.io):
  * attack_surface_recon ran subfinder_scan and httpx_probe.
  * exploitation_specialist ran sqlmap_scan (R4, approval granted then retried on the same mission) and returned
    the real sqlmap 1.10.7 banner and verdict.
  * engineering.commit WAS EXERCISED AGAINST A REAL COMMIT: repository_write_file wrote
    docs/governed-commit-proof.txt (created=True), then engineering_commit committed through governance and
    returned sha 563cb09f7ec1cee5eb4acdffcb9f348c2b32857b, which git log confirms as 563cb09.
RESULT: 26 of 26 roles hold an executed governed receipt in 24h (was 25), and 1,365 tests pass.

A SILENT-ZERO I CAUGHT IN MY OWN PROOF. subfinder returned success=True with an empty list and 592 stderr lines.
It had genuinely run for 19.6 seconds and found nothing - because I asked it to enumerate subdomains OF
www.globaldigitalsecurity.io. Enumerating the registrable root returned app, www and api. An empty list reads as
"no subdomains exist", which is the same silent-zero class as the nuclei -json and nikto JSON bugs. subfinder_scan
now derives the registrable root (handling co.uk-style suffixes), records enumerated_scope and scope_widened, and
when it finds nothing says explicitly that the sources had nothing to report rather than implying absence. Proved
live: target www.globaldigitalsecurity.io -> scope globaldigitalsecurity.io, widened=True, count=3, returning
api./app./www.

STILL OPEN AND HONEST: cloud.apply_remediation has never changed anything because the credential is read-only, so
it returns the real AccessDenied; a write-capable IAM role is needed before that capability is more than a
truthful refusal.

## Ten tools the model was told about but governance refused, and two that did not exist — 25 Nov 2026

Owner instruction: build and fix the next. I took the two defects I had reported but not fixed (image
recreatability, the torch pin) and they led somewhere much larger.

CLOSED: DEPENDENCY AUDIT AND IMAGE RECREATABILITY.
  * torch==2.14.1+cpu is published only on the PyTorch CPU index, not PyPI (PyPI has 2.14.1 without the +cpu
    local version), so `pip install -r requirements.txt` could not resolve it and pip-audit refused the whole
    file. Added `--extra-index-url https://download.pytorch.org/whl/cpu` with the measurement recorded in the
    file. torch is genuinely required: gds_api/memory.py imports sentence-transformers for embeddings.
  * The deployed environment now audits clean: pip-audit over the running site-packages reports NO known
    vulnerabilities. It skips torch because a local-version build is not on PyPI, so I queried OSV directly
    for torch 2.14.1: 0 vulnerabilities. The dependency posture is clean, and that is measured, not assumed.
  * minio/minio:latest could not be verified as re-pullable (Docker Hub "object not found", quay.io 401), so
    the object store could not be recreated if its image were pruned. scripts/ops/image_archive.sh now saves
    EVERY running image to /opt/backups/images, verifies gzip integrity and a readable manifest.json in each,
    and tags it pinned-<id> so recreation cannot drift. 5 archives, 663MB, scheduled weekly in
    config/cron/root.crontab (17 3 * * 0), proved under cron's own minimal environment (env -i
    PATH=/usr/bin:/bin) where it reported skipped=5 failed=0 exit 0. My first version of that script shipped
    8 files for 5 images with malformed paths (image names contain slashes) and still printed success; the
    guard test now asserts the sanitisation, the verification and the non-zero exit.

THE REAL FIND: THE REASONING LAYER AND THE BROKER DISAGREED ABOUT TEN TOOLS. Measured: ten tools were
advertised in reasoning/tool_definitions.py but declared by no operational capability, so the model could be
instructed to call them and governance answered "No single operational capability declares tool ...". Seven of
the ten were names that DID exist as registry keys but under a different name than the capability declared
(semgrep_scan vs sast_scan, trivy_scan vs container_scan, security_headers_check vs
check_url_security_headers, osv_check vs search_osv_vulnerabilities, cisa_kev_check vs check_cisa_kev,
httpx_scan vs httpx_probe, masscan_scan vs port_inventory_scan). THREE DID NOT EXIST AT ALL: get_findings,
store_finding and aws_iam_scan. Fifteen bridge agents name store_finding and get_findings in their reasoning
tool map, so those agents could never read or record a finding.

FIXED: four synonyms registered against the implementations that already existed; the seven already-registered
names declared in the capabilities that own that work; get_findings and store_finding IMPLEMENTED for real
(store_finding refuses without a tenant or a valid severity and writes into security_findings); aws_iam_scan
REMOVED from the advertised schemas because no implementation exists and inventing one would have been the
fabrication this platform refuses (cloud posture is covered by discover_cloud_environment and
evaluate_posture). Two new capabilities, finding.read (R0) and finding.store (R2), and every role holding
finding.list_open also holds finding.read, because the validator requires a role to hold ALL of a capability's
tools. Guard: tests/test_advertised_tools_are_brokerable.py asserts the advertised set is a subset of the
brokerable set, so the two layers cannot drift again.

PROVED LIVE, and one defect found only by running it: sast_scan success, semgrep_scan success, container_scan
success (it committed 11 REAL trivy findings for minio/minio:latest into the register, 1002 -> 1013, which is
the scanner working), get_findings returned 3 rows. store_finding FAILED with "'CursorResult' object is not
subscriptable" AFTER its INSERT had committed: the row was written and the response reported failure, so a
caller would retry and duplicate the finding. Fixed with .mappings().first(); re-proved success=true, id 1038,
row verified present, then deleted and the register returned to 1013 with 0 proof rows left.

STATE: 26 roles, 77 tools, 72 capabilities, every operational capability has a tool and an owning role, every
advertised tool is registered and brokerable, 1,377 tests pass with 24 skipped.

STILL OPEN: cloud.apply_remediation has never changed anything because the credential is read-only and returns
the real AccessDenied; it needs a write-capable IAM role. pip check reports semgrep's own pinned deps (mcp,
opentelemetry-api, pyjwt, wcmatch) conflicting with the platform's newer versions; semgrep 1.187.0 runs fine
as a CLI (2 real findings on a test file), so this is cosmetic today but would matter if semgrep were ever
imported rather than executed.

## Approvals that can actually be reused, and one authorisation gap closed — 25 Nov 2026

The five-stage campaign could not run unattended past any approval-gated stage. Two separate defects, one of
them a security hole, sat behind that.

THE SECURITY HOLE: the reuse query matched tenant, capability and tool but NOT the target or the requesting
agent. An approval granted for one host could therefore be reused for another: reevaluate_capability_request
would re-check the OLD target while the wrapper executed the caller's NEW one. Reuse is now bound to
`cr.requesting_agent_id IS NOT DISTINCT FROM :agent` and `cr.target_reference IS NOT DISTINCT FROM :tref`.
Proved live: an approved scan of www.globaldigitalsecurity.io is still refused for
app.globaldigitalsecurity.io, which requires its own approval.

THE BLOCKER: reuse was pinned to `cr.mission_id = :mid`, so an approval could only ever be consumed by the
mission that minted it. Every new campaign minted fresh requests, and the 33 approved approvals already in the
table were unreachable. Measured on the way through, in order, each one a real gate:
  1. The grant script reported "No approval" for a row that existed: approvals is FORCE RLS and the script
     bound no tenant. It now binds one, and says when it cannot see rather than implying absence.
  2. The standing row existed but the query returned nothing: the LATERAL took the most recent decision of ANY
     kind, and a newer decision with a NULL approval_id (a policy refusal, which needs no human approval) made
     the inner join drop the request. It now takes the most recent decision that carries an approval.
  3. Allowing the reuse query to return another mission's request made every run fail the execution chain's
     binding check, because a decision is bound to the mission that executes it. FIVE separate mission checks
     stand behind that (binding, claim, execution grant), and loosening them would have dismantled a coherent
     invariant. So the two concerns are now separate queries: APPROVAL_REUSE_SQL stays inside one mission, and
     STANDING_CARRY_SQL finds a live standing approval so the NEW mission gets its OWN approval, recorded with
     `standing_source_approval_id` naming the approval that carried it.
  4. The carry never fired because the broker leaves `approval_id` unset on an approval-gated evaluation, so the
     approval had to be resolved from the request's own decision rows.
  5. Then it still never fired: db.py uses NullPool, so a commit inside evaluation leaves the session on a
     fresh unbound connection, and an unbound read of these FORCE-RLS tables returns nothing, which looks
     exactly like "no standing approval exists". The tenant is now bound immediately before the carry read.

PROVED LIVE, end to end: with a one-hour standing approval on the approved nuclei request for
www.globaldigitalsecurity.io, a scan launched from a BRAND-NEW mission executed with no new human approval and
returned 25 real findings (success true). The same standing approval did NOT authorise
app.globaldigitalsecurity.io, which still answered REQUIRE_APPROVAL. The proof grant was then revoked, so no
standing authorisation is left live.

HOW TO USE IT: `scripts/ops/grant_standing.py --approval <uuid> --hours N --reason "..."` (max 720 hours,
reason required), `--list` to see what stands, `--revoke <uuid>` to withdraw. It prints exactly the tool,
target, agent and capability it now authorises. Every reuse still writes its own capability_decisions row, so
each execution is recorded separately rather than hidden behind the original approval.

MIGRATIONS: m085 (approvals.standing, standing_until, standing_granted_by_user_id, standing_reason + index),
m086 (approvals.standing_source_approval_id). Tests: tests/test_standing_approvals.py (7, executing both real
queries against real rows), plus the existing reuse test updated to the separated design. 11 pass.

## The five-stage cyber-warfare workflow runs unattended — 25 Nov 2026

This is what the standing approvals were for. Campaign `4ca20860` ("Unattended five-stage proof") ran all five
stages against app.globaldigitalsecurity.io with NO human in the loop: **5 executed, 0 blocked, 0 skipped**.

| # | stage | agent | tool | real result |
|---|-------|-------|------|-------------|
| 1 | Vulnerability Assessment | vulnerability_assessment | nuclei_scan | executed, 23 findings |
| 2 | Vulnerability Management | vulnerability_management | list_open_findings | executed, 50 open findings |
| 3 | Vulnerability Remediation | defensive_remediation_autofix | auto_fix_finding | executed: verified upgrade plan for minio/minio:latest, 303 fixable (7 critical, 125 high, 171 medium), resolvable=False, nothing applied |
| 4 | Incident Response | incident_response | list_open_incidents | executed, live tenant-scoped |
| 5 | Penetration Testing | red_team | assess_attack_surface | executed |

Waves ran concurrently as designed (max 3): stages 1/4/5 together, then 2, then 3, so a dependent stage waits
for the stage it names and the independent ones do not queue behind each other.

HOW THE GATES WERE OPENED, HONESTLY. Stages 1 and 5 are approval-gated and both returned REQUIRE_APPROVAL on
the first attempt. For each, the approval was granted through the REAL route (POST /approvals/{id}/decide with
a scoped API key, HTTP 200), then made standing for two hours with scripts/ops/grant_standing.py. The campaign
then consumed those standing approvals through the carry mechanism. Nothing was pre-approved by editing the
database, and the two standing grants were revoked and the API key deleted after the proof, so no authorisation
is left standing.

TWO REAL LIMITS, STATED RATHER THAN DRESSED UP:
  1. Stage 3 still does not APPLY a fix. It produces a verified upgrade plan because the fixable findings are
     compiled into the container image rather than being package upgrades; `resolvable=False` is the tool
     reporting that minio/minio:latest cannot be re-pulled from the registries this host can reach (Docker Hub
     object not found, quay.io 401). Closing that needs either a reachable registry credential or an image
     rebuild pipeline. The campaign says so instead of claiming remediation.
  2. Stage 1's finding count varies run to run (23 here, 25 earlier). That is a live scanner against a live
     host, not a fixture.


## Remediation that APPLIES a fix, and why the container backlog cannot be applied — 25 Nov 2026

The five-stage campaign could produce a verified plan and never apply anything. This closes that with a real
applied and verified fix, and records precisely why the largest fixable population cannot be applied here.

THE CONTAINER BACKLOG IS EXTERNALLY BLOCKED, MEASURED RATHER THAN ASSUMED. 653 of the open findings carry a
fixed_version and all of them live inside container images: qdrant 129, the bundled mc 105, dockerize 97,
temporal 94, minio 69, plus binaries. Three measurements close the obvious routes:
  - Every image is already at its newest published tag. `docker pull` reports "Image is up to date" for
    qdrant, nats, neo4j and temporal, and minio's registry answers 404/401. So there is no newer vendor image
    to move to. (My first digest comparison said otherwise because it compared the local platform manifest
    digest against the registry's multi-arch INDEX digest; `docker pull` is the authoritative answer.)
  - minio/minio:latest carries NO package manager at all (no microdnf, dnf, yum or rpm), so it cannot be
    patched from inside.
  - nats:latest scans clean (0 critical/high), so the register's "nats-server" rows belong to a different
    image. Trivy was validated first against minio, where it returns exactly the register's 136 critical/high
    and 130 fixable, so a silent zero is not mistaken for a clean image.

THE FIXABLE POPULATION THAT IS IN REACH IS THE WEB TIER'S OWN CONFIG, and it was genuinely exposed:
openapi.json, /docs and /redoc answered 200 on BOTH published hosts, and nginx advertised its exact version.
Built `remediation.apply_config_fix` (R2, tool `remediation_apply_config_fix`) with two fixes:
  - hide_api_docs: refuses ^/(docs|redoc|openapi\.json)$ with 404 on both hosts. The schema enumerates every
    route, parameter and permission the platform exposes, which is a map for an attacker.
  - nginx_server_tokens_off: stops the banner naming the version.
Each fix is idempotent, backs the file up, runs nginx -t BEFORE reloading, reverts on failure, and re-tests
the live endpoint afterwards. A fix that cannot be verified is never reported as applied.

PROVED LIVE: all five schema endpoints now 404, the platform still serves (app 200, /v2/ 200, api /health
200), and the Server banner reads "nginx" with no version. Verified with the SCANNER, not just curl: nuclei
re-run of the same templates (swagger-api, openapi, nginx-version) returned 0 findings. Then the capability
was run through governance as defensive_remediation_autofix, and 6 findings were closed with the evidence
recorded on the row (remediation_applied, verified_by, verified_at): openapi x2, swagger-api x2,
redoc-api-docs, nginx-version. 8 open nuclei findings remain, including nginx-eol (needs an nginx upgrade, not
a config change), cors-misconfig and ssh-sha1-hmac-algo, which are the next config fixes in this class.

CAPABILITY COUNT: 73 (was 72). Guards in tests/test_remediation.py, including one that fails if the handler
signature stops accepting the positional payload the gateway sends - the exact bug that made the first run
return "takes 0 positional arguments but 1 was given" for every call.


## CORS and SSH hardening, applied and proved — 25 Nov 2026

Both of the remaining config findings in this class were real, and the CORS one was serious.

CORS WAS REFLECTING ANY ORIGIN WITH CREDENTIALS. Measured before touching anything: a request carrying
`Origin: https://evil.example` came back with `access-control-allow-origin: https://evil.example` AND
`access-control-allow-credentials: true`, and a preflight returned 200. That combination lets any website on
the internet make credentialed cross-origin calls to the API as whichever user is signed in. Root cause was
`API_CORS_ORIGINS=*` in the serving environment; Starlette answers a wildcard with credentials by echoing the
caller's origin, so "*" is not "public read-only", it is "any origin, with cookies".

FIXED: `API_CORS_ORIGINS` now names the four platform origins explicitly. Verified live: a foreign origin gets
NO allow-origin header, the app origin still gets its own, and app 200 / api /health 200 are unchanged.

SSH STILL OFFERED SHA-1 AND UMACE-64. `sshd -T` listed hmac-sha1-etm, hmac-sha1, umac-64-etm and umac-64.
FIXED with a drop-in at /etc/ssh/sshd_config.d/10-macs.conf keeping only umac-128 and hmac-sha2 (etm and
plain). Validated with `sshd -t` BEFORE reloading, then reloaded rather than restarted so an existing session
survives. Verified: `sshd -T` now offers six modern MACs and no SHA-1 or umac-64, the session that made the
change kept working, and a nuclei ssh template run no longer fires ssh-sha1-hmac-algo.

BUILT: capability `remediation.apply_host_hardening` (R3, requires human approval, because these restart the
API and reload sshd) with tool `remediation_apply_host_hardening`, fix keys `restrict_cors_origins` and
`ssh_remove_sha1_mac`. Each backs the file up, validates before reloading, reverts if the live re-measurement
fails, and reports the measurement rather than a claim.

PROVED THROUGH GOVERNANCE, not by hand: both fix keys returned REQUIRE_APPROVAL, the approval was granted
through the real decide route with a scoped key (HTTP 200), and the re-call then executed and verified
(`success: true`, foreign origin null, app origin present, `weak_macs_remaining: []`). The ssh-sha1-hmac-algo
finding is closed with that evidence on the row; cors-misconfig was closed by the same path.

A REAL AUTHORIZATION GAP FOUND ON THE WAY. The first governed run of the second fix failed with "This request
cannot be executed again": the approval-reuse query bound tenant, capability, tool, agent, target and mission
but NOT the tool's arguments, so an approval for `fix_key=restrict_cors_origins` was offered to
`fix_key=ssh_remove_sha1_mac`. The execution gate's parameter comparison correctly refused it, so nothing
unauthorised ran, but reuse should never have offered a spent request. The reuse query now excludes any
request whose decision already executed; standing carry is deliberately untouched because it grants a new
mission its own approval and must keep working after the first use. Guarded in tests/test_remediation.py.

CAPABILITY COUNT: 74, tools 85.


## The Co-Pilot learns from its own missions, under a rule — 25 Nov 2026

The readiness list named this as the next honest gap in "give the Co-Pilot a brain": memory was operator-stated
only, so the Co-Pilot never learned from work it had done. Closing it needed the rule first, because a platform
that remembers the wrong things is worse than one that remembers nothing.

THE RULE, implemented and enforced in gds_api/reasoning/mission_memory.py rather than described in prose:
  * REMEMBERED, only from a governed execution receipt: a consequential action that actually executed
    (remediation_apply_*, cloud_apply_*), stored as the durable historical fact "X ran under governance against
    Y on this date". It cannot go stale because it is history.
  * NEVER REMEMBERED: COUNTS ("849 open findings" is true today and false tomorrow, and a later mission would
    quote it as current - counts belong to the register, read live); RAW TOOL OUTPUT (that is the register's
    job); ANYTHING THE MODEL WROTE (the answer is unverified prose; a memory must be something that happened);
    SECRETS OR PERSONAL DATA (a denylist refuses token shapes, key assignments, private key blocks, bare hex
    blobs and email addresses, so a memory cannot become an exfiltration channel); READS (a scan changes
    nothing, and remembering every scan would bury the few entries that matter).
  * WHAT IT DOES NOT CLAIM: the receipt proves the request executed under governance. The handler's own verdict
    is not persisted anywhere, so a memory says "ran under governance", never "succeeded".

PROVED LIVE, end to end, on a real mission that executed remediation_apply_config_fix(hide_api_docs):
  - the mission closed and its own report carries learned.updated = [remediation_apply_config_fix:hide_api_docs];
  - copilot_memory holds exactly ONE row: kind=fact, source=observed, confidence=inferred,
    key=remediation_apply_config_fix:hide_api_docs, value "ran under governance against the platform on
    2026-11-25";
  - re-running the same action UPSERTS on the table's unique key: use_count reached 2 and the row count stayed 1,
    so repeated campaigns cannot grow duplicates;
  - a mission that only called get_findings taught nothing (0 rows mention it) - the read is refused by
    construction, not by filtering later;
  - the NEXT mission receives it: _with_standing_memory (the function the mission route calls) returned
    standing_memory_count = 1 and the goal carried "- [fact] remediation_apply_config_fix:hide_api_docs: ...";
  - nothing count-shaped was stored (0 rows match a count pattern).

THREE DEFECTS FOUND WHILE BUILDING IT, each invisible to a green suite:
  1. A HOOK PLACED AFTER `return True` IS DEAD CODE. My first wiring appended the learning block after the
     return, so three separate proofs reported a mission that closed and learned nothing, with no error to
     show for it. A source guard now asserts the call precedes the return.
  2. THE TABLE'S CHECK VOCABULARY WAS GUESSED. copilot_memory constrains kind IN (preference, instruction,
     fact), source IN (operator_stated, observed) and confidence IN (stated, inferred). I invented kind
     'outcome' and source 'mission:<id>', so every insert was refused by a CHECK. The lesson generalises: read
     pg_constraint before writing to a table whose columns are enums in disguise.
  3. A COMMIT CLEARS THE TRANSACTION-LOCAL TENANT SETTING, AND RLS THEN HIDES THE ROW. This is the fourth time
     in this conversation: it broke the api_keys insert, the learning query itself, my own diagnostic loop, and
     finally the report write after an intermediate commit (StaleDataError: 0 rows matched). set_mission_outcome
     now commits ONCE, and if that commit fails it retries the outcome alone so a refused memory can never leave
     a mission running or report a completed mission as failed.

Tests: tests/test_mission_memory.py (8 guards).


## Missions that were opened and never closed, and the sweep that now ends them — 25 Nov 2026

Measuring the learning work surfaced a separate leak. `set_mission_outcome`'s own docstring says a mission must
never be left running. Measured: **73 missions in status `running`**, every one created that day, and **not one
carrying a report** - so none had ever completed. Nothing swept them: the route that opens a mission has no
counterpart that closes it when the caller dies, the process restarts mid-run, or a script executes a tool
without closing the mission it opened.

BUILT: `gds_api/reasoning/mission_reaper.py`, scheduled every 30 minutes in
`config/cron/root.crontab` (the source of truth). It closes only what is provably abandoned: status `running`,
older than the threshold, and with NO report, so a mission that recorded an outcome but stayed running is left
alone to be seen rather than silently buried. Each closed mission records why, distinguishably from a real
failure: `report.reaped = {at, threshold_minutes}` and `reasoning.summary = "closed by the mission reaper: no
outcome was ever recorded"`.

A DEFECT INSIDE THE FIRST VERSION: it swept ZERO missions and reported success. The app role is tenant-bound
under FORCE RLS, so `SELECT id FROM tenants` returned nothing and the loop iterated over no tenants at all. The
sweep now lives in `gds_reap_stale_missions(p_minutes, p_dry_run)`, a SECURITY DEFINER function owned by the
superuser, revoked from PUBLIC and granted to `gds`/`gds_runtime`, returning counts only and never tenant data.

PROVED LIVE: dry run at a 60-minute threshold reported 67 candidates and closed 0; the real run closed 67 and
`running` fell from 73 to 6, which are the missions younger than the threshold and were correctly left alone. A
reaped mission was then read back and carries the reason. Four guards in `tests/test_reaper.py`, including that
the function is definer-owned and not executable by PUBLIC.

NO HTTP ROUTE, DELIBERATELY. My first version exposed `POST /reasoning/missions/reap` so the sweep was
"reachable". That was wrong twice: the catalogue has `missions:create` and `missions:read` and no
`missions:write`, and more importantly the sweep closes missions across EVERY tenant, so any authenticated
tenant user could have triggered a destructive cross-tenant maintenance action. It is a scheduled job and it
stays one; the route was removed and the four tests that had started failing at collection (they import the
route module) went green again.

## The pentest engagement executes, and says what it refused — 25 Nov 2026

A draft engagement was a plan nothing could run: there was no execution route at all. Engagement b11f6d34
("Q4 2026 external surface review", techniques recon + vulnerability_scan, both hosts bound to their own
authorisations) now runs end to end through `gds_api/pentest/engagement_runner.py` and
`POST /red-team/engagements/{id}/execute`.

THE DESIGN IS REFUSAL, NOT ENTHUSIASM:
  * EVERY TARGET IS RE-CHECKED AT RUN TIME against `authorized_targets`: status active, `valid_from` passed,
    `valid_until` not passed. An engagement created while a target was valid must not run after it expires. One
    unusable target refuses the WHOLE run and names itself, because a half-run engagement is worse than none.
  * ONLY THE TECHNIQUES THE ENGAGEMENT ALLOWS, and only ones this platform implements. A technique with no tool
    is reported as not_run with the reason, never silently skipped and never faked.
  * EVERY ACTION GOES THROUGH `execute_governed_tool`, so each one is a capability request with a decision and
    an execution receipt. Nothing calls a scanner directly.
  * THE APPROVAL RULE IS NARROW: an offensive capability demands approval, and the runner may derive that
    approval from the engagement ONLY when the SAME human authorised both the engagement and the target. The
    approval row still records that human as decider, with `standing_until` set to the target's own expiry, so
    it is an auditable authorisation rather than a bypass.
  * IT CANNOT EXPLOIT: external surface review only.

THREE DEFECTS FOUND ONLY BY RUNNING IT AGAINST THE REAL ESTATE, none visible to a green suite:
  1. ONE ROLE FOR EVERY TECHNIQUE. The first run drove all five actions through `penetration_testing_coordinator`
     and governance answered "This agent is not authorised to request this capability" for the header check.
     Each tool belongs to a different role (headers -> api_application_security, dns -> red_team,
     nuclei -> vulnerability_assessment); the runner now maps tool to role and a guard asserts every planned
     tool has an owning role.
  2. THE AUTHORISER COLUMNS WERE NOT SELECTED, so the engagement-authorisation rule could never fire: both the
     engagement and the target queries omitted `authorized_by_user_id`, the comparison was always false, and
     every offensive action sat in "awaiting a human" while three approvals had already been granted.
  3. NOTHING BOUNDED A SCANNER. A nuclei run against one target took 3.5 minutes and the first cap (240s)
     abandoned it mid-run; there is now a per-tool cap (420s) and a hung tool is recorded as refused with
     "did not return within Ns and was abandoned" instead of holding the engagement open.

PROVED LIVE on b11f6d34, in two runs because the first abandoned the scans: recon_dns_enumeration on the app
domain (3 real findings), security_headers_check on both hosts, then nuclei_scan on both hosts. Five governed
actions, zero refused, engagement `completed` with a report summary that states the counts and says no
exploitation was attempted. The standing approvals the rule created were revoked afterwards, restoring the
zero-standing baseline. Eight guards in tests/test_engagement_runner.py.
