-- Item 34: the secrets posture route (GET /secrets/posture) reports which credentials are configured, which API keys
-- this tenant has issued and what TLS certificate each hostname actually serves. That is a reconnaissance map, so it is
-- not readable by every account that can read findings: an analyst holds findings:read, and this route is gated on its
-- own permission instead.
--
-- No table is created. Certificates are read from a live handshake, credentials from the API process environment
-- (names only) and API keys from the existing api_keys table. The only new object is the permission.
UPDATE roles
SET permissions = permissions || '["secrets:read"]'::jsonb
WHERE name = 'platform_owner'
  AND NOT (permissions @> '["secrets:read"]'::jsonb);

-- admin already holds "*", which satisfies every gate, so it needs no explicit grant. analyst is deliberately left
-- without this permission.
