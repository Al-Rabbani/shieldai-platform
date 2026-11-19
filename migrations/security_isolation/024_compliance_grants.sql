-- 024 — grant the application role access to the compliance catalog.
--
-- 19 Nov 2026 (P9). Migration 023 created compliance_frameworks and compliance_controls as the
-- superuser and granted nothing, so /compliance/frameworks returned 500 "permission denied for table
-- compliance_frameworks" the moment it was called. The tables were readable only by me, which is
-- exactly the kind of thing an endpoint test catches and a migration does not.
--
-- Read plus write for the application role: the assessor runs as the application and upserts the
-- catalog on every run. No DELETE is granted, so the catalog cannot be emptied from the app.
GRANT SELECT, INSERT, UPDATE ON compliance_frameworks TO gds;
GRANT SELECT, INSERT, UPDATE ON compliance_frameworks TO gds_runtime;
GRANT SELECT, INSERT, UPDATE ON compliance_controls TO gds;
GRANT SELECT, INSERT, UPDATE ON compliance_controls TO gds_runtime;
