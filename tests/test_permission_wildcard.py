"""A role holding `*` must pass every permission gate; every other role must not.

The denial path needs a database session to write its audit record, so denial is proven live (a 403 for the
analyst role) rather than here. This file pins the allow path, which is where the defect was: the owner's own
role was refused because `*` was compared literally.
"""
import asyncio
import pathlib

from gds_api.security import CurrentUser, require_permission

SOURCE = pathlib.Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "security.py"


def user(permissions, role_name="admin"):
    return CurrentUser(
        user_id="2b0d4c22-2c1c-4f2e-9d0f-0d3a1c6b7e11",
        tenant_id="2ec10dd0-e48e-4043-8c88-5998ba5e23b0",
        email="president@globaldigitalstreams.com",
        role_id="6c15f716-f198-411d-8bc4-0774b1a0cc75",
        role_name=role_name,
        permissions=permissions,
    )


def test_the_wildcard_passes_a_permission_the_role_does_not_name():
    dep = require_permission("users:manage")
    passed = asyncio.run(dep(current_user=user(["*", "read"]), db=None))
    assert passed.permissions == ["*", "read"]


def test_the_wildcard_passes_the_provisioning_gate_too():
    dep = require_permission("tenants:manage")
    assert asyncio.run(dep(current_user=user(["*"]), db=None)) is not None


def test_a_named_permission_still_passes_without_the_wildcard():
    dep = require_permission("audit:read")
    assert asyncio.run(dep(current_user=user(["audit:read"], role_name="analyst"), db=None)) is not None


def test_the_check_reads_the_wildcard():
    source = SOURCE.read_text(encoding="utf-8")
    assert 'or "*" in current_user.permissions' in source, (
        "require_permission stopped honouring the wildcard; the owner's role will 403 on users:manage again"
    )
