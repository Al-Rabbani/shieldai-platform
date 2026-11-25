"""A write must not depend on a read it makes after commit.

Measured 25 Nov 2026: DELETE /admin/api-keys/{id} answered 500 for a revoke that had succeeded - the key really
did stop authenticating (401 afterwards) - because the route re-read the row after commit, and _bind sets
gds.tenant_id with is_local=true, so the binding died with the transaction and FORCE RLS returned zero rows.

This is the same family as the 46 db.refresh()-after-commit call sites fixed earlier, in its raw-SQL form.
"""
import re
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "apps/api/gds_api/admin_identity.py"


def _revoke_source() -> str:
    text = SRC.read_text()
    start = text.index("async def revoke_api_key")
    end = text.index("@router.", start + 10) if "@router." in text[start + 10 :] else len(text)
    return text[start:end]


def test_revoke_returns_the_row_from_the_write_not_a_read_after_commit():
    body = _revoke_source()
    assert "RETURNING" in body, "the revoke must capture its row from the UPDATE itself"
    commit_at = body.index("await db.commit()")
    after = body[commit_at:]
    assert "SELECT" not in after.upper(), (
        "no read may happen after commit on an RLS table: the tenant binding is transaction-local"
    )


def test_revoke_still_refuses_an_unknown_key():
    body = _revoke_source()
    assert "404" in body
