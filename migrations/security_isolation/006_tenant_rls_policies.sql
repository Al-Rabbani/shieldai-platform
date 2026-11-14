-- 006_tenant_rls_policies.sql
-- R2 defence in depth: define a tenant-isolation policy on every table that carries a
-- tenant_id but had no policy at all (51 tables at time of writing).
--
-- ENABLE (not FORCE) at this stage. The API, worker and kernel all connect as role 'gds',
-- which owns these tables, and an owner bypasses row-level security unless FORCE is set.
-- So this migration installs and records the policy layer without changing behaviour;
-- FORCE is applied table by table once its consumers are known to bind gds.tenant_id.
--
-- Policy shape matches the existing, working policies on security_findings,
-- mission_results and ciem_findings:
--   tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid
-- A session with no tenant set therefore matches nothing (fail closed), rather than
-- matching every row.
BEGIN;

DO $$
DECLARE t record;
DECLARE policy_name text;
BEGIN
    FOR t IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relrowsecurity = false
          AND EXISTS (
              SELECT 1 FROM information_schema.columns col
              WHERE col.table_name = c.relname AND col.column_name = 'tenant_id'
          )
        ORDER BY c.relname
    LOOP
        policy_name := 'gds_' || t.relname || '_tenant';
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, t.relname);
        EXECUTE format(
            'CREATE POLICY %I ON %I USING (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), '''')::uuid))',
            policy_name, t.relname
        );
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.relname);
    END LOOP;
END $$;

COMMIT;
