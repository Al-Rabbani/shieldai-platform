-- 080: copilot:orchestrate could never be granted, so the Co-Pilot was wildcard-only
--
-- MEASURED 25 Nov 2026: gds_api/copilot_orchestrate_api.py is the only Co-Pilot route and it is guarded by
-- require_permission("copilot:orchestrate"). That string appeared in NO role's permission list, so it never reached
-- CATALOGUE_PERMISSIONS (which is derived from ROLE_PERMISSIONS), which means POST /admin/roles rejected it as unknown
-- and no operator could ever grant it. Only a role holding "*" passed the gate - measured: admin and platform_owner
-- hold "*", analyst does not - so every analyst on every tenant got 403 "Missing permission: copilot:orchestrate" on the
-- product's main screen. The chat is a read-only reasoning surface by default (allow_writes defaults to false), which
-- is exactly the kind of capability an analyst should hold.
UPDATE roles
   SET permissions = coalesce(permissions, '[]'::jsonb) || '["copilot:orchestrate"]'::jsonb
 WHERE name = 'analyst'
   AND NOT (coalesce(permissions, '[]'::jsonb) ? 'copilot:orchestrate');
