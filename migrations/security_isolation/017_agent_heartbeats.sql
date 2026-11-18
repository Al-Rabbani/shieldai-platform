-- 017: authenticated worker heartbeats.
-- Before this migration the platform had no heartbeat table at all, so every "online" label in the
-- Base44 Agent entity was unbacked: 25 records, five of them created 18 Nov 2026 duplicating the
-- 9 Jun 2026 set, all labelled online against June heartbeats.
CREATE TABLE IF NOT EXISTS agent_heartbeats (
    id            uuid PRIMARY KEY,
    tenant_id     uuid NOT NULL REFERENCES tenants(id),
    agent_id      text NOT NULL,
    worker_id     text NOT NULL,
    release_sha   text NOT NULL,
    observed_at   timestamptz NOT NULL,
    received_at   timestamptz NOT NULL DEFAULT now(),
    health_signal text NOT NULL,
    task_ref      text,
    nonce         text NOT NULL,
    payload_digest text NOT NULL,
    CONSTRAINT agent_heartbeats_agent_nonce_uniq UNIQUE (agent_id, nonce)
);

CREATE INDEX IF NOT EXISTS agent_heartbeats_agent_observed_idx
    ON agent_heartbeats (agent_id, observed_at DESC);

ALTER TABLE agent_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_heartbeats_tenant ON agent_heartbeats;
CREATE POLICY agent_heartbeats_tenant ON agent_heartbeats
    USING (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('gds.tenant_id', true), '')::uuid);

ALTER TABLE agent_heartbeats FORCE ROW LEVEL SECURITY;
