-- 050: the operator role must be able to read the audit trail.
--
-- Measured on the live database: the account that runs this platform (president@globaldigitalstreams.com)
-- holds a role named "admin", which is not one of the four roles the code declares (platform_owner,
-- analyst, auditor, executive_viewer). Its permissions differ from platform_owner by exactly two:
--
--   admin has   cloud:connections:manage   platform_owner does not
--   admin lacks audit:read                 platform_owner has
--
-- The second difference is the one that matters. The person accountable for the platform cannot read
-- the audit log, while a role they are not using can. This migration makes "admin" a superset of
-- platform_owner by granting the missing read, and changes nothing else: no permission is removed, so
-- no capability currently in use stops working.
--
-- It deliberately does not add "admin" to ROLE_PERMISSIONS. A new tenant should be created with a
-- declared role, and silently adding a fifth one would change provisioning behaviour for every future
-- customer to fix a single legacy account.

UPDATE roles
SET permissions = permissions || '["audit:read"]'::jsonb
WHERE name = 'admin'
  AND NOT permissions @> '["audit:read"]'::jsonb;

COMMENT ON TABLE roles IS
    'Role definitions per tenant. The catalogue in seed_data.ROLE_PERMISSIONS declares the intended roles; a row whose name is absent from that catalogue is legacy and should be reconciled rather than assumed valid.';
