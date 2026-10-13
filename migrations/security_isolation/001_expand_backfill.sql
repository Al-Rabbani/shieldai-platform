-- DRAFT: operator-reviewed expand/backfill, NOT an automatic deploy migration.
-- Required psql variables: reviewed_tenant_id, reviewed_findings_count, reviewed_missions_count,
-- ownership_review_reference. Pause writers and re-review ownership beforehand.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE security_findings, mission_results IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE gds_backfill_review (
    tenant_id uuid NOT NULL,
    finding_count bigint NOT NULL,
    mission_count bigint NOT NULL,
    review_reference text NOT NULL CHECK (length(review_reference) > 0)
) ON COMMIT DROP;
INSERT INTO gds_backfill_review VALUES
    (:'reviewed_tenant_id'::uuid, :'reviewed_findings_count'::bigint, :'reviewed_missions_count'::bigint,
     :'ownership_review_reference');

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tenants
        WHERE id = (SELECT tenant_id FROM gds_backfill_review)) THEN
        RAISE EXCEPTION 'Reviewed platform tenant not found';
    END IF;
    IF (SELECT count(*) FROM security_findings) != (SELECT finding_count FROM gds_backfill_review)
       OR (SELECT count(*) FROM mission_results) != (SELECT mission_count FROM gds_backfill_review) THEN
        RAISE EXCEPTION 'Reviewed row counts changed; repeat ownership review';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE oid IN
        ('security_findings'::regclass, 'mission_results'::regclass)
        AND (relrowsecurity OR relforcerowsecurity)) THEN
        RAISE EXCEPTION 'RLS state changed; reconcile before migration';
    END IF;
END $$;

-- Existing repositories require a real local working_directory. Remote security
-- identity is registered separately; never populate fake worktree paths.
ALTER TABLE repositories ADD CONSTRAINT uq_repositories_id_tenant UNIQUE (id, tenant_id);
CREATE TABLE security_repository_bindings (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    provider text NOT NULL CHECK (provider = 'github'),
    provider_repository_id bigint NOT NULL CHECK (provider_repository_id > 0),
    provider_full_name text NOT NULL,
    managed_repository_id uuid,
    verified_at timestamptz NOT NULL,
    verification_reference text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    UNIQUE (provider, provider_repository_id),
    UNIQUE (id, tenant_id),
    FOREIGN KEY (managed_repository_id, tenant_id)
        REFERENCES repositories(id, tenant_id)
);
CREATE UNIQUE INDEX uq_security_repository_binding_name
    ON security_repository_bindings(provider, lower(provider_full_name));

ALTER TABLE security_findings ADD COLUMN tenant_id uuid;
ALTER TABLE security_findings ADD COLUMN repository_binding_id uuid;
ALTER TABLE mission_results ADD COLUMN tenant_id uuid;
ALTER TABLE mission_results ADD COLUMN repository_binding_id uuid;

-- All reviewed historical rows are platform-owned. Do NOT assign every row to
-- shieldai-platform: AWS IAM and network findings have no repository binding.
UPDATE security_findings SET tenant_id = (SELECT tenant_id FROM gds_backfill_review);
UPDATE mission_results SET tenant_id = (SELECT tenant_id FROM gds_backfill_review);

ALTER TABLE security_findings ADD CONSTRAINT fk_security_findings_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) NOT VALID;
ALTER TABLE mission_results ADD CONSTRAINT fk_mission_results_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) NOT VALID;
ALTER TABLE security_findings ADD CONSTRAINT fk_security_findings_repo_tenant
    FOREIGN KEY (repository_binding_id, tenant_id)
    REFERENCES security_repository_bindings(id, tenant_id) NOT VALID;
ALTER TABLE mission_results ADD CONSTRAINT fk_mission_results_repo_tenant
    FOREIGN KEY (repository_binding_id, tenant_id)
    REFERENCES security_repository_bindings(id, tenant_id) NOT VALID;
ALTER TABLE security_findings VALIDATE CONSTRAINT fk_security_findings_tenant;
ALTER TABLE mission_results VALIDATE CONSTRAINT fk_mission_results_tenant;
ALTER TABLE security_findings VALIDATE CONSTRAINT fk_security_findings_repo_tenant;
ALTER TABLE mission_results VALIDATE CONSTRAINT fk_mission_results_repo_tenant;

-- TEMPORARY single-tenant compatibility only. No customer tenant onboarding
-- until defaults are removed and phase 2 acceptance tests pass.
DO $$
DECLARE reviewed_tenant uuid;
BEGIN
    SELECT tenant_id INTO reviewed_tenant FROM gds_backfill_review;
    EXECUTE format('ALTER TABLE security_findings ALTER COLUMN tenant_id SET DEFAULT %L::uuid', reviewed_tenant);
    EXECUTE format('ALTER TABLE mission_results ALTER COLUMN tenant_id SET DEFAULT %L::uuid', reviewed_tenant);
END $$;

CREATE INDEX ix_security_findings_tenant_repo_status
    ON security_findings(tenant_id, repository_binding_id, status);
CREATE INDEX ix_mission_results_tenant_created
    ON mission_results(tenant_id, created_at);

CREATE TABLE security_isolation_migration_audit (
    migration_name text PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    findings_backfilled bigint NOT NULL,
    missions_backfilled bigint NOT NULL,
    ownership_review_reference text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO security_isolation_migration_audit
    (migration_name, tenant_id, findings_backfilled, missions_backfilled, ownership_review_reference)
SELECT '001_expand_backfill', (SELECT tenant_id FROM gds_backfill_review),
    finding_count, mission_count, review_reference FROM gds_backfill_review;
COMMIT;
