-- 078: the last five tables that carried tenant data without a tenant column
--
-- MEASURED BEFORE THIS (23 Nov 2026): of 102 tables, nine had no tenant_id. Four are correctly global - the compliance
-- framework and control catalogues, schema_migrations and tenants itself. Five held tenant data with no isolation:
--   incident_findings   20 rows, RLS off, joined incidents (which has tenant_id) to findings
--   repository_policies  1 row,  RLS off, keyed by repository_id into repositories (which has tenant_id)
--   workspace_policies   1 row,  RLS off, same key
--   security_incidents   1 row,  RLS off, legacy, no foreign key at all
--   engagement_targets   0 rows, RLS off
-- platform_data.py already named security_incidents as a schema gap and excluded it from tenant-scoped reads rather
-- than mixing it in, so the absence was stated - but the other four were simply unprotected.
--
-- Every parent-linked row resolves to a tenant (checked: 0 unresolvable in all three), so the backfill is exact
-- rather than a guess. security_incidents has no parent to resolve through; its single row is the GDS MFA posture
-- incident ("No MFA for user gds-security-scanner", "No IAM password policy set"), so it is attributed to the GDS
-- tenant explicitly and the attribution is written down here rather than left implicit.

BEGIN;

-- ---------------------------------------------------------------- incident_findings
ALTER TABLE incident_findings ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE incident_findings inf
   SET tenant_id = i.tenant_id
  FROM incidents i
 WHERE i.id = inf.incident_id
   AND inf.tenant_id IS NULL;
DO $$
DECLARE unresolved int;
BEGIN
    SELECT count(*) INTO unresolved FROM incident_findings WHERE tenant_id IS NULL;
    IF unresolved > 0 THEN
        RAISE EXCEPTION '078: % incident_findings row(s) cannot resolve a tenant; refusing to leave them unisolated',
            unresolved;
    END IF;
END $$;
ALTER TABLE incident_findings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_incident_findings_tenant ON incident_findings (tenant_id);
ALTER TABLE incident_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_findings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS incident_findings_tenant ON incident_findings;
CREATE POLICY incident_findings_tenant ON incident_findings
    USING (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON incident_findings TO gds;
GRANT SELECT ON incident_findings TO gds_runtime;

-- ---------------------------------------------------------------- repository_policies
ALTER TABLE repository_policies ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE repository_policies p
   SET tenant_id = r.tenant_id
  FROM repositories r
 WHERE r.id = p.repository_id
   AND p.tenant_id IS NULL;
DO $$
DECLARE unresolved int;
BEGIN
    SELECT count(*) INTO unresolved FROM repository_policies WHERE tenant_id IS NULL;
    IF unresolved > 0 THEN
        RAISE EXCEPTION '078: % repository_policies row(s) cannot resolve a tenant', unresolved;
    END IF;
END $$;
ALTER TABLE repository_policies ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_repository_policies_tenant ON repository_policies (tenant_id);
ALTER TABLE repository_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_policies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS repository_policies_tenant ON repository_policies;
CREATE POLICY repository_policies_tenant ON repository_policies
    USING (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON repository_policies TO gds;
GRANT SELECT ON repository_policies TO gds_runtime;

-- ---------------------------------------------------------------- workspace_policies
ALTER TABLE workspace_policies ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE workspace_policies p
   SET tenant_id = r.tenant_id
  FROM repositories r
 WHERE r.id = p.repository_id
   AND p.tenant_id IS NULL;
DO $$
DECLARE unresolved int;
BEGIN
    SELECT count(*) INTO unresolved FROM workspace_policies WHERE tenant_id IS NULL;
    IF unresolved > 0 THEN
        RAISE EXCEPTION '078: % workspace_policies row(s) cannot resolve a tenant', unresolved;
    END IF;
END $$;
ALTER TABLE workspace_policies ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_workspace_policies_tenant ON workspace_policies (tenant_id);
ALTER TABLE workspace_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_policies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_policies_tenant ON workspace_policies;
CREATE POLICY workspace_policies_tenant ON workspace_policies
    USING (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_policies TO gds;
GRANT SELECT ON workspace_policies TO gds_runtime;

-- ---------------------------------------------------------------- engagement_targets
ALTER TABLE engagement_targets ADD COLUMN IF NOT EXISTS tenant_id uuid;
-- Nothing writes this table yet (0 rows), so there is nothing to backfill; the column is NOT NULL so a future
-- writer cannot create an unisolated row by omission.
ALTER TABLE engagement_targets ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_engagement_targets_tenant ON engagement_targets (tenant_id);
ALTER TABLE engagement_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_targets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS engagement_targets_tenant ON engagement_targets;
CREATE POLICY engagement_targets_tenant ON engagement_targets
    USING (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON engagement_targets TO gds;
GRANT SELECT ON engagement_targets TO gds_runtime;

-- ---------------------------------------------------------------- security_incidents (legacy, no parent)
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE security_incidents
   SET tenant_id = '2ec10dd0-e48e-4043-8c88-5998ba5e23b0'
 WHERE tenant_id IS NULL;
ALTER TABLE security_incidents ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_security_incidents_tenant ON security_incidents (tenant_id);
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS security_incidents_tenant ON security_incidents;
CREATE POLICY security_incidents_tenant ON security_incidents
    USING (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON security_incidents TO gds;
GRANT SELECT ON security_incidents TO gds_runtime;

COMMIT;
