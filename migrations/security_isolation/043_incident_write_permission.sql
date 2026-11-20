-- incidents:write - the permission that lets an incident be closed.
--
-- GET /incidents was the only route on the resource, so an incident stayed "open" for the life of the platform no
-- matter what happened to the findings behind it. Two incidents created on 19 Nov 2026 for the container CVEs are
-- still open while every one of their 20 linked findings is resolved (6) or accepted as risk (14).
--
-- The route now exists and requires incidents:write. Roles are JSONB arrays seeded per tenant, so the permission
-- has to be appended to the roles that already exist; a seed change alone only reaches tenants created afterwards.
-- Appended to the three roles that already hold incidents:read and are accountable for incident work. Auditor and
-- executive_viewer keep read-only access on purpose: closing an incident is not an observation.

UPDATE roles
SET permissions = permissions || '["incidents:write"]'::jsonb
WHERE permissions @> '["incidents:read"]'::jsonb
  AND NOT permissions @> '["incidents:write"]'::jsonb
  AND name IN ('admin', 'platform_owner', 'analyst');

COMMENT ON TABLE incident_findings IS
    'Links incidents to findings. Two registers exist: finding_id (uuid, findings) and security_finding_id (integer, security_findings). Every real row uses security_finding_id, which the ORM did not map until 20 Nov 2026, so counting finding_id reported 0 links.';
