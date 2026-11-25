-- 082: record what an alert dispatch actually did
--
-- MEASURED 25 Nov 2026: alerts/dispatch.py is real httpx posting to Slack, Teams, PagerDuty and Resend, dispatch_all()
-- is called from the rule engine and from a route, and email and Slack ARE configured on this host (RESEND_API_KEY,
-- SLACK_WEBHOOK_URL, ALERT_EMAIL_TO present in the serving process). NOTHING RECORDED A RESULT: the function returned a
-- dict to its caller and no row was ever written, so "was the team told?" had no answer anywhere in the product, and the
-- Alerts page drew "0 dispatched / 0 delivered" from a NotificationDispatch entity that has no table.
CREATE TABLE IF NOT EXISTS alert_deliveries (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL,
    channel      text NOT NULL,
    success      boolean NOT NULL,
    error        text,
    provider     jsonb NOT NULL DEFAULT '{}'::jsonb,
    alert_ref    text,
    rule_name    text,
    severity     text,
    triggered_by text NOT NULL DEFAULT 'manual',
    sent_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alert_deliveries_tenant_sent
    ON alert_deliveries (tenant_id, sent_at DESC);

ALTER TABLE alert_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_deliveries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alert_deliveries_tenant ON alert_deliveries;
CREATE POLICY alert_deliveries_tenant ON alert_deliveries
    USING (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT ON alert_deliveries TO gds;
GRANT SELECT, INSERT ON alert_deliveries TO gds_runtime;
