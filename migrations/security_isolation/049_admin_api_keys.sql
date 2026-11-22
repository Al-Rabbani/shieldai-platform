-- 049: API keys for the owner/admin portal.
--
-- Step 10 needs an owner to issue a machine credential without a shell. Until now the only way to
-- authenticate was a browser session, so every automated caller had to borrow a human's cookie.
--
-- The key itself is never stored. Only a SHA-256 hash and a short prefix are kept, so a database
-- read cannot recover a usable credential and the prefix exists solely to let an owner recognise
-- which key is which. Revocation is a timestamp rather than a delete, so the audit trail keeps
-- saying a key existed even after it stopped working.

CREATE TABLE IF NOT EXISTS api_keys (
    id            uuid PRIMARY KEY,
    tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          text NOT NULL,
    key_prefix    text NOT NULL,
    key_hash      text NOT NULL UNIQUE,
    scopes        jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_by    uuid,
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_used_at  timestamptz,
    revoked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS ix_api_keys_tenant ON api_keys (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_api_keys_hash ON api_keys (key_hash) WHERE revoked_at IS NULL;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_keys_tenant ON api_keys;
CREATE POLICY api_keys_tenant ON api_keys
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);

COMMENT ON TABLE api_keys IS
    'Machine credentials issued by a tenant owner. Only a hash is stored: the plaintext key exists once, in the response to its own creation, and cannot be recovered afterwards.';
COMMENT ON COLUMN api_keys.revoked_at IS
    'When the key stopped working. The row is kept rather than deleted so an audit can still show that a credential existed and when it was withdrawn.';
COMMENT ON COLUMN api_keys.key_prefix IS
    'First characters of the key, shown so an owner can tell two keys apart. Not a secret and not sufficient to authenticate.';

DO $$
DECLARE
    runtime_role text;
BEGIN
    FOREACH runtime_role IN ARRAY ARRAY['gds_runtime', 'gds']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime_role) THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO %I', runtime_role);
        END IF;
    END LOOP;
END $$;

-- Managing people and credentials is an owner function. Only roles already holding users:manage get
-- the tenant-provisioning grant, so no role gains reach over other tenants by this migration.
UPDATE roles
SET permissions = permissions || '["tenants:manage"]'::jsonb
WHERE permissions @> '["users:manage"]'::jsonb
  AND NOT permissions @> '["tenants:manage"]'::jsonb
  AND name = 'platform_owner';
