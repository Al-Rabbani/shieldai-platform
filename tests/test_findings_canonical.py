"""The findings read path must point at the table that holds findings.

Before this, GET /findings queried the legacy ORM model over a table that is empty by design, and still held
317 stale rows with status 'observed'. The console's main page showed those while 873 findings sat open in
security_findings, and the ?status= filter was accepted and ignored.
"""
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "findings.py"


def _list_findings_source() -> str:
    text = SRC.read_text(encoding="utf-8")
    start = text.index("async def list_findings(")
    end = text.index("async def findings_summary(")
    return text[start:end]


def test_reads_the_authoritative_table():
    body = _list_findings_source()
    assert "FROM security_findings" in body
    assert "select(Finding)" not in body, "the legacy ORM table is empty by design and must not be the read path"


def test_jsonb_columns_are_cast_before_coalescing():
    # details is jsonb; coalesce(details, '') makes Postgres parse '' as JSON and raises
    # InvalidTextRepresentationError: invalid input syntax for type json. This was a live 500.
    body = _list_findings_source()
    assert "details::text" in body
    assert "coalesce(details, '')" not in body


def test_status_and_severity_filters_are_actually_applied():
    body = _list_findings_source()
    assert "status = :status" in body
    assert "severity = :severity" in body


def test_paging_is_bounded():
    body = _list_findings_source()
    assert "LIMIT :limit" in body and "OFFSET :offset" in body
    assert "min(max(limit, 1), 1000)" in body


def test_summary_counts_in_sql_not_from_a_page():
    text = SRC.read_text(encoding="utf-8")
    start = text.index("async def findings_summary(")
    body = text[start:start + 2000]
    assert "count(*) FILTER" in body, "counts must come from an aggregate, not from whatever page was fetched"
    assert "FROM security_findings" in body
