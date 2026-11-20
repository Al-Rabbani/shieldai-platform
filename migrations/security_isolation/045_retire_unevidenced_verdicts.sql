-- Retire the eighteen compliance verdicts that assert pass or fail with no evidence behind them.
--
-- Measured 20 Nov 2026: compliance_assessments holds eighteen rows dated 2026-08-01 with verdict_source 'manual'
-- across four frameworks that have no catalogue row at all:
--     iso27001 (4), nist_csf (4), pci_dss (6), soc2 (4)
-- Each carries status pass or fail and no collector, no observed payload and no evidence hash. They are the
-- August seeding, before the catalogue existed, and nothing has ever re-derived them. A reader who queries the
-- table sees "iso27001 1 pass / 3 fail" and has no way to learn that nobody checked anything.
--
-- They are NOT deleted. The rows are the record of what the platform claimed in August, and deleting history is
-- how the same claim gets made again. They are marked not_tested with a verdict source that says why, and the
-- observed payload records the claim being retired so the change is readable without a diff of this file.
--
-- This is deliberately conservative in one direction only: it can turn an unsupported pass into not_tested. It
-- cannot invent a pass. Re-earning any of these frameworks means cataloguing controls and giving them collectors.

BEGIN;

UPDATE compliance_assessments
SET status = 'not_tested',
    verdict_source = 'unevidenced_retired',
    observed = COALESCE(observed, '{}'::jsonb) || jsonb_build_object(
        'retired_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'retired_because', 'manual verdict with no collector, no observed payload and no evidence hash; '
                           'the framework has no catalogue row, so the verdict could not be reproduced',
        'claimed_status', status,
        'claimed_on', assessment_date::date::text
    ),
    assessed_at = now()
WHERE verdict_source = 'manual'
  AND framework IN ('iso27001', 'nist_csf', 'pci_dss', 'soc2')
  AND framework NOT IN (SELECT framework_key FROM compliance_controls)
  AND (collector IS NULL OR collector = '')
  AND (observed IS NULL OR observed = '{}'::jsonb);

-- The invariant the console relies on: a framework with no catalogue row has no pass or fail.
DO $$
DECLARE
    offending integer;
BEGIN
    SELECT count(*) INTO offending
    FROM compliance_assessments a
    WHERE a.framework NOT IN (SELECT framework_key FROM compliance_controls)
      AND a.status IN ('pass', 'fail');
    IF offending > 0 THEN
        RAISE EXCEPTION 'still % unevidenced pass/fail row(s) on uncatalogued frameworks', offending;
    END IF;
END $$;

COMMIT;
