"""A route that answers 500 the first time it is called was never exercised.

GET /drift/findings raised asyncpg AmbiguousParameterError because :status appeared only inside a null test, and
PUT /drift/config failed on COALESCE(:types, '{}') with a list bound to text[]. The suite never runs these statements
against Postgres, so it stayed green. This pins the shape that made them fail.
"""
import pathlib
import re

RAW = pathlib.Path("/opt/gds-os/apps/api/gds_api/drift.py").read_text()
# Assertions run against code, never against prose: the first version of this test failed because the module's own
# comment quotes the pattern it forbids.
SOURCE = "\n".join(line for line in RAW.splitlines() if not line.strip().startswith("#"))


def test_no_parameter_is_used_only_in_a_null_test():
    assert ":status IS NULL" not in SOURCE
    assert "(:only_violations = false" not in SOURCE


def test_every_array_parameter_carries_a_cast():
    for param in ("types", "sevs"):
        assert f"CAST(:{param} AS text[])" in SOURCE, f"{param} needs an explicit text[] cast"


def test_the_boolean_parameters_carry_a_cast():
    for param in ("enabled", "auto", "only_violations"):
        assert f"CAST(:{param} AS boolean)" in SOURCE


def test_the_status_filter_is_applied_by_the_query_not_the_caller():
    assert 'where += " AND status = :status"' in SOURCE
