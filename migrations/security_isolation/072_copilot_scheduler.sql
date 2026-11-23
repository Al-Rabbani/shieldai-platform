-- Item 42: the autonomous scheduler was invisible and unrecorded.
--
-- A cron job (/opt/gds-os/apps/api/run_autonomous_missions.py, every 30 minutes) has been running real GPT-4.1 missions
-- since October: platform-posture-check, 3 agents, 10-13 tool calls per run. Nothing in the app could see it, and its
-- history lived only in a log file and a JSON state file that is overwritten each time. This adds the log the app reads
-- and the permission that gates the controls.
UPDATE roles
SET permissions = permissions || '["scheduler:read", "scheduler:write"]'::jsonb
WHERE name = 'platform_owner'
  AND NOT (permissions @> '["scheduler:read"]'::jsonb);

CREATE TABLE IF NOT EXISTS copilot_scheduler_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    schedule_name text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('run', 'control')),
    status text NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'skipped', 'paused', 'resumed')),
    mission_id text,
    agents integer,
    agents_succeeded integer,
    tool_calls integer,
    duration_ms integer,
    cost_usd numeric(12, 6),
    detail text,
    actor_email text,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS copilot_scheduler_log_tenant_idx
    ON copilot_scheduler_log (tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS copilot_scheduler_log_schedule_idx
    ON copilot_scheduler_log (schedule_name, started_at DESC);

ALTER TABLE copilot_scheduler_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_scheduler_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_scheduler_log_tenant_isolation ON copilot_scheduler_log;
CREATE POLICY copilot_scheduler_log_tenant_isolation ON copilot_scheduler_log
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON copilot_scheduler_log TO gds;
GRANT SELECT ON copilot_scheduler_log TO gds_runtime;
