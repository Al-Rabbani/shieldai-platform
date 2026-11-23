"""Incident response tasks must be tenant-scoped, priority-ordered by rank, and never invent a status.

Measured 23 Nov 2026: IncidentResponsePage seeded five default tasks and an initial-investigation task per incident, and
every one vanished because no table existed; it also wrote status "investigating" to incidents, which holds only open.
"""
import ast
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE = ROOT / "apps" / "api" / "gds_api" / "incident_tasks_api.py"
MIGRATION = ROOT / "migrations" / "security_isolation" / "067_incident_tasks.sql"
PAGE = ROOT / "apps" / "web" / "src" / "pages" / "IncidentResponsePage.jsx"
INCIDENTS = ROOT / "apps" / "api" / "gds_api" / "incidents.py"


def _statements(source: str) -> list[str]:
    tree = ast.parse(source)
    nested = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.JoinedStr):
            for child in node.values:
                if isinstance(child, ast.Constant):
                    nested.add(id(child))
    out = []
    for node in ast.walk(tree):
        value = None
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and id(node) not in nested:
            value = node.value
        elif isinstance(node, ast.JoinedStr):
            value = "".join(p.value for p in node.values if isinstance(p, ast.Constant) and isinstance(p.value, str))
        if value and re.match(r"^\s*(SELECT|WITH|INSERT|UPDATE|DELETE)\b", value, re.IGNORECASE):
            out.append(value)
    return out


def test_every_statement_is_tenant_scoped():
    statements = _statements(MODULE.read_text(encoding="utf-8"))
    assert statements
    for sql in statements:
        assert "tenant_id = :tenant_id" in sql or "INSERT INTO incident_tasks" in sql, sql[:120]


def test_priority_is_ranked_not_alphabetical():
    """Ordering priority as text would put medium first and critical last, which is the opposite of the page's intent."""
    source = MODULE.read_text(encoding="utf-8")
    assert "CASE priority WHEN 'critical' THEN 0" in source
    for value in ("critical", "high", "medium"):
        assert value in source


def test_both_post_shapes_are_accepted():
    """create() posts one object and bulkCreate() posts {items: [...]} to the same path."""
    source = MODULE.read_text(encoding="utf-8")
    assert 'if "items" in body' in source
    assert "TaskCreate(**item)" in source and "TaskCreate(**body)" in source


def test_completing_a_task_records_when():
    source = MODULE.read_text(encoding="utf-8")
    assert 'provided.get("status") == "completed"' in source
    assert 'provided["completed_at"]' in source


def test_the_migration_constrains_status_and_priority_and_grants():
    sql = MIGRATION.read_text(encoding="utf-8")
    sql_only = "\n".join(line.split("--")[0] for line in sql.splitlines()).lower()
    assert "check (status in ('open', 'completed'))" in sql_only
    assert "check (priority in ('critical', 'high', 'medium', 'low'))" in sql_only
    assert "references incidents(id) on delete cascade" in sql_only
    assert "force row level security" in sql_only
    assert "grant select, insert, update, delete on incident_tasks to gds" in sql_only
    # no invented incident status
    assert "investigating" not in sql_only


def test_the_page_does_not_write_an_invented_incident_status():
    text = PAGE.read_text(encoding="utf-8")
    code = re.sub(r"/\*[\s\S]*?\*/", "", text)
    code = re.sub(r"^\s*//.*$", "", code, flags=re.M)
    assert 'status: "investigating"' not in code, "the page still writes a status the incidents table does not hold"
    assert "assigned_to: engineer" in code, "the assignment itself must still be recorded"


def test_the_assignment_route_refuses_an_empty_assignee():
    source = INCIDENTS.read_text(encoding="utf-8")
    assert "assigned_to is required" in source
    assert "assigned_at = now()" in source
