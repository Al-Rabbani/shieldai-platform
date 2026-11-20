"""A score for one cloud must never be presented as the score for another."""

from pathlib import Path

SCORE = Path("apps/api/gds_api/cloud/posture/score.py").read_text()
ROUTE = Path("apps/api/gds_api/cloud_posture_api.py").read_text()


def test_score_function_accepts_a_provider():
    assert "provider: str | None = None" in SCORE


def test_score_filters_runs_by_provider():
    assert "CloudPostureEvaluationRun.provider == provider" in SCORE


def test_missing_provider_run_reports_no_run_not_another_provider():
    assert '"status": "no_run"' in SCORE
    assert "never substituted" in SCORE


def test_route_passes_the_provider_through():
    assert "provider: str | None = None" in ROUTE
    assert "provider=provider" in ROUTE
