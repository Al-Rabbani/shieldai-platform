-- 077: one deterministic schedule, for the tenant the runner actually serves
--
-- Migration 076 inserted the deterministic scan's schedule row for EVERY tenant (`FROM tenants t`), which created
-- four schedules that no runner executes. Each of those tenants would then open its scanner page and be told its
-- scan is "never_run" / silent - a false alarm produced by this platform, about this platform. The runner resolves
-- exactly one tenant from GDS_TENANT_ID, so exactly one tenant gets a schedule.
--
-- The tenant id is stated literally because a migration cannot read the process environment, the same reason
-- migration 074's backfill names the GDS tenant. If a second tenant is ever given its own runner, this is the row
-- to copy for it - and that runner must stamp it.

BEGIN;

DELETE FROM scan_schedules
 WHERE monitor_type = 'deterministic'
   AND tenant_id <> '2ec10dd0-e48e-4043-8c88-5998ba5e23b0';

COMMIT;
