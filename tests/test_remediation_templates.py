"""Remediation templates must be tenant-scoped, and the usage counter must only move when someone applies one.

Measured 23 Nov 2026: RemediationTemplateForm created templates, both pages filtered them by is_active sorted by
usage_count, and no table existed. These tests pin the three things that would let it rot back: a statement without a
tenant predicate, a write gated by a read permission, and a derived number stored as if it were measured.
"""
import ast
import pathlib
import re

MODULE = pathlib.Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "remediation_templates_api.py"
MIGRATION = (
    pathlib.Path(__file__).resolve().parents[1]
    / "migrations"
    / "security_isolation"
    / "065_remediation_templates.sql"
)


def _statements(source: str) -> list[str]:
    """SQL strings in the module. Constants that are children of an f-string are skipped: ast.walk descends into an
    f-string, so the literal part before a {placeholder} would otherwise read as a statement of its own."""
    tree = ast.parse(source)
    nested = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.JoinedStr):
            for child in node.values:
                if isinstance(child, ast.Constant):
                    nested.add(id(child))
    out = []
    for node in ast.walk(tree):
        text_value = None
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and id(node) not in nested:
            text_value = node.value
        elif isinstance(node, ast.JoinedStr):
            text_value = "".join(
                part.value for part in node.values if isinstance(part, ast.Constant) and isinstance(part.value, str)
            )
        if not text_value:
            continue
        if re.match(r"^\s*(SELECT|WITH|INSERT|UPDATE|DELETE)\b", text_value, re.IGNORECASE) and "remediation_templates" in text_value:
            out.append(text_value)
    return out


def test_every_statement_is_tenant_scoped():
    statements = _statements(MODULE.read_text(encoding="utf-8"))
    assert len(statements) >= 5, statements
    for sql in statements:
        scoped = "tenant_id = :tenant_id" in sql or "INSERT INTO remediation_templates" in sql
        assert scoped, sql[:120]


def test_reads_need_only_the_read_permission_and_writes_need_the_write_one():
    source = MODULE.read_text(encoding="utf-8")
    # a template can be read by anyone who can read findings; authoring one is a fix act
    assert source.count('require_permission("findings:read")') == 1
    assert source.count('require_permission("fixes:write")') == 3


def test_no_derived_number_is_stored():
    """usage_count is the only counter, and it moves only when a caller says a template was applied."""
    source = MODULE.read_text(encoding="utf-8")
    for invented in ("risk_score", "success_rate", "times_applied_auto", "last_run", "match_count"):
        assert invented not in source, f"{invented} would be a claim nothing measures"


def test_the_migration_grants_and_forces_rls():
    sql = MIGRATION.read_text(encoding="utf-8")
    sql_only = "\n".join(line.split("--")[0] for line in sql.splitlines()).lower()
    assert "force row level security" in sql_only
    assert "grant select, insert, update, delete on remediation_templates to gds" in sql_only
    assert "grant select on remediation_templates to gds_runtime" in sql_only
    # a negative counter is not a usage count
    assert "check (usage_count >= 0)" in sql_only


def test_the_usage_sort_is_indexed():
    """Both call sites sort by usage_count; an unindexed sort would read the whole tenant table each time."""
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "remediation_templates_active_usage_idx" in sql
    assert "usage_count desc" in sql.lower()
