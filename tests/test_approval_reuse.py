"""A granted approval must be consumable: the wrapper reuses the request it was granted against.

Measured 25 Nov 2026: execute_governed_tool called evaluate_capability_request every attempt, minting a new
capability request each time, so 13 approved approvals could never be consumed and every approval-gated
capability was permanently unreachable.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = (ROOT / "apps" / "api" / "gds_api" / "reasoning" / "governed_tools.py").read_text()
# The reuse query lives in its own module so it can be executed by a test; assert against where it really is.
SQL_SRC = (ROOT / "apps" / "api" / "gds_api" / "reasoning" / "approval_scope.py").read_text()


def test_wrapper_imports_the_reevaluation_entry_point():
    assert "reevaluate_capability_request" in SRC


def test_wrapper_reuses_a_request_whose_approval_is_pending_or_granted():
    assert "a.status IN ('pending', 'approved')" in SQL_SRC
    assert "reuse_request_id is not None" in SRC
    # the fresh-evaluation path must still exist for a first attempt or after a rejection
    assert "evaluate_capability_request(" in SRC


def test_reuse_is_scoped_to_the_same_mission_capability_tool_agent_and_target():
    """Widened 25 Nov 2026: the query must also bind the agent and the target.

    It bound neither, so a request approved for one host could be reused for another while
    reevaluate_capability_request re-checked the old target and the wrapper executed the new one.
    """
    for guard in ("cr.tenant_id = :tid", "cr.mission_id = :mid",
                  "cr.capability_key = :ck", "cr.requested_tool_id = :tool",
                  "cr.requesting_agent_id IS NOT DISTINCT FROM :agent",
                  "cr.target_reference IS NOT DISTINCT FROM :tref"):
        assert guard in SQL_SRC, guard


def test_cross_mission_authorisation_is_the_carry_query_not_the_reuse_query():
    """Measured 25 Nov 2026: letting the reuse query hand another mission's request over fails the execution
    chain's binding check, so cross-mission authorisation lives in its own query."""
    assert "STANDING_CARRY_SQL" in SQL_SRC
    assert "a.standing IS TRUE" in SQL_SRC
    assert "a.standing_until > now()" in SQL_SRC
    # and the reuse query itself must stay inside one mission
    # split on the ASSIGNMENT: the reuse query mentions the carry query by name in a comment
    reuse = SQL_SRC.split("STANDING_CARRY_SQL = ")[0]
    assert "AND cr.mission_id = :mid" in reuse
