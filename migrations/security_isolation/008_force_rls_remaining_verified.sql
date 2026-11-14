-- 008_force_rls_remaining_verified.sql
-- Escalates RLS to enforced for every table whose consumers are proven to bind a tenant.
--
-- Selection rule (applied per table, not in bulk):
--   * the table carries tenant_id and already has a policy (migration 006)
--   * every consumer that EXECUTES a query either binds gds.tenant_id itself, or is an HTTP
--     route module (routes bind automatically via get_current_user, which sets the context
--     on the same session FastAPI hands to the handler)
--   * no root-level cron script writes it without binding
--
-- Forcing is not harmless: a forced table returns ZERO rows to an unbound session rather
-- than raising, so a missed consumer is silent data loss, not an error. Verified after
-- applying: unbound sessions see 0 rows on all sampled tables, bound sessions see their
-- real counts (knowledge_documents 3, cost_records 21), every API endpoint returned 200,
-- and the error log held zero row-level-security violations.
--
-- STILL NOT FORCED, deliberately:
--   missions          tenant anchor; activities read it by PK before any tenant is known
--   users, roles      auth lookup in get_current_user runs before a tenant can be bound
--   findings, evidence, incidents, engagements, mission_tasks, mission_messages,
--   workspaces, workflow_runs, user_sessions   have non-route consumers that do not bind yet
--   notifications, alert_events, alert_rules   check_alerts.py (cron, every 5 min) writes
--                                              them without binding
BEGIN;

ALTER TABLE approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE authorized_targets FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE capability_decisions FORCE ROW LEVEL SECURITY;
ALTER TABLE capability_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE capability_state FORCE ROW LEVEL SECURITY;
ALTER TABLE ciem_findings FORCE ROW LEVEL SECURITY;
ALTER TABLE ciem_scan_results FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_asset_change_events FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_asset_relationships FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_connection_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_connection_validations FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_discovery_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_environments FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_finding_contexts FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_finding_status_history FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_finding_suppressions FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_inventory_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_policy_evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_posture_evaluation_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE conversation_threads FORCE ROW LEVEL SECURITY;
ALTER TABLE cost_records FORCE ROW LEVEL SECURITY;
ALTER TABLE engineering_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE engineering_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE mission_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE mission_results FORCE ROW LEVEL SECURITY;
ALTER TABLE policies FORCE ROW LEVEL SECURITY;
ALTER TABLE purple_mission_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE red_team_safety_state FORCE ROW LEVEL SECURITY;
ALTER TABLE repositories FORCE ROW LEVEL SECURITY;
ALTER TABLE security_findings FORCE ROW LEVEL SECURITY;
ALTER TABLE security_isolation_migration_audit FORCE ROW LEVEL SECURITY;
ALTER TABLE security_repository_bindings FORCE ROW LEVEL SECURITY;
ALTER TABLE siem_correlated_incidents FORCE ROW LEVEL SECURITY;
ALTER TABLE siem_correlation_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE siem_events FORCE ROW LEVEL SECURITY;
ALTER TABLE watchlist_entries FORCE ROW LEVEL SECURITY;

COMMIT;
