-- Digital Warriors: the five-stage cyber warfare campaign.
-- One row per campaign and one per stage, so "the teams came together" is a record rather than a claim.
CREATE TABLE IF NOT EXISTS warfare_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    target text,
    status text NOT NULL DEFAULT 'running',
    stages_total integer NOT NULL DEFAULT 0,
    stages_executed integer NOT NULL DEFAULT 0,
    stages_blocked integer NOT NULL DEFAULT 0,
    summary jsonb,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warfare_campaign_stages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES warfare_campaigns(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    stage_number integer NOT NULL,
    stage_key text NOT NULL,
    stage_label text NOT NULL,
    owner_agent text NOT NULL,
    capability_key text,
    tool_name text,
    status text NOT NULL DEFAULT 'pending',
    findings_count integer,
    result_summary text,
    detail jsonb,
    started_at timestamptz,
    completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_warfare_stages_campaign ON warfare_campaign_stages(campaign_id, stage_number);
CREATE INDEX IF NOT EXISTS idx_warfare_campaigns_tenant ON warfare_campaigns(tenant_id, started_at DESC);

ALTER TABLE warfare_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE warfare_campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE warfare_campaign_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE warfare_campaign_stages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warfare_campaigns_tenant ON warfare_campaigns;
CREATE POLICY warfare_campaigns_tenant ON warfare_campaigns
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);

DROP POLICY IF EXISTS warfare_campaign_stages_tenant ON warfare_campaign_stages;
CREATE POLICY warfare_campaign_stages_tenant ON warfare_campaign_stages
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gds') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON warfare_campaigns TO gds';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON warfare_campaign_stages TO gds';
    END IF;
END $$;
