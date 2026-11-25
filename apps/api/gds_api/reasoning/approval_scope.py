"""The approval-reuse query, in its own module so a test can execute the real SQL.

Two properties matter, both measured on 25 Nov 2026:

  1. The query must bind the requesting agent AND the target. It bound neither, so a capability request
     approved for one host could be reused for another: reevaluate_capability_request would re-check the OLD
     target while the wrapper executed the caller's NEW one.

  2. A request minted by one mission may only be reused by a later mission through an explicit standing
     approval inside its window. Reuse was pinned to capability_requests.mission_id, so an approval could
     never be consumed again and every campaign minted fresh requests; the five-stage warfare workflow could
     not run unattended past any approval-gated stage.

This module imports nothing, so the query can be exercised against real rows without loading the app.
"""

APPROVAL_REUSE_SQL = """
                    SELECT cr.id
                    FROM capability_requests cr
                    -- The most recent decision that actually carries an approval. Measured 25 Nov 2026: the
                    -- original took the most recent decision of ANY kind, and a later decision with a NULL
                    -- approval_id (a policy refusal, which needs no human approval) made the inner join drop
                    -- the request entirely, so an approval granted earlier could never be found.
                    JOIN LATERAL (
                        SELECT d.approval_id, d.decided_at
                        FROM capability_decisions d
                        WHERE d.request_id = cr.id AND d.approval_id IS NOT NULL
                        ORDER BY d.decided_at DESC NULLS LAST
                        LIMIT 1
                    ) d ON TRUE
                    JOIN approvals a ON a.id = d.approval_id
                    WHERE cr.tenant_id = :tid
                      AND cr.capability_key = :ck
                      AND cr.requested_tool_id = :tool
                      -- the SAME requesting agent and the SAME target. Measured 25 Nov 2026: neither was
                      -- bound, so a request approved for one host could be reused for another while the
                      -- re-check evaluated the old target and the wrapper executed the new one.
                      AND cr.requesting_agent_id IS NOT DISTINCT FROM :agent
                      AND cr.target_reference IS NOT DISTINCT FROM :tref
                      -- Same mission only. A standing approval does NOT authorise reusing another mission's
                      -- request: the execution chain binds a decision to the mission that executes it, so
                      -- cross-mission authorisation is handled by STANDING_CARRY_SQL, which grants this
                      -- mission its own approval. Measured 25 Nov 2026, returning the foreign request here
                      -- made every standing run fail the binding check instead of carrying the approval.
                      AND cr.mission_id = :mid
                         -- A request that has ALREADY EXECUTED is not a reuse candidate. Measured 25 Nov
                         -- 2026: an approval for remediation_apply_host_hardening(fix_key=A) was handed to
                         -- remediation_apply_host_hardening(fix_key=B) and failed with "This request cannot
                         -- be executed again". The execution gate was right; reuse should never have offered
                         -- a spent request. A different action on the same tool now mints its own request
                         -- and needs its own approval. Standing carry is deliberately untouched: it grants a
                         -- new mission its own approval and must keep working after the first use.
                         AND NOT EXISTS (
                             SELECT 1 FROM capability_decisions dx
                             WHERE dx.request_id = cr.id AND dx.executed_at IS NOT NULL
                         )
                      AND a.status IN ('pending', 'approved')
                    ORDER BY (a.status = 'approved') DESC,
                             d.decided_at DESC NULLS LAST,
                             cr.requested_at DESC
                    LIMIT 1
                    """

STANDING_CARRY_SQL = """
                    SELECT a.id AS standing_approval_id, a.decided_by_user_id
                    FROM capability_requests cr
                    JOIN capability_decisions d ON d.request_id = cr.id AND d.approval_id IS NOT NULL
                    JOIN approvals a ON a.id = d.approval_id
                    WHERE cr.tenant_id = :tid
                      AND cr.capability_key = :ck
                      AND cr.requested_tool_id = :tool
                      AND cr.requesting_agent_id IS NOT DISTINCT FROM :agent
                      AND cr.target_reference IS NOT DISTINCT FROM :tref
                      AND a.status = 'approved'
                      AND a.standing IS TRUE
                      AND a.standing_until IS NOT NULL
                      AND a.standing_until > now()
                    ORDER BY a.standing_until DESC
                    LIMIT 1
                    """

PENDING_APPROVAL_SQL = """
                    SELECT a.id AS approval_id
                    FROM capability_decisions d
                    JOIN approvals a ON a.id = d.approval_id
                    WHERE d.request_id = :rid AND a.status = 'pending'
                    ORDER BY d.decided_at DESC NULLS LAST
                    LIMIT 1
                    """
