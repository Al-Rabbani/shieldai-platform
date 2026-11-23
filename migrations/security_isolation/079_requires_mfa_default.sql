-- 079: a role requires MFA unless it explicitly says otherwise
--
-- MEASURED BEFORE THIS (23 Nov 2026): migration 075 added roles.requires_mfa and set it true for the roles that
-- existed. It left the COLUMN DEFAULT at false, so every role created afterwards opted out of the second factor by
-- omission. Proven by running the customer lifecycle: POST /admin/tenants provisions a tenant with its own
-- platform_owner role, that INSERT does not name requires_mfa, the column defaulted to false, and the new customer's
-- first login returned 200 with a password alone. P0-4 therefore protected only the seven accounts that existed when
-- it shipped, and every future customer would have started without MFA.
--
-- The default is inverted here rather than patched at the one call site: a default that silently disables a security
-- control is a trap for the next INSERT too, and there are already two (this route and the roles POST endpoint).

BEGIN;

ALTER TABLE roles ALTER COLUMN requires_mfa SET DEFAULT true;

-- Existing roles that are false are not assumed deliberate: the only one on this platform was created by the
-- provisioning route minutes before this migration, and no route exists to set the flag false on purpose.
UPDATE roles SET requires_mfa = true WHERE requires_mfa IS DISTINCT FROM true;

COMMIT;
