# Global Digital Security — Platform Readiness Audit and Repair Record


**Audit date:** 14 November 2026, Europe/Dublin / UTC

**System:** srv1869692.hstgr.cloud; application checkout `/opt/gds-os`

**Application:** https://app.globaldigitalsecurity.io

**API:** https://api.globaldigitalsecurity.io

**Change branch:** `codex/gds-readiness-20261114`

**Starting revision:** `a2ff2e3`

## Decision

The platform's infrastructure and several important security and frontend defects were repaired. The final checks show seven healthy infrastructure dependencies, a responding workflow service, a stable worker, a working HTTPS application, and substantially improved anonymous-access boundaries.


**This is a verified repair pass, not certification that the entire product is production-complete or the best platform in its industry.** Three agent roles still have documented missing capabilities. Nineteen planned agents are not operational. Several advanced legacy feature groups remain deliberately unavailable until their authentication, tenant isolation, permissions and functional behavior are verified. Authenticated browser journeys require the owner to sign in; they were not certified in this pass.

## Verified results

| Area | Observed result | What the result establishes |
|---|---|---|
| Backend regression suite | 86 tests passed | Existing security contracts plus new readiness, legacy-route and workflow-input regressions pass offline. |
| Frontend regression suite | 11 tests passed | The complete script parses; live-data rendering, escaping, failed-request states, session restoration, logout and accessible form controls meet the tested contracts. |
| Anonymous GET audit | 118 routes checked | 116 returned 401; two explicitly public routes returned 200; no unexpected results in this bounded audit. |
| Readiness | HTTP 200; seven of seven dependencies healthy | PostgreSQL, Redis, Neo4j, Qdrant, Temporal, NATS and MinIO passed their implemented checks. |
| Temporal | Protocol handshake succeeds | A listening TCP proxy is no longer accepted as proof of workflow readiness. |
| NATS | Protocol PING/PONG succeeds | The service responds as NATS, rather than merely accepting TCP. |
| Supervisor processes | Kernel, API and worker RUNNING | The worker remained up for more than ten minutes after recovery, rather than restarting every few seconds. This is an observation window, not an availability SLA. |
| Agent registration | 23 registered; 20 marked operational; three degraded | These are registry labels, separate from actual execution and independent capability validation. |
| Agent tool contracts | All 23 registered agents reference available tools | No declared tool was missing from the 48-tool runtime registry. This does not prove every tool completed a real external task. |
| Current mission activity | Zero registered agents recorded against running mission tasks at the final query | Idle agents are not described as busy. No artificial workload was created to inflate activity counts. |
| HTTPS | Application and API readiness returned 200 with normal certificate verification | Both public HTTPS routes responded successfully. |
| API listener | `127.0.0.1:8000` | Direct access to the application listener is restricted to the host; Nginx remains its public proxy. |
| Production cookies | `COOKIE_SECURE=true` verified in the running API environment | Production startup now enforces the Secure setting. Actual successful-login cookie behavior still needs the authenticated browser check. |
| Mobile sign-in | 390-pixel viewport; document width 390 pixels | No horizontal overflow was observed on the sign-in view; Sign In and Register controls worked. |
| Deployed frontend identity | SHA-256 matches the tested source | See the deployment identity below. |

### Before and after anonymous access

The broader audit was performed after the initial six-group legacy guard had already been deployed; it is not a complete snapshot of the original installation.

| Result | Before expanded safeguards | After expanded safeguards |
|---|---:|---:|
| HTTP 200 | 17 | 2 |
| HTTP 401 | 71 | 116 |
| HTTP 500 | 29 | 0 |
| HTTP 422 | 1 | 0 |
| Checked routes | 118 | 118 |

The two intentionally public routes were `/bridge/health` and `/billing/plans`. Health endpoints were checked separately. This audit covered GET routes without path parameters, not authenticated access, every object ID, every HTTP method, or every external integration.

## Repairs applied

### 1. Restored durable workflow infrastructure

The worker was in a restart loop because Temporal could not reach PostgreSQL. PostgreSQL was already configured to listen on the private Docker bridge, but the reboot started PostgreSQL before that bridge existed. Its log showed the failed bind to `172.17.0.1`, leaving only loopback listeners while Temporal waited for its database.

The repair added a systemd ordering drop-in so PostgreSQL starts after Docker, restarted PostgreSQL, and verified that the already-configured bridge listener accepted connections. Existing database authentication rules were not broadened. Temporal subsequently started serving workflows and the worker resumed polling `gds-missions`.

The persistent configuration is `/etc/systemd/system/postgresql@15-main.service.d/gds-docker-order.conf`; its versioned copy is `deploy/systemd/postgresql-docker-order.conf`. The ordering has been inspected, but a controlled reboot/restore rehearsal has not yet been performed.

### 2. Made readiness reflect service behavior

The original Temporal check reported healthy when a Docker TCP proxy accepted a connection, even though Temporal could not serve requests. The revised probe performs the Temporal client's actual gRPC connection handshake. NATS now needs a valid protocol greeting and PING/PONG response.

