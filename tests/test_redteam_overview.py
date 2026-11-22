"""The offensive side must report what it holds and name what it does not.

Measured 22 Nov 2026: CloudAttackPath, AttackSimulation, PentestCampaign and AttackFinding have no table (only
prompt_attacks matched '%attack%'), so Red Team Command's four counters were fetched-array lengths and printed 0 beside a
real risk score. authorized_targets holds 2 rows, red_team_safety_state 1, engagements 0, pentest_authorizations 0,
pentest_agreements 0.
"""
import ast
import re
from pathlib import Path

import pytest

MODULE = Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "redteam_overview_api.py"


@pytest.fixture(scope="module")
def source() -> str:
    return MODULE.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def tree(source) -> ast.Module:
    return ast.parse(source)


def _sql(tree) -> list[str]:
    docstrings = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef)):
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
    statements = _sql(tree)
    assert statements
    for sql in statements:
        assert "tenant_id = :tenant_id" in sql, sql[:80]


def test_the_four_absent_stores_are_named(source):
    for name in ("CloudAttackPath", "AttackSimulation", "PentestCampaign", "AttackFinding"):
        assert f'"{name}":' in source, f"{name} must be named as not served"


def test_counts_come_from_stores_that_exist(tree):
    joined = " ".join(_sql(tree)).lower()
    for table in ("authorized_targets", "engagements", "pentest_authorizations", "pentest_agreements"):
        assert table in joined, f"{table} must be counted from the real table"
    for absent in ("cloud_attack_paths", "attack_simulations", "attack_findings"):
        assert absent not in joined, f"{absent} does not exist and must not be queried"


def test_route_is_read_gated(source):
    assert 'require_permission("redteam:read")' in source
    assert "get_safety_state" in source, "the emergency-stop latch is the real state, not a copy"


def test_no_coverage_figure_is_invented(source):
    assert "mitre" not in source.lower(), "MITRE coverage is not measured here and must not be asserted"
