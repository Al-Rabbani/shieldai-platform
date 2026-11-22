-- 053: every running container has a CVE watch, and the schedule table has a writer.
--
-- Measured on 22 November 2026: NOTHING in the repository wrote scan_schedules. Only monitoring.py and
-- check_alerts.py read it, and the tree contained no UPDATE on it at all. The five rows were seeded once
-- and frozen, so four container rows had last_run_at NULL forever and the OSV row had last run on
-- 17 November. check_alerts.py compares next_run_at against each row's own interval and alerts when
-- overdue, so it had been emailing and Slacking the owner every hour, indefinitely, about schedules that
-- could never clear. A genuine stall would have been indistinguishable from that noise.
--
-- The writer is scripts/ops/scan_schedule_record.py, called at the end of a successful scan by the
-- container CVE watch and the OSV check. Both are now in cron daily (container watch was weekly against a
-- declared 1440-minute interval; the OSV check was scheduled nowhere at all).
--
-- This migration closes the remaining coverage hole the first real run exposed: neo4j is running with no
-- scan_schedules row, so no watch expected it and nothing would ever have reported it silent.

INSERT INTO scan_schedules (id, tenant_id, name, monitor_type, interval_minutes, status, next_run_at, created_at)
SELECT gen_random_uuid(), t.tenant_id, 'Container image watch: neo4j', 'container_scan', 1440, 'active', now(), now()
FROM (SELECT DISTINCT tenant_id FROM scan_schedules WHERE monitor_type = 'container_scan') AS t
WHERE NOT EXISTS (
    SELECT 1 FROM scan_schedules s
    WHERE s.tenant_id = t.tenant_id AND s.name = 'Container image watch: neo4j'
);

COMMENT ON TABLE scan_schedules IS
    'What each scheduled scanner is expected to do and when it last actually did it. Written by scripts/ops/scan_schedule_record.py at the end of a successful scan; read by check_alerts.py to raise a silence alert. A row whose last_run_at never advances is a real stall, not a display artefact.';
