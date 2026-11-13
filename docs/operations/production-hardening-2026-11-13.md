# GDS production hardening: implementation and release gates

Status: source changes prepared, Base44 safeguards saved, VPS deployment blocked by missing authenticated access. This is not a production-readiness certification.

## Applied to Base44

App `6a22a773bb173a975d8337f9`, checkpoint `6af7554e9c6fd3c2b429ecec`, source commit `7e8fba429b196df716c8822fde53a185d8ce9608`.

- Retired random production writes in `agentWorker` and `agentSimulator`. Admin-only explicit previews return labelled examples without entity writes or notifications. Existing records were not deleted or altered.
- Kernel approval RPC no longer changes approval counts or advances sessions. It returns `GOVERNED_APPROVAL_REQUIRED` until an atomic governed runtime service is connected. Kernel session drafts derive the actor from the authenticated caller.
- Removed random heartbeat/health results and fabricated metrics from the reviewed runtime and health endpoints. Missing telemetry remains unknown; source failures do not become successful empty reads.
- Disabled fake start/heartbeat/cancel/message acknowledgements and fake SOAR execution. These are deliberately unavailable, not completed runtime integrations.
- Dark-web summaries no longer claim a new collection timestamp.
- Agent screens derive heartbeat state from freshness, show unknown measurements and no longer pretend a database update restarts a worker.
- `Agent`, `KernelSession` and `KernelApprovalRequest` now require admin read access and reject client-side creates/updates/deletes. Service-role operations remain privileged and require handler-level checks. This is containment for the current platform, not multi-tenant authorization.
- Added `draft` to the KernelSession schema to match its non-executing behavior.

The Base44 build and 29 backend contract checks passed, plus heartbeat UI and schema assertions. SDK/provider calls were mocked; effective hosted RLS still needs an authenticated denied/allowed live test.

The snapshot in `deploy/base44-hardening/` records the exact revised source for review. Base44 is its primary running source; these files are not automatically deployed by a GitHub merge. Run its backend contracts using Node 24: `node tests/gds-production-hardening.mjs` from that directory.

## VPS source changes in this PR

- Closed plain `tool_gateway.execute_tool`; registered handlers are reached through the governed path after checking a persisted claimed decision and exact actor/mission/request binding.
- Bound execution to the stored request's tool and parameter set. Raw values cannot replace redacted stored arguments. Credential-bearing workflows must use reviewed credential references; masked non-secret arguments also need a compatible reviewed binding design before enabling those workflows.
- Added a durable request-wide execution claim using PostgreSQL row locking. Re-evaluating a request does not create another opportunity to repeat its side effect. Crashed `executing` claims require explicit reconciliation; do not auto-retry uncertain effects.
- Explicit tool failures are recorded as failed, not executed successfully.
- Closed legacy AgenticLoop direct AWS/finding/tool branches and raw kernel tool/approval RPC bypasses. Existing modern capability workflows remain the intended path.
- Bridge credentials must be non-empty and compare in constant time. Health reports registry reachability separately from verified workers.
- Added authenticated `/bridge/diagnostics`, returning bounded metadata and explicit unverified gates. Set `GDS_RELEASE_SHA` from the deployed revision; it is a deployment assertion, not independent binary attestation.
- Expanded the existing CI workflow to cover the changed execution/bridge paths and all offline contracts.

These changes have NOT been deployed to the VPS. The Base44 secret-name inventory contains no `BRIDGE_API_KEY`; protected VPS agent detail returned 401 during review. No SSH or Hostinger infrastructure session was available. No migration, restart, scanner, remediation or customer notification was run.

## Acceptance before VPS rollout

1. Restore a database backup into isolated staging. Verify current schema, non-owner runtime role, forced RLS, principal mappings and release compatibility. Preserve existing finding/mission IDs and provenance.
2. Deploy this branch to staging with a recorded full SHA. Run the offline suite on the actual Python version. Confirm imports with real service dependencies, not only AST tests.
3. Exercise a complete legitimate capability request through the real broker and real database. Verify exact tool/arguments and actor/tenant/mission matching. Test redacted argument handling explicitly.
4. Run two concurrent executions of one request: exactly one reaches a canary handler. Repeat after a decision re-evaluation. Rejected, expired, cancelled, failed and crash-uncertain requests must not replay automatically.
5. Test failure before claim commit, crash after claim commit, tool failure, audit persistence failure and service restart. Reconcile unknown effects before a fresh authorized request.
6. Test two tenants across reads, writes, counts, mission polling, exports, background jobs and connection-pool reuse. Missing/forged identity must fail closed. A shared bridge key is not tenant membership or approver identity.
7. Confirm plain tool dispatch, legacy loop calls and raw kernel tool/grant RPC cannot run scanners. Use modern capability workflows for approved canaries.
8. Check `/bridge/diagnostics` using secure credential injection. Confirm wrong/missing keys receive 401 and the full deployed SHA matches the release. Never print a credential or DSN.
9. Verify actual ThreatMonitor service/sensor logs, upstream event freshness and a labelled benign detection canary. Verify EvidencePackBot against authentic evidence and an opened generated report. A status-row edit is not recovery.
10. Run load, timeout, rate-limit, cancellation and restore tests at an explicitly bounded workload before advertising capacity. Keep production onboarding restricted until isolation passes.

