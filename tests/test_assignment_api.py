"""Assignment rules must store, and must assign only what they can match.

Measured 23 Nov 2026: AssignmentRulesPage saved rules into a table that did not exist above the promise "New findings
matching it are assigned on discovery"; nothing assigned anything; security_findings had no owner column; and the form's
asset_type could never match because 0 of 849 open findings carry an asset type.
"""
import ast
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "apps" / "api" / "gds_api" / "assignment_api.py"
MIGRATION = ROOT / "migrations" / "security_isolation" / "063_assignment_rules.sql"


@pytest.fixture(scope="module")
def source() -> str:
    return MODULE.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def migration() -> str:
    return MIGRATION.read_text(encoding="utf-8")


def _sql(tree) -> list[str]:
    docs = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef)):
            doc = ast.get_docstring(node, clean=False)
            if doc:
                docs.add(doc)
    out = []
    for node in ast.walk(tree):
        value = None
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            value = node.value
        elif isinstance(node, ast.JoinedStr):
            value = "".join(p.value for p in node.values if isinstance(p, ast.Constant) and isinstance(p.value, str))
        if value is None or value in docs:
            continue
        if re.match(r"^\s*(SELECT|WITH|INSERT|UPDATE|DELETE)\b", value, re.IGNORECASE):
            if "assignment_rules" in value or "security_findings" in value:
                out.append(value)
    return out


def test_every_statement_is_tenant_scoped(source):
    statements = _sql(ast.parse(source))
    assert len(statements) >= 7, f"expected the rule and finding statements, found {len(statements)}"
    for sql in statements:
        scoped = "tenant_id = :tenant_id" in sql or "INSERT INTO assignment_rules" in sql and "(tenant_id" in sql
        assert scoped, sql[:100]


def test_no_bind_parameter_is_followed_by_a_cast(source):
    sql_only = "\n".join(line.split("#")[0] for line in source.splitlines())
    assert not re.search(r":[a-z_]+::", sql_only)


def test_assignment_never_overwrites_an_owner(source):
    assign = source[source.index("async def _assign("):source.index("async def _assign(") + 700]
    assert "owner IS NULL" in assign, "an owned finding must never be reassigned"
    assert "SET owner = :owner" in assign


def test_apply_is_a_preview_unless_asked(source):
    assert "apply = bool(body.apply) if body else False" in source
    assert "if apply and assignable:" in source


def test_read_and_write_are_gated_separately(source):
    assert 'require_permission("findings:read")' in source
    assert source.count('require_permission("findings:assign")') == 4, "create, update, delete and apply"


def test_asset_type_is_not_a_match_key(source):
    assert "asset_type" not in source.split('"""', 2)[2].lower(), "no finding records an asset type, so it cannot match"


def test_the_store_and_the_owner_column_exist(migration):
    assert "CREATE TABLE IF NOT EXISTS assignment_rules" in migration
    assert "ALTER TABLE security_findings ADD COLUMN IF NOT EXISTS owner text" in migration
    assert "FORCE ROW LEVEL SECURITY" in migration
    assert "TO gds;" in migration and "TO gds_runtime;" in migration
