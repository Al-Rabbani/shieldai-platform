-- 021 — persist Stripe events, and close the one billing table with no isolation.
--
-- 19 Nov 2026 (P8 / B36, B37). Before this, /billing/webhook verified the signature and processed the
-- event but stored nothing, so a Stripe event that was mis-handled left no trace to investigate: the
-- only evidence was a log line. Billing was also keyed on user_id while the product is tenant-scoped,
-- and billing_payments was the one billing table with neither a tenant_id nor RLS, so every payment
-- row was readable by any tenant through any future endpoint that exposed it.
--
-- tenants had no Stripe linkage at all (only id/name/slug), so "plan active" could not be observed at
-- the level the product actually bills at.

CREATE TABLE IF NOT EXISTS billing_events (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id     text NOT NULL UNIQUE,
    event_type          text NOT NULL,
    livemode            boolean,
    tenant_id           uuid REFERENCES tenants(id),
    user_id             uuid,
    signature_verified  boolean NOT NULL DEFAULT false,
    payload             jsonb NOT NULL,
    received_at         timestamptz NOT NULL DEFAULT now(),
    processed           boolean NOT NULL DEFAULT false,
    processing_result   jsonb,
    error               text
);
CREATE INDEX IF NOT EXISTS ix_billing_events_tenant  ON billing_events (tenant_id, received_at DESC);
CREATE INDEX IF NOT EXISTS ix_billing_events_type    ON billing_events (event_type, received_at DESC);
CREATE INDEX IF NOT EXISTS ix_billing_events_unprocessed ON billing_events (received_at DESC) WHERE NOT processed;

-- Reads are tenant-scoped. A row whose tenant could not be resolved is stored (forensics matter most
-- when attribution failed) but is invisible to every tenant: USING never matches NULL, so only a
-- superuser or the owner role can read it. WITH CHECK permits the NULL insert for exactly that reason.
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS billing_events_tenant ON billing_events;
CREATE POLICY billing_events_tenant ON billing_events
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id IS NULL
                OR tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);

-- billing_payments: give it the tenant it belongs to and put it under the same policy as everything else.
ALTER TABLE billing_payments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS ix_billing_payments_tenant ON billing_payments (tenant_id, paid_at DESC);
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS billing_payments_tenant ON billing_payments;
CREATE POLICY billing_payments_tenant ON billing_payments
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id IS NULL
                OR tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);

-- tenants: the linkage that makes a subscription observable at the tenant level.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id  text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_tier           text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status text;
CREATE INDEX IF NOT EXISTS ix_tenants_stripe_customer ON tenants (stripe_customer_id);

GRANT SELECT, INSERT, UPDATE ON billing_events TO gds;
GRANT SELECT, INSERT, UPDATE ON billing_events TO gds_runtime;
GRANT SELECT, INSERT, UPDATE ON billing_payments TO gds;
GRANT SELECT, INSERT, UPDATE ON billing_payments TO gds_runtime;
