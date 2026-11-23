-- Item 40: the Co-Pilot's memory. A standing preference or instruction the operator stated, held per tenant.
CREATE TABLE IF NOT EXISTS copilot_memory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('preference', 'instruction', 'fact')),
    key text NOT NULL,
    value text NOT NULL,
    source text NOT NULL DEFAULT 'operator_stated' CHECK (source IN ('operator_stated', 'observed')),
    confidence text NOT NULL DEFAULT 'stated' CHECK (confidence IN ('stated', 'inferred')),
    pinned boolean NOT NULL DEFAULT false,
    use_count integer NOT NULL DEFAULT 0,
    last_used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (tenant_id, kind, key)
);

CREATE INDEX IF NOT EXISTS copilot_memory_tenant_idx ON copilot_memory (tenant_id, kind);

ALTER TABLE copilot_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_memory FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_memory_tenant_isolation ON copilot_memory;
CREATE POLICY copilot_memory_tenant_isolation ON copilot_memory
    USING (tenant_id = current_setting('gds.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('gds.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON copilot_memory TO gds;
GRANT SELECT ON copilot_memory TO gds_runtime;
