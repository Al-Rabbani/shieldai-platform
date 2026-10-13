# Security tenant isolation — staged migration design

Review package for issue #12. These SQL files are drafts, not automatically
executed deploy migrations. No production data or credential values are
included. PostgreSQL execution and rollback must be verified in a restored
staging database before approval.

## Ground truth and decisions

This is a generic design derived from the repository's existing security store
queries and tenant/repository models. Production identifiers, row counts,
credentials and detailed runtime-role metadata are intentionally omitted.
An authorized operator supplies reviewed values privately during staging.

Keep legacy table names and IDs during this rollout. Enrich those authoritative
stores rather than creating competing copies in empty ORM tables. Migration to
the UUID ORM findings model is a later explicit change with provenance mapping,
not an incidental part of tenant backfill.

Existing Repository ORM registration is designed for LOCAL repositories with a
real working_directory, and its credential reference is not yet an operational
remote credential resolver. A separate security_repository_bindings registry
therefore records verified remote identity. Its optional managed_repository_id
links to a real existing managed object; do not fabricate worktree paths.

Do not assign all findings to shieldai-platform: network, domain and AWS IAM
findings belong to the platform tenant but may have no repository association.
Backfill repository_binding_id only from an explicitly reviewed per-record
association manifest. Substring target matching is never an identity mapping.
Retain the test tenant until users, FKs and retention obligations are checked;
this migration does not delete it.

## Trusted identity chain

Authenticate a workload using a dedicated credential managed outside the model
and request payload. Resolve it through a server-owned principal record or
credential broker to an allowed tenant and repository set. During the initial
platform-only deployment, the dedicated CI credential can be mapped explicitly
to the GDS principal; it does not become a generic multi-tenant authorization
key. A caller-supplied tenant UUID is ignored or rejected.

Fetch GitHub repository metadata server-side and verify immutable repository
ID plus canonical full_name against security_repository_bindings. Verify the
exact commit against that identity. A commit URL containing a repository name
is not proof of actor-to-tenant authorization, and public commit readability
is not a second tenant authorization factor. GitHub Actions installation tokens
need installation/workload handling; do not treat them as human /user tokens.

Look up the binding within the principal's allowed tenant; reject unknown,
revoked, mismatched or reassigned repositories. Repository renames update the
verified full_name while preserving the immutable provider ID; forks have
different IDs and require separate approved bindings. Only a trusted registry
administration path may create/transfer bindings. No LLM tool can enroll them.

Then start a database transaction and set context with a bound value:

```python
cursor.execute("SELECT set_config('gds.tenant_id', %s, true)", (str(trusted_tenant_id),))
```

Use that same transaction/connection for every query. The true argument makes
the setting transaction-local. Test rollback, exceptions and connection-pool
reuse; never use a session-global SET. RLS protects rows for non-bypass roles,
but does not protect against a compromised database client freely changing
context; trusted principal resolution remains a separate enforcement boundary.

## Phase A — preflight and backup

Pause schedules and writers for the brief ownership snapshot/backfill window.
Inspect current counts and every target again; do not reuse historical counts without checking. Record an ownership-review reference, metadata
and restorable database backup. Verify restore into an isolated staging DB.
Obtain runtime-role ownership, superuser/BYPASSRLS and membership metadata.
Keep credentials and customer evidence out of reports.

## Phase B — expand and backfill

Review and run 001_expand_backfill.sql in staging first using psql variables
reviewed_tenant_id, reviewed_findings_count, reviewed_missions_count and ownership_review_reference.
It locks the two authoritative stores, checks tenant/count/RLS assumptions,
adds tenant and repository identity columns, creates a remote binding registry,
backfills the reviewed GDS rows, validates FKs and creates indexes/audit metadata.
Existing IDs and evidence stay intact.

Temporary tenant defaults preserve the current GDS-only writers. This is a
compatibility measure, not authorization or multi-tenant readiness. Keep new
customer onboarding disabled. No repository bindings are guessed or inserted.
RLS is not enabled at this phase, and code behavior remains unchanged.

## Phase C — register identity and migrate every path

Provision a real server-owned GDS principal and register verified repository
metadata. Select the correct user/administrator deliberately where managed
repository ownership is needed; never SELECT the first user. Assign only
reviewed repository-associated finding IDs. Verify no cross-tenant composite
FK associations are possible.

