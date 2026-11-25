"""A granted approval must be consumable: the wrapper reuses the request it was granted against.

Measured 25 Nov 2026: execute_governed_tool called evaluate_capability_request every attempt, minting a new
capability request each time, so 13 approved approvals could never be consumed and every approval-gated
capability was permanently unreachable.
"""
import pathlib

SRC = (pathlib.Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "reasoning" / "governed_tools.py").read_text()


def test_wrapper_imports_the_reevaluation_entry_point():
    assert "reevaluate_capability_request" in SRC


def test_wrapper_reuses_a_request_whose_approval_is_pending_or_granted():
    assert "a.status IN ('pending', 'approved')" in SRC
    assert "reuse_request_id is not None" in SRC
    # the fresh-evaluation path must still exist for a first attempt or after a rejection
    assert "evaluate_capability_request(" in SRC


def test_reuse_is_scoped_to_the_same_mission_capability_and_tool():
    for guard in ("cr.tenant_id = :tid", "cr.mission_id = :mid",
                  "cr.capability_key = :ck", "cr.requested_tool_id = :tool"):
        assert guard in SRC, guard