A new `/health/ready` endpoint returns HTTP 503 when required dependencies are unavailable and HTTP 200 when the implemented checks pass. Raw exception text is omitted from public failure details to reduce the risk of exposing connection details or credentials. `/health/live` remains separate from dependency readiness.

The failed-dependency case was verified live before the Temporal repair: readiness returned 503. After the repair it returned 200.

### 3. Closed unsafe legacy access paths

An anonymous request to `/ciem/findings` originally returned 200. Its legacy SQL query did not bind a tenant. Six legacy gap-route groups are now authenticated and fail closed before reaching their unverified handlers.

A wider audit found additional legacy reasoning exposure and numerous advanced modules returning 500 without authentication. Thirteen additional feature-router mounts now use the same guard. Some handlers used the bare `Depends` function as their user default rather than a real authentication dependency.


**The guard is containment, not a completed feature implementation.** Anonymous callers receive 401. Authenticated access to these unverified handlers receives 503 until the underlying feature passes tenant, permission and capability verification. Earlier canonical permission-scoped routes continue to take precedence.

Affected advanced groups include legacy reasoning, compliance autofix, generic autofix, compliance evidence, CI/CD integrations, webhooks, SSO, data residency, AI security, attack graphs, red-team simulations, digital twins and marketplace. This list must not be mistaken for a list of certified working product features.

### 4. Fixed frontend execution and authentication defects

- Corrected a pre-existing JavaScript syntax error in the version template expression that prevented the application script from loading.
- Switched the frontend to its same-origin `/api` proxy, with explicit cookie credentials.
- Replaced trust in cached browser user data with server verification through `/auth/me`.
- Changed sign-out to call the backend logout endpoint before clearing the browser view.
- Made expired sessions visible and avoided treating failed data loads as empty datasets.
- Escaped API-supplied text in agent, finding, incident, audit, tenant and cloud displays.
- Stopped an unavailable incident service from being presented as “All clear.”
- Connected form labels to inputs, added autocomplete hints and status announcements, and made authentication mode controls actual buttons.
- Restored mobile navigation links, added keyboard focus styling and respected reduced-motion preferences.

### 5. Added Agent Assurance

The previous Agents view was a hardcoded roster with an unsupported claim of 35 agents. The new view requests the actual agent registry, the current organisation's running mission activity, and the planned-agent registry.

It displays registered count, operational/degraded labels, executing mission count, planned count, tools, departments and the observation time. It explicitly distinguishes “marked operational” from “executing a mission” and does not invent a count when verification fails. It includes a refresh action, responsive metric cards, a scrollable accessible table and a restrained visual treatment.


**This is the implemented differentiator in this pass:** an evidence-aware operational view that refuses to turn unavailable data into success claims. Authenticated visual and functional verification of this page remains pending owner sign-in; its rendering and failure contracts passed offline tests.

### 6. Reduced retry noise and direct exposure

Malformed mission UUIDs and references to permanently missing missions now produce non-retryable Temporal application errors. A recovered queued malformed request was observed reaching the new `InvalidMissionId` boundary. The worker was not stopped by this invalid work item.

The production API binds to loopback, and its startup script forces Secure cookies. A frontend backup and a stray terminal artifact were archived outside the web root. No customer records, original authorised SSH keys, databases, snapshots or application repositories were deleted.

### 7. Made verification reproducible

The root `npm test` previously printed “No tests configured” and exited successfully. It now invokes backend and frontend regression suites. The VPS has Python but no Node executable; frontend tests were run in the available Node 24 runtime against an exact copy of the staged source, whose hash matched the deployed file. The existing project engine requires Node 18 or later for the JavaScript suite.

Added or updated verification artifacts:

- `tests/test_readiness_protocols.py`
- `tests/frontend-assurance.test.cjs`
- `scripts/audit_anonymous_routes.py`
- `web/gds_app.html`, now versioned rather than existing only under the web root
- `deploy/systemd/postgresql-docker-order.conf`

## Agent restoration status

All 23 registered agents have resolvable declared tools, but three roles remain honestly degraded:

| Agent | Existing working contract recorded in the registry | Missing work before claiming the whole role is operational |
|---|---|---|
| Validation and Retest | Independent validation/rejection of findings | Execute an authorised retest, retain its evidence, and prove the underlying issue or attack path is closed. A patch or commit alone must not close a finding. |
| Defensive Remediation and Auto-Fix | Starts a governed remediation mission | Track that asynchronous mission through review, required human approval, actual commit and independent retest. Handle failure, denial and rollback explicitly. |
| Penetration Testing Coordinator | Governed multi-target DNS/port/TLS reconnaissance | Generate test plans, assign appropriate specialists, consolidate evidence, validate attack paths and create findings from verified results, all within engagement authorisation. |

These capability descriptions come from the implementation's own registry, not from a new successful end-to-end exercise. Changing the three status labels would not implement the missing capabilities. Nineteen planned agents also remain planned.

