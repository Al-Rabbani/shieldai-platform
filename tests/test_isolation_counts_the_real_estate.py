"""The isolation check counted the tables it was allowed to see, not the tables that exist.

Measured 20 Nov 2026: the bridge health verdict reported 71 tenant tables while the database held 73, and the same
query run as gds_runtime through information_schema.columns saw 11. information_schema is filtered by the connected
role's grants, so a check built on it answers "how many tenant tables can I see", not "how many tenant tables are
there". The verdict it feeds - database isolation verified when zero tenant tables lack FORCE RLS - would therefore
pass while a tenant table it could not see sat unprotected, which is the exact failure the check exists to catch.

Both call sites now use pg_attribute, which is not privilege-filtered.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

VERIFICATION = (ROOT / "apps" / "api" / "gds_api" / "bridge" / "verification.py").read_text(encoding="utf-8")
PLATFORM = (ROOT / "apps" / "api" / "gds_api" / "platform_data.py").read_text(encoding="utf-8")


def test_the_health_verdict_counts_tenant_tables_without_regard_to_grants():
    assert "FROM pg_attribute a" in VERIFICATION
    assert "a.attname = 'tenant_id'" in VERIFICATION
    # the pattern that was replaced, not the word: the fix's own comment names it
    assert "EXISTS (SELECT 1 FROM information_schema.columns" not in VERIFICATION


def test_the_architecture_review_does_the_same():
    assert "FROM pg_attribute a" in PLATFORM
    assert "a.attrelid = c.oid AND a.attname = 'tenant_id'" in PLATFORM
    # the identity posture check still asks about one named table's columns, which is fine; the schema sweep is not
    sweep = PLATFORM.split("async def architecture_review")[1]
    assert "EXISTS (SELECT 1 FROM information_schema.columns" not in sweep


def test_the_reported_source_says_which_catalogue_was_read():
    assert '"source": "pg_class + pg_attribute (live)"' in PLATFORM


def test_an_unforced_tenant_table_still_fails_the_verdict():
    """The point of the wider count is that the verdict now covers the whole estate."""
    assert "unforced == 0 and bool(tenant_tables)" in VERIFICATION
