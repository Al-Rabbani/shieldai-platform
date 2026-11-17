-- 013_monitoring_schedules.sql
-- Create the two tables the monitoring engine was already coded against.
--
-- gds_api/monitoring.py declares ScanSchedule and MonitoringResult as ORM models and the
-- Temporal workflow in gds_api/workflows/monitoring_workflow.py queries them, but no migration
-- ever created them. Every /monitoring/schedules request therefore failed with
-- UndefinedTable, i.e. the endpoint 500'd rather than reporting the schedules it claimed to own.
--
-- Both tables are tenant tables and are forced, matching every other consumer table. The
-- Temporal scheduler resolves the tenant from the schedule row itself and binds it before
-- reading, so RLS does not hide the row from the workflow.
BEGIN;

CREATE TABLE IF NOT EXISTS scan_schedules (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name              varchar(200) NOT NULL,
    monitor_type      varchar(50)  NOT NULL,
    target_config     jsonb        NOT NULL DEFAULT '{}'::jsonb,
    interval_minutes  integer      NOT NULL DEFAULT 360,
    auto_triage       boolean      NOT NULL DEFAULT true,
    auto_escalate     boolean      NOT NULL DEFAULT true,
    status            varchar(20)  NOT NULL DEFAULT 'active',
    last_run_at       timestamptz,
    next_run_at       timestamptz,
    last_run_findings integer      NOT NULL DEFAULT 0,
    total_runs        integer      NOT NULL DEFAULT 0,
    total_findings    integer      NOT NULL DEFAULT 0,
    last_error        text,
    created_at        timestamptz  NOT NULL DEFAULT now(),
    updated_at        timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT scan_schedules_status_check CHECK (status IN ('active', 'paused', 'error')),
    CONSTRAINT scan_schedules_interval_check CHECK (interval_minutes BETWEEN 1 AND 525600)
);

CREATE INDEX IF NOT EXISTS ix_scan_schedules_tenant_status
    ON scan_schedules (tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_scan_schedules_due
    ON scan_schedules (next_run_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS monitoring_results (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    schedule_id       uuid NOT NULL REFERENCES scan_schedules(id) ON DELETE CASCADE,
    monitor_type      varchar(50) NOT NULL,
    started_at        timestamptz NOT NULL DEFAULT now(),
    completed_at      timestamptz,
    duration_seconds  double precision,
    findings_created  integer NOT NULL DEFAULT 0,
    findings_triaged  integer NOT NULL DEFAULT 0,
    incidents_created integer NOT NULL DEFAULT 0,
    critical_findings integer NOT NULL DEFAULT 0,
    status            varchar(20) NOT NULL,
    error_message     text,
    result_summary    jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_monitoring_results_schedule
    ON monitoring_results (schedule_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ix_monitoring_results_tenant
    ON monitoring_results (tenant_id, started_at DESC);

ALTER TABLE scan_schedules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_schedules     FORCE  ROW LEVEL SECURITY;
ALTER TABLE monitoring_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_results FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gds_scan_schedules_tenant ON scan_schedules;
CREATE POLICY gds_scan_schedules_tenant ON scan_schedules
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);

DROP POLICY IF EXISTS gds_monitoring_results_tenant ON monitoring_results;
CREATE POLICY gds_monitoring_results_tenant ON monitoring_results
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);

COMMIT;