## Remaining blockers and acceptance criteria

| Priority | Blocker or limitation | Required evidence before release |
|---|---|---|
| P0 | Signed-in customer journeys have not been completed in this pass | Owner sign-in, then verify dashboard data, navigation, session expiry, refresh, logout, permissions, approval flows and error recovery in the browser. |
| P0 | Unverified legacy feature groups are quarantined | Real authenticated handlers; permissions appropriate to each operation; bound tenant/object queries; cross-tenant negative tests; required schema migrations; documented contracts. Re-enable each module separately after proof. |
| P0 | Three agent roles are incomplete | Demonstrate the missing contracts above using authorised targets and real persisted evidence. |
| P0 | A tool existing in a registry is not an execution test | Run benign per-agent smoke missions and check actual tool invocation, model/provider errors, denied actions, output contracts and durable task completion. |
| P0 | Full tenant isolation is not certified | A metadata check found 64 ordinary public-schema tables with RLS enabled on four. This is coverage information, not proof that the other tables leak. Verify application scoping and database enforcement table by table. The inspected `gds` role was not a superuser and did not have BYPASSRLS or CREATEROLE. |
| P1 | Docker-published infrastructure ports need a full exposure review | Verify external reachability, Docker firewall behavior and required clients; bind private services to loopback/private interfaces where appropriate without breaking valid integrations. UFW rules alone were not treated as proof for Docker-published services. |
| P1 | Availability and reboot recovery need rehearsal | Controlled reboot, worker restart, dependency outage and backup restoration tests; prove the new PostgreSQL/Docker ordering across a reboot. |
| P1 | External integrations remain unverified | Test the configured model provider, cloud connectors, scanners, email/webhooks and repositories with scoped credentials and authorised fixtures. No offensive scans or paid model completion campaign was run in this pass. |
| P1 | Several hundred API paths exceed the bounded smoke-test coverage | Add authenticated tests for parameterised routes and all write methods, schema validation, idempotency, authorisation, rollback and rate limits. |
| P1 | Scale claims have no supporting benchmark in this audit | Representative concurrent load, queue saturation, backpressure, soak tests, database/worker capacity, recovery behavior and cost budgets. Do not advertise million-user or million-agent capacity based on these checks. |
| P1 | Full dependency and operating-system assurance is incomplete | Current lockfiles, dependency vulnerability review, image provenance, SBOM, secret scanning, package updates and a tested rollback process. The login banner reported pending OS updates; those were not applied here. |
| P1 | Browser security policy still permits inline/evaluated scripts | Move scripts to versioned assets or adopt tested nonce/hash policies before tightening CSP. Preserve existing security headers and verify every page under the revised policy. |
| P1 | Data protection and operations need product-level evidence | Backup retention and restore drills, audit-log retention/tamper resistance, key rotation, credential scopes, incident response and tenant data deletion/export behavior. |
| P2 | Full responsive/accessibility coverage is pending | Keyboard-only dashboard use, screen-reader checks, contrast, empty/error/loading states and mobile/tablet/desktop screenshots after authenticated sign-in. Only the public authentication views were exercised visually. |
| P2 | Product differentiation needs proof beyond appearance | Benchmark investigations, explainable decision trails, controlled remediation outcomes and operator time saved on real customer problems. |

## Recommended completion sequence

1. Complete authenticated owner and restricted-role browser checks.
2. Exercise a read-only Platform Operations mission through the recovered workflow service; verify task state and evidence, not just an HTTP acknowledgement.
3. Implement retest evidence and remediation completion tracking, then extend pentest coordination under explicit engagement rules.
4. Restore quarantined modules one at a time after their tenant, permission, schema and integration tests pass.
5. Add a staged deployment pipeline with regression, security and dependency checks plus rollback verification.
6. Complete recovery and representative load/soak tests before external production-readiness or scale claims.

### Next product differentiator: Mission Assurance Passport

Build on the implemented Agent Assurance view with a per-mission evidence record: tenant and target scope, authorisation, agent/tool versions, action evidence hashes, approval decisions, remediation commit, independent retest, residual risk and rollback outcome. Make “verified resolved” a computed result supported by these records, never a manually applied badge. This passport is a proposed extension, not a feature claimed as implemented by this audit.

## Deployment identity and recovery

The tested frontend, versioned `web/gds_app.html`, and deployed `/var/www/gds_app.html` matched:

```text
29fbc02d165afe89b2ea67bb3f90c28ffc8bf5af8126eb4376500565571521dc
```

The pre-change frontend is archived at `/var/backups/gds/gds_app.html.backup.20261114-pre-readiness`. Changes are preserved on the named branch rather than represented as an upstream merge. Service configuration changes must be considered separately from source rollback. Do not restore the old frontend merely to remove the new view: it contains the earlier script and session defects. Likewise, removing the legacy guards would re-expose the paths identified by this audit.

No credentials, private keys, customer row contents or authentication tokens are included in this record. The absence of a detected issue in these bounded checks is not a guarantee that an untested path is secure.
