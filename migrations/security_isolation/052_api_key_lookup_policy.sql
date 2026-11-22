-- 052: an API key must be findable before a tenant is known.
--
-- Step 12 measured that api_keys was read by nothing but the module that issues keys, so a key could
-- be created and never used. Making it authenticate needs one thing RLS currently forbids: the lookup
-- happens before any tenant is bound, because the tenant is what the key row supplies.
--
-- The existing api_keys_tenant policy requires gds.tenant_id, which is not yet set at that moment. This
-- adds a second permissive policy (policies are OR'd) that exposes exactly the row whose hash matches a
-- hash the caller has already computed and bound. It grants no broader read: a request that binds no
-- hash, or a different one, still sees nothing.
--
-- The same pattern is already used for the other pre-tenant lookups on this platform:
-- gds.login_email for the login path and gds.principal_id for the token path.

DROP POLICY IF EXISTS api_keys_hash_lookup ON api_keys;

CREATE POLICY api_keys_hash_lookup ON api_keys
    FOR SELECT
    USING (key_hash = nullif(current_setting('gds.api_key_hash', true), ''));

COMMENT ON POLICY api_keys_hash_lookup ON api_keys IS
    'Exposes one api_keys row to a caller that has already computed and bound its hash, so a key can be resolved before its tenant is known. Binds no hash, sees no rows.';
