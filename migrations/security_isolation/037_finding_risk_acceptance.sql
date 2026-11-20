-- Accepted risk: the state between "open" and "fixed", which did not exist.
--
-- security_findings held only two statuses, open and resolved, and the findings API had no write path at all,
-- so a finding that cannot be fixed had exactly one dishonest option: mark it resolved, which claims a fix that
-- never happened. The cloud posture module has had real accepted-risk handling for a while (suppression.py,
-- VALIDATED -> ACCEPTED_RISK); findings never got the equivalent. This is that equivalent.
--
-- What a defensible acceptance has to carry, and why each field is here rather than in a comment somewhere:
--   accepted_by / accepted_by_email - a named human, not "the platform". Risk acceptance is an accountable act.
--   reason                          - why it cannot be fixed now. Enforced to a real sentence in code.
--   compensating_controls           - what actually limits the exposure in the meantime. Without this the
--                                     record is just a mute button.
--   severity_at_acceptance          - what was accepted. If the finding later worsens, the record still shows
--                                     what the decision covered.
--   expires_at                      - acceptance is a lease, not a burial. On expiry the finding reopens by
--                                     itself (reconcile_expired_acceptances), so silence cannot become permanent.
--   revoked_at / revoked_by         - withdrawal keeps the row and its reason. History is not rewritten.
--   expired_at                      - kept distinct from revoked_at on purpose: "the clock ran out" and "a
--                                     human withdrew this" are different facts and must not share a column.
--
-- One live acceptance per finding, enforced by a partial unique index: two live acceptances with different
-- expiries would make "when does this reopen" ambiguous.
--
-- FORCE RLS with a tenant policy, matching every other tenant table.

CREATE TABLE IF NOT EXISTS finding_risk_acceptances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    finding_id integer NOT NULL REFERENCES security_findings(id) ON DELETE CASCADE,
    accepted_by uuid REFERENCES users(id) ON DELETE SET NULL,
    accepted_by_email text,
    reason text NOT NULL,
    compensating_controls text NOT NULL,
    severity_at_acceptance text NOT NULL,
    expires_at timestamptz NOT NULL,
    review_date date,
    revoked_at timestamptz,
    revoked_by uuid REFERENCES users(id) ON DELETE SET NULL,
    revoke_reason text,
    expired_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT finding_risk_acceptances_reason_not_empty CHECK (length(btrim(reason)) > 0),
    CONSTRAINT finding_risk_acceptances_controls_not_empty CHECK (length(btrim(compensating_controls)) > 0)
);

CREATE INDEX IF NOT EXISTS finding_risk_acceptances_tenant_finding
    ON finding_risk_acceptances (tenant_id, finding_id);

-- At most one live acceptance per finding; withdrawn and expired rows stay for the record.
CREATE UNIQUE INDEX IF NOT EXISTS finding_risk_acceptances_one_live
    ON finding_risk_acceptances (finding_id)
    WHERE revoked_at IS NULL AND expired_at IS NULL;

CREATE INDEX IF NOT EXISTS finding_risk_acceptances_expiry
    ON finding_risk_acceptances (expires_at)
    WHERE revoked_at IS NULL AND expired_at IS NULL;

ALTER TABLE finding_risk_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_risk_acceptances FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finding_risk_acceptances_tenant_isolation ON finding_risk_acceptances;
CREATE POLICY finding_risk_acceptances_tenant_isolation ON finding_risk_acceptances
    USING (tenant_id = current_setting('gds.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('gds.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON finding_risk_acceptances TO gds;
GRANT SELECT, INSERT, UPDATE, DELETE ON finding_risk_acceptances TO gds_runtime;

-- The permission that gates it. Permissions live in a JSONB array on roles (not in a permissions table), and
-- the same pattern as cloud:posture is followed deliberately: accepting risk stays with platform_owner only.
UPDATE roles
SET permissions = permissions || '["findings:accept_risk"]'::jsonb
WHERE name = 'platform_owner'
  AND NOT (permissions @> '["findings:accept_risk"]'::jsonb);

-- The runner (scripts/ops/migrate.py) records this file with its name and checksum after it succeeds.
-- Inserting the row here fails on schema_migrations.name NOT NULL and rolls the whole migration back.
