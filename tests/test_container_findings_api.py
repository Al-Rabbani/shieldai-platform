"""The container CVE surface must read the rows that exist, and never present a page as a total.

Measured 22 Nov 2026: `findings` holds 317 rows - 314 trivy_container and 3 cspm - and before this module no
route could return the 314. These invariants keep it that way, and they are checked by parsing the module's
source rather than importing it, so they do not depend on a database or on the API's environment being loaded:

  * every statement filters the one container source;
  * every statement is tenant-scoped by explicit predicate (findings is FORCE RLS);
  * filters arrive as bound parameters, never interpolated text;
  * both endpoints are permission-gated;
  * the list response carries a count of everything matching, not the length of the page;
  * a null column stays null instead of being defaulted into a confident-looking value.
"""
import ast
from pathlib import Path

import pytest

MODULE = Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "container_findings_api.py"


@pytest.fixture(scope="module")
def source() -> str:
    return MODULE.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def tree(source) -> ast.Module:
    return ast.parse(source)


def _functions(tree):
    return {n.name: n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}


def test_the_module_reads_only_the_container_source(source):
    # A route that stopped filtering by source would start presenting cloud posture rows as container CVEs.
    assert 'CONTAINER_SOURCE = "trivy_container"' in source
    assert source.count("source = :source") >= 4, "every statement must filter on the source"


def test_every_statement_is_tenant_scoped(source):
    assert source.count("tenant_id = :tenant_id") >= 4


def test_filters_are_bound_parameters(source):
    # Severities, image names and search patterns come from the caller; they must never be formatted into SQL.
    for marker in (":severity", ":status_filter", ":image", ":cve", ":search"):
        assert marker in source
    # "isoformat(" is legitimate; building SQL with str.format is not.
    assert ".format(" not in source, "SQL must not be built with str.format"
    assert "%s" not in source, "SQL must not be built with printf placeholders"
    # The one f-string in the module may interpolate the column list constant and nothing else.
    assert "{_COLUMNS}" in source
    assert "_LIST_SQL = f\"\"\"" in source


def test_both_endpoints_are_permission_gated(tree):
    funcs = _functions(tree)
    for name in ("list_container_findings", "container_findings_summary"):
        assert name in funcs, f"{name} is missing"
        args = [a.arg for a in funcs[name].args.args]
        assert "current_user" in args, f"{name} is not permission-gated"


def test_the_list_endpoint_reports_a_total_not_a_page_length(source, tree):
    assert "count(*)" in source
    funcs = _functions(tree)
    body = ast.get_source_segment(source, funcs["list_container_findings"]) or ""
    assert '"count": total' in body, "the response must carry the matching count"


def test_a_null_column_is_not_turned_into_a_value(tree):
    # _row_to_out must copy the row through, not substitute defaults for absent data.
    funcs = _functions(tree)
    body = ast.get_source_segment(MODULE.read_text(encoding="utf-8"), funcs["_row_to_out"]) or ""
    assert " or " not in body.replace('" or "', ""), "a null field must not be defaulted"
    assert "0 if" not in body and "0.0 if" not in body
    assert '"unknown"' not in body and '"n/a"' not in body
