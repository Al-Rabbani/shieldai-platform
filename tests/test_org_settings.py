"""The settings page must save to a real store, and only the SLA hours may change behaviour.

Measured 23 Nov 2026: GDSSettingsPage wrote OrgSettings.update/create behind `.catch(() => {})` and then showed "Settings
saved", so nothing was written and nothing failed visibly. No settings table existed.
"""
import ast
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "apps" / "api" / "gds_api" / "org_settings_api.py"
MIGRATION = ROOT / "migrations" / "security_isolation" / "062_org_settings_store.sql"
PAGE = ROOT / "apps" / "web" / "src" / "pages" / "GDSSettingsPage.jsx"


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
        if re.match(r"^\s*(SELECT|WITH|INSERT|UPDATE|DELETE)\b", value, re.IGNORECASE) and "org_settings" in value:
            out.append(value)
    return out


def test_every_statement_is_tenant_scoped(source):
    statements = _sql(ast.parse(source))
    assert len(statements) >= 3
    for sql in statements:
        scoped = "tenant_id = :tenant_id" in sql or "INSERT INTO org_settings (tenant_id" in sql
        assert scoped, sql[:90]


def test_one_row_per_tenant(migration):
    assert "tenant_id           uuid NOT NULL UNIQUE" in migration, "a second save must update, not append"
    assert "ON CONFLICT (tenant_id)" in migration.replace("\n", " ") or "ON CONFLICT (tenant_id)" in (
        ROOT / "apps" / "api" / "gds_api" / "org_settings_api.py"
    ).read_text(encoding="utf-8")


def test_sla_hours_are_nullable_so_no_number_is_invented(migration):
    for column in ("sla_critical_hours  integer,", "sla_high_hours      integer,", "sla_medium_hours    integer,"):
        assert column in migration, f"{column} must be nullable: NULL means 'use the platform ladder'"


def test_read_and_write_are_gated_separately(source):
    assert 'require_permission("findings:read")' in source
    assert 'require_permission("settings:write")' in source


def test_the_api_states_which_settings_are_enforced(source):
    assert "ENFORCED_BY" in source
    assert "no auto-triage, auto-fix" in source.lower() or "no auto-triage, auto-fix" in source


def _rendered_page() -> str:
    """Comments are prose: this page's own comment NAMES the swallowed pattern it removed."""
    text = PAGE.read_text(encoding="utf-8")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"//[^\n]*", "", text)


def test_the_page_no_longer_swallows_failures():
    text = _rendered_page()
    assert ".catch(() => {})" not in text, "a swallowed save is a save that reports success while writing nothing"
    assert "setSaveError" in text
    assert "Settings were not saved" in text
    assert "no engine on this" in text
