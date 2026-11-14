-- 012_force_rls_consumer_tables.sql
-- Force RLS on the remaining consumer-bound tables that were still owner-bypassable.
--
-- Seven of these are EMPTY at the time of writing (evidence, incidents, engagements,
-- mission_messages, workflow_runs, workspaces, findings), so nothing can leak from them today.
-- Forcing them now is deliberate: the point is that they can never start accumulating another
-- tenant's rows later, and their writers are request-scoped, so the tenant is bound.
--
-- DELIBERATELY EXCLUDED: missions and mission_tasks. They hold live rows (4 and 9) and are
-- written by the Temporal activity runtime, whose tenant context has not yet been proven with
-- a real end-to-end mission run. Forcing them before that proof would risk the same silent
-- zero-row failure this programme is meant to eliminate. They stay as the unforced tenant
-- anchor until the activity path is verified.
BEGIN;

ALTER TABLE evidence         FORCE ROW LEVEL SECURITY;
ALTER TABLE incidents        FORCE ROW LEVEL SECURITY;
ALTER TABLE engagements      FORCE ROW LEVEL SECURITY;
ALTER TABLE mission_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs    FORCE ROW LEVEL SECURITY;
ALTER TABLE workspaces       FORCE ROW LEVEL SECURITY;
ALTER TABLE findings         FORCE ROW LEVEL SECURITY;

COMMIT;
