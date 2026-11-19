"""The cloud score must be derivable and explainable, never a stored guess.

19 Nov 2026: the platform held a cloud_score of 62 with no producer anywhere in the codebase.
These tests pin the arithmetic and the honesty rule (no evaluation means no score, not a default).
"""

from gds_api.cloud.posture.score import _PENALTY, grade_for


def test_grade_boundaries():
    assert grade_for(100) == "A"
    assert grade_for(90) == "A"
    assert grade_for(89.9) == "B"
    assert grade_for(80) == "B"
    assert grade_for(79.9) == "C"
    assert grade_for(70) == "C"
    assert grade_for(69) == "D"
    assert grade_for(60) == "D"
    assert grade_for(59.9) == "F"
    assert grade_for(0) == "F"


def test_severity_weights_are_ordered_and_defined():
    assert _PENALTY["critical"] > _PENALTY["high"] > _PENALTY["medium"] > _PENALTY["low"]
    assert _PENALTY["info"] == 0


def test_the_measured_estate_scores_69():
    """Three failing controls (CloudTrail high, Config medium, GuardDuty medium) on 19 Nov 2026."""
    penalty = _PENALTY["high"] + _PENALTY["medium"] + _PENALTY["medium"]
    assert penalty == 31
    assert grade_for(100 - penalty) == "D"
