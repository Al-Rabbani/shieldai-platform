-- 074: compliance verdicts become per-tenant
--
-- MEASURED BEFORE THIS MIGRATION (23 Nov 2026): compliance_assessments held 315 rows and
-- compliance_scope_determinations 1 row, neither with a tenant_id and neither with RLS. Five tenants
-- exist on this platform and every one of them read the same compliance score. For an MSSP that is a
-- cross-tenant disclosure and a wrong number at the same time.
--
-- SCOPE DECISION, deliberate: only the VERDICTS and the DECISIONS become per-tenant.
--   compliance_frameworks (9 rows) is the framework catalogue (name, version, official control count,
--     jurisdiction) and compliance_controls (297 rows) is the control catalogue (ref, title, check key,
--     mapping basis). Those describe the standards, not the customer, so they stay global reference data.
--     Duplicating them per tenant would make every new customer inherit a 306-row copy and would let two
--     tenants disagree about what PCI-DSS requires.
--   compliance_assessments and compliance_scope_determinations are this tenant's verdicts and this
--     tenant's written scope decisions. They get a tenant_id, a policy and FORCE RLS.
--
-- The backfill assigns the existing rows to the operating tenant, which is where they came from.

BEGIN;

ALTER TABLE compliance_assessments ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE compliance_scope_determinations ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE compliance_assessments
   SET tenant_id = '2ec10dd0-e48e-4043-8c88-5998ba5e23b0'
 WHERE tenant_id IS NULL;

UPDATE compliance_scope_determinations
   SET tenant_id = '2ec10dd0-e48e-4043-8c88-5998ba5e23b0'
 WHERE tenant_id IS NULL;

ALTER TABLE compliance_assessments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE compliance_scope_determinations ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_assessments_tenant
    ON compliance_assessments (tenant_id, framework);
CREATE INDEX IF NOT EXISTS idx_compliance_scope_determinations_tenant
    ON compliance_scope_determinations (tenant_id, framework_key);

ALTER TABLE compliance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS compliance_assessments_tenant_isolation ON compliance_assessments;
CREATE POLICY compliance_assessments_tenant_isolation ON compliance_assessments
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);

ALTER TABLE compliance_scope_determinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_scope_determinations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS compliance_scope_determinations_tenant_isolation ON compliance_scope_determinations;
CREATE POLICY compliance_scope_determinations_tenant_isolation ON compliance_scope_determinations
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_assessments TO gds;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_scope_determinations TO gds;
GRANT SELECT ON compliance_assessments TO gds_runtime;
GRANT SELECT ON compliance_scope_determinations TO gds_runtime;

COMMIT;
