-- Make the cloud environment's own discovery state true, for the rows that already exist.
--
-- Measured 20 Nov 2026: cloud_environments held discovery_status='never_run' and asset_count=0 for BOTH providers,
-- while cloud_assets held 144 AWS assets and 1 Azure asset and cloud_discovery_jobs held five completed jobs. The
-- console's Cloud page reads asset_count, so it showed "Assets 0" beside an account with 144.
--
-- The model documents discovery_status as never_run|queued|running|partially_completed|completed|failed and
-- asset_count as "refreshed after every completed/partially_completed discovery job". The runner now does that on
-- every run; this migration brings the rows that predate it up to the same truth, from the same evidence the runner
-- would use - the assets and jobs that already exist - rather than from a guess.

UPDATE cloud_environments e
SET asset_count = sub.asset_count,
    region_count = sub.region_count
FROM (
    SELECT environment_id,
           count(*) AS asset_count,
           count(DISTINCT NULLIF(region_or_location, '')) AS region_count
    FROM cloud_assets
    GROUP BY environment_id
) sub
WHERE sub.environment_id = e.id
  AND (e.asset_count IS DISTINCT FROM sub.asset_count
       OR e.region_count IS DISTINCT FROM sub.region_count);

-- Freshness from the jobs that actually completed. A completed job is the only evidence of a successful discovery;
-- partially_completed and failed runs do not get to set last_successful_discovery_at.
UPDATE cloud_environments e
SET discovery_status = CASE
        WHEN sub.failed_only THEN 'failed'
        WHEN sub.partial THEN 'partially_completed'
        ELSE 'completed'
    END,
    last_successful_discovery_at = sub.last_success,
    last_attempted_discovery_at = COALESCE(e.last_attempted_discovery_at, sub.last_attempt)
FROM (
    SELECT environment_id,
           bool_or(status = 'completed') AS any_completed,
           bool_or(status = 'partially_completed') AS partial,
           NOT bool_or(status IN ('completed', 'partially_completed')) AS failed_only,
           max(completed_at) FILTER (WHERE status = 'completed') AS last_success,
           max(COALESCE(completed_at, started_at)) AS last_attempt
    FROM cloud_discovery_jobs
    WHERE status IN ('completed', 'partially_completed', 'failed')
    GROUP BY environment_id
) sub
WHERE sub.environment_id = e.id
  AND e.discovery_status = 'never_run';

COMMENT ON COLUMN cloud_environments.discovery_status IS
    'never_run|queued|running|partially_completed|completed|failed. Written by discovery_runner on every run.';
