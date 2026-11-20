"""The MSSP surface called every tenant a customer.

Measured 20 Nov 2026: GET /mssp/customers answered count=5 for a platform holding gds (the provider), a 1 Aug test
tenant, a real second account, and two fixtures created on 18 and 19 Nov to prove the assessment and isolation
paths. The page carried a static disclaimer, so a reader on that page was told; but the API returned a bare count
that curl, a report or any future consumer would read as customers.

Now the API splits the three groups and names them: customers (production, excluding the provider), the provider
tenant itself, and non-production tenants with a count. A customer count has to survive being read out loud.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

API = (ROOT / "apps" / "api" / "gds_api" / "mssp_api.py").read_text(encoding="utf-8")
CLIENT = (ROOT / "web" / "gds_app.html").read_text(encoding="utf-8")
MIGRATION = (ROOT / "migrations" / "security_isolation" / "041_tenant_environment.sql").read_text(encoding="utf-8")


def test_the_count_excludes_the_provider_and_non_production_tenants():
    assert 'c["environment"] == "production" and c["tenant_id"] != provider_id' in API
    assert 'c["environment"] != "production"' in API


def test_both_exclusions_are_reported_rather_than_dropped():
    """A silently filtered list is indistinguishable from a complete one."""
    assert '"provider_tenant": provider[0] if provider else None' in API
    assert '"non_production": [' in API
    assert '"non_production_count": len(excluded)' in API


def test_the_page_states_the_scope_of_the_number_it_shows():
    assert 'Counting production customers only' in CLIENT
    assert '<div class="stat-lbl">Customers</div>' in CLIENT
    assert "excluded from the count" in CLIENT


def test_an_empty_customer_list_does_not_hide_the_excluded_ones():
    assert "non-production" in CLIENT
    assert "No production customer is recorded yet" in CLIENT


def test_environment_is_a_two_value_label_not_a_nullable_flag():
    """A nullable boolean invites "unknown", and an unknown tenant would have to be guessed into a count."""
    assert "ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production'" in MIGRATION
    assert "CHECK (environment IN ('production', 'test'))" in MIGRATION


def test_the_fixtures_are_labelled_by_slug_so_the_migration_is_readable_and_rerunnable():
    for slug in ("test-user-269c6d", "gds-assessment-sandbox", "onboarding-rehearsal"):
        assert slug in MIGRATION
    assert "environment IS DISTINCT FROM 'test'" in MIGRATION


def test_the_view_returns_the_environment_so_callers_need_not_guess():
    assert "last_onboarding timestamp with time zone, environment text" in MIGRATION
    assert "t.environment" in MIGRATION
