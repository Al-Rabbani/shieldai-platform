"""Service level objectives, pinned against the ways a status page usually lies.

The page answers "are we meeting what we promise". Three failure modes are guarded here, because each of them makes
the answer wrong in the flattering direction:

  1. A missing measurement rendered as a number. Prometheus being down, a query returning no series, or a window
     with no traffic must read `unmeasured` with a reason, never 0% and never 100%.
  2. A threshold that does not exist in the data. The request-duration histogram has fixed bucket boundaries and no
     bucket at 800 ms, so "share of requests under 800 ms" returns nothing at all and silently reads as 0%. Latency
     is a p95 for that reason, and this file pins the direction so a future edit cannot quietly invert it.
  3. A denominator that flatters. Cancelled missions, internal proof runs and campaign stages are excluded from the
     mission objective, and the test asserts they are still counted and named in the detail rather than dropped.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from gds_api.slo_api import (
    _objective,
    approval_objective,
    evaluate_higher,
    evaluate_lower,
    mission_objective,
    overall_status,
    scanner_objective,
)

NOW = datetime.now(timezone.utc).replace(microsecond=0)


# ------------------------------------------------------------------ the evaluator
def test_at_the_target_the_allowance_is_spent_so_it_is_met_but_at_risk():
    """The allowance is 1 - target. Sitting exactly on the target has used all of it, which is worth saying."""
    verdict = evaluate_higher(0.995, 0.995)
    assert verdict["status"] == "at_risk"
    assert verdict["budget_remaining_pct"] == 0.0


def test_a_perfect_ratio_has_the_whole_allowance_left():
    verdict = evaluate_higher(1.0, 0.995)
    assert verdict["status"] == "met"
    assert verdict["budget_remaining_pct"] == 100.0


def test_a_ratio_just_below_target_is_breached_with_the_shortfall_stated():
    verdict = evaluate_higher(0.94, 0.95)
    assert verdict["status"] == "breached"
    assert verdict["budget_remaining_pct"] == 0.0
    assert round(verdict["shortfall"], 4) == 0.01


def test_a_ratio_with_no_measurement_is_unmeasured_not_zero():
    """The defect this replaces: None rendered as 0% told the operator the platform was failing when nobody knew."""
    verdict = evaluate_higher(None, 0.95)
    assert verdict["status"] == "unmeasured"
    assert verdict["budget_remaining_pct"] is None
    assert verdict["shortfall"] is None


def test_a_ratio_with_a_little_budget_left_is_at_risk_not_met():
    # 99.6% against a 99.5% target leaves 20% of the allowance, which is worth saying out loud.
    verdict = evaluate_higher(0.996, 0.995)
    assert verdict["status"] == "at_risk"


def test_latency_below_target_is_met_and_the_budget_is_the_allowance_left():
    verdict = evaluate_lower(176.0, 800.0)
    assert verdict["status"] == "met"
    assert round(verdict["budget_remaining_pct"], 1) == 78.0


def test_latency_above_target_is_breached_by_the_difference():
    verdict = evaluate_lower(1200.0, 800.0)
    assert verdict["status"] == "breached"
    assert verdict["shortfall"] == 400.0


def test_latency_with_no_measurement_is_unmeasured():
    assert evaluate_lower(None, 800.0)["status"] == "unmeasured"


def test_a_zero_target_latency_is_unmeasured_rather_than_a_division_by_zero():
    assert evaluate_lower(10.0, 0.0)["status"] == "unmeasured"


# ------------------------------------------------------------------ the objective payload
def test_an_unmeasured_objective_carries_its_reason():
    payload = _objective("x", "X", "question?", 0.9, None, "tenant", "7d", "basis",
                         unmeasured_reason="Prometheus did not answer (ConnectError)")
    assert payload["status"] == "unmeasured"
    assert "Prometheus did not answer" in payload["unmeasured_reason"]


def test_a_latency_objective_reports_milliseconds_not_a_percentage():
    payload = _objective("api_latency", "Latency", "how fast?", 800.0, 176.0, "platform", "24h", "basis",
                         unit="ms", direction="lower")
    assert payload["unit"] == "ms"
    assert payload["target"] == 800.0
    assert payload["actual"] == 176.0
    assert payload["status"] == "met"


# ------------------------------------------------------------------ scanner freshness
def _schedule(name, interval):
    return {"name": name, "interval_minutes": interval}


def test_every_scanner_fresh_meets_the_objective():
    schedules = [_schedule("a", 360), _schedule("b", 1440)]
    runs = {"a": NOW - timedelta(minutes=10), "b": NOW - timedelta(minutes=60)}
    payload = scanner_objective(schedules, runs, NOW)
    assert payload["status"] == "met"
    assert payload["actual"] == 100.0


def test_a_scanner_that_never_ran_is_named_and_never_counts_as_fresh():
    schedules = [_schedule("a", 360), _schedule("b", 360)]
    runs = {"a": NOW - timedelta(minutes=10)}
    payload = scanner_objective(schedules, runs, NOW)
    assert payload["status"] == "breached"
    assert payload["detail"]["never_run"] == ["b"]
    assert payload["actual"] == 50.0


def test_a_silent_scanner_breaches_freshness_but_an_overdue_one_is_named_separately():
    schedules = [_schedule("a", 360), _schedule("b", 360), _schedule("c", 360)]
    runs = {
        "a": NOW - timedelta(minutes=10),
        "b": NOW - timedelta(minutes=400),
        "c": NOW - timedelta(minutes=800),
    }
    payload = scanner_objective(schedules, runs, NOW)
    assert payload["detail"]["overdue"] == ["b"]
    assert payload["detail"]["silent"] == ["c"]
    assert payload["actual"] == 33.33


def test_no_registered_scanners_is_unmeasured_not_a_perfect_score():
    payload = scanner_objective([], {}, NOW)
    assert payload["status"] == "unmeasured"
    assert "no scanner schedules" in payload["unmeasured_reason"]


# ------------------------------------------------------------------ mission success
def test_mission_success_counts_completed_against_completed_plus_failed():
    rows = [
        {"status": "completed", "mission_type": "port_scan"},
        {"status": "completed", "mission_type": "port_scan"},
        {"status": "failed", "mission_type": "cloud_security_assessment"},
    ]
    payload = mission_objective(rows)
    assert payload["actual"] == 66.67
    assert payload["detail"]["failed_by_type"] == {"cloud_security_assessment": 1}


def test_cancelled_missions_are_excluded_and_still_counted():
    """Cancelling a failing mission must not be able to improve the number, and must not vanish either."""
    rows = [
        {"status": "completed", "mission_type": "port_scan"},
        {"status": "failed", "mission_type": "port_scan"},
        {"status": "cancelled", "mission_type": "port_scan"},
    ]
    payload = mission_objective(rows)
    assert payload["actual"] == 50.0
    assert payload["detail"]["cancelled_excluded"] == 1


def test_internal_proof_runs_and_campaign_stages_are_excluded_and_named():
    rows = [
        {"status": "completed", "mission_type": "port_scan"},
        {"status": "failed", "mission_type": "standing_proof"},
        {"status": "failed", "mission_type": "warfare_stage"},
    ]
    payload = mission_objective(rows)
    assert payload["actual"] == 100.0
    assert payload["detail"]["internal_runs_excluded"] == 2
    assert payload["detail"]["internal_runs_by_type"] == {"standing_proof": 1, "warfare_stage": 1}


def test_mission_objective_with_no_outcome_is_unmeasured():
    payload = mission_objective([{"status": "cancelled", "mission_type": "port_scan"}])
    assert payload["status"] == "unmeasured"


# ------------------------------------------------------------------ approval timeliness
def test_approvals_decided_within_the_threshold_meet_the_objective():
    rows = [
        {"status": "approved", "created_at": NOW - timedelta(hours=30), "decided_at": NOW - timedelta(hours=29)},
        {"status": "rejected", "created_at": NOW - timedelta(hours=10), "decided_at": NOW - timedelta(hours=9)},
    ]
    payload = approval_objective(rows)
    assert payload["status"] == "met"
    assert payload["actual"] == 100.0


def test_a_late_decision_breaches_and_a_pending_one_is_reported_not_counted():
    rows = [
        {"status": "approved", "created_at": NOW - timedelta(hours=40), "decided_at": NOW - timedelta(hours=10)},
        {"status": "approved", "created_at": NOW - timedelta(hours=3), "decided_at": NOW - timedelta(hours=2)},
        {"status": "pending", "created_at": NOW - timedelta(hours=6), "decided_at": None},
    ]
    payload = approval_objective(rows)
    assert payload["detail"]["decided"] == 2
    assert payload["detail"]["within_threshold"] == 1
    assert payload["detail"]["pending_excluded"] == 1
    assert payload["detail"]["oldest_pending_hours"] == 6.0
    assert payload["actual"] == 50.0


def test_an_approval_with_no_decision_or_no_creation_time_is_not_counted_as_timely():
    rows = [{"status": "approved", "created_at": None, "decided_at": NOW}]
    payload = approval_objective(rows)
    assert payload["status"] == "unmeasured"


# ------------------------------------------------------------------ overall
def test_one_breach_makes_the_overall_status_breached():
    objectives = [
        {"status": "met"},
        {"status": "breached"},
    ]
    assert overall_status(objectives)["status"] == "breached"


def test_all_met_is_met_and_anything_unmeasured_is_not_reported_as_met():
    assert overall_status([{"status": "met"}, {"status": "met"}])["status"] == "met"
    assert overall_status([{"status": "met"}, {"status": "unmeasured"}])["status"] == "unmeasured"
    assert overall_status([{"status": "at_risk"}])["status"] == "at_risk"
