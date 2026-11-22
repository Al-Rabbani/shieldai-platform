-- 051: a tenant can be provisioned by an owner, not only by self-registration.
--
-- Measured cause of POST /admin/tenants returning 500:
--   InsufficientPrivilegeError: new row violates row-level security policy for table "tenants"
--
-- The only INSERT policy on tenants was:
--   tenants_registration_insert  WITH CHECK (NULLIF(current_setting('gds.login_email', true), '') IS NOT NULL)
--
-- That is a self-registration policy. It permits an insert when an email is bound, which is what the
-- old /auth/register path did. An owner provisioning a tenant binds no login email, so the insert was
-- refused - correctly, by a policy that never anticipated this caller.
--
-- The fix is a second, explicit door rather than reusing the registration one. Provisioning sets a
-- dedicated setting that only the gated admin route sets, after the tenants:manage check has passed.
-- The registration predicate is left exactly as it was, so nothing about the old path changes.

DROP POLICY IF EXISTS tenants_registration_insert ON tenants;

CREATE POLICY tenants_registration_insert ON tenants
    FOR INSERT
    WITH CHECK (
        nullif(current_setting('gds.login_email', true), '') IS NOT NULL
        OR nullif(current_setting('gds.provisioning', true), '') = 'owner'
    );

COMMENT ON POLICY tenants_registration_insert ON tenants IS
    'Permits a tenants insert either from the self-registration path (a login email is bound) or from owner-driven provisioning (gds.provisioning = owner, set only by the gated /admin/tenants route after its permission check).';
