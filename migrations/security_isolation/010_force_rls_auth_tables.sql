-- 010_force_rls_auth_tables.sql
-- R2.1: enforce tenant isolation on the tables that hold the auth data.
--
-- These are the hardest tables in the programme because authentication must read them BEFORE
-- a tenant is known: get_current_user loads the user row to LEARN the tenant. Forcing them
-- without a bootstrap path locks every user out, so three narrow doors are opened, each set by
-- the caller and each exposing the minimum:
--
--   gds.principal_id  the token subject. get_current_user sets it before the users+roles join,
--                     so exactly the row whose id matches is visible.
--   gds.login_email   the address being authenticated. /login, /refresh and /register set it,
--                     so exactly the row for that address is visible and no other.
--   gds.tenant_id     set once the tenant is known, and by every request/job thereafter.
--
-- Roles additionally get a bootstrap policy keyed on the user being authenticated, because the
-- role join runs in the same pre-tenant query. Its subquery reads users, which is itself
-- limited by the policies above, so it cannot enumerate another tenant's roles.
--
-- The base policies from migration 006 are FOR ALL without WITH CHECK, so PostgreSQL applies the
-- tenant predicate to INSERTs too. That means the writers must bind BEFORE they insert:
--   - _issue_session binds the user's tenant before inserting user_sessions
--   - register binds the new tenant id (known at construction) before inserting role and user
--   - the login failure path binds the tenant before writing an audit event, and logs to the
--     application log instead when the address is unknown and therefore unattributable
--
-- NOT INCLUDED: tenants. It still has no RLS. Signup inserts a tenant before any tenant exists,
-- so it needs an insert policy keyed on the registration context; that is a separate decision
-- and is deliberately left open rather than guessed at.
BEGIN;

CREATE POLICY users_principal ON users FOR SELECT
  USING (id = NULLIF(current_setting('gds.principal_id', true), '')::uuid);

CREATE POLICY users_login ON users FOR SELECT
  USING (lower(email) = NULLIF(lower(current_setting('gds.login_email', true)), ''));

CREATE POLICY roles_bootstrap ON roles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.role_id = roles.id
      AND (u.id = NULLIF(current_setting('gds.principal_id', true), '')::uuid
        OR lower(u.email) = NULLIF(lower(current_setting('gds.login_email', true)), ''))));

ALTER TABLE users         FORCE ROW LEVEL SECURITY;
ALTER TABLE roles         FORCE ROW LEVEL SECURITY;
ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events  FORCE ROW LEVEL SECURITY;

COMMIT;
