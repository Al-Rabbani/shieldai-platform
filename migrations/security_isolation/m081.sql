-- 081: permissions that routes guard but no role could hold
--
-- MEASURED 25 Nov 2026: require_permission() names 78 distinct permissions across the API, but 25 of them appeared in no
-- role's list. CATALOGUE_PERMISSIONS is derived from those lists, so POST /admin/roles rejected the unknown names and no
-- operator could grant them; require_permission() passes on the permission OR a "*" wildcard, so those routes were
-- reachable only by a wildcard role. The same defect had already made the entire Co-Pilot admin-only (copilot:orchestrate,
-- migration 080). Least privilege: reads to the read-only roles, operational writes to analyst, consequential actions
-- (pentest execute/approve, secrets, settings, tenant management) to platform_owner.
DO $$
DECLARE
  mapping jsonb := '{
    "analyst": ["findings:write","findings:assign","findings:schedule","fixes:write","reports:write",
                "remediation:read","monitoring:read","scheduler:read","siem:read","pentest:read",
                "ai_ml:read","security_tools:read"],
    "auditor": ["monitoring:read","siem:read","pentest:read","remediation:read","ai_ml:read",
                "security_tools:read","scheduler:read"],
    "platform_owner": ["cloud:write","integrations:write","monitoring:write","pentest:approve","pentest:execute",
                       "pentest:write","remediation:write","scheduler:write","secrets:read","security_tools:write",
                       "settings:write","siem:write","tenants:manage"]
  }'::jsonb;
  role_name text;
  perms jsonb;
BEGIN
  FOR role_name IN SELECT jsonb_object_keys(mapping) LOOP
    SELECT mapping -> role_name INTO perms;
    UPDATE roles r
       SET permissions = coalesce(r.permissions, '[]'::jsonb) || (
             SELECT coalesce(jsonb_agg(p), '[]'::jsonb)
               FROM jsonb_array_elements_text(perms) AS p
              WHERE NOT (coalesce(r.permissions, '[]'::jsonb) ? p)
           )
     WHERE r.name = role_name;
  END LOOP;
END $$;
