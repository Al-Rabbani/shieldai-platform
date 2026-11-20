-- A second factor, so a password alone stops being enough.
--
-- The compliance assessment has reported mfa_enforced as FAIL for weeks for a plain reason: the users table had
-- no second-factor columns and the auth API had no enrolment mechanism at all. This adds both. Enrolment is
-- opt-in per user, so no existing account is locked out by the deploy.
--
-- The shared secret is stored encrypted (Fernet) rather than as bare base32, because a database read should not
-- hand an attacker the ability to mint valid codes. Recovery codes are stored as sha256 hashes: they are
-- high-entropy random values, so a hash is sufficient and a leaked table cannot be replayed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enrolled_at timestamptz;

CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash text NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_user ON mfa_recovery_codes (user_id) WHERE used_at IS NULL;

ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_recovery_codes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mfa_recovery_codes_tenant ON mfa_recovery_codes;
CREATE POLICY mfa_recovery_codes_tenant ON mfa_recovery_codes
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON mfa_recovery_codes TO gds;
