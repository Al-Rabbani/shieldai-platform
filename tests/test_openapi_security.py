"""Every route must declare how it is authenticated (P4 / B21).

Before this, the schema had no securitySchemes and 0 of 324 operations said how they were
protected, so a generated client could not distinguish /auth/login from /findings. These tests
pin the declarations to the routes that actually exist, so a new route cannot ship undeclared.
"""
from __future__ import annotations

import pytest

from gds_api.main import _PUBLIC_OPENAPI_PATHS, app

METHODS = ("get", "post", "put", "patch", "delete", "head", "options")
# Served by FastAPI itself rather than declared as APIRoute objects.
FRAMEWORK_PATHS = {"/docs", "/redoc", "/openapi.json", "/docs/oauth2-redirect"}


@pytest.fixture(scope="module")
def schema() -> dict:
    return app.openapi()


def test_both_schemes_are_declared(schema):
    schemes = schema["components"]["securitySchemes"]
    assert schemes["AccessCookie"]["in"] == "cookie"
    assert schemes["AccessCookie"]["name"] == "gds_access_token"
    assert schemes["BridgePlatformKey"]["scheme"] == "bearer"


def test_every_operation_declares_security(schema):
    undeclared = [
        f"{method.upper()} {path}"
        for path, operations in schema["paths"].items()
        for method, operation in operations.items()
        if method in METHODS and isinstance(operation, dict) and "security" not in operation
    ]
    assert undeclared == [], f"routes without a security declaration: {undeclared}"


def test_public_routes_declare_no_requirement(schema):
    for path in ("/auth/login", "/auth/register", "/health"):
        for method, operation in schema["paths"].get(path, {}).items():
            if method in METHODS:
                assert operation["security"] == [], f"{path} should require nothing"


def test_bridge_routes_use_the_platform_key(schema):
    bridge = [p for p in schema["paths"] if p.startswith("/bridge")]
    assert bridge, "expected bridge routes to exist"
    for path in bridge:
        for method, operation in schema["paths"][path].items():
            if method in METHODS:
                assert {"BridgePlatformKey": []} in operation["security"], path


def test_protected_routes_use_the_access_cookie(schema):
    checked = 0
    for path in ("/findings", "/missions", "/cloud/posture/score"):
        for method, operation in (schema["paths"].get(path) or {}).items():
            if method in METHODS:
                assert {"AccessCookie": []} in operation["security"], path
                checked += 1
    assert checked, "none of the expected protected routes were present"


def test_public_allowlist_matches_real_routes(schema):
    """A stale allowlist entry would silently mark a real route public."""
    # Compare against the published schema, which is what clients actually read, rather than
    # app.routes - a router included with its own prefix does not necessarily appear there in
    # the same shape the schema publishes.
    published = set(schema["paths"])
    unknown = {p for p in _PUBLIC_OPENAPI_PATHS if p not in published and p not in FRAMEWORK_PATHS}
    assert unknown == set(), f"allowlist names routes that do not exist: {unknown}"
