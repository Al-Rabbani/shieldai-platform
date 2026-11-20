"""An ORM model that disagrees with its table fails only in production.

Migration 033 added mfa_* columns to Postgres and I forgot the User model. Every offline test passed; the first
real login returned 500 because attribute access on the ORM object raised. This pins the two declarations
together so the same mistake cannot reach the host again.
"""
from pathlib import Path

MODELS = (Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "models.py").read_text(encoding="utf-8")
MIGRATION = (Path(__file__).resolve().parents[1] / "migrations" / "security_isolation" / "033_mfa.sql").read_text(encoding="utf-8")


def test_every_mfa_column_in_the_migration_is_mapped_on_the_model():
    for column in ("mfa_secret", "mfa_enabled", "mfa_enrolled_at"):
        assert column in MIGRATION, f"{column} missing from migration 033"
        assert column in MODELS, f"{column} added to users but not mapped on the User model"


def test_the_model_can_be_imported_and_has_the_attributes():
    from gds_api.models import User

    for column in ("mfa_secret", "mfa_enabled", "mfa_enrolled_at"):
        assert hasattr(User, column), column
