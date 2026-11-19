-- 030: mssp_onboarding_records carried a tenant_id with no row-level security at all.
--
-- The table was created during tenant onboarding and never hardened, so it was the single tenant table in
-- the database with RLS neither enabled nor forced. Its only writer is scripts/ops/onboard_tenant.py,
-- which now binds the row's tenant in the same session, so forcing is safe and the read path stays honest:
-- an unbound connection sees nothing rather than another customer's onboarding record.
--
-- Idempotent.
ALTER TABLE mssp_onboarding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mssp_onboarding_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mssp_onboarding_tenant ON mssp_onboarding_records;
CREATE POLICY mssp_onboarding_tenant ON mssp_onboarding_records
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id'::text, true), ''::text))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id'::text, true), ''::text))::uuid);
