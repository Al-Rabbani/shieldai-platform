-- 059: the age-policy escalation route needs an accountable write permission.
--
-- Measured 22 Nov 2026: roles.permissions is a jsonb array, admin holds "*" (75 entries), platform_owner holds 62
-- named permissions and does NOT hold "*". There is no findings:escalate anywhere in the catalogue, and no route
-- ever performed this write - the only implementation was scripts/ops/escalate_stale_findings.py, run by cron.
-- Escalating a finding past its severity policy raises a notification a human is expected to acknowledge, so it is
-- an accountable act and belongs with the owner role, the same reasoning that put findings:accept_risk and
-- incidents:write there.
--
-- Idempotent: the guard makes a second run a no-op instead of appending a duplicate.
UPDATE roles
   SET permissions = permissions || '["findings:escalate"]'::jsonb
 WHERE name = 'platform_owner'
   AND NOT (permissions @> '["findings:escalate"]'::jsonb);
