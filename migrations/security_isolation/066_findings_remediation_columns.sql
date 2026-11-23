-- Item 27 (migration 066): the template "Apply" recorded remediation nowhere.
--
-- Measured 23 Nov 2026: RemediationTemplatesPage.applyTemplate calls
-- TriagedFinding.bulkUpdate([{id, status: "in_remediation", remediation_notes, remediation_started_at}]), and
-- TriageQueuePage does the same for a bulk selection. There is no PATCH /findings/bulk and no PATCH /findings/{id} at
-- all, so the whole action failed; and even if it had been served, security_findings has no remediation_notes or
-- remediation_started_at column, and its status vocabulary holds only open (849), resolved (139) and accepted_risk (14)
-- - "in_remediation" is a value nothing else in the platform understands, so writing it would have made every open
-- count, SLA band and executive figure quietly wrong.
--
-- These columns record that remediation was started, by which template, with what notes. "In remediation" is then a
-- fact derived from (status = 'open' AND remediation_started_at IS NOT NULL) rather than a new status nobody counts.

ALTER TABLE security_findings
    ADD COLUMN IF NOT EXISTS remediation_notes        text,
    ADD COLUMN IF NOT EXISTS remediation_started_at   timestamptz,
    ADD COLUMN IF NOT EXISTS remediation_template_id  uuid REFERENCES remediation_templates(id) ON DELETE SET NULL;

-- The triage page lists findings that are already in remediation, so this predicate is worth an index.
CREATE INDEX IF NOT EXISTS security_findings_remediation_idx
    ON security_findings (tenant_id, remediation_started_at)
    WHERE remediation_started_at IS NOT NULL;

-- No new permission: starting remediation is the same class of act as authoring the fix (fixes:write, item 21).
