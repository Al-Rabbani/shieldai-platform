"""Regressions for the restore drill's verdict logic.

Until this work a backup was "verified" if pg_restore could list its objects; no dump had ever been
restored. These cases pin the rule that makes a drill meaningful: a table that comes back with a
different row count, or does not come back at all, is a failed restore rather than a warning.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from gds_api.backup_ops import MANIFEST_TABLES, compare_counts  # noqa: E402


def test_matching_counts_pass():
    counts = {table: 5 for table in MANIFEST_TABLES}
    ok, problems = compare_counts(counts, dict(counts))
    assert ok is True
    assert problems == []


def test_fewer_rows_after_restore_fails():
    ok, problems = compare_counts({"security_findings": 378}, {"security_findings": 377})
    assert ok is False
    assert "security_findings: manifest 378 vs restored 377" in problems[0]


def test_an_unreadable_count_fails_even_when_both_sides_agree():
    """Found live: a wrong table name gave -1 at dump time and -1 after restore, and two equal
    negatives would have been reported as a verified restore."""
    ok, problems = compare_counts({"remediations": -1}, {"remediations": -1})
    assert ok is False
    assert "unreadable count" in problems[0]


def test_a_table_missing_after_restore_fails():
    ok, problems = compare_counts({"missions": 18}, {"missions": -1})
    assert ok is False
    assert "unreadable count" in problems[0]


def test_a_table_absent_from_the_manifest_fails():
    ok, problems = compare_counts({"users": 3}, {"users": 3, "remediations": 9})
    assert ok is False
    assert any("absent from the dump manifest" in p for p in problems)


def test_manifest_covers_the_tables_that_matter():
    for required in ("security_findings", "missions", "users", "remediation_plans"):
        assert required in MANIFEST_TABLES
