-- 004_ciem_tenant_isolation.sql
-- Phase 3: ciem_findings has NO tenant identity and NO RLS, which is why the
-- legacy /ciem/findings route is quarantined. Bring it to the same standard as
-- security_findings: tenant column, NOT NULL, ENABLE + FORCE RLS, one policy.
-- Table currently holds 0 rows; backfill is a no-op but the guard is explicit.

BEGIN;

DO $$
DECLARE
  gds_tenant uuid;
  n integer;
BEGIN
  SELECT id INTO gds_tenant FROM tenants WHERE slug = 'gds';
  IF gds_tenant IS NULL THEN
    RAISE EXCEPTION 'GDS tenant not found - aborting';
  END IF;

  SELECT count(*) INTO n FROM ciem_findings;
  RAISE NOTICE 'ciem_findings rows before migration: %', n;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ciem_findings' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE ciem_findings ADD COLUMN tenant_id uuid;
    UPDATE ciem_findings SET tenant_id = gds_tenant WHERE tenant_id IS NULL;
    ALTER TABLE ciem_findings ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  ALTER TABLE ciem_findings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE ciem_findings FORCE ROW LEVEL SECURITY;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ciem_findings') THEN
    CREATE POLICY gds_ciem_findings_tenant ON ciem_findings
      USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
      WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);
  END IF;

  RAISE NOTICE 'ciem_findings tenant isolation applied';
END $$;

COMMIT;

-- verify
SELECT 'rls' AS check, relrowsecurity::text, relforcerowsecurity::text FROM pg_class WHERE relname='ciem_findings';
SELECT 'policies' AS check, count(*)::text FROM pg_policies WHERE tablename='ciem_findings';
SELECT 'tenant_col' AS check, is_nullable FROM information_schema.columns WHERE table_name='ciem_findings' AND column_name='tenant_id';
