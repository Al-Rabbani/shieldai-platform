-- Outbound webhooks, for real.
--
-- The retired module advertised /actions/webhooks/replay, which only posted a task to an agent channel and
-- delivered nothing. A customer integrating GDS OS with a SIEM or ticketing system needs events to actually
-- leave the platform, signed so the receiver can trust them, with a delivery record so "we sent it" is
-- provable rather than asserted.
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    name text NOT NULL,
    url text NOT NULL,
    secret text NOT NULL,
    min_severity text NOT NULL DEFAULT 'high',
    is_active boolean NOT NULL DEFAULT true,
    created_by_user_id uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    last_delivery_at timestamptz,
    consecutive_failures integer NOT NULL DEFAULT 0,
    CONSTRAINT webhook_endpoints_url_https CHECK (url ~ '^https://' OR url ~ '^http://(127\.0\.0\.1|localhost)'),
    CONSTRAINT webhook_endpoints_severity CHECK (min_severity IN ('critical','high','medium','low','info'))
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    endpoint_id uuid NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    finding_id integer,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    signature text NOT NULL,
    response_code integer,
    delivered boolean NOT NULL DEFAULT false,
    error text,
    attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries (endpoint_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_tenant ON webhook_endpoints (tenant_id) WHERE is_active;

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_endpoints_tenant ON webhook_endpoints;
CREATE POLICY webhook_endpoints_tenant ON webhook_endpoints
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);
DROP POLICY IF EXISTS webhook_deliveries_tenant ON webhook_deliveries;
CREATE POLICY webhook_deliveries_tenant ON webhook_deliveries
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_endpoints, webhook_deliveries TO gds;
