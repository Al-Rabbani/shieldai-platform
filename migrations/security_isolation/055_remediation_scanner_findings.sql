-- Item 8 (migration 055): a remediation plan must be able to point at the finding anyone can see.
--
-- Measured 22 Nov 2026: findings (uuid ids, governed register) 317 rows, security_findings (integer ids, scanner
-- register) 1002 rows. remediation_plans.finding_id was uuid NOT NULL with a foreign key to findings(id), so the
-- engine could not accept a single id from the register the UI shows; posting one answered 404 "badly formed
-- hexadecimal UUID string". That is why the store held zero rows.

ALTER TABLE remediation_plans
  ADD COLUMN IF NOT EXISTS security_finding_id integer REFERENCES security_findings(id);

-- A plan now references exactly one register, so finding_id can no longer be mandatory.
ALTER TABLE remediation_plans ALTER COLUMN finding_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS ix_remediation_plans_security_finding
  ON remediation_plans (security_finding_id) WHERE security_finding_id IS NOT NULL;

COMMENT ON COLUMN remediation_plans.finding_id IS
  'Governed register (findings.id, uuid). NULL when security_finding_id is set.';
COMMENT ON COLUMN remediation_plans.security_finding_id IS
  'Scanner register (security_findings.id, integer) - the register every finding in the UI comes from.';
