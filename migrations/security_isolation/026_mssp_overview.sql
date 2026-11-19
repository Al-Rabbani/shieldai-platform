-- 026 — one read-only function for the MSSP provider's customer overview.
--
-- 19 Nov 2026 (P8 / B38). /mssp/customers must show every customer, but every tenant table is
-- FORCE-RLS: the application role, correctly, cannot read another tenant's findings. Rather than widen
-- a policy or run the request as the superuser, this exposes exactly the aggregate facts the customer
-- list needs - counts and plan state, never row content - through a SECURITY DEFINER function owned by
-- postgres. It answers one question and cannot be bent into a general cross-tenant read.
CREATE OR REPLACE FUNCTION mssp_customer_overview()
RETURNS TABLE (
    tenant_id uuid, slug text, name text, display_name text, plan_tier text,
    subscription_status text, sla_tier text, onboarding_status text, onboarded_at timestamptz,
    services_provisioned jsonb, active_users bigint, findings bigint, critical_findings bigint,
    missions bigint, last_onboarding timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT t.id, t.slug, t.name, t.display_name, t.plan_tier, t.subscription_status, t.sla_tier,
           t.onboarding_status, t.onboarded_at, t.services_provisioned,
           (SELECT count(*) FROM users u WHERE u.tenant_id = t.id AND u.is_active),
           (SELECT count(*) FROM findings f WHERE f.tenant_id = t.id),
           (SELECT count(*) FROM findings f WHERE f.tenant_id = t.id AND lower(f.severity) = 'critical'),
           (SELECT count(*) FROM missions m WHERE m.tenant_id = t.id),
           (SELECT max(r.performed_at) FROM mssp_onboarding_records r WHERE r.tenant_id = t.id)
    FROM tenants t
$$;

REVOKE ALL ON FUNCTION mssp_customer_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mssp_customer_overview() TO gds;
GRANT EXECUTE ON FUNCTION mssp_customer_overview() TO gds_runtime;
