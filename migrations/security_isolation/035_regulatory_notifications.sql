-- NIS2 Article 23 reporting: a 24-hour early warning and a 72-hour notification, then a final report. The deadlines
-- are computed from detection when the record is created and stored, so an overdue report is a query, not a memory.
CREATE TABLE IF NOT EXISTS regulatory_notifications (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    incident_id uuid NOT NULL,
    regulation text NOT NULL,
    authority text,
    detected_at timestamptz NOT NULL,
    early_warning_due_at timestamptz NOT NULL,
    notification_due_at timestamptz NOT NULL,
    final_report_due_at timestamptz NOT NULL,
    early_warning_sent_at timestamptz,
    notification_sent_at timestamptz,
    final_report_sent_at timestamptz,
    status text NOT NULL DEFAULT 'pending',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT regulatory_notifications_incident_regulation_key UNIQUE (incident_id, regulation)
);
CREATE INDEX IF NOT EXISTS idx_reg_notif_tenant_due ON regulatory_notifications (tenant_id, notification_due_at);
ALTER TABLE regulatory_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS regulatory_notifications_tenant_isolation ON regulatory_notifications;
CREATE POLICY regulatory_notifications_tenant_isolation ON regulatory_notifications
    USING (tenant_id = current_setting('gds.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('gds.tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE ON regulatory_notifications TO gds;
GRANT SELECT, INSERT, UPDATE ON regulatory_notifications TO gds_runtime;
