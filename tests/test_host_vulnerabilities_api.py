"""The VM page's estate must be the one that exists, and its absences must be named, not printed as zero.

Measured 22 Nov 2026: no vm_findings or vm_scans table exists (information_schema matched only
webhook_endpoints), while findings holds 60 OSV rows for host packages - 55 resolved, 5 open. The builder's VM
Security page asked for the two absent names, so the adapter refused both and the page printed "No VM findings
found", which reads as a clean estate.

Checked by parsing the module's source, like the container route tests, so these hold without a database:
  * the module reads the one host source and no other;
  * every statement is tenant-scoped by explicit predicate (findings is FORCE RLS);
  * 'observed' counts as open, because that is the platform's fresh state;
  * the list response carries a count of everything matching, not the length of the page;
  * the absences are named, and no instance figure is invented.
"""
import ast
from pathlib import Path

import pytest

MODULE = Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "host_vulnerabilities_api.py"


@pytest.fixture(scope="module")
def source() -> str:
    return MODULE.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def tree(source) -> ast.Module:
    return ast.parse(source)


def test_reads_only_the_host_source(source):
    assert 'HOST_SOURCE = "osv"' in source
    assert source.count("source = :source") >= 3, "every statement must filter on the source"


def test_every_statement_is_tenant_scoped(source):
    for name in ("_LIST_SQL", "_COUNT_SQL", "_SUMMARY_SQL"):
        start = source.index(f"{name} =")
        # Slice to the closing triple quote rather than a fixed length: a fixed window truncated the
        # summary's WHERE clause and failed on a statement that is in fact scoped.
        end = source.index('"""', source.index('"""', start) + 3)
        block = source[start:end]
        assert "tenant_id = :tenant_id" in block, f"{name} is not tenant-scoped"


def test_observed_counts_as_open(source):
    # A page that filters status == 'open' shows zero over this estate: the platform stores 'observed'.
    assert 'CLOSED_STATES = ("resolved", "accepted_risk", "false_positive")' in source
    assert "status NOT IN ('resolved','accepted_risk','false_positive')" in source
    assert "status = 'observed'" not in source


def test_both_endpoints_are_permission_gated(tree):
    funcs = {n.name: n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
    for name in ("list_host_vulnerabilities", "host_vulnerability_summary"):
        assert name in funcs, f"{name} missing"
        text = ast.dump(funcs[name])
        assert "require_permission" in text, f"{name} is not permission-gated"


def test_the_list_reports_a_total_not_a_page_length(source):
    start = source.index("async def list_host_vulnerabilities")
    block = source[start:start + 1200]
    assert '"count": total' in block
    assert '"returned": len(findings)' in block


def test_absences_are_named_and_never_a_zero(source):
    start = source.index('"not_measured"')
    block = source[start:start + 500]
    assert "instances_scanned" in block
    assert "endpoint_agents" in block
    # The whole point: no fabricated figure. A zero would be read as a measured clean state.
    assert "instances_scanned\": 0" not in block
    assert "no VM or endpoint scan store exists" in block
