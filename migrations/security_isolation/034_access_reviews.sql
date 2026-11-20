-- Periodic access review: standing access is re-justified on a cadence, not granted once and forgotten.
--
-- The compliance control has reported access_review as FAIL with the reason "no access review has ever been
-- recorded and none is scheduled". Deactivation existed; periodic review did not. These tables are the record,
-- and they snapshot the facts a reviewer needs (role, tenant, last authenticated session) at generation time so
-- the decision is not made against data that has since drifted.
CREATE TABLE IF NOT EXISTS access_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    period_days integer NOT NULL DEFAULT 90,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','abandoned')),
    total_items integer NOT NULL DEFAULT 0,
    decided_items integer NOT NULL DEFAULT 0,
    revoked_items integer NOT NULL DEFAULT 0,
    generated_by uuid REFERENCES users(id) ON DELETE SET NULL,
    generated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS access_review_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL REFERENCES access_reviews(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email text NOT NULL,
    role_name text,
    last_session_at timestamptz,
    days_since_last_session integer,
    decision text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','retain','revoke')),
    decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
    decided_at timestamptz,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_review_items_review ON access_review_items (review_id);

ALTER TABLE access_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_reviews FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_reviews_tenant ON access_reviews;
CREATE POLICY access_reviews_tenant ON access_reviews
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);

ALTER TABLE access_review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_review_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_review_items_tenant ON access_review_items;
CREATE POLICY access_review_items_tenant ON access_review_items
    USING (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('gds.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON access_reviews, access_review_items TO gds;
