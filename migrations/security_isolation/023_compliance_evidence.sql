-- 023 — a real control catalog, and evidence attached to every verdict.
--
-- 19 Nov 2026 (P9 / B39, B40). Compliance was 18 hand-typed rows across iso27001/nist_csf/pci_dss/soc2,
-- with four of them claiming "pass" and no evidence linked to any row. CIS, NIST AI RMF, HIPAA, DORA and
-- SOC 2 Type II had no rows at all, so their 0% was an absence of data rather than a measured result.
-- Two rows also share control ref soc2/CC6.6 with opposite verdicts.
--
-- This adds the missing pieces: what each framework actually contains, which controls have a
-- machine-checkable criterion, and the observed facts behind every automated verdict.

CREATE TABLE IF NOT EXISTS compliance_frameworks (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_key          text UNIQUE NOT NULL,
    name                   text NOT NULL,
    version                text,
    official_control_count integer,
    source                 text,
    created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_controls (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_key  text NOT NULL REFERENCES compliance_frameworks(framework_key),
    control_ref    text NOT NULL,
    title          text NOT NULL,
    category       text,
    check_key      text,        -- NULL means no automated check exists yet: verdict is not_tested
    severity       text NOT NULL DEFAULT 'medium',
    mapping_basis  text,        -- why this check is accepted as evidence for this control
    UNIQUE (framework_key, control_ref)
);

-- Evidence columns on the results table. A verdict without these is an opinion, not an assessment.
ALTER TABLE compliance_assessments
    ADD COLUMN IF NOT EXISTS check_key      text,
    ADD COLUMN IF NOT EXISTS verdict_source text,      -- automated | manual
    ADD COLUMN IF NOT EXISTS collector      text,
    ADD COLUMN IF NOT EXISTS observed       jsonb,     -- the facts the verdict was derived from
    ADD COLUMN IF NOT EXISTS evidence_sha   text,      -- sha256 of observed, so a verdict is reproducible
    ADD COLUMN IF NOT EXISTS assessed_at    timestamptz;

-- Existing rows were typed by hand and carry no evidence. Label them as such rather than letting them
-- read as measured findings.
UPDATE compliance_assessments SET verdict_source = 'manual' WHERE verdict_source IS NULL;

CREATE INDEX IF NOT EXISTS ix_compliance_assessments_fw ON compliance_assessments (framework, control_id);
CREATE INDEX IF NOT EXISTS ix_compliance_controls_check ON compliance_controls (check_key);
