-- Let the tenant's own administrator accept risk, not just a role that no account here holds.
--
-- 037 gated accepted risk on findings:accept_risk and granted it to platform_owner, mirroring
-- cloud:posture:suppress. Measured immediately afterwards on this deployment: the tenant that owns all 14 open
-- criticals (2ec10dd0-e48e-4043-8c88-5998ba5e23b0) has exactly one active user, president@globaldigitalstreams.com,
-- and that account's role is `admin`, not platform_owner. The three platform_owner roles belong to other
-- tenants. So the only person accountable for these findings could not record the decision about them, and the
-- feature would have shipped unusable - the same shape of defect as cloud:posture:suppress, which no role in
-- this deployment holds at all.
--
-- Granting to `admin` is deliberate and narrow: it is the tenant's most privileged role (72 permissions, the
-- only non-owner role holding approvals:decide), and accepting risk is an accountable administrative decision,
-- which is exactly what that role exists for. analyst and assessment_runner are not granted it.

UPDATE roles
SET permissions = permissions || '["findings:accept_risk"]'::jsonb
WHERE name = 'admin'
  AND NOT (permissions @> '["findings:accept_risk"]'::jsonb);
