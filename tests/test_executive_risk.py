"""The executive score is a pure function of counts, so it is tested without a database.

These pin the policy, not a number: a clean estate must score 100, and each penalty must bite at its
stated threshold and stop biting above it. If someone changes a weight, these tell them what they changed.
"""
from gds_api.executive_risk_api import score_from_counts


def clean(**over):
    base = {"open_total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0, "kev_open": 0,
            "high_epss": 0, "internet_exposed": 0, "stale": 0, "new_7d": 0, "resolved_7d": 0}
    base.update(over)
    return base


def test_a_clean_estate_scores_100_and_grades_a():
    r = score_from_counts(clean())
    assert r["overall_score"] == 100.0
    assert r["grade"] == "A"
    assert r["trend"] == "stable"


def test_critical_volume_bites_and_caps():
    ten = score_from_counts(clean(critical=10))
    assert ten["penalties"]["critical_volume"] == 25.0
    # Above the threshold the penalty stops growing: the cap is the policy.
    assert score_from_counts(clean(critical=400))["penalties"]["critical_volume"] == 25.0
    # Half the threshold is half the penalty.
    assert score_from_counts(clean(critical=5))["penalties"]["critical_volume"] == 12.5


def test_every_penalty_is_independent():
    all_max = score_from_counts(clean(critical=10, high=50, kev_open=5, high_epss=20,
                                      stale=100, internet_exposed=50))
    assert sum(all_max["penalties"].values()) == 90.0
    assert all_max["overall_score"] == 10.0
    assert all_max["grade"] == "F"


def test_the_caps_put_a_practical_floor_at_ten():
    """My first expectation here was 0 and the code said 10, and the code is right.

    Every penalty is capped, so the worst possible estate loses 90 of 100 and scores 10. That is a
    property worth pinning rather than a bug: the score cannot be driven to zero by volume alone, so
    "score 0" can never be confused with "no data". The clamp at 0 stays as a defensive guard.
    """
    r = score_from_counts(clean(critical=999, high=999, kev_open=999, high_epss=999,
                                stale=999, internet_exposed=999))
    assert r["overall_score"] == 10.0
    assert r["grade"] == "F"


def test_score_never_exceeds_100():
    r = score_from_counts(clean(resolved_7d=50, new_7d=0))
    assert r["overall_score"] == 100.0


def test_trend_follows_resolved_against_new():
    assert score_from_counts(clean(new_7d=3, resolved_7d=5))["trend"] == "improving"
    # "degrading", not "worsening": the shipped dashboard renders any other word as "Stable".
    assert score_from_counts(clean(new_7d=5, resolved_7d=3))["trend"] == "degrading"
    assert score_from_counts(clean(new_7d=3, resolved_7d=3))["trend"] == "stable"


def test_freshness_bonus_only_when_more_resolved_than_new():
    assert score_from_counts(clean(new_7d=1, resolved_7d=2))["freshness_bonus"] == 5.0
    assert score_from_counts(clean(new_7d=2, resolved_7d=1))["freshness_bonus"] == 0.0


def test_grade_boundaries():
    # 100 - 25 = 75 -> C, because a single capped critical penalty is already a C.
    assert score_from_counts(clean(critical=10))["grade"] == "C"
    # 100 - 20 = 80 -> B
    assert score_from_counts(clean(high=50))["grade"] == "B"
    # 100 - 10 = 90 -> A
    assert score_from_counts(clean(stale=100))["grade"] == "A"


def test_the_policy_is_reported_alongside_the_score():
    r = score_from_counts(clean())
    assert r["policy"]["critical"] == {"cap": 25.0, "at": 10}
    assert r["policy"]["exploitable"]["epss_at_or_above"] == 0.5
