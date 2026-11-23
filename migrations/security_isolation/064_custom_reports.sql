-- Item 26 (migration 064): the custom report builder could run a report but had nowhere to keep its definition.
--
-- Measured 23 Nov 2026: CustomReportsPage calls CustomReport.list/create/update/delete and no table matched '%report%'.
-- All six report sources it offers (Asset, Incident, EvidenceRecord, Agent, ComplianceChecklistItem, TriagedFinding) ARE
-- served, so a report really runs and really exports; only the saved definition vanished. The refused Drive function's
-- own message says "The report itself is stored on the platform", which was untrue until this table existed.

CREATE TABLE IF NOT EXISTS custom_reports (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            text NOT NULL,
    description     text NOT NULL DEFAULT '',
    source_entity   text NOT NULL,
    columns         text[] NOT NULL DEFAULT '{}',
    status_filter   text NOT NULL DEFAULT '',
    severity_filter text NOT NULL DEFAULT '',
    framework       text NOT NULL DEFAULT '',
    date_from       text NOT NULL DEFAULT '',
    date_to         text NOT NULL DEFAULT '',
    sort_order      text NOT NULL DEFAULT 'newest',
    row_limit       integer NOT NULL DEFAULT 100,
    created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_reports_tenant_created_idx ON custom_reports (tenant_id, created_at DESC);

DO $$
BEGIN
  ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
  ALTER TABLE custom_reports FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_reports') THEN
    CREATE POLICY gds_custom_reports_tenant ON custom_reports
      USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
      WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), '') )::uuid);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON custom_reports TO gds;
GRANT SELECT ON custom_reports TO gds_runtime;

-- Saving a report definition is a write like any other; there is no reports:* permission in the catalogue.
UPDATE roles SET permissions = permissions || '["reports:write"]'::jsonb
 WHERE name = 'platform_owner' AND NOT permissions @> '["reports:write"]'::jsonb;
