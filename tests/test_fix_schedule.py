"""The fix calendar must persist what a person placed, and only what they placed.

Measured 23 Nov 2026: FixCalendarPage and FixPlanningBoardPage perform create/update/delete on FixScheduleItem across 11
call sites, and no table matched fix/schedul, so every write was refused while the board looked saved.
"""
import ast
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "apps" / "api" / "gds_api" / "fix_schedule_api.py"
MIGRATION = ROOT / "migrations" / "security_isolation" / "060_fix_schedule_store.sql"


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
        text_value = None
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            text_value = node.value
        elif isinstance(node, ast.JoinedStr):
            # _SELECT and _SELECT_ONE are f-strings, so their text arrives as a JoinedStr, not a Constant
            text_value = "".join(
                part.value for part in node.values if isinstance(part, ast.Constant) and isinstance(part.value, str)
            )
        if text_value is None or text_value in docs:
            continue
        if re.match(r"^\s*(SELECT|WITH|INSERT|UPDATE|DELETE)\b", text_value, re.IGNORECASE) and "fix_schedule_items" in text_value:
            out.append(text_value)
    return out


def test_every_statement_is_tenant_scoped(source):
    tree = ast.parse(source)
    statements = _sql(tree)
    assert len(statements) >= 5, "expected select, select-one, upsert, update and delete"
    for sql in statements:
        # an INSERT scopes by binding the tenant_id column; every other statement filters on it
        scoped = "tenant_id = :tenant_id" in sql or ("INSERT INTO fix_schedule_items (tenant_id" in sql)
        assert scoped, sql[:90]


def test_finding_id_is_never_coerced(source):
    """Two registers: integer scanner ids and UUID governed ids. The caller's string is stored as given."""
    assert "finding_id: str" in source
    assert "uuid.UUID = body.finding_id" not in source
    assert "findings.id = :finding_id" not in source


def test_read_and_write_are_gated_by_different_permissions(source):
    assert 'require_permission("findings:read")' in source
    assert source.count('require_permission("findings:schedule")') == 3, "create, move and unschedule each need it"


def test_the_store_forces_rls_and_grants(migration):
    assert "FORCE ROW LEVEL SECURITY" in migration
    assert "CREATE POLICY" in migration
    assert "TO gds;" in migration and "TO gds_runtime;" in migration
    assert "UNIQUE (tenant_id, finding_id)" in migration, "one placement per finding per tenant"


def test_no_derived_priority_is_stored(migration):
    # comments are prose: the migration's own note says these are NOT stored, so assert against the SQL only
    sql_only = "\n".join(line.split("--")[0] for line in migration.splitlines()).lower()
    for invented in ("priority", "risk_score", "strategy", "effort"):
        assert invented not in sql_only, f"{invented} would be an invented judgement, not a placement"
