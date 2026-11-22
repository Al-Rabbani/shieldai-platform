-- Item 10 (migration 058): the AI security pages had no store, and nothing recorded the platform's own AI activity.
--
-- Measured 22 Nov 2026: AISecurityPage and AttackVectorSimulatorPage call PromptAttack, JailbreakAttempt, Hallucination,
-- AIModel and AIPolicy across 8 sites. No table matched ai/prompt/model/llm/agent, and no column anywhere recorded a
-- model name or token count, even though the platform runs an OpenAI reasoning loop (gpt-4.1) behind five /reasoning
-- routes. These three tables record what actually happens rather than what a page wishes happened.

CREATE TABLE IF NOT EXISTS ai_models (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            text NOT NULL,
    provider        text NOT NULL,
    model_family    text,
    deployment_type text NOT NULL DEFAULT 'external_api',
    configured_in   text NOT NULL,
    is_active       boolean NOT NULL DEFAULT true,
    approved        boolean NOT NULL DEFAULT false,
    approved_by     text,
    approved_at     timestamptz,
    risk_class      text NOT NULL DEFAULT 'unclassified',
    first_seen      timestamptz NOT NULL DEFAULT now(),
    last_seen       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name, configured_in)
);

-- One row per reasoning invocation the platform actually ran, derived from the mission it created.
CREATE TABLE IF NOT EXISTS ai_invocations (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mission_id       uuid,
    model            text,
    invocation_type  text NOT NULL DEFAULT 'reasoning_mission',
    status           text NOT NULL,
    risk_class       text,
    objective_hash   text NOT NULL,
    duration_seconds integer,
    started_at       timestamptz,
    completed_at     timestamptz,
    recorded_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, mission_id)
);

-- A real detection, written when a guarded AI route receives text that matches a named injection rule.
CREATE TABLE IF NOT EXISTS prompt_attacks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attack_type     text NOT NULL,
    severity        text NOT NULL,
    target_route    text NOT NULL,
    matched_rules   text[] NOT NULL DEFAULT '{}',
    payload_hash    text NOT NULL,
    payload_preview text,
    blocked         boolean NOT NULL DEFAULT false,
    actor_id        text,
    source_ip       text,
    detected_at     timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ai_models','ai_invocations','prompt_attacks'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t) THEN
      EXECUTE format(
        'CREATE POLICY gds_%s_tenant ON %I USING (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid) WITH CHECK (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid)',
        t, t);
    END IF;
  END LOOP;
END $$;

-- Grants are stated here rather than assumed: migration 056 created tables nothing could read until 057 added them.
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_models, ai_invocations, prompt_attacks TO gds;
GRANT SELECT ON ai_models, ai_invocations, prompt_attacks TO gds_runtime;

CREATE INDEX IF NOT EXISTS ix_ai_invocations_recent ON ai_invocations (tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ix_prompt_attacks_recent ON prompt_attacks (tenant_id, detected_at DESC);

COMMENT ON COLUMN ai_invocations.objective_hash IS
    'SHA-256 of the mission objective. The objective text itself is not duplicated into this ledger.';
COMMENT ON COLUMN prompt_attacks.payload_preview IS
    'First 120 characters of the refused text, kept for triage. The full payload is never stored.';
