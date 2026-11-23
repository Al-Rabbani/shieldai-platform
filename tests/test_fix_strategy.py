"""The strategy library must persist what a person wrote, and only that.

Measured 23 Nov 2026: FixStrategyLibraryPage performs create/update/delete on FixStrategy and TriageQueuePage reads published
rows by times_reused and writes the counter back. No table matched '%strateg%', so every write vanished.
"""
import ast
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "apps" / "api" / "gds_api" / "fix_strategy_api.py"
MIGRATION = ROOT / "migrations" / "security_isolation" / "061_fix_strategy_store.sql"


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
        if re.match(r"^\s*(SELECT|WITH|INSERT|UPDATE|DELETE)\b", value, re.IGNORECASE) and "fix_strategies" in value:
            out.append(value)
    return out


def test_every_statement_is_tenant_scoped(source):
    statements = _sql(ast.parse(source))
    assert len(statements) >= 4, "expected list, insert, select-one, update and delete"
    for sql in statements:
        scoped = "tenant_id = :tenant_id" in sql or "INSERT INTO fix_strategies\n       (tenant_id" in sql
        assert scoped, sql[:90]


def test_read_and_write_are_gated_separately(source):
    assert 'require_permission("findings:read")' in source
    assert source.count('require_permission("fixes:write")') == 3, "create, update and delete each need it"


def test_the_store_forces_rls_and_grants(migration):
    assert "FORCE ROW LEVEL SECURITY" in migration
    assert "CREATE POLICY" in migration
    assert "TO gds;" in migration and "TO gds_runtime;" in migration


def test_no_derived_judgement_is_stored(migration):
    sql_only = "\n".join(line.split("--")[0] for line in migration.splitlines()).lower()
    for invented in ("success_rate", "effectiveness", "confidence", "rank", "score"):
        assert invented not in sql_only, f"{invented} would be an invented judgement about a strategy"


def test_tags_are_an_array_not_a_string(migration, source):
    assert "tags               text[]" in migration
    assert '"tags": [t.strip() for t in body.tags if t.strip()]' in source, "asyncpg wants a Python sequence for text[]"
