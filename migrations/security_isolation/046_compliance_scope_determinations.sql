-- 046: a scope determination is a record, not an opinion in a chat log
--
-- PCI DSS could not be judged because nobody had ever written down whether any system here is in scope. That is a
-- determination, not a measurement, and it needs to live somewhere a future reader can inspect: what was decided,
-- on what evidence, by whom, when it expires, and exactly which requirements the decision makes applicable.
--
-- The table is deliberately platform governance data, like compliance_frameworks and compliance_controls, so it
-- carries no tenant_id and no row-level security. Tenant isolation counts tables with a tenant_id column, and adding
-- a nullable one here would have added a table to that count without protecting anything.
--
-- Two constraints do the enforcing. A partial unique index allows only one approved determination per framework, so
-- two contradicting scopes cannot both govern the same standard. A check constraint keeps the status vocabulary to
-- three words so "approved" cannot quietly become "approved_pending_review".

BEGIN;

CREATE TABLE IF NOT EXISTS compliance_scope_determinations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_key       text NOT NULL,
    determination_ref   text NOT NULL,
    status              text NOT NULL DEFAULT 'draft',

    -- The finding itself: is there a cardholder data environment on infrastructure we control?
    cde_defined         boolean NOT NULL,
    cde_summary         text NOT NULL,
    chd_stored          boolean NOT NULL,
    chd_processed       boolean NOT NULL,
    chd_transmitted     boolean NOT NULL,
    saq_track           text,

    -- What the decision covers, and what it removes from scope.
    systems_in_scope        jsonb NOT NULL DEFAULT '[]'::jsonb,
    systems_out_of_scope    jsonb NOT NULL DEFAULT '[]'::jsonb,
    tpsp                    jsonb NOT NULL DEFAULT '[]'::jsonb,
    applicable_refs         jsonb NOT NULL DEFAULT '[]'::jsonb,
    not_applicable_refs     jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- Why the decision is what it is: each entry states the method and the result that was measured.
    evidence            jsonb NOT NULL DEFAULT '[]'::jsonb,
    caveats             jsonb NOT NULL DEFAULT '[]'::jsonb,

    determined_by       text NOT NULL,
    determined_at       timestamptz NOT NULL DEFAULT now(),
    approved_by         text,
    approved_at         timestamptz,
    approval_basis      text,
    review_due_at       timestamptz,
    superseded_by       uuid,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT compliance_scope_determinations_ref_uniq UNIQUE (determination_ref),
    CONSTRAINT compliance_scope_determinations_status_chk CHECK (status IN ('draft', 'approved', 'superseded')),
    -- A determination cannot be approved without saying who approved it and when.
    CONSTRAINT compliance_scope_determinations_approval_chk
        CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
    -- Disjointness of applicable_refs and not_applicable_refs cannot be a CHECK here: PostgreSQL forbids
    -- subqueries in a CHECK constraint and the jsonb containment operators compare keys, not element overlap.
    -- It is enforced instead by the writer (scripts/ops/scope_determinations.py asserts it and refuses to write)
    -- and by tests/test_pci_scope_determination.py, which fails if a ref appears in both lists.
);

-- One approved scope per framework. A second approved row would leave two answers to "are we in scope".
CREATE UNIQUE INDEX IF NOT EXISTS compliance_scope_determinations_one_approved
    ON compliance_scope_determinations (framework_key)
    WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS compliance_scope_determinations_framework_idx
    ON compliance_scope_determinations (framework_key, status);

GRANT SELECT, INSERT, UPDATE ON compliance_scope_determinations TO gds;
GRANT SELECT, INSERT, UPDATE ON compliance_scope_determinations TO gds_runtime;

COMMIT;
