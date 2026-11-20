-- Separate a production tenant from a rehearsal fixture, so a customer count means what it says.
--
-- Measured 20 Nov 2026: GET /mssp/customers answered count=5 for a platform whose tenants are gds (the provider),
-- test-user-269c6d (a 1 Aug test tenant), president-59c5e6 (a real second account), gds-assessment-sandbox
-- (created 18 Nov to prove the assessment path) and onboarding-rehearsal (created 19 Nov to prove tenant
-- isolation). Three of the five are fixtures I created while proving the platform, and the provider itself is not
-- one of its own customers. A provider dashboard reporting five customers where two exist is exactly the kind of
-- number that ends up in a board pack.
--
-- Deleting the fixtures would destroy the record of what was proven, and they hold real audit rows, so they stay.
-- They are labelled instead, and the customer surface counts only production tenants. environment is deliberately
-- not called is_production: a nullable boolean invites "unknown", and an unknown tenant would have to be guessed
-- into one of the two counts.

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production';

ALTER TABLE tenants
    DROP CONSTRAINT IF EXISTS tenants_environment_check;

ALTER TABLE tenants
    ADD CONSTRAINT tenants_environment_check CHECK (environment IN ('production', 'test'));

COMMENT ON COLUMN tenants.environment IS
    'production = a tenant the platform is accountable for; test = a fixture created to prove a path. '
    'The MSSP customer count includes only production tenants and states how many it excluded.';

-- The three fixtures, identified by slug rather than by id so this is readable and re-runnable.
UPDATE tenants SET environment = 'test'
WHERE slug IN ('test-user-269c6d', 'gds-assessment-sandbox', 'onboarding-rehearsal')
  AND environment IS DISTINCT FROM 'test';

-- The customer view gains the environment so the caller can split the counts instead of guessing.
DROP FUNCTION IF EXISTS public.mssp_customer_overview();

CREATE FUNCTION public.mssp_customer_overview()
 RETURNS TABLE(tenant_id uuid, slug text, name text, display_name text, plan_tier text,
               subscription_status text, sla_tier text, onboarding_status text,
               onboarded_at timestamp with time zone, services_provisioned jsonb, active_users bigint,
               findings bigint, critical_findings bigint, missions bigint,
               last_onboarding timestamp with time zone, environment text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
    SELECT t.id, t.slug, t.name, t.display_name, t.plan_tier, t.subscription_status, t.sla_tier,
           t.onboarding_status, t.onboarded_at, t.services_provisioned,
           (SELECT count(*) FROM users u WHERE u.tenant_id = t.id AND u.is_active),
           (SELECT count(*) FROM findings f WHERE f.tenant_id = t.id),
           (SELECT count(*) FROM findings f WHERE f.tenant_id = t.id AND lower(f.severity) = 'critical'),
           (SELECT count(*) FROM missions m WHERE m.tenant_id = t.id),
           (SELECT max(r.performed_at) FROM mssp_onboarding_records r WHERE r.tenant_id = t.id),
           t.environment
    FROM tenants t
$function$;
