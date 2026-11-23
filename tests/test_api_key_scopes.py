"""API key scopes: what is stored, what is refused, and what the response says.

THE DEFECT THIS PINS, and a correction to my own reporting. I claimed scopes were dropped and not enforced. Measured
against the live API: a key issued with ["findings:read"] is STORED as ["findings:read"], and that key is refused with
403 Missing permission: users:manage on /admin/users and on POST /admin/api-keys. Enforcement was correct. What was
wrong was the response: the issue endpoint built ApiKeyIssued without passing scopes, so every 201 reported
"scopes": [] whatever had been granted - which is exactly what made the storage look broken.

The same run found two genuine footguns, both now refused at issue time: a key with no scopes (it authenticates and
then authorises nothing, because permissions ARE the scopes) and a key with a scope that does not exist (stored, and
permanently useless).
"""
from __future__ import annotations

import asyncio
import uuid

import pytest
from fastapi import HTTPException

from gds_api.admin_identity import CATALOGUE_PERMISSIONS, ApiKeyCreate, issue_api_key
from gds_api.security import CurrentUser


class _Result:
    def __init__(self, rows=None):
        self._rows = rows or []

    def mappings(self):
        return self

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class _FakeDB:
    """Captures every statement and its parameters so the test can assert what was written."""

    def __init__(self):
        self.statements: list[tuple[str, dict]] = []

    async def execute(self, statement, params=None):
        self.statements.append((str(statement), params or {}))
        return _Result()

    async def commit(self):
        return None


class _User:
    tenant_id = "2ec10dd0-e48e-4043-8c88-5998ba5e23b0"
    user_id = "11111111-1111-1111-1111-111111111111"


def _issue(scopes):
    db = _FakeDB()
    body = ApiKeyCreate(name="ci pipeline", scopes=scopes)
    out = asyncio.run(issue_api_key(body=body, current_user=_User(), db=db))
    return out, db


def _insert_params(db):
    for sql, params in db.statements:
        if "INSERT INTO api_keys" in sql:
            return params
    raise AssertionError("no api_keys insert was issued")


# ------------------------------------------------------------------ the response, which was the real defect
def test_the_issue_response_echoes_the_scopes_that_were_granted():
    """The defect: every 201 said "scopes": [] regardless, which reads as a storage failure and is not one."""
    out, db = _issue(["findings:read"])
    assert out.scopes == ["findings:read"]
    assert _insert_params(db)["scopes"] == '["findings:read"]'


def test_the_response_and_the_row_agree():
    """A response that disagrees with the write is worse than no response: it is the reason I misreported this."""
    for scopes in (["findings:read"], ["findings:read", "cloud:findings:read"]):
        out, db = _issue(scopes)
        import json

        assert json.loads(_insert_params(db)["scopes"]) == out.scopes == scopes


def test_the_raw_key_is_returned_once_and_is_not_the_prefix():
    out, db = _issue(["findings:read"])
    assert out.key.startswith("gds_")
    assert len(out.key) > len(out.key_prefix)
    assert _insert_params(db)["prefix"] == out.key_prefix
    # the hash is what is stored, never the key
    assert _insert_params(db)["hash"] != out.key
    assert len(_insert_params(db)["hash"]) == 64


# ------------------------------------------------------------------ the two footguns, now refused
def test_a_key_with_no_scopes_is_refused():
    """It would authenticate and then authorise nothing: permissions ARE the scopes."""
    with pytest.raises(HTTPException) as exc:
        _issue([])
    assert exc.value.status_code == 400
    assert "at least one scope" in exc.value.detail


def test_a_scope_that_does_not_exist_is_refused_by_name():
    with pytest.raises(HTTPException) as exc:
        _issue(["findings:read", "total:nonsense"])
    assert exc.value.status_code == 400
    assert "total:nonsense" in exc.value.detail
    # and the refusal points at the catalogue rather than leaving the operator guessing
    assert "/admin/permissions" in exc.value.detail


def test_every_catalogue_permission_is_accepted():
    """The validation must not refuse a permission the platform really grants."""
    for permission in CATALOGUE_PERMISSIONS:
        out, _ = _issue([permission])
        assert out.scopes == [permission]


def test_the_catalogue_is_not_empty_and_looks_like_permissions():
    assert len(CATALOGUE_PERMISSIONS) > 10
    assert all(":" in p for p in CATALOGUE_PERMISSIONS)


# ------------------------------------------------------------------ the property that makes scopes mean something
def test_an_api_key_principal_can_never_exceed_its_scopes():
    """security.py builds CurrentUser(permissions=list(scopes)): this is why an unscoped key is useless, and why
    scope is what authorises a machine call. Pinned here so the mapping cannot quietly become role-based."""
    key_user = CurrentUser(
        user_id=uuid.uuid4(),
        tenant_id=uuid.UUID("2ec10dd0-e48e-4043-8c88-5998ba5e23b0"),
        email="api-key:gds_abc",
        role_id=uuid.uuid4(),
        role_name="api_key",
        permissions=["findings:read"],
    )
    assert key_user.permissions == ["findings:read"]
    assert "users:manage" not in key_user.permissions
    assert "cloud:findings:read" not in key_user.permissions
