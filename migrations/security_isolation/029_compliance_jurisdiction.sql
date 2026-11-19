-- 029: which legal order each compliance framework belongs to (gap C12).
--
-- The console listed five frameworks without saying where any of them binds, so a reader could not tell
-- that DORA is an EU instrument and HIPAA a US one. Jurisdiction is a property of the framework, so it
-- lives on the framework rather than being inferred in the browser.
--
-- NIS2 has no catalogued controls at all, so there is nothing to label for it yet. That absence is a real
-- gap in the catalog, not something a jurisdiction column can paper over.
--
-- Idempotent: safe to re-run, and the DEFAULT keeps a future framework from arriving unlabelled.
ALTER TABLE compliance_frameworks ADD COLUMN IF NOT EXISTS jurisdiction text;

UPDATE compliance_frameworks SET jurisdiction = CASE framework_key
    WHEN 'dora'         THEN 'EU'
    WHEN 'hipaa'        THEN 'US'
    WHEN 'nist_ai_rmf'  THEN 'US'
    WHEN 'cis_v8'       THEN 'International'
    WHEN 'soc2_type2'   THEN 'International'
    ELSE 'Unspecified' END
 WHERE jurisdiction IS NULL;

ALTER TABLE compliance_frameworks ALTER COLUMN jurisdiction SET DEFAULT 'Unspecified';
ALTER TABLE compliance_frameworks ALTER COLUMN jurisdiction SET NOT NULL;
