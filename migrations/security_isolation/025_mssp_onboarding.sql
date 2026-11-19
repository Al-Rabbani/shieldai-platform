-- 025 — MSSP tenant onboarding state and a record of how each tenant was onboarded.
--
-- 19 Nov 2026 (P8 / B38). A tenant could be created (POST /auth/register) but there was no notion of
-- having been onboarded: no plan, no provisioned services, no SLA tier, no evidence that isolation was
-- actually verified for that tenant rather than assumed from the platform-wide RLS policy. The
-- commercial surface (/mssp/customers) had nothing to read.
--
-- services_provisioned records what was CONFIGURED for the tenant. It deliberately does not claim
-- delivery: whether a tenant is actually being monitored is answered from their own telemetry, and the
-- health endpoint reports not_assessed when there is none.
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS onboarding_status     text DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS onboarded_at          timestamptz,
    ADD COLUMN IF NOT EXISTS services_provisioned  jsonb,
    ADD COLUMN IF NOT EXISTS sla_tier              text;

CREATE TABLE IF NOT EXISTS mssp_onboarding_records (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL REFERENCES tenants(id),
    plan_tier          text,
    sla_tier           text,
    services_provisioned jsonb,
    isolation_verified boolean NOT NULL DEFAULT false,
    isolation_evidence jsonb,
    baseline           jsonb,
    performed_by       text,
    performed_at       timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON mssp_onboarding_records TO gds;
GRANT SELECT, INSERT ON mssp_onboarding_records TO gds_runtime;
CREATE INDEX IF NOT EXISTS ix_mssp_onboarding_tenant ON mssp_onboarding_records (tenant_id, performed_at DESC);
