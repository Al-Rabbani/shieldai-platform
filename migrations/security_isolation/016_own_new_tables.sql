-- 016_own_new_tables.sql
-- 015 created remediation_plans, pentest_authorizations and pentest_agreements, but it created them
-- while connected as postgres. Every other table in this schema is owned by the application role
-- `gds`, which is how it holds its privileges (information_schema.role_table_grants shows no explicit
-- grants for gds - it acts as owner). The consequence was measured immediately: as role gds,
-- `select count(*) from remediation_plans` returned "permission denied for table remediation_plans",
-- so the routes would have moved from UndefinedTableError to ProgrammingError rather than working.
-- Giving ownership to gds matches the rest of the schema exactly; no explicit grants are needed and
-- FORCE RLS still applies to the owner, so ownership does not widen access across tenants.
BEGIN;

ALTER TABLE remediation_plans      OWNER TO gds;
ALTER TABLE pentest_authorizations OWNER TO gds;
ALTER TABLE pentest_agreements     OWNER TO gds;

COMMIT;
