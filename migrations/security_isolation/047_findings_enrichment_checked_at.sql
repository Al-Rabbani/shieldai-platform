-- A KEV answer that never expires is not an answer.
--
-- Measured 21 Nov 2026: all 849 open findings read kev_listed = false, and the enricher that produces that column
-- selected its work with
--
--     AND (cve IS NULL OR epss IS NULL OR kev_listed IS NULL)
--
-- Since the first run wrote false rather than NULL into every row, that predicate matched nothing for the rows it had
-- already touched. The log shows the decay: 500 rows examined, then 161, then 38, and on the last run 38 examined with
-- 0 carrying a CVE, so nothing was enriched at all. The cron kept firing every twelve hours and kept doing nothing,
-- which is the same defect class as the mission reaper that reported "cancelled 0" for two days.
--
-- WHY IT MATTERS: the CISA KEV catalogue is republished daily (2026.11.20, 1,790 entries). A CVE absent from KEV in
-- November can be added in December, and this platform would have gone on reporting kev_listed = false forever, because
-- false is a value and the selection only ever looked for NULL. EPSS decays and climbs daily for the same reason.
--
-- The honest fix is not to make the query look at everything every time; it is to record WHEN the check happened, so
-- false means "checked at T, absent from the catalogue as of T" instead of "nobody looked". kev_date_added and
-- kev_due_date are added at the same time because the catalogue publishes them and a remediation deadline that is
-- thrown away at load time cannot be recovered later.
--
-- Existing rows are deliberately left with enrichment_checked_at NULL. Backfilling it with now() would claim a check
-- that never happened; NULL means "never checked under this scheme", and the next run re-examines every row once.

ALTER TABLE security_findings
    ADD COLUMN IF NOT EXISTS enrichment_checked_at timestamptz,
    ADD COLUMN IF NOT EXISTS kev_date_added date,
    ADD COLUMN IF NOT EXISTS kev_due_date date;

COMMENT ON COLUMN security_findings.enrichment_checked_at IS
    'When the enricher last examined this finding against the EPSS and KEV feeds. NULL means never checked. '
    'kev_listed = false is only evidence when this is recent: it means absent from the catalogue as of this time.';
COMMENT ON COLUMN security_findings.kev_date_added IS
    'CISA KEV dateAdded for a listed CVE; NULL when the CVE is not listed or has no published date.';
COMMENT ON COLUMN security_findings.kev_due_date IS
    'CISA KEV dueDate for a listed CVE, the remediation deadline the catalogue publishes.';

-- The staleness query is per tenant, open only, oldest check first. Without this index it is a sequential scan of the
-- whole table every twelve hours, which is affordable now and will not be once findings accumulate.
CREATE INDEX IF NOT EXISTS ix_security_findings_enrichment_stale
    ON security_findings (tenant_id, enrichment_checked_at)
    WHERE status = 'open';
