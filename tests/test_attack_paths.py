"""Attack paths must be reported as unmeasured, never as zero-and-therefore-clean.

Measured 23 Nov 2026: no attack-path store exists and cloud_asset_relationships holds 0 edges against 145 assets, while
three routed surfaces read CloudAttackPath and rendered the result as "0 critical attack paths" and "Active attack paths 0".
"""
import ast
import re
from pathlib import Path

import pytest

MODULE = Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "attack_paths_api.py"


@pytest.fixture(scope="module")
def source() -> str:
    return MODULE.read_text(encoding="utf-8")


def test_every_statement_is_tenant_scoped(source):
    tree = ast.parse(source)
    statements = [
        n.value for n in ast.walk(tree)
        if isinstance(n, ast.Constant) and isinstance(n.value, str)
        and re.match(r"^\s*SELECT\b", n.value, re.IGNORECASE)
    ]
    assert statements, "expected the counts statement"
    for sql in statements:
        assert "tenant_id = :tenant_id" in sql, sql[:90]


def test_no_path_is_derived(source):
    assert '"items": []' in source, "with no store and no edges, a path would have to be invented"
    assert '"count": 0' in source


def test_the_route_names_what_is_missing(source):
    assert "NOT_SERVED" in source
    assert "CloudAttackPath" in source
    assert "no graph engine" in source.lower() or "No graph engine" in source


def test_it_is_read_gated(source):
    assert 'require_permission("cloud:findings:read")' in source
