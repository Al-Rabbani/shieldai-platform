-- One meaning for "no tenant bound", across all 73 tenant tables.
--
-- Measured 20 Nov 2026: 75 of 79 policies build their predicate with
--     tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid
-- and three do not:
--     finding_risk_acceptances, on_call_shifts, regulatory_notifications
-- use
--     tenant_id = (current_setting('gds.tenant_id', true))::uuid
--
-- With the GUC unset, current_setting(..., true) returns NULL and NULL::uuid is NULL, so both forms return zero
-- rows. With the GUC set to the empty string - which is how a session says "no tenant" - the second form raises
-- invalid input syntax for type uuid instead. The same mistake therefore returned an empty result on 70 tables and
-- a 500 on three, depending only on which migration wrote the policy.
--
-- No leak either way: this is fail-closed in both forms. The reason to normalise is that one meaning for an empty
-- bind is a property worth being able to state, and a test can only assert "an unbound session reads nothing" if
-- every table answers that question the same way. NULLIF makes the empty string behave exactly like an unbound
-- session, which is what every other table already does.
--
-- Each policy carries BOTH a USING and a WITH CHECK clause with the same expression (verified against pg_policy),
-- so both are rewritten together. Changing only USING would leave writes still erroring on an empty bind.

ALTER POLICY finding_risk_acceptances_tenant_isolation ON finding_risk_acceptances
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);

ALTER POLICY on_call_shifts_tenant_isolation ON on_call_shifts
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);

ALTER POLICY regulatory_notifications_tenant_isolation ON regulatory_notifications
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);

-- The three tables must still be forced, or the predicates above exempt their owner.
ALTER TABLE finding_risk_acceptances FORCE ROW LEVEL SECURITY;
ALTER TABLE on_call_shifts FORCE ROW LEVEL SECURITY;
ALTER TABLE regulatory_notifications FORCE ROW LEVEL SECURITY;
