"""The Cloud page said "Assets 0" beside an account holding 144.

cloud_environments carries discovery_status, last_attempted_discovery_at, last_successful_discovery_at,
last_failure_detail, asset_count and region_count, and the model documents them as refreshed after every
completed discovery job. Nothing refreshed them: the only writer in the codebase was the startup reconciler setting
"failed". Measured 20 Nov 2026, five discovery jobs had completed for the Azure environment and four for AWS, while
both rows still read never_run / asset_count 0. The console reads asset_count, so the product surface reported an
empty account.

These tests hold the runner's obligation and the page's honesty about it.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

RUNNER = (ROOT / "apps" / "api" / "gds_api" / "cloud" / "discovery_runner.py").read_text(encoding="utf-8")
CLIENT = (ROOT / "web" / "gds_app.html").read_text(encoding="utf-8")
MIGRATION = (ROOT / "migrations" / "security_isolation" / "042_environment_discovery_state.sql").read_text(encoding="utf-8")
MODEL = (ROOT / "apps" / "api" / "gds_api" / "models.py").read_text(encoding="utf-8")


def test_the_vocabulary_is_the_one_the_model_documents():
    """No invented status strings: the column comment already defines the set."""
    documented = "never_run|queued|running|partially_completed|completed|failed"
    assert documented in MODEL
    for value in ("running", "partially_completed", "completed", "failed"):
        assert f'"{value}"' in RUNNER


def test_a_run_marks_the_environment_running_with_an_attempt_time():
    assert 'status="running"' in RUNNER
    assert "attempted_at=datetime.now(timezone.utc)" in RUNNER


def test_every_failure_path_marks_the_environment_failed_with_the_reason():
    assert RUNNER.count('_mark_environment(environment, status="failed", failure=reason)') == 3


def test_success_refreshes_the_counts_and_clears_the_old_failure():
    assert 'status="partially_completed" if errors else "completed"' in RUNNER
    assert "asset_count=len(stored)" in RUNNER
    assert "clear_failure=True" in RUNNER


def test_a_successful_run_does_not_record_a_partial_one_as_a_success():
    """last_successful_discovery_at is only set when no category failed."""
    assert 'succeeded_at=datetime.now(timezone.utc) if not errors else None' in RUNNER


def test_the_backfill_uses_assets_and_jobs_rather_than_a_guess():
    assert "FROM cloud_assets" in MIGRATION
    assert "FROM cloud_discovery_jobs" in MIGRATION
    assert "last_successful_discovery_at = sub.last_success" in MIGRATION
    assert "AND e.discovery_status = 'never_run'" in MIGRATION


def test_the_page_shows_when_the_asset_count_was_last_true():
    assert "<th>Discovery</th>" in CLIENT
    assert "last_successful_discovery_at" in CLIENT
    assert "never run" in CLIENT
    assert "no successful run recorded" in CLIENT


def test_the_page_does_not_invent_a_zero_asset_count():
    assert "typeof e.asset_count === 'number' ? e.asset_count : '--'" in CLIENT
    assert "escapeHtml(e.asset_count||0)" not in CLIENT
