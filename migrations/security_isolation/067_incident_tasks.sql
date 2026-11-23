-- Item 29 (migration 067): incident response tasks were written to a table that never existed.
--
-- Measured 23 Nov 2026: IncidentResponsePage calls IncidentTask.list("-priority", 20),
-- IncidentTask.bulkCreate(DEFAULT_TASKS), IncidentTask.update(id, {status: "completed", completed_at}) and
-- IncidentTask.create({incident_id, title, description, priority, assignee_name, status: "open"}). No table matched
-- '%task%' except engineering_tasks and mission_tasks, so the default playbook the page seeds on the active incident
-- vanished on reload and every "mark complete" was lost. The page also calls
-- Incident.update(id, {status: "investigating", assigned_to}), and the incidents table has neither column and no status
-- other than open - so starting an investigation recorded nothing at all.

CREATE TABLE IF NOT EXISTS incident_tasks (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- The page lists incidents from the incidents table (uuid ids), so a task belongs to that row.
    incident_id       uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    title             text NOT NULL,
    description       text NOT NULL DEFAULT '',
    task_type         text NOT NULL DEFAULT 'response',
    -- Response vocabulary for this store: open -> completed. Nothing writes a third value.
    status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
    priority          text NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    assignee_name     text NOT NULL DEFAULT '',
    notes             text NOT NULL DEFAULT '',
    due_at            timestamptz,
    completed_at      timestamptz,
    requires_approval boolean NOT NULL DEFAULT false,
    approved_by       text,
    created_by        uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

-- The page reads one incident's tasks ordered by priority, and the panel lists recent tasks platform-wide.
CREATE INDEX IF NOT EXISTS incident_tasks_incident_idx
    ON incident_tasks (tenant_id, incident_id, status);
CREATE INDEX IF NOT EXISTS incident_tasks_created_idx
    ON incident_tasks (tenant_id, created_at DESC);

-- Who is running an investigation, and when they picked it up. There is no "investigating" status in the incidents
-- table and inventing one would drop the row out of every count that reads status = 'open'; the derived state is
-- (status = 'open' AND assigned_at IS NOT NULL).
ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS assigned_to text,
    ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['incident_tasks'] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t) THEN
            EXECUTE format(
                'CREATE POLICY gds_%s_tenant ON %I USING (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid) WITH CHECK (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid)',
                t, t);
        END IF;
    END LOOP;
END $$;

-- A table with FORCE RLS and no GRANT answers "permission denied", not "no rows" (item 9).
GRANT SELECT, INSERT, UPDATE, DELETE ON incident_tasks TO gds;
GRANT SELECT ON incident_tasks TO gds_runtime;

-- No new permission: incidents:write already exists and is what resolving an incident uses.
