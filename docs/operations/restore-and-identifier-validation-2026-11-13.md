# Restore, tenant policy and workflow identifier validation

13 November 2026. VPS observations were returned by GDS Co-Pilot through its
existing authorized connection. Codex SSH remains unavailable from this workspace.
No production source deployment or merge was performed in this batch.

## Isolated restore completed

Archive `/root/gds-backups/gds_os_20261113T203703Z.dump` matched SHA256
`c7abdaa99f3bc385e2a2aa54830820f8bf396b557cd7297576ee13719a700e94`.
Co-Pilot restored it into a newly created, postgres-owned database,
`gds_restorecheck_20261113T204720Z`, with PUBLIC CONNECT revoked before restore.
Neither `gds` nor `gds_runtime` received a connection grant. It remains retained
for further isolated checks; no application or worker was pointed at it.

The first file-open attempt was denied by the root-only backup permissions.
Streaming the archive through stdin resolved this without relaxing permissions;
`pg_restore --no-owner --no-acl` then exited zero against that same empty target.
Reported duration was under one second. All 64 public base tables restored; 24
contained data, with 503 aggregate rows. All four protected tables retained RLS,
FORCE RLS and one policy each. Production finding count remained 92.

This proves this archive could restore its schema and data. It does not prove
scheduled/off-host backup durability, full infrastructure recovery, original ACL
restoration, provider recovery or an application RTO.

## Effective two-tenant policy acceptance

Only the restored database was used. A single BEGIN/ROLLBACK transaction created
synthetic fixtures and a NOLOGIN, NOSUPERUSER, NOBYPASSRLS role, with transaction-
local grants and SET LOCAL ROLE. It was not owner of any protected table.

| Test | Result reported |
|---|---|
| Tenant A visibility across findings/results/repositories/bindings | One own fixture row in each |
| Tenant B visibility across those four tables | One own fixture row in each |
| Missing tenant context | Zero visible rows in all four; finding write rejected |
| Foreign finding update/delete | Zero rows affected |
| Foreign-tenant finding insert | Rejected by RLS |
| Moving own finding to another tenant | Rejected by WITH CHECK |
| Own finding insert and update | Succeeded; own visible fixtures increased to two |
| Session tenant context after rollback | Blank |
| Test roles/fixtures/grants after rollback | Removed; no persistent test role |
| Retained restored baseline | 64 tables, 92 findings, 137 legacy mission results, four policies |
| PUBLIC and application CONNECT after rollback | Still denied |

These are actual policy checks on the restored schema, not a substitute schema.
Write denial tests were reported for findings; do not infer every write operation
on every protected table was exercised. ORM `missions` and `tenants` do not have
RLS. No authenticated API, background worker, export or connection-pool acceptance
was performed. A raw role allowed to set `gds.tenant_id` is not itself a verified
tenant principal: the application must establish trusted identity and scope.

## Identifier defect and bounded correction

The worker log contained 22 malformed UUID failures at `assess_mission`. Legacy
bridge IDs use `mission-<12hex>` in `mission_results.mission_id` (varchar), while
ORM `missions.id` is UUID. These are distinct stores. The current lifecycle start
helper passes a UUID, and the bridge/scheduler has no Temporal start reference.
The producer of the invalid historical workflow payload remains unconfirmed.
There is no evidence permitting an automatic mapping between these ID spaces.

Candidate source now:

- Parses existing database UUIDs without minting, truncating or guessing an ID.
- Validates the mission ID before opening the Temporal client or creating a
  WorkflowRun row. Valid direct/chat workflow IDs remain unchanged.
- Validates mission/task/approval IDs before database-session creation in eight
  activity entry points. Invalid IDs produce `ApplicationError` with type
  `InvalidDatabaseIdentifier` and `non_retryable=True`, without reflecting input.
- Treats missing mission IDs in the three dictionary payloads the same way.
- Leaves workflow run definitions and historical data unchanged. Existing failed
  workflows must be inspected and reconciled separately; none was retried here.

Temporal's documented permanent-input failure mechanism is used:
https://python.temporal.io/temporalio.exceptions.ApplicationError.html

Verification: 95 offline checks passed, including four new parsing contracts.
Six additional tests passed with Temporal SDK 1.31.0: all eight activity guards,
missing payload IDs, real failure-converter serialization of the non-retryable
flag, valid assessment lookup, invalid-start rejection before side effects and
preserved direct/chat start IDs. Database/client/decorator boundaries are fixtures;
these tests do not execute a workflow server, LLM, scanner or real ORM session.

## Still required before production release

1. Review historical invalid workflow inputs and establish the actual producer.
   Reconcile them explicitly; do not map prefixed IDs to UUIDs by convention.
2. Complete API/import compatibility and authenticated two-tenant acceptance,
   including the ORM mission paths and all remaining tenant-sensitive tables.
3. Exercise the legitimate governed broker path with harmless canaries and verify
   redacted arguments, replay, crash and audit behavior.
4. Restore provider budget or configure an approved funded provider before a
   bounded real mission. No billing changes or provider calls occurred here.
5. Add scheduled encrypted off-host backups, capture Temporal configuration and
   image digest, and finish release/rollback/ingress verification.

The tested backup and these policy checks close specific evidence gaps. They do
not establish overall production readiness.
