-- Item 23 (migration 063): the assignment rules page promised routing that does not exist, over a store that does not
-- exist either.
--
-- Measured 23 Nov 2026: pages/settings/AssignmentRulesPage.jsx calls AssignmentRule.list/create/update/delete across five
-- sites, its header reads "Route findings by asset type and team ownership", and a successful save says "New findings
-- matching it are assigned on discovery". No assignment table existed, no code assigns anything, and security_findings has
-- no owner column at all - only the governed findings table (317 rows) has one, while the UI shows the 1,002-row scanner
-- register.
--
-- MATCH KEYS ARE COLUMNS THAT EXIST. The form's asset_type cannot be a match key: measured 0 of 849 open findings carry an
-- asset_type in raw_data (keys present are type, tool, scan_type, domain, service, file, ...). Rules therefore match on
-- severity and source, which security_findings really stores, and the page says so instead of collecting a field that
-- could never fire.

CREATE TABLE IF NOT EXISTS assignment_rules (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rule_name        text NOT NULL,
    match_severity   text,
    match_source     text,
    owner_team       text NOT NULL DEFAULT '',
    assignee_name    text NOT NULL DEFAULT '',
    assignee_email   text NOT NULL DEFAULT '',
    team_lead_name   text NOT NULL DEFAULT '',
    team_lead_email  text NOT NULL DEFAULT '',
    -- recorded because the form collects them, but nothing delivers to them: this host has no Slack bot token.
    assignee_slack_user_id  text NOT NULL DEFAULT '',
    team_lead_slack_user_id text NOT NULL DEFAULT '',
    is_active        boolean NOT NULL DEFAULT true,
    fire_count       integer NOT NULL DEFAULT 0,
    last_fired       timestamptz,
    created_by       uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assignment_rules_tenant_active_idx
    ON assignment_rules (tenant_id, is_active, created_at);

-- The register the UI shows had nowhere to record an owner. Nullable: NULL means unassigned, which is the real state of
-- every row today, so no owner is invented for findings nobody has picked up.
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS owner text;
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS owner_assigned_at timestamptz;
CREATE INDEX IF NOT EXISTS security_findings_tenant_owner_idx
    ON security_findings (tenant_id, owner) WHERE owner IS NOT NULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['assignment_rules'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t) THEN
      EXECUTE format(
        'CREATE POLICY gds_%s_tenant ON %I USING (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid) WITH CHECK (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid)',
        t, t);
    END IF;
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_rules TO gds;
GRANT SELECT ON assignment_rules TO gds_runtime;

-- Assigning a finding puts a named person's name against a security defect, so it is an accountable write with its own
-- permission rather than riding on findings:read. Owner gets it; admin already holds "*". Idempotent.
UPDATE roles
   SET permissions = permissions || '["findings:assign"]'::jsonb
 WHERE name = 'platform_owner'
   AND NOT (permissions @> '["findings:assign"]'::jsonb);
