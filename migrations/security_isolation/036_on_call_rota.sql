-- On-call rota: who is expected to answer, and when.
--
-- The paging ladder escalates on a 5/15/60 minute schedule, but it escalates to a Slack channel and the
-- notification's owner. Nobody is named as the person expected to answer outside business hours, so an
-- unacknowledged page has no defined human owner. This table is that owner, expressed as shifts with explicit
-- start and end instants rather than a weekly pattern, so "who is on call right now" is a single indexed query
-- and a handover is just two rows.
--
-- FORCE RLS with a tenant policy, matching every other tenant table: an unbound read must return nothing rather
-- than the roster of every tenant.

CREATE TABLE IF NOT EXISTS on_call_shifts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    person_name text NOT NULL,
    person_email text NOT NULL,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    notes text,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT on_call_shifts_window_valid CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS on_call_shifts_tenant_window
    ON on_call_shifts (tenant_id, starts_at, ends_at);

ALTER TABLE on_call_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_call_shifts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS on_call_shifts_tenant_isolation ON on_call_shifts;
CREATE POLICY on_call_shifts_tenant_isolation ON on_call_shifts
    USING (tenant_id = current_setting('gds.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('gds.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON on_call_shifts TO gds;
GRANT SELECT, INSERT, UPDATE, DELETE ON on_call_shifts TO gds_runtime;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('036', now())
ON CONFLICT (version) DO NOTHING;
