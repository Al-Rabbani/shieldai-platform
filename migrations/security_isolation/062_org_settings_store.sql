-- Item 22 (migration 062): the platform settings page saved nowhere, and told the user it had saved.
--
-- Measured 23 Nov 2026: GDSSettingsPage reads OrgSettings.list("-created_date", 1) and writes update/create with a payload
-- of organization_name, domain, industry, sla_critical_hours, sla_high_hours, sla_medium_hours, auto_triage_enabled,
-- auto_fix_enabled, ci_gate_enabled, data_residency and retention_days. Both calls are wrapped in `.catch(() => {})` and
-- followed by `toast.success("Settings saved")`, so every save reported success while nothing was written. No table
-- matched %setting% / %config% other than the drift tables.
--
-- ONE ROW PER TENANT, enforced by the unique tenant_id: a settings page that appends a new row per save leaves the reader
-- picking list[0] and showing whichever row happened to sort first.
--
-- The SLA hours are the only setting here with a real consumer: POST /findings/escalate-stale reads them to decide when a
-- finding is stale, falling back to the cron script's own ladder when a column is NULL. They are nullable on purpose - NULL
-- means "use the platform ladder", and the route reports which one it used rather than inventing a number.

CREATE TABLE IF NOT EXISTS org_settings (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    organization_name   text NOT NULL DEFAULT '',
    domain              text NOT NULL DEFAULT '',
    industry            text NOT NULL DEFAULT '',
    sla_critical_hours  integer,
    sla_high_hours      integer,
    sla_medium_hours    integer,
    data_residency      text NOT NULL DEFAULT 'eu',
    retention_days      integer NOT NULL DEFAULT 90,
    auto_triage_enabled boolean NOT NULL DEFAULT false,
    auto_fix_enabled    boolean NOT NULL DEFAULT false,
    ci_gate_enabled     boolean NOT NULL DEFAULT false,
    mfa_required        boolean NOT NULL DEFAULT false,
    updated_by          uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['org_settings'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t) THEN
      EXECUTE format(
        'CREATE POLICY gds_%s_tenant ON %I USING (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid) WITH CHECK (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid)',
        t, t);
    END IF;
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON org_settings TO gds;
GRANT SELECT ON org_settings TO gds_runtime;

-- Changing an organisation's SLA policy changes when its findings are escalated to a human, so it is an accountable write
-- and gets its own permission rather than riding on findings:read. Owner gets it; admin already holds "*". Idempotent.
UPDATE roles
   SET permissions = permissions || '["settings:write"]'::jsonb
 WHERE name = 'platform_owner'
   AND NOT (permissions @> '["settings:write"]'::jsonb);
