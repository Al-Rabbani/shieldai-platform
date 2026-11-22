"""The attack surface route must count what is linked and must not invent what was never measured.

Measured 22 Nov 2026: cloud_assets holds 145 rows, only 73 carry an exposure measurement, and
cloud_finding_contexts holds 3 rows in total. security_findings has no asset_id column at all, so a
per-asset finding count can only come from cloud_finding_contexts.

These invariants are checked by parsing the module source, so they hold without a database:

  * every statement is tenant-scoped by explicit predicate (cloud_assets is FORCE RLS);
  * a caller-supplied filter is a bound parameter cast at each appearance;
  * cve_count and technologies are stated nulls, not zeros;
  * the card's three states survive: the response never turns an unknown exposure into false;
  * the summary counts assets once, not once per linked finding.
"""
import ast
from pathlib import Path

import pytest

MODULE = Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "cloud" / "attack_surface_api.py"


@pytest.fixture(scope="module")
def source() -> str:
    return MODULE.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def tree(source) -> ast.Module:
    return ast.parse(source)


def _functions(tree):
    return {n.name: n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}


def test_every_statement_is_tenant_scoped(source):
    assert source.count("a.tenant_id = :tenant_id") == 2, "both statements must scope by tenant"


def test_filters_are_bound_and_cast(source):
    # The exact failure mode that made GET /containers/findings return 500: a parameter that only
    # ever appears as `:p IS NULL` has no column for asyncpg to type it against.
    assert "cast(:asset_type AS text)" in source
    assert "cast(:provider AS text)" in source
    assert source.count("cast(:asset_type AS text)") == 2, "cast at every appearance"
    assert source.count("cast(:provider AS text)") == 2, "cast at every appearance"
    assert ".format(" not in source, "SQL must not be built with str.format"
    assert "%s" not in source, "SQL must not be built with printf placeholders"


def test_unmeasured_columns_are_stated_nulls(source):
    # A zero here would read as "measured, nothing found". Nothing measured these.
    assert "NULL::text AS cve_count" in source
    assert "NULL::text AS technologies" in source


def _code_without_docstring(tree, source) -> str:
    """The module docstring explains what was measured, including tables this route must not read."""
    doc = ast.get_docstring(tree)
    return source.replace(doc, "", 1) if doc else source


def test_finding_count_comes_from_the_only_link_that_exists(tree, source):
    code = _code_without_docstring(tree, source)
    assert "FROM cloud_finding_contexts c" in code
    assert "JOIN findings f ON f.id = c.finding_id" in code
    # security_findings has no asset column; referencing one would be a lie the SQL could not execute.
    assert "security_findings" not in code, "the SQL must not reference a table with no asset link"


def test_summary_counts_assets_once_not_once_per_finding(source):
    assert "count(DISTINCT a.id) AS assets" in source
    assert "count(DISTINCT c.cloud_asset_id) AS assets_with_linked_findings" in source


def test_both_endpoints_are_permission_gated(tree):
    funcs = _functions(tree)
    for name in ("list_attack_surface", "attack_surface_summary"):
        assert name in funcs, f"{name} must exist"
        src = ast.get_source_segment(
            MODULE.read_text(encoding="utf-8"), funcs[name]
        )
        assert 'require_permission("cloud:assets:read")' in src, f"{name} must be gated"


def test_the_response_separates_unknown_from_internal(source):
    # The card prints INTERNAL for a falsy exposure, so an unknown must reach it as null.
    assert '"is_internet_facing": r["is_internet_facing"]' in source
    assert "exposure_unknown" in source
