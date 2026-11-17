-- 014_incident_findings_link.sql
-- Let incidents reference the finding store the platform actually writes to.
--
-- incident_findings had PRIMARY KEY (incident_id, finding_id) with finding_id uuid NOT NULL, which
-- matches the legacy `findings` table and cannot hold a security_findings id (integer). Every live
-- finding lives in security_findings, so the join table was structurally incapable of linking a real
-- finding to a real incident, and create_incident_from_findings had nothing honest it could write.
--
-- The table was empty when this ran (0 rows, verified), so the primary key is replaced with a
-- surrogate id, finding_id becomes nullable for the legacy uuid links, and security_finding_id is
-- added with a real foreign key.
BEGIN;

ALTER TABLE incident_findings DROP CONSTRAINT incident_findings_pkey;

ALTER TABLE incident_findings
    ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE incident_findings
    ADD CONSTRAINT incident_findings_pkey PRIMARY KEY (id);

ALTER TABLE incident_findings ALTER COLUMN finding_id DROP NOT NULL;

ALTER TABLE incident_findings
    ADD COLUMN IF NOT EXISTS security_finding_id integer;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'incident_findings_security_finding_fk'
    ) THEN
        ALTER TABLE incident_findings
            ADD CONSTRAINT incident_findings_security_finding_fk
            FOREIGN KEY (security_finding_id) REFERENCES security_findings(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_incident_findings_pair
    ON incident_findings (incident_id, security_finding_id)
    WHERE security_finding_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_incident_findings_security_finding
    ON incident_findings (security_finding_id);

COMMIT;
