-- 011_rls_tenants.sql
-- R2.1 final table: tenants had NO row-level security at all.
--
-- This is the awkward one because registration inserts a tenant BEFORE any tenant exists, so
-- the insert cannot be authorised by gds.tenant_id. It is authorised by gds.login_email
-- instead: /register binds the address being registered before it does anything, and that
-- value is only ever set by the auth routes. So a tenant row may be created only inside a
-- registration flow, and afterwards can only be read or updated by that tenant itself.
--
-- Reads are limited to id = gds.tenant_id. The two consumers (auth.py db.get(Tenant, ...) at
-- the login response and at /auth/me) both run after get_current_user or _issue_session has
-- bound the tenant, so they see exactly their own row.
--
-- No DELETE policy is created: nothing in the application deletes tenants, so deletes are
-- denied by default rather than enabled by guesswork.
BEGIN;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_own_select ON tenants;
CREATE POLICY tenants_own_select ON tenants FOR SELECT
  USING (id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenants_registration_insert ON tenants;
CREATE POLICY tenants_registration_insert ON tenants FOR INSERT
  WITH CHECK (NULLIF(current_setting('gds.login_email', true), '') IS NOT NULL);

DROP POLICY IF EXISTS tenants_own_update ON tenants;
CREATE POLICY tenants_own_update ON tenants FOR UPDATE
  USING (id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid);

ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

COMMIT;
