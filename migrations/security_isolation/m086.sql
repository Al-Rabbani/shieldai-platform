-- ONE SCHEDULE ROW PER SCANNER, ENFORCED BY THE DATABASE.
--
-- MEASURED 26 Nov 2026: "Estate sweep: nikto" had EIGHT rows in scan_schedules, owasp_pentest and api_pentest six each,
-- nmap four, httpx/security_headers/subfinder three, ffuf/gobuster/nuclei two - 29 duplicate rows in total. The cause
-- was an INSERT ... ON CONFLICT DO NOTHING with NO CONFLICT TARGET against a table with no unique constraint, so the
-- clause never fired: every sweep run added a row, and the UPDATE that followed matched by name and therefore bumped
-- total_runs on ALL the duplicates. The counters were split and inflated, and the "scanner silent" alert - which reads
-- this table - could see a stale duplicate and call a live scanner dead.
--
-- Totals are RECOMPUTED FROM scan_runs, which is the record of what actually ran, rather than summed across the
-- duplicates (summing would keep the inflation). Where no run history exists the existing figure is left alone.

BEGIN;

-- 1. Fold each group into one keeper, then drop the rest.
WITH ranked AS (
    SELECT id, tenant_id, name,
           ROW_NUMBER() OVER (
               PARTITION BY tenant_id, name
               ORDER BY last_run_at DESC NULLS LAST, total_runs DESC, created_at DESC
           ) AS rn
      FROM scan_schedules
), keeper AS (
    SELECT id, tenant_id, name FROM ranked WHERE rn = 1
), true_totals AS (
    SELECT k.id,
           (SELECT count(*) FROM scan_runs r
             WHERE r.tenant_id = k.tenant_id
               AND r.scanner = 'estate_sweep:' || substring(k.name FROM '^Estate sweep: (.*)$')) AS sweep_runs,
           (SELECT coalesce(sum(r.new_findings), 0) FROM scan_runs r
             WHERE r.tenant_id = k.tenant_id
               AND r.scanner = 'estate_sweep:' || substring(k.name FROM '^Estate sweep: (.*)$')) AS sweep_findings
      FROM keeper k
)
UPDATE scan_schedules s
   SET total_runs = CASE WHEN t.sweep_runs > 0 THEN t.sweep_runs ELSE s.total_runs END,
       total_findings = CASE WHEN t.sweep_runs > 0 THEN t.sweep_findings ELSE s.total_findings END,
       updated_at = now()
  FROM true_totals t
 WHERE s.id = t.id;

DELETE FROM scan_schedules s
 USING (
    SELECT id, ROW_NUMBER() OVER (
               PARTITION BY tenant_id, name
               ORDER BY last_run_at DESC NULLS LAST, total_runs DESC, created_at DESC
           ) AS rn
      FROM scan_schedules
 ) ranked
 WHERE s.id = ranked.id AND ranked.rn > 1;

-- 2. Make a duplicate impossible from now on. ON CONFLICT (tenant_id, name) needs this index to exist.
CREATE UNIQUE INDEX IF NOT EXISTS uq_scan_schedules_tenant_name
    ON scan_schedules (tenant_id, name);

COMMIT;
