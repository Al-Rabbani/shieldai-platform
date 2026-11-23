-- 076: every scan run records itself, and the deterministic scan becomes monitorable
--
-- WHY: the 6-hourly scan wrote its outcome to a log file only. The finding register has not moved since 19 Nov, and
-- from inside the product a scanner that died and an estate that changed nothing looked identical. scan_schedules
-- drives the "Scanner silent" alert in check_alerts.py, but the deterministic scan had no row there, so even the
-- alert path could not see it.
--
-- scan_runs is history (one row per run, per scanner). scan_schedules stays the schedule of record: the runner
-- stamps last_run_at/next_run_at through scripts/ops/scan_schedule_record.py, which is what check_alerts.py reads.

BEGIN;

CREATE TABLE IF NOT EXISTS scan_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scanner text NOT NULL,
    started_at timestamptz NOT NULL,
    finished_at timestamptz NOT NULL DEFAULT now(),
    duration_ms integer,
    targets integer NOT NULL DEFAULT 0,
    new_findings integer NOT NULL DEFAULT 0,
    duplicates integer NOT NULL DEFAULT 0,
    failed integer NOT NULL DEFAULT 0,
    register_before integer,
    register_after integer,
    outcome text NOT NULL DEFAULT 'ok',
    detail jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_scan_runs_tenant_scanner_started
    ON scan_runs (tenant_id, scanner, started_at DESC);

ALTER TABLE scan_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scan_runs_tenant ON scan_runs;
CREATE POLICY scan_runs_tenant ON scan_runs
    USING (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON scan_runs TO gds;
GRANT SELECT ON scan_runs TO gds_runtime;

-- The deterministic scan enters the schedule of record so its silence becomes alertable.
INSERT INTO scan_schedules (id, tenant_id, name, monitor_type, target_config, interval_minutes,
                            auto_triage, auto_escalate, status, total_runs, total_findings, created_at, updated_at)
SELECT gen_random_uuid(), t.id, 'Deterministic estate scan (headers + ports)', 'deterministic', '{}'::jsonb, 360,
       false, false, 'active', 0, 0, now(), now()
  FROM tenants t
 WHERE NOT EXISTS (
    SELECT 1 FROM scan_schedules s WHERE s.tenant_id = t.id AND s.monitor_type = 'deterministic'
 );

COMMIT;
