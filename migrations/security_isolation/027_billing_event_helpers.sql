-- 027 — record and update webhook events through narrow privileged helpers.
--
-- 19 Nov 2026. A real Stripe delivery exposed a defect that local testing could not: every webhook
-- whose customer could not be resolved to a tenant (a deleted customer, an unknown buyer, a
-- subscription.deleted) failed with "new row violates row-level security policy" and returned 500, so
-- billing_events stayed empty and Stripe retried against a wall. The cause is subtle: INSERT ...
-- RETURNING applies the SELECT policy to the returned row, and a NULL-tenant row is invisible under
-- that policy, so the insert was rejected even though its WITH CHECK allows NULL.
--
-- Two narrow SECURITY DEFINER functions fix it without loosening RLS. Keeping NULL-tenant rows
-- invisible to tenants is deliberate: they are platform-level forensic records, not customer data, and
-- no tenant should be able to enumerate events that belong to nobody.
CREATE OR REPLACE FUNCTION billing_event_record(
    p_event_id text, p_type text, p_livemode boolean, p_tenant uuid, p_user uuid,
    p_sig boolean, p_payload jsonb
) RETURNS TABLE (record_id uuid, duplicate boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO billing_events (stripe_event_id, event_type, livemode, tenant_id, user_id,
                                signature_verified, payload)
    VALUES (p_event_id, p_type, p_livemode, p_tenant, p_user, p_sig, p_payload)
    ON CONFLICT (stripe_event_id) DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        RETURN QUERY SELECT b.id, true FROM billing_events b WHERE b.stripe_event_id = p_event_id;
    ELSE
        RETURN QUERY SELECT v_id, false;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION billing_event_mark(
    p_record uuid, p_processed boolean, p_result jsonb, p_error text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_rows integer;
BEGIN
    UPDATE billing_events
       SET processed = p_processed,
           processing_result = COALESCE(p_result, processing_result),
           error = p_error
     WHERE id = p_record;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows > 0;
END $$;

REVOKE ALL ON FUNCTION billing_event_record(text, text, boolean, uuid, uuid, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION billing_event_mark(uuid, boolean, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION billing_event_record(text, text, boolean, uuid, uuid, boolean, jsonb) TO gds;
GRANT EXECUTE ON FUNCTION billing_event_record(text, text, boolean, uuid, uuid, boolean, jsonb) TO gds_runtime;
GRANT EXECUTE ON FUNCTION billing_event_mark(uuid, boolean, jsonb, text) TO gds;
GRANT EXECUTE ON FUNCTION billing_event_mark(uuid, boolean, jsonb, text) TO gds_runtime;
