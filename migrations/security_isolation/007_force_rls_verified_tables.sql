-- 007_force_rls_verified_tables.sql
-- Escalate RLS from "policy defined" (006) to "enforced" for the tables whose request
-- paths are proven to bind gds.tenant_id.
--
-- Why FORCE is needed at all: the API, worker and kernel connect as role 'gds', which owns
-- these tables, and a table owner bypasses row-level security unless FORCE is set. ENABLE
-- alone therefore enforces nothing for the running services.
--
-- Why only these tables: FORCE applies to every session including Temporal activities and
-- the kernel, which do not pass through the HTTP auth path that binds the tenant. Forcing a
-- table a background worker reads without binding would make it silently see zero rows.
-- Each remaining table is elevated only after its consumers are shown to bind context.
--
-- Verified for each table below: the owner tenant still reads its own rows through the API
-- (proving the bind works) while a second tenant reads none.
BEGIN;

-- pilot: proven with /policy/rules (owner saw its 5 rows, second tenant saw 0, after FORCE)
ALTER TABLE policies           FORCE ROW LEVEL SECURITY;

-- proven with /approvals and /cloud/environments returning 200 for the owner, 0 for the
-- second tenant, with no worker errors after forcing
ALTER TABLE approvals          FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_environments FORCE ROW LEVEL SECURITY;

COMMIT;