## Rollout and rollback

Preserve the current working VPS release and database backup. Deploy source only after staging acceptance; do not execute tenant migrations implicitly. The execution claim uses the existing decision status string column and adds no migration in this PR, but validate the actual schema first.

This release intentionally retires ungoverned legacy execution. Do not roll back to a permissive raw dispatcher just to restore old functionality. If legitimate workflows fail, pause affected missions, preserve evidence and repair their governed path. Prefer restoring service through a known-good governed release. A Base44 checkpoint rollback that restores simulators would also restore the original integrity flaw.

## Remaining delivery order

| Gate | Current evidence | Next requirement |
|---|---|---|
| Production inventory | Base44 source inspected; public bridge reachable | Authenticated VPS/service inventory and deployed SHA |
| Trust and access | Base44 safeguards applied; VPS code and offline contracts prepared | Effective hosted RLS, real database concurrency and legitimate broker-path acceptance |
| Operational telemetry | Misleading states removed on reviewed paths | Real sensors, signed worker reporting, ThreatMonitor and evidence worker recovery |
| Isolation and durability | Existing helpers and new request claim reviewed | PostgreSQL/queue/restart/restore tests and completion of all tenant paths |
| Grok staging | Architecture documented, no credentials or connection configured | Restricted principal and reviewed connector/API adapter after the earlier gates pass |
| Controlled remediation | Unsafe legacy paths closed | Approved canary change, retest, rollback and independent closure |
| Commercial readiness | No capacity or compliance certification claimed | Measured costs/capacity, onboarding boundaries and operational ownership |

No new customer tenant, Grok account or paid subscription was created. Grok must receive only tenant-scoped, redacted functions; never root SSH, general shell or shared database/bridge credentials.


## Follow-up: internal sandbox and database execution claims

The hardening branch is published as draft PR #21. The follow-up also denies direct
`ToolSandbox.execute` calls, closing the internal daemon/syscall route around HTTP
and API gates. Tool wiring uses `ToolState.OPEN` instead of integer `2`, so driver
serialization can safely use the enum's `.value`.

The offline suite now has 87 passing checks. Four opt-in PostgreSQL integration
checks exercise the production `_claim_execution` implementation against real
SQLAlchemy sessions and a disposable schema: twenty concurrent attempts, replay
after re-evaluation, wrong-tenant rejection and decision substitution. They do not
exercise the full API, production ORM schema, RLS or VPS release.

Local PostgreSQL execution could not start because this workspace denies socket
creation. The CI workflow therefore includes an isolated PostgreSQL 16 service.
The PostgreSQL job succeeded in run 43484961011 after enabling SQLAlchemy asyncio dependencies: all four tests ran and passed. This proves the isolated claim contracts, not production RLS or the deployed VPS.


## Authenticated runtime connection control

Base44 checkpoint `6af75a3c1bc2c9d3c1bad699`, commit
`d65f1387cbdbb87ba0453543e19ddc84c2185be4`, adds the admin-only
`gds-runtime-diagnostics` backend and a Verify runtime connection button in Agent
Fleet. It performs only fixed-origin GET requests to the GDS bridge. It rejects
redirects, bounds response size and timeout, returns selected metadata only and
never sends the key to the browser or accepts a caller-selected URL.

Set the EXISTING VPS bridge credential privately in Base44 server Secrets under
`BRIDGE_API_KEY`. A newly invented key will not authenticate to the existing VPS.
No credential was copied, generated or changed during this work. Missing credentials
return an explicit blocked state without network access. Older releases can supply
an authenticated roster; a roster never proves worker execution or production
readiness. A separate authorized deployment channel is still needed for VPS rollout.

The Base44 build and all 37 backend contracts passed (19 safeguards, 10 existing
AgentOS, 8 diagnostic transport). CI additionally exercises the 27 snapshot tests;
the 10 existing AgentOS contracts remain in the actual Base44 app. CI's PostgreSQL
service is disposable and contains no customer data.
