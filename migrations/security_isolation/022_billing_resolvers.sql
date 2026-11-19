-- 022 — resolve which tenant a Stripe event belongs to, without weakening RLS.
--
-- 19 Nov 2026 (P8 / B36). A webhook arrives with no session, so there is no gds.tenant_id bound and
-- every RLS-forced lookup returns zero rows: the event cannot be attributed by reading users or
-- tenants from the request session. Widening those policies would be the wrong fix.
--
-- These three functions are SECURITY DEFINER and owned by the superuser, so they can perform exactly
-- the narrow lookup needed and nothing else. They are the only sanctioned way to answer "which
-- tenant owns this Stripe object" before a tenant is known. They are read-only and return a single
-- uuid, so they cannot be used to enumerate or modify tenant data.

CREATE OR REPLACE FUNCTION billing_tenant_for_user(uid uuid) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT tenant_id FROM users WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION billing_tenant_for_customer(customer text) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT id FROM tenants WHERE stripe_customer_id = customer LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION billing_tenant_for_subscription(sub_id text) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT tenant_id FROM billing_subscriptions WHERE stripe_subscription_id = sub_id LIMIT 1;
$$;

ALTER FUNCTION billing_tenant_for_user(uuid) OWNER TO postgres;
ALTER FUNCTION billing_tenant_for_customer(text) OWNER TO postgres;
ALTER FUNCTION billing_tenant_for_subscription(text) OWNER TO postgres;

REVOKE ALL ON FUNCTION billing_tenant_for_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION billing_tenant_for_customer(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION billing_tenant_for_subscription(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION billing_tenant_for_user(uuid) TO gds, gds_runtime;
GRANT EXECUTE ON FUNCTION billing_tenant_for_customer(text) TO gds, gds_runtime;
GRANT EXECUTE ON FUNCTION billing_tenant_for_subscription(text) TO gds, gds_runtime;
