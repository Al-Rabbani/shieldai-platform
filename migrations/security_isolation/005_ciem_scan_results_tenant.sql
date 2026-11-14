-- 005_ciem_scan_results_tenant.sql
-- R2 tenant isolation: ciem_scan_results had no tenant identity at all, so the legacy
-- /ciem/scan-results and /ciem/scan handlers could neither scope a read nor attribute a
-- write. The table is empty (0 rows), so identity can be enforced outright rather than
-- backfilled.
BEGIN;

ALTER TABLE ciem_scan_results ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Fail closed: an insert that forgets the tenant must error rather than create an
-- unattributable scan row.
ALTER TABLE ciem_scan_results ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ciem_scan_results_tenant_started
    ON ciem_scan_results (tenant_id, started_at DESC);

COMMENT ON COLUMN ciem_scan_results.tenant_id IS
    'Owning tenant. Required: legacy rows could not be attributed, table was empty at migration time.';

COMMIT;
