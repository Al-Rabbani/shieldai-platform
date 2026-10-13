# Phase C.1 — authenticated service scope and scoped findings

Part of issue #12 and the staged design in PR #15. This package is intentionally
not imported by production routes or existing writers. It introduces the
reusable code that later integration PRs will call; it does not claim that all
seven paths or tenant isolation are complete.

## Code prepared

- `authenticate_scoped_bridge` verifies the actual bridge credential before
  reading a server-owned principal/tenant mapping. No request/model tenant ID
  is accepted. This fixed service mapping is for the initial platform workload,
  not generic customer authorization or a replacement for a principal registry.
- `scoped_security_transaction` uses a separate configured database connection
  and role. It rejects autocommit, superuser, BYPASSRLS, elevated membership,
  owner membership, missing tables or missing forced RLS. Tenant context is set
  transaction-locally with a bound value and repository membership is checked
  within that tenant before data access.
- `read_scoped_findings` and `store_scoped_finding` bind tenant/repository IDs
  independently of payloads. Reads use exact targets, not substring matching;
  writes explicitly supply tenant identity. Errors are controlled and connections
  are closed after commit/rollback. Limits and finding severity are validated.

The typed scope is an internal object, not a serialized authorization token.
Only trusted code may construct or resolve it. A compromised service with DB
credentials can still alter its context; RLS does not replace principal
authorization, credential separation or application boundary checks.

## Staging configuration (values remain private)

Co-Pilot configures `SECURITY_DATABASE_URL` for the restored staging DB's
non-owner runtime role and `SECURITY_RUNTIME_ROLE` for that exact role.
The helper does not fall back to the existing privileged DATABASE_URL.
All four phase-D tables/policies must be ready in staging before calls succeed.

For the bridge-scope test, set private server-owned values for
SECURITY_BRIDGE_PRINCIPAL_ID, SECURITY_BRIDGE_TENANT_ID and optional
SECURITY_BRIDGE_REPOSITORY_BINDING_ID. Provision the matching active repository
binding when the optional repository scope is used. Do not paste credential or
identifier values into public comments, code, or chat.

No service should start reading the root-only environment file as an
unprivileged user. Operations inject the required environment through the
existing secure service configuration/credential broker. The new module does
not loosen file permissions.

## Acceptance before wiring

Run `python -m unittest discover -s tests -p test_security_scope.py -v`.
Eleven offline contracts cover auth, forged payload identity, missing service
configuration, unsafe roles/enforcement, autocommit, inactive repository,
transaction-local context, bound read/write values, rollback and error masking.
They use fake connections; PostgreSQL/pool behavior still requires real tests.

Co-Pilot should test against the retained isolated staging DB:

1. An authenticated mapped service resolves its configured scope; wrong key and
   missing/malformed scope configuration fail before data access.
2. GDS scope sees only its staged findings, a second tenant sees only its own,
   and cross-tenant repository bindings fail. Exact targets cannot collide.
3. Store a clearly labelled finding with quotes/newlines, verify its explicit
   tenant/repository fields, read it back and remove it using scoped access.
4. Missing RLS, superuser/owner/elevated role, wrong runtime-role name and
   autocommit are rejected. No-context direct reads remain denied by RLS.
5. Exercise commit, rollback, exception and connection reuse; confirm context
   disappears after the transaction. Verify no connection details leak.

Return outcomes and code SHA only, never DSNs, keys or production evidence.

## Remaining Phase C integration work

| Path | Remaining work |
|---|---|
| Bridge/kernel admission | Call verified scope resolver after auth; carry scope separately from payload; bind process/IPC ownership. |
| Kernel tools | Route finding operations through scoped functions; preserve trusted scope across sandbox/subprocess execution. |
| agent_loop and active runner | Carry explicit scope on delegated tasks/tool calls; prevent legacy fallback bypass. |
| mission_orchestrator | Explicit scoped persistence and reads; remove runtime DDL in scoped mode; tenant-bound memory cache and polling. |
| CI gate | Registered workload and immutable provider repository identity; scoped exact repository counts. |
| check_alerts | Trusted per-tenant jobs and recipient binding; remove first-user/first-tenant selection. |
| Schedules/exports | Explicit principals and tenant context; tests for concurrent jobs and cross-tenant reports. |

Do not switch production credentials or enable phase-D enforcement until those
paths pass the full acceptance matrix. This PR is review/staging code only.
It does not change DNS, TLS, database grants, migrations, repository visibility,
or production routing. Existing services continue using existing paths.
