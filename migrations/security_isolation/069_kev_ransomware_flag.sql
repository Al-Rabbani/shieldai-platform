-- Item 37: the CISA KEV catalogue this platform already fetches DOES carry a ransomware flag, and item 36 said it did
-- not. Every entry in the cached catalogue has `knownRansomwareCampaignUse`, either "Known" or "Unknown" (361 of 1,790
-- entries "Known" in catalogVersion 2026.11.20). So "no ransomware association is recorded" was false: the association
-- was in the file the enricher reads every night and was being discarded at load time, exactly as the KEV dates were
-- before item 31 kept them.
--
-- This column holds it. NULL means the catalogue was never consulted for that finding, which is different from false
-- ("consulted, not flagged"). The enricher writes it for every row it stamps from now on; the backfill below fills the
-- rows already stamped, so the register does not carry a half-populated column.
ALTER TABLE security_findings
    ADD COLUMN IF NOT EXISTS kev_ransomware_use boolean;

COMMENT ON COLUMN security_findings.kev_ransomware_use IS
    'CISA KEV knownRansomwareCampaignUse for this finding''s CVE: true = the catalogue marks it known ransomware use, '
    'false = listed/checked and not flagged, NULL = never checked against the catalogue.';

-- Backfill from the cached catalogue for every row that has already been enriched. A row whose CVE is not in the
-- catalogue is false only where kev_listed has already been established as false, so an unchecked row stays NULL.
WITH kev AS (
    SELECT (v ->> 'cveID') AS cve_id,
           lower(coalesce(v ->> 'knownRansomwareCampaignUse', 'unknown')) = 'known' AS ransomware
    FROM jsonb_array_elements(
        CAST(pg_read_file('/var/cache/gds/kev.json') AS jsonb) -> 'vulnerabilities'
    ) AS v
)
UPDATE security_findings f
SET kev_ransomware_use = kev.ransomware
FROM kev
WHERE f.cve = kev.cve_id
  AND f.kev_ransomware_use IS DISTINCT FROM kev.ransomware;

-- Rows the catalogue was consulted for but which are not listed carry no ransomware association at all.
UPDATE security_findings
SET kev_ransomware_use = false
WHERE kev_listed IS FALSE
  AND kev_ransomware_use IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON security_findings TO gds;
GRANT SELECT ON security_findings TO gds_runtime;
