-- 019 — force tenant isolation on the last two unforced tenant tables.
--
-- 19 Nov 2026 (P2). missions and mission_tasks were the only two of 63 tenant tables with RLS
-- enabled but not FORCED, so the table owner bypassed the policy and any session could read every
-- tenant's missions. Before this, the consumers were made explicit rather than relying on the bind
-- that get_current_user happens to leave on the request session:
--   * engineering/recovery.py — binds the session row's own tenant before each by-PK Mission read
--     (an unbound by-PK read returns None on a forced table, which would have left missions stuck
--     "running" forever with no error).
--   * reconciliation.py — binds the tenant it was asked to reconcile before reading its missions.
-- Route modules were already safe: get_current_user binds gds.tenant_id on the request session, and
-- the session factory sets expire_on_commit=False so a commit does not expire loaded objects.
--
-- FORCE ROW LEVEL SECURITY applies the policy to the table owner as well, which is the point: the
-- application connects as the owner role.

ALTER TABLE missions FORCE ROW LEVEL SECURITY;
ALTER TABLE mission_tasks FORCE ROW LEVEL SECURITY;
