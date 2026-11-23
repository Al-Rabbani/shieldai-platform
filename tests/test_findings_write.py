"""The remediation write path must record, and must not smuggle a status the estate does not use.

Measured 23 Nov 2026: no PATCH /findings/bulk or /findings/{id} existed, security_findings had no remediation_notes or
remediation_started_at, and both fix pages sent status "in_remediation" while the register holds only open, resolved and
accepted_risk. These tests pin the correction.
"""
import ast
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE = ROOT / "apps" / "api" / "gds_api" / "findings_write_api.py"
MIGRATION = ROOT / "migrations" / "security_isolation" / "066_findings_remediation_columns.sql"
TEMPLATE_PAGE = ROOT / "apps" / "web" / "src" / "pages" / "RemediationTemplatesPage.jsx"
TRIAGE_PAGE = ROOT / "apps" / "web" / "src" / "pages" / "TriageQueuePage.jsx"


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
        if value and re.match(r"^\s*(SELECT|UPDATE|INSERT|DELETE)\b", value, re.IGNORECASE):
            out.append(value)
    return out


def test_the_update_is_tenant_scoped():
    statements = _statements(MODULE.read_text(encoding="utf-8"))
    assert statements, "no SQL found"
    for sql in statements:
        assert "tenant_id = :tenant_id" in sql, sql[:120]


def test_the_route_cannot_write_a_status():
    """A template button must not be able to change a finding's state: every open count and SLA band depends on it."""
    source = MODULE.read_text(encoding="utf-8")
    statements = " ".join(_statements(source)).lower()
    assert "status" not in statements, "the remediation write must not touch status"
    for absent in ("in_remediation",):
        assert absent not in statements, f"{absent} is not a status this estate uses"


def test_an_empty_record_is_refused():
    source = MODULE.read_text(encoding="utf-8")
    assert "at least one of remediation_notes" in source


def test_missing_ids_are_reported_not_silently_skipped():
    source = MODULE.read_text(encoding="utf-8")
    assert "missing" in source
    assert "BulkResult" in source


def test_the_migration_adds_columns_without_inventing_a_status():
    sql = MIGRATION.read_text(encoding="utf-8")
    sql_only = "\n".join(line.split("--")[0] for line in sql.splitlines()).lower()
    for column in ("remediation_notes", "remediation_started_at", "remediation_template_id"):
        assert column in sql_only
    assert "in_remediation" not in sql_only


def test_the_apply_payloads_write_no_invented_status():
    """Scoped to the payloads this item fixed. The triage page's own status dropdown and its "fixed"/"false_positive"
    vocabulary are a separate, larger alignment (recorded as item 28) and are not silently declared fixed here."""
    template = TEMPLATE_PAGE.read_text(encoding="utf-8")
    code = re.sub(r"/\*[\s\S]*?\*/", "", template)
    start = code.index("async function applyTemplate")
    payload = code[start:code.index("await base44.entities.RemediationTemplate.update", start)]
    assert 'status: "in_remediation"' not in payload, "the template apply still invents a status"
    assert "remediation_started_at" in payload and "remediation_template_id" in payload

    triage = TRIAGE_PAGE.read_text(encoding="utf-8")
    tcode = re.sub(r"/\*[\s\S]*?\*/", "", triage)
    bstart = tcode.index("async function bulkAssign")
    bpayload = tcode[bstart:tcode.index("setFindings((prev)", bstart)]
    assert 'status: "in_remediation"' not in bpayload, "bulk assign still invents a status"
    assert "owner: name" in bpayload, "assignment must land in the owner column that exists"
