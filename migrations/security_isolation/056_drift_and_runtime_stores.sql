-- Item 9 (migration 056): configuration drift and runtime posture had no store at all.
--
-- Measured 22 Nov 2026: the drift page called ConfigurationDrift, ConfigurationBaseline, ConfigurationCorrection and
-- DriftAlertConfig; the runtime page called RuntimeThreat at 16 call sites. No table existed for any of them, and the
-- only route in this area was POST /actions/cloud/{account_id}/drift-remediate. A page cannot report drift it never
-- measured, so the store comes first and a collector fills it from real host settings.

CREATE TABLE IF NOT EXISTS config_baselines (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name              text NOT NULL,
    target            text NOT NULL,
    settings          jsonb NOT NULL,
    settings_checksum text NOT NULL,
    is_approved       boolean NOT NULL DEFAULT false,
    approved_by       text,
    approved_at       timestamptz,
    captured_at       timestamptz NOT NULL DEFAULT now(),
    created_at        timestamptz NOT NULL DEFAULT now()
);

-- One approved reference per target; superseded baselines are kept for history.
CREATE UNIQUE INDEX IF NOT EXISTS ux_config_baselines_approved
    ON config_baselines (tenant_id, target) WHERE is_approved;

CREATE TABLE IF NOT EXISTS configuration_drift (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    baseline_id      uuid REFERENCES config_baselines(id) ON DELETE SET NULL,
    asset            text NOT NULL,
    setting_key      text NOT NULL,
    drift_type       text NOT NULL DEFAULT 'changed',
    severity         text NOT NULL DEFAULT 'low',
    expected_value   text,
    actual_value     text,
    status           text NOT NULL DEFAULT 'detected',
    auto_correctable boolean NOT NULL DEFAULT false,
    risk_score       integer,
    dedup_key        text NOT NULL,
    detected_at      timestamptz NOT NULL DEFAULT now(),
    corrected_at     timestamptz
);

-- A re-scan of an unchanged drift updates the open row instead of stacking duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS ux_configuration_drift_open
    ON configuration_drift (tenant_id, dedup_key) WHERE status = 'detected';

CREATE TABLE IF NOT EXISTS runtime_posture (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    host               text NOT NULL,
    container_id       text NOT NULL,
    container_name     text NOT NULL,
    image              text,
    image_digest       text,
    state              text,
    privileged         boolean NOT NULL DEFAULT false,
    host_network       boolean NOT NULL DEFAULT false,
    host_pid           boolean NOT NULL DEFAULT false,
    host_ipc           boolean NOT NULL DEFAULT false,
    read_only_rootfs   boolean,
    user_account       text,
    caps_added         text[] NOT NULL DEFAULT '{}',
    mounts_count       integer,
    posture_violations jsonb NOT NULL DEFAULT '[]'::jsonb,
    risk_score         integer NOT NULL DEFAULT 0,
    severity           text NOT NULL DEFAULT 'low',
    mitre_technique    text,
    collected_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, host, container_id)
);

CREATE TABLE IF NOT EXISTS drift_alert_configs (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    is_enabled       boolean NOT NULL DEFAULT true,
    asset_types      text[] NOT NULL DEFAULT '{}',
    severities       text[] NOT NULL DEFAULT '{critical}',
    auto_fix_enabled boolean NOT NULL DEFAULT false,
    updated_by       text,
    updated_at       timestamptz NOT NULL DEFAULT now(),
    created_at       timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['config_baselines','configuration_drift','runtime_posture','drift_alert_configs'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t) THEN
      EXECUTE format(
        'CREATE POLICY gds_%s_tenant ON %I USING (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid) WITH CHECK (tenant_id = (NULLIF(current_setting(''gds.tenant_id'', true), ''''))::uuid)',
        t, t);
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS ix_configuration_drift_status ON configuration_drift (tenant_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS ix_runtime_posture_severity ON runtime_posture (tenant_id, severity, risk_score DESC);

COMMENT ON COLUMN configuration_drift.expected_value IS 'Value measured into the approved baseline.';
COMMENT ON COLUMN configuration_drift.actual_value IS 'Value measured by the scan that raised this row.';
COMMENT ON COLUMN runtime_posture.posture_violations IS 'Named violations found in docker inspect HostConfig, not a score.';
