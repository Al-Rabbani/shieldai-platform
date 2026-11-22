"""The team roster must be real people, and its absences must be named rather than counted as zero.

Measured 22 Nov 2026 before the module was written: there is no team_members table. `users` carries id, tenant_id,
role_id, email, is_active, created_at and the MFA columns, and `roles` carries name, so four routed pages that ask for
a TeamMember to fill assignment dropdowns (Assets, Risk Thresholds, Vulnerability Management, escalation settings) can
read the tenant's real people instead of an empty list.

Checked by parsing the module's source, like the host and container route tests, so these hold without a database:
  * every statement is tenant-scoped by an explicit predicate, on top of FORCE RLS;
  * the secret columns are never selected, so they cannot reach a response or a log;
  * no display name is invented - `name` is the email, the identity the platform actually holds;
  * the two absences (Slack identity, per-member escalation settings) are named in the response.
"""
import ast
import re
from pathlib import Path

import pytest

MODULE = Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "team_api.py"


@pytest.fixture(scope="module")
def source() -> str:
    return MODULE.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def tree(source) -> ast.Module:
    return ast.parse(source)


def _sql_strings(tree) -> list[str]:
    """Only real statements. A docstring that mentions the word "selected" is not SQL."""
    docstrings = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            doc = ast.get_docstring(node, clean=False)
            if doc:
                docstrings.add(doc)
    out = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            text = node.value
            if text in docstrings:
                continue
            if re.match(r"^\s*(SELECT|WITH)\b", text, re.IGNORECASE) and re.search(r"\bFROM\b", text, re.IGNORECASE):
                out.append(text)
    return out


def test_every_statement_is_tenant_scoped(tree):
    statements = _sql_strings(tree)
    assert statements, "expected SQL in the module"
    for sql in statements:
        assert "tenant_id = :tenant_id" in sql, f"statement not tenant-scoped: {sql[:80]}"


def test_secret_columns_are_never_selected(source, tree):
    for sql in _sql_strings(tree):
        lowered = sql.lower()
        for column in ("password_hash", "mfa_secret", "mfa_enabled", "mfa_enrolled_at"):
            assert column not in lowered, f"{column} must never be selected"


def test_no_display_name_is_invented(source):
    assert '"name": m["email"]' in source, "name must be the real email, not a made-up or blank value"
    assert "display_name" not in source.split('"""', 2)[-1], "there is no display_name column to read"


def test_both_absences_are_named(source):
    assert "slack_user_id" in source and "No Slack identity is stored" in source
    assert "escalation_settings" in source and "no per-member escalation store" in source.lower()


def test_router_is_tenant_roster_only(tree):
    prefix = None
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and (getattr(node.func, "id", None) or getattr(node.func, "attr", "")) == "APIRouter":
            for kw in node.keywords:
                if kw.arg == "prefix":
                    prefix = kw.value.value
    assert prefix == "/team", f"router prefix must be /team, got {prefix}"
