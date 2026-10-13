-- DRAFT: apply ONLY after trusted identity + all readers/writers are migrated.
-- Required psql variable: runtime_role (pre-provisioned, non-owner, non-bypass).
-- This file is intentionally not wired into deploy or API startup.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TEMP TABLE gds_runtime_role_review (role_name text NOT NULL) ON COMMIT DROP;
INSERT INTO gds_runtime_role_review VALUES (:'runtime_role');
DO $$
DECLARE r pg_roles%ROWTYPE;
BEGIN
    SELECT * INTO r FROM pg_roles
        WHERE rolname = (SELECT role_name FROM gds_runtime_role_review);
    IF NOT FOUND OR r.rolsuper OR r.rolbypassrls THEN
        RAISE EXCEPTION 'Runtime role missing or bypasses RLS';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE oid IN
        ('security_findings'::regclass, 'mission_results'::regclass,
         'security_repository_bindings'::regclass, 'repositories'::regclass)
        AND pg_has_role(r.oid, relowner, 'MEMBER')) THEN
        RAISE EXCEPTION 'Runtime role owns or can assume an owner role';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles elevated
        WHERE (elevated.rolsuper OR elevated.rolbypassrls)
        AND pg_has_role(r.oid, elevated.oid, 'MEMBER')) THEN
        RAISE EXCEPTION 'Runtime role can assume elevated privileges';
    END IF;
    IF EXISTS (SELECT 1 FROM security_findings WHERE tenant_id IS NULL)
       OR EXISTS (SELECT 1 FROM mission_results WHERE tenant_id IS NULL) THEN
        RAISE EXCEPTION 'Unassigned rows remain';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policy WHERE polrelid IN
        ('security_findings'::regclass, 'mission_results'::regclass,
         'security_repository_bindings'::regclass, 'repositories'::regclass)) THEN
        RAISE EXCEPTION 'Existing RLS policies require review; do not combine permissive policies blindly';
    END IF;
END $$;

ALTER TABLE security_findings ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE mission_results ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE security_findings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE mission_results ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE security_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_findings FORCE ROW LEVEL SECURITY;
CREATE POLICY gds_security_findings_tenant ON security_findings
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);
ALTER TABLE mission_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_results FORCE ROW LEVEL SECURITY;
CREATE POLICY gds_mission_results_tenant ON mission_results
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);
ALTER TABLE security_repository_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_repository_bindings FORCE ROW LEVEL SECURITY;
CREATE POLICY gds_security_repository_tenant ON security_repository_bindings
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories FORCE ROW LEVEL SECURITY;
CREATE POLICY gds_managed_repository_tenant ON repositories
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON security_findings, mission_results
    TO :"runtime_role";
GRANT SELECT ON security_repository_bindings, repositories TO :"runtime_role";
-- Existing integer finding IDs use the sequence reported in ground truth.
GRANT USAGE, SELECT ON SEQUENCE security_findings_id_seq TO :"runtime_role";
COMMIT;
