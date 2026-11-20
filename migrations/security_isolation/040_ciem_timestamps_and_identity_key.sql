-- CIEM could never store a single row, for two independent reasons.
--
-- 1. Every CIEM timestamp column was `timestamp without time zone`, while both models default to
--    datetime.now(timezone.utc). asyncpg refuses to bind a tz-aware value into a naive column, so every
--    insert raised DataError "can't subtract offset-naive and offset-aware datetimes" before the row was
--    ever checked against RLS. Reproduced directly: a plain CIEMScanResult flush failed, and so did a
--    CIEMFinding flush that supplied an explicit tenant_id. 0 scans and 0 findings had ever been stored.
--
-- 2. ciem_scan_results.tenant_id is NOT NULL on a FORCE-RLS table, but the model did not map it at all.
--
-- The repo standard is timestamptz (180 columns) rather than naive (27), so the columns move to the
-- standard instead of the code moving away from it. Existing values are interpreted as UTC, which is what
-- the writer always meant.

ALTER TABLE ciem_findings
    ALTER COLUMN detected_at TYPE timestamptz USING detected_at AT TIME ZONE 'UTC',
    ALTER COLUMN last_used   TYPE timestamptz USING last_used   AT TIME ZONE 'UTC',
    ALTER COLUMN resolved_at TYPE timestamptz USING resolved_at AT TIME ZONE 'UTC';

ALTER TABLE ciem_scan_results
    ALTER COLUMN started_at   TYPE timestamptz USING started_at   AT TIME ZONE 'UTC',
    ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC';

-- A re-scan must not duplicate what it already found, and it must be able to recognise the same identity
-- twice. The key is the identity plus the kind of problem, per account, per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS ux_ciem_findings_identity_type
    ON ciem_findings (tenant_id, cloud_account_id, identity_arn, finding_type);