| Path | Required change before enforcement |
|---|---|
| reasoning/agent_loop.py | Derive tenant from authenticated mission context; explicit tenant/repository inserts and scoped reads. |
| gds_kernel/tool_wiring.py | Pass trusted execution identity separately from model payload; validate tenant/repository consistency; set transaction context inside DB subprocess and use explicit inserts. |
| ci_gate.py | Registered workload/repository binding, exact tenant_id + repository_binding_id counts; remove ILIKE substring matching. |
| check_alerts.py | Enumerate only provisioned authorized tenant jobs; no first-tenant/first-user selection; scope findings and notification recipient together. |
| reasoning/mission_orchestrator.py | Persist and read tenant/repository identity in mission_results; tenant-bound status polling and reports. |
| bridge and mission APIs | Authenticate membership/capability on admission, tool dispatch, status polling and export; deny caller/model tenant overrides. |
| schedules/background workers | Explicit trusted service principal and tenant for each job; no inherited ambient pool identity. |

No privilege-bypassing gateway fallback is allowed. Missing identity must fail
closed before any read/write, even during the compatibility window. Verify
credential brokering and connection roles before replacing current service
credentials. Never expose DB credentials through MCP or model context.

## Phase D — enforce, after the writer rollout passes

Provision a dedicated non-owner application role with no superuser,
BYPASSRLS, elevated membership or DDL privileges. Audit SECURITY DEFINER
functions and other privileged paths. A login/password is provisioned through
secure operations, not embedded in migration files.

Review and run 002_enforce_rls.sql with runtime_role in staging. It rejects
owner/elevated roles, unassigned rows and preexisting policies needing review;
removes compatibility defaults; makes tenant IDs mandatory; and enables/forces
USING + WITH CHECK RLS on findings, mission history, remote bindings and managed
repositories. Missing tenant context denies reads and writes. Other ORM tables
still require a separate RLS/authorization inventory; this does not claim
database-wide isolation.

Switch all scoped services to that runtime role and validate actual role use.
RLS gives no protection to a still-running superuser or BYPASSRLS client. Do not
enable customer tenants until the tests below and recovery checks pass.

## Required staging and deployment acceptance

1. Preserve finding/mission row counts, IDs, details and statuses through the
   reviewed backfill; reject drifted counts or ownership snapshots.
2. Create two isolated test tenants with separate repositories, principals,
   findings and missions. Verify reads, inserts, updates, deletes, counts,
   status polling, reports and exports cannot cross tenant boundaries.
3. Attempt absent/forged tenant context, wrong repository/tenant association,
   revoked principal, repository rename/fork and unauthorized registry changes.
4. Verify missing context yields no rows and blocked writes; table owner,
   elevated membership and BYPASSRLS role checks reject unsafe runtime roles.
5. Test pool reuse across tenants after commit, rollback and exceptions, and
   concurrent/background jobs. Confirm transaction-local context is cleared.
6. Verify gate counts use exact binding IDs and no prefix/suffix repository
   collision can alter another repository's verdict.
7. Verify every writer supplies explicit tenant IDs after defaults are removed.
   Inspect real service role identity and audit records, not just ORM fields.
8. Run existing runtime/client/backend suites and bounded live missions, findings
   round-trips and alert delivery with labelled test records and cleanup.

## Rollback and completion

Expand is transactional: an error before COMMIT rolls back the whole file.
After expand, keep added columns and audit metadata when reverting application
code; do not drop provenance or overwrite new findings. Preserve the reviewed
single-tenant compatibility defaults until the writer correction is retried.

Once enforcement or customer data exists, do not disable RLS or restore broad
legacy readers to recover service. Pause tenant workloads, restore a known-good
scoped application release, and repair role/context handling with data preserved.
A full database restore requires reconciling post-backup writes and approved
recovery; it is not an automatic rollback shortcut.

Issue #12 is complete only after staged PostgreSQL tests, writer changes,
principal/repository bindings, production role verification and cross-tenant
acceptance evidence. This PR prepares the concrete design and SQL drafts only;
no PostgreSQL execution or production migration is claimed.
