"""The Co-Pilot may learn from its own missions - under a rule, enforced.

The readiness list named this gap: memory was operator-stated only. Closing it needed a rule first, because a
platform that remembers the wrong things is worse than one that remembers nothing. These guards pin the rule,
and pin the two defects that cost real time while building it: a hook placed after `return True` (dead code
that silently learned nothing) and the table's own CHECK vocabulary being guessed instead of read.
"""
import inspect

from gds_api.reasoning import mission_memory as mm


def test_a_read_is_never_remembered():
    assert mm.is_rememberable("get_findings") is False
    assert mm.is_rememberable("nuclei_scan") is False
    assert mm.is_rememberable("remediation_apply_config_fix") is True
    assert mm.is_rememberable("cloud_apply_remediation") is True


def test_credentials_and_personal_data_are_refused():
    for bad in (
        "ghp_abcdefghijklmnop1234",
        "sk-abcdefghijklmnop1234",
        "Bearer abcdefghijklmnop1234",
        "-----BEGIN RSA PRIVATE KEY-----",
        "password=hunter2",
        "api_key: abc123",
        "president@globaldigitalstreams.com",
        "deadbeefdeadbeefdeadbeefdeadbeef",
    ):
        assert mm.refusal_reason(bad), f"should have been refused: {bad}"
    assert mm.refusal_reason("hide_api_docs ran under governance") is None


def test_the_stored_vocabulary_matches_the_table_constraints():
    """copilot_memory CHECKs all three columns; guessing them cost a rejected insert on the first run."""
    assert mm.KIND == "fact"                        # allowed: preference | instruction | fact
    assert mm.SOURCE == "observed"                  # allowed: operator_stated | observed
    assert mm.CONFIDENCE == "inferred"              # allowed: stated | inferred


def test_a_candidate_is_a_historical_fact_and_carries_no_count():
    from datetime import UTC, datetime

    c = mm.build_candidate(tool_name="remediation_apply_config_fix",
                           parameters={"fix_key": "hide_api_docs"}, target=None,
                           executed_at=datetime(2026, 11, 25, tzinfo=UTC))
    assert c is not None
    assert c["kind"] == "fact"
    assert c["key"] == "remediation_apply_config_fix:hide_api_docs"
    assert "ran under governance" in c["value"]
    assert "2026-11-25" in c["value"]
    # A count would go stale and a later mission would quote it as current.
    assert not any(w in c["value"] for w in ("findings", "critical", "open "))


def test_a_redacted_discriminator_is_dropped_rather_than_stored():
    from datetime import UTC, datetime

    c = mm.build_candidate(tool_name="remediation_apply_config_fix",
                           parameters={"fix_key": "[REDACTED]"}, target=None,
                           executed_at=datetime(2026, 11, 25, tzinfo=UTC))
    assert c is not None
    assert "[REDACTED]" not in c["key"] and "[REDACTED]" not in c["value"]


def test_a_read_produces_no_candidate():
    from datetime import UTC, datetime

    assert mm.build_candidate(tool_name="get_findings", parameters={}, target=None,
                              executed_at=datetime(2026, 11, 25, tzinfo=UTC)) is None


def test_learning_runs_before_the_return_and_commits_once():
    """Measured 25 Nov 2026: the hook was appended AFTER `return True`, so it was dead code and the first three
    proofs reported learning that never happened. The call must precede the return in the function body."""
    from gds_api.reasoning.governed_tools import set_mission_outcome

    src = inspect.getsource(set_mission_outcome)
    assert "learn_from_mission" in src
    assert src.index("learn_from_mission") < src.index("return True"), "learning is unreachable again"
    # One commit before the fallback: an intermediate commit clears the transaction-local tenant setting that
    # RLS reads, and the next UPDATE then matches zero rows (StaleDataError).
    assert src.count("await session.commit()") == 2, "expected the main commit plus the fallback"
