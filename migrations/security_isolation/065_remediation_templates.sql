-- Item 27 (migration 065): the remediation template library wrote to a table that never existed.
--
-- Measured 23 Nov 2026: RemediationTemplateForm calls RemediationTemplate.create({...form, is_active: true,
-- usage_count: 0}); RemediationTemplatesPage and TriageQueuePage both call
-- RemediationTemplate.filter({is_active: true}, "-usage_count", N) and then
-- RemediationTemplate.update(id, {usage_count: ...}) when a template is applied to findings. No table matched
-- '%templ%', so every template vanished on reload and the usage counter could never move. The rows are what an
-- operator wrote down; nothing here is derived.

CREATE TABLE IF NOT EXISTS remediation_templates (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_name       text NOT NULL,
    vulnerability_type  text NOT NULL DEFAULT '',
    severity            text NOT NULL DEFAULT 'high',
    description         text NOT NULL DEFAULT '',
    remediation_steps   text NOT NULL,
    testing_guidance    text NOT NULL DEFAULT '',
    estimated_effort    text NOT NULL DEFAULT '1-4 hours',
    target              text NOT NULL DEFAULT '',
    is_active           boolean NOT NULL DEFAULT true,
    usage_count         integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
    created_by          uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Both call sites sort by usage_count, so the read is served from the index rather than a sort over the table.
CREATE INDEX IF NOT EXISTS remediation_templates_active_usage_idx
    ON remediation_templates (tenant_id, is_active, usage_count DESC);

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['remediation_templates'] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t) THEN
            EXECUTE format(
                'CREATE POLICY gds_%s_tenant ON %I USING (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid) WITH CHECK (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid)',
                t, t);
        END IF;
    END LOOP;
END $$;

-- Every new table needs grants: a table with FORCE RLS and no GRANT answers "permission denied", not "no rows".
GRANT SELECT, INSERT, UPDATE, DELETE ON remediation_templates TO gds;
GRANT SELECT ON remediation_templates TO gds_runtime;

-- No new permission: authoring a fix template is the same class of act as authoring a fix strategy (item 21),
-- which is already gated by fixes:write on the platform owner role.
