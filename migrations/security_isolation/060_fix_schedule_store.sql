-- Item 20 (migration 060): the fix calendar and planning board wrote to a table that never existed.
--
-- Measured 23 Nov 2026: FixCalendarPage and FixPlanningBoardPage call FixScheduleItem across 11 sites and perform
-- create, update and delete on it. Dragging a finding into a week calls FixScheduleItem.create({finding_id,
-- finding_title, week_key, week_number}); moving it calls update(id, {week_key}); dropping it back to the backlog calls
-- delete(id). No table matched fix/schedul anywhere in the schema, so every one of those writes was refused and the
-- board reverted on the next load while looking like it had saved.
--
-- This table records only what a person placed: no strategy, no risk estimate, no derived priority. finding_id is text
-- because this platform holds two finding registers - integer ids in security_findings (1,002 rows, what the UI shows)
-- and UUID ids in findings (317 governed rows) - so the id is stored as the caller's own string and never coerced.

CREATE TABLE IF NOT EXISTS fix_schedule_items (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    finding_id    text NOT NULL,
    finding_title text NOT NULL DEFAULT '',
    week_key      text NOT NULL,
    week_number   integer,
    created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, finding_id)
);

CREATE INDEX IF NOT EXISTS fix_schedule_items_tenant_week_idx
    ON fix_schedule_items (tenant_id, week_key);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fix_schedule_items'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t) THEN
      EXECUTE format(
        'CREATE POLICY gds_%s_tenant ON %I USING (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid) WITH CHECK (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid)',
        t, t);
    END IF;
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON fix_schedule_items TO gds;
GRANT SELECT ON fix_schedule_items TO gds_runtime;

-- Scheduling a fix is a planning decision, not a change to a finding's state, so it gets its own permission rather than
-- borrowing findings:accept_risk (a risk decision) or findings:escalate (an accountable alert). Measured catalogue:
-- findings:read, findings:accept_risk, findings:escalate and cloud:findings:* exist; there is no findings:write. The
-- owner role gets it, admin already holds "*". Idempotent: a second run appends nothing.
UPDATE roles
   SET permissions = permissions || '["findings:schedule"]'::jsonb
 WHERE name = 'platform_owner'
   AND NOT (permissions @> '["findings:schedule"]'::jsonb);
