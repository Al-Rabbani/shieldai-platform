"""The tenant id reaches Postgres as a string, or the route answers 500.

Measured 23 Nov 2026 on release a32b17b: GET /intel/ransomware returned 500 with

    asyncpg.exceptions.DataError: invalid input for query argument $1: UUID('2ec10dd0-...')
    (expected str, got UUID)   [SQL: SELECT set_config('gds.tenant_id', $1, true)]

`current_user.tenant_id` is a uuid.UUID. The suite was green because its fixtures supply strings, so nothing
exercised the object the request actually carries. These tests call the handlers with a REAL UUID and assert on
the parameter values handed to the session, which is the layer the failure lived in.
"""
from __future__ import annotations

import asyncio
import pathlib
import re
import uuid
from collections import defaultdict

import pytest

from gds_api import intel_api as m

TENANT = uuid.UUID("2ec10dd0-e48e-4043-8c88-5998ba5e23b0")
API = pathlib.Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api"


def _code(path: pathlib.Path) -> str:
    text = path.read_text()
    text = re.sub(r'""".*?"""', "", text, flags=re.S)
    return re.sub(r"(?m)^\s*#.*$", "", text)


class _Result:
    """Enough of a SQLAlchemy Result for the aggregate reads these handlers perform."""

    def __init__(self, rows=None, one=None):
        self._rows = rows if rows is not None else []
        self._one = one if one is not None else defaultdict(int)

    def mappings(self):
        return self

    def all(self):
        return self._rows

    def one(self):
        return self._one

    def one_or_none(self):
        return self._one


class FakeDb:
    """Records every parameter set the handler binds, and returns empty aggregates."""

    def __init__(self):
        self.params = []

    async def execute(self, statement, params=None):
        self.params.append(dict(params or {}))
        return _Result()


class FakeUser:
    """The real shape: tenant_id is a UUID object, not a string."""

    def __init__(self, tenant_id=TENANT):
        self.tenant_id = tenant_id


def _run(coro):
    return asyncio.run(coro)


def _assert_every_tenant_param_is_a_string(db):
    tenant_params = [p["tid"] for p in db.params if "tid" in p]
    assert tenant_params, "no tenant parameter was bound at all"
    for value in tenant_params:
        assert isinstance(value, str), (
            f"a UUID object reached asyncpg as a tenant parameter ({type(value).__name__}); "
            "set_config and tenant_id = :tid both need str"
        )
        assert value == str(TENANT)


# ------------------------------------------------------------------ the three routes, called with a real UUID
def test_ransomware_binds_the_tenant_as_a_string():
    db = FakeDb()
    _run(m.ransomware_exposure(10, db, FakeUser()))
    _assert_every_tenant_param_is_a_string(db)
    assert len(db.params) >= 2, "the handler should have bound the tenant for its aggregate and its row read"


def test_apt_binds_the_tenant_as_a_string():
    db = FakeDb()
    _run(m.apt_coverage(db, FakeUser()))
    _assert_every_tenant_param_is_a_string(db)


def test_dark_web_binds_the_tenant_as_a_string():
    db = FakeDb()
    _run(m.dark_web_coverage(db, FakeUser()))
    _assert_every_tenant_param_is_a_string(db)


# ------------------------------------------------------------------ and the source cannot drift back
def test_no_intel_handler_passes_the_raw_tenant_id():
    code = _code(API / "intel_api.py")
    assert "tid = current_user.tenant_id" not in code, (
        "a raw UUID is being bound again: asyncpg raises DataError and the route answers 500"
    )
    assert code.count("tid = str(current_user.tenant_id)") == 3


def test_every_route_still_declares_the_read_permission():
    """A refusal must come from require_permission, not from an unauthenticated handler."""
    code = _code(API / "intel_api.py")
    assert code.count('require_permission("findings:read")') == 3
