-- Item 40 follow-up: make copilot_memory's policy match every other table here.
-- An unbound session must read ZERO rows, not raise: ''::uuid raises, so the cast must be NULLIF-guarded.
DROP POLICY IF EXISTS copilot_memory_tenant_isolation ON copilot_memory;
CREATE POLICY copilot_memory_tenant_isolation ON copilot_memory
    USING (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('gds.tenant_id', true), ''))::uuid);
