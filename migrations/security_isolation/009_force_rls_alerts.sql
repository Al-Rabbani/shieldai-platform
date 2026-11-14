-- 009_force_rls_alerts.sql
-- Enforce tenant isolation on the alerting tables now that their writers bind.
--
-- alert_events and alert_rules are written only by HTTP routes, which bind through
-- get_current_user on the session the handler receives.
--
-- notifications is written both by routes and by check_alerts.py (cron, every 5 minutes,
-- connecting through DATABASE_URL as the owner role). That script previously relied on
-- RLS being inactive: its own comment said "the notifications table is not RLS-managed",
-- which migration 006 made untrue. It now binds the provisioned SECURITY_ALERT_TENANT_ID
-- on the connection before writing, so the insert satisfies the policy.
--
-- Verified after forcing: an unbound INSERT into notifications is rejected with a
-- row-level-security error, a bound INSERT with the same parameters is accepted (rolled
-- back, no row persisted), the 52 existing notifications remain visible to the bound
-- tenant, and a manual run of check_alerts.py completed normally.
BEGIN;

ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE alert_events  FORCE ROW LEVEL SECURITY;
ALTER TABLE alert_rules   FORCE ROW LEVEL SECURITY;

COMMIT;
