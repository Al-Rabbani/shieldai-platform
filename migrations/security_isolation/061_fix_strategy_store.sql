-- Item 21 (migration 061): the fix strategy library offered create, edit and delete with nowhere to save.
--
-- Measured 23 Nov 2026: FixStrategyLibraryPage calls FixStrategy.create, update and delete (lines 49/51/60) and
-- TriageQueuePage reads FixStrategy.filter({is_published: true}, "-times_reused", 100) and writes times_reused back when a
-- strategy is applied to findings. No table matched '%strateg%' anywhere in the schema, so a strategy typed into the form
-- vanished, the library was always empty, and the Triage queue could never offer one.
--
-- Columns are exactly what FixStrategyForm submits and FixStrategyCard renders: title, vulnerability_type, severity,
-- tags, summary, remediation_steps, validation_steps, is_published, plus source and times_reused. No derived score or
-- ranking column exists, because none can be known from a strategy a person wrote.

CREATE TABLE IF NOT EXISTS fix_strategies (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title              text NOT NULL,
    vulnerability_type text NOT NULL,
    severity           text NOT NULL DEFAULT 'high',
    tags               text[] NOT NULL DEFAULT '{}',
    summary            text NOT NULL DEFAULT '',
    remediation_steps  text NOT NULL DEFAULT '',
    validation_steps   text NOT NULL DEFAULT '',
    is_published       boolean NOT NULL DEFAULT true,
    source             text NOT NULL DEFAULT 'manual',
    times_reused       integer NOT NULL DEFAULT 0,
    created_by         uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fix_strategies_tenant_published_idx
    ON fix_strategies (tenant_id, is_published, times_reused DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fix_strategies'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t) THEN
      EXECUTE format(
        'CREATE POLICY gds_%s_tenant ON %I USING (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid) WITH CHECK (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid)',
        t, t);
    END IF;
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON fix_strategies TO gds;
GRANT SELECT ON fix_strategies TO gds_runtime;

-- Writing a strategy into the library is a knowledge act, not a finding decision: it needs its own permission rather than
-- borrowing findings:accept_risk or findings:escalate. Owner gets it; admin already holds "*". Idempotent.
UPDATE roles
   SET permissions = permissions || '["fixes:write"]'::jsonb
 WHERE name = 'platform_owner'
   AND NOT (permissions @> '["fixes:write"]'::jsonb);
