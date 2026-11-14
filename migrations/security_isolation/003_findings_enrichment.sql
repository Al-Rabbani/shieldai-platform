-- 003_findings_enrichment.sql
-- Phase 3: make security_findings the single source of truth for findings.
-- The legacy "findings" table is empty and carried enrichment columns
-- (cve, cvss, epss, kev_listed, reachability, exploitability, exposure, source,
-- external_id, risk_class, confidence, business_impact, raw_data) that the live
-- scannner-written security_findings table lacks. These columns are added
-- additively so no existing row, policy or index is disturbed.
-- Applied: 2026-11-14. Idempotent (IF NOT EXISTS).

ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS source            varchar(64);
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS external_id       varchar(255);
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS cve               varchar(64);
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS cvss              double precision;
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS epss              double precision;
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS kev_listed        boolean;
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS reachability      varchar(32);
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS exploitability    varchar(32);
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS exposure          varchar(32);
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS risk_class        varchar(32);
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS confidence        varchar(32);
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS business_impact   text;
ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS raw_data          jsonb;

CREATE INDEX IF NOT EXISTS idx_security_findings_cve  ON security_findings (cve) WHERE cve IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_findings_kev  ON security_findings (kev_listed) WHERE kev_listed IS TRUE;

COMMENT ON TABLE security_findings IS 'Authoritative findings store (Phase 3 consolidation). Legacy "findings" table retained read-only; enrichment columns migrated here 2026-11-14.';
