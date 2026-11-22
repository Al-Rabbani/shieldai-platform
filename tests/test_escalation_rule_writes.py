"""The escalation panel writes. These pin the routes it calls and the two ways an update can go wrong.

Why this file exists: EscalationSettingsPage edits a rule, pauses it and deletes it. Until now only GET and POST
existed on /siem/correlation/rules, so every one of those actions was a 405 the user could not act on, and the
panel's ten real rows were read-only in the product.

The route table is read from the application object, built in-process from the source that is about to be
deployed, NOT from the running server. My first version curled the live /openapi.json, which made this file
assert something no deploy could satisfy: the suite runs before the API restarts, so a route added by the very
release being deployed could never be published yet, and the gate refused every deploy. The lesson is the one
this repo keeps teaching - a check that cannot pass is a check that gets bypassed. Building the app here also
proves registration, which a source grep does not.

Two failure modes are worth a test rather than a comment:

  * An update that does not use exclude_unset writes every field it knows about. The pause button sends
    {is_active: false} alone, so a plain model_dump() would blank the rule's name (NOT NULL, so a 500) and its
    conditions. The assertion on exclude_unset is what stops that being reintroduced.
  * An update or delete that filters only on the row id can reach another tenant's rule. Both handlers must
    carry the tenant predicate; the route table alone cannot show that.
"""
from __future__ import annotations

from pathlib import Path

import pytest

ROUTES_SOURCE = Path("/opt/gds-os/apps/api/gds_api/siem/routes.py")


def published_paths() -> dict:
    """The route table of the app as built from this source tree.

    In-process, so it describes the release being deployed rather than whatever the server happens to be
    running. Importing the application registers every router; no database connection is opened.
    """
    import sys

    sys.path.insert(0, "/opt/gds-os/apps/api")
    from gds_api.main import app  # noqa: PLC0415 - deliberate: keeps the 10s import out of collection

    return app.openapi()["paths"]


def handler_source(path: str, method: str) -> str:
    """The decorated function body for one route, found by its decorator path.

    Sliced from the decorator to the next top-level @router so the permission dependency and the WHERE clause
    are read from the handler that actually serves the route, not from a neighbour.
    """
    text = ROUTES_SOURCE.read_text(encoding="utf-8")
    # The router carries prefix="/siem", so the decorator names only the part after it.
    decorator_path = path[len("/siem") :]
    marker = f'@router.{method}("{decorator_path}"'
    start = text.find(marker)
    assert start != -1, f"no {method.upper()} handler for {path}"
    end = text.find("\n@router.", start + 1)
    return text[start : end if end != -1 else len(text)]


RULE_PATH = "/siem/correlation/rules/{rule_id}"


def test_the_routes_the_panel_calls_are_registered():
    paths = published_paths()
    published = paths.get(RULE_PATH, {})
    assert "patch" in published, "the panel edits a rule with a PATCH"
    assert "delete" in published, "the panel deletes a rule with a DELETE"
    assert "get" in paths.get("/siem/correlation/rules", {}), "and lists them"
    assert "post" in paths.get("/siem/correlation/rules", {}), "and creates them"


@pytest.mark.parametrize("method", ["patch", "delete"])
def test_each_write_requires_the_siem_write_permission(method):
    body = handler_source(RULE_PATH, method)
    assert 'require_permission("siem:write")' in body, (
        f"{method.upper()} {RULE_PATH} must be gated on siem:write"
    )


@pytest.mark.parametrize("method", ["patch", "delete"])
def test_each_write_is_scoped_to_the_callers_tenant(method):
    body = handler_source(RULE_PATH, method)
    assert "CorrelationRule.tenant_id == current_user.tenant_id" in body, (
        f"{method.upper()} {RULE_PATH} must not be able to reach another tenant's rule by id"
    )


def test_an_update_writes_only_the_fields_it_was_sent():
    body = handler_source(RULE_PATH, "patch")
    assert "exclude_unset=True" in body, (
        "without exclude_unset a pause toggle would blank the rule's name and conditions"
    )


def test_a_missing_rule_is_a_404_not_a_silent_success():
    for method in ("patch", "delete"):
        body = handler_source(RULE_PATH, method)
        assert "404" in body, f"{method.upper()} must answer 404 for a rule that is not there"
