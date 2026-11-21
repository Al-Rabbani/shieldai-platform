-- Linear ticketing, and the rule that a ticket exists only when Linear says so.
--
-- Ported from the builder app's gdsLinearSync, one of nine functions there that made a real outbound
-- call: it posted GraphQL to api.linear.app with a timeout and kept a link row per finding. Three
-- things change in the move to this platform.
--
-- It links to security_findings, the authoritative register (1002 rows, the table the Findings page
-- reads), not the stale legacy findings table and not a Base44 entity.
--
-- The rows are tenant-scoped and forced under RLS like every other tenant table, so one customer's
-- ticket cannot be read or written from another tenant.
--
-- And an identifier is only ever stored after Linear returned it. The Jira function in the same app
-- generated keys with Math.random(), set success = true, and wrote the invented key into the finding,
-- so a vulnerability that nothing had filed read as tracked. A NOT NULL identifier and a unique index
-- per finding are here so that class of defect cannot be expressed in this schema.

CREATE TABLE IF NOT EXISTS linear_issue_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    finding_id integer NOT NULL,
    linear_issue_id text NOT NULL,
    identifier text NOT NULL,
    url text,
    team_id text,
    team_key text,
    state_name text,
    state_type text,
    app_status text,
    created_at timestamptz NOT NULL DEFAULT now(),
    synced_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT linear_issue_links_identifier_not_blank CHECK (btrim(identifier) <> '')
);

-- One ticket per finding per tenant. The builder enforced this in application code, which loses to a
-- retry or a race; a unique index means two tickets for one vulnerability cannot exist.
CREATE UNIQUE INDEX IF NOT EXISTS ux_linear_issue_links_finding
    ON linear_issue_links (tenant_id, finding_id);

CREATE INDEX IF NOT EXISTS ix_linear_issue_links_sync
    ON linear_issue_links (tenant_id, synced_at DESC);

ALTER TABLE linear_issue_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_issue_links FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS linear_issue_links_tenant ON linear_issue_links;
CREATE POLICY linear_issue_links_tenant ON linear_issue_links
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);

COMMENT ON TABLE linear_issue_links IS
    'Links a security_findings row to a Linear issue. A row exists only after Linear returned an identifier, so an absent row means "no ticket" and never "probably ticketed".';
COMMENT ON COLUMN linear_issue_links.app_status IS
    'The finding status this link last pushed or observed. A sync compares against it to tell whether anything actually changed, instead of rewriting every row every run.';
COMMENT ON COLUMN linear_issue_links.synced_at IS
    'When Linear was last asked about this issue. Not when the row was written: a row that has never been re-read is stale, not current.';

-- The API connects as a runtime role rather than the owner, so the grants have to be explicit. Both
-- role names are attempted because the platform has carried two over its life.
DO $$
DECLARE
    runtime_role text;
BEGIN
    FOREACH runtime_role IN ARRAY ARRAY['gds_runtime', 'gds']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime_role) THEN
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON linear_issue_links TO %I', runtime_role);
        END IF;
    END LOOP;
END $$;

-- Tickets are a write, not an observation: only the roles accountable for remediation get it. Auditor
-- and executive_viewer stay read-only on purpose.
UPDATE roles
SET permissions = permissions || '["integrations:write"]'::jsonb
WHERE permissions @> '["findings:read"]'::jsonb
  AND NOT permissions @> '["integrations:write"]'::jsonb
  AND name IN ('admin', 'platform_owner', 'analyst');
