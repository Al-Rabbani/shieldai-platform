"""Saved report definitions must be tenant-scoped, and a partial edit must not blank the rest.

Measured 23 Nov 2026: CustomReportsPage calls CustomReport.list/create/update/delete across four sites; no table matched
'%report%', while all six sources it queries were served, so a report ran and exported but its definition vanished.
"""
import ast
import re
from pathlib import Path

import pytest

API = Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "custom_reports_api.py"
MIG = Path(__file__).resolve().parents[1] / "migrations" / "security_isolation" / "064_custom_reports.sql"
ADAPTER = Path(__file__).resolve().parents[1] / "apps" / "web" / "src" / "api" / "base44Client.js"


@pytest.fixture(scope="module")
def source() -> str:
    return API.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def migration() -> str:
    return MIG.read_text(encoding="utf-8")


def _statements(source: str) -> list[str]:
    tree = ast.parse(source)
    # ast.walk descends INTO an f-string, so the constant part before {sets} arrives as its own Constant and reads as a
    # statement fragment. Skip those children: only the whole f-string is a statement.
    inner = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.JoinedStr):
            for part in node.values:
                if isinstance(part, ast.Constant):
                    inner.add(id(part))
    out = []
    for node in ast.walk(tree):
        value = None
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            if id(node) in inner:
                continue
            value = node.value
        elif isinstance(node, ast.JoinedStr):
            value = "".join(p.value for p in node.values if isinstance(p, ast.Constant) and isinstance(p.value, str))
        if value and re.match(r"^\s*(SELECT|INSERT|UPDATE|DELETE)\b", value, re.I) and "custom_reports" in value:
            out.append(value)
    return out


def test_every_statement_is_tenant_scoped(source):
    statements = _statements(source)
    assert len(statements) >= 4, statements
    for sql in statements:
        scoped = "tenant_id = :tenant_id" in sql or "INSERT INTO custom_reports (tenant_id" in sql
        assert scoped, sql[:100]


def test_no_bind_parameter_is_followed_by_a_cast(source):
    assert not re.search(r":\w+::", source), "a cast after a bind parameter is unparseable by SQLAlchemy"


def test_a_partial_edit_writes_only_what_was_sent(source):
    assert "exclude_unset=True" in source
    assert "no fields to update" in source


def test_migration_forces_rls_and_grants(migration):
    assert "FORCE ROW LEVEL SECURITY" in migration
    assert "CREATE POLICY gds_custom_reports_tenant" in migration
    assert "GRANT SELECT, INSERT, UPDATE, DELETE ON custom_reports TO gds" in migration
    assert "reports:write" in migration


def test_the_store_derives_nothing(migration):
    sql_only = "\n".join(line.split("--")[0] for line in migration.splitlines()).lower()
    for invented in ("last_run", "row_count", "generated", "risk_score"):
        assert invented not in sql_only, f"{invented} would be a cached claim the page never computes"


def test_the_adapter_serves_the_entity():
    text = ADAPTER.read_text(encoding="utf-8")
    assert 'CustomReport: { path: "/custom-reports" }' in text
