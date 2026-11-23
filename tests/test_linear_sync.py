"""Linear ticketing: the failures that happen without a network.

No test here asserts that Linear works. They assert that this code cannot claim a ticket it did not
receive, because that is the defect the Jira function in the same builder app shipped: it invented a
key, set success, and stored it, so an unfiled vulnerability read as tracked.

The coroutines are driven with asyncio.run rather than an async test plugin, because this venv has
anyio but no pytest-asyncio, and a test that cannot run is not a test.
"""

import asyncio

import httpx
import pytest

from gds_api import linear


def run(coro):
    return asyncio.run(coro)


def transport(payload, status=200):
    def handler(request):
        return httpx.Response(status, json=payload)

    return httpx.MockTransport(handler)


def test_canonical_statuses_round_trip_and_legacy_names_normalise():
    """The register holds open, resolved and accepted_risk; those three must survive a round trip through Linear.

    Legacy names (fixed, in_remediation, false_positive) may still sit on rows written before the vocabulary was
    aligned, so they translate instead of falling through to a default - but they are not produced any more.
    Asserting both halves means an edit that collapses a canonical status, or resurrects a legacy one on the write
    side, has to change this test and say why.
    """
    canonical = {"open", "resolved", "accepted_risk"}
    legacy = {"fixed", "in_remediation", "false_positive"}
    assert set(linear.APP_TO_STATE) == canonical | legacy
    for app_status, state_type in linear.APP_TO_STATE.items():
        back = linear.STATE_TO_APP[state_type]
        assert back in canonical, f"{app_status} -> {state_type} -> {back} is not a register status"
        if app_status in canonical:
            assert back == app_status, f"{app_status} did not round-trip"
    assert linear.STATE_TO_APP["completed"] == "resolved"
    assert linear.STATE_TO_APP["started"] == "open"


def test_description_carries_what_was_measured():
    body = linear.ticket_description(
        {
            "title": "CVE-2026-1 in nginx",
            "severity": "critical",
            "target": "api.globaldigitalsecurity.io",
            "cve": "CVE-2026-1",
            "cvss": 9.8,
            "epss": 0.42,
            "kev_listed": True,
            "exploitability": "exploited_in_wild",
            "business_impact": "Internet facing",
            "remediation": "Upgrade nginx",
        }
    )
    assert "**CRITICAL**" in body
    assert "api.globaldigitalsecurity.io" in body
    assert "CVE-2026-1" in body
    assert "9.8" in body
    assert "42.0%" in body
    assert "CISA KEV" in body
    assert "exploited in wild" in body
    assert "Upgrade nginx" in body


def test_description_does_not_invent_absent_fields():
    body = linear.ticket_description({"title": "Header missing", "severity": "low", "target": "example.com"})
    assert "CVE" not in body
    assert "CVSS" not in body
    assert "EPSS" not in body
    assert "CISA KEV" not in body


def test_graphql_errors_raise_even_on_http_200():
    """Linear reports failure inside a 200. Reading status alone would call that success."""
    with pytest.raises(linear.LinearError, match="not authorized"):
        run(
            linear.gql(
                "query { viewer { name } }",
                token="t",
                transport=transport({"errors": [{"message": "not authorized"}]}, status=200),
            )
        )


def test_http_error_raises():
    with pytest.raises(linear.LinearError, match="500"):
        run(linear.gql("query { viewer { name } }", token="t", transport=transport({}, status=500)))


def test_create_issue_refuses_a_success_flag_with_no_issue():
    """The whole point of the port: a flag is not a ticket."""
    payload = {"data": {"issueCreate": {"success": True, "issue": None}}}
    with pytest.raises(linear.LinearError, match="no issue identifier"):
        run(linear.create_issue({"title": "x"}, "team-1", token="t", transport=transport(payload)))


def test_create_issue_requires_an_identifier():
    payload = {"data": {"issueCreate": {"success": True, "issue": {"id": "abc"}}}}
    with pytest.raises(linear.LinearError, match="no issue identifier"):
        run(linear.create_issue({"title": "x"}, "team-1", token="t", transport=transport(payload)))


def test_create_issue_returns_what_linear_returned():
    issue = {
        "id": "abc",
        "identifier": "SEC-42",
        "url": "https://linear.app/acme/issue/SEC-42",
        "state": {"name": "Triage", "type": "triage"},
        "team": {"id": "team-1", "key": "SEC"},
    }
    payload = {"data": {"issueCreate": {"success": True, "issue": issue}}}
    assert run(linear.create_issue({"title": "x"}, "team-1", token="t", transport=transport(payload))) == issue


def test_move_issue_rejects_a_refusal():
    payload = {"data": {"issueUpdate": {"success": False, "issue": None}}}
    with pytest.raises(linear.LinearError, match="rejected"):
        run(linear.move_issue("abc", "state-1", token="t", transport=transport(payload)))


def test_issues_by_id_omits_ids_linear_could_not_find():
    payload = {
        "data": {
            "i0": {"id": "a", "identifier": "SEC-1", "state": {"name": "Done", "type": "completed"}},
            "i1": None,
        }
    }
    found = run(linear.issues_by_id(["a", "b"], token="t", transport=transport(payload)))
    assert list(found) == ["a"]
    assert found["a"]["identifier"] == "SEC-1"


def test_missing_key_names_the_setting(monkeypatch):
    monkeypatch.delenv("LINEAR_API_KEY", raising=False)
    with pytest.raises(linear.LinearError, match="LINEAR_API_KEY"):
        linear.api_token()


def test_no_key_means_no_request(monkeypatch):
    """A missing key must fail before any network call is attempted."""
    monkeypatch.delenv("LINEAR_API_KEY", raising=False)
    with pytest.raises(linear.LinearError) as excinfo:
        run(linear.gql("query { viewer { name } }"))
    assert excinfo.value.status_code == 409

def test_gql_sends_an_api_key_raw_and_an_oauth_token_as_bearer():
    """Measured against the live API: a key sent as Bearer is refused with a 400 naming the mistake."""
    seen = {}

    def handler(request):
        seen["auth"] = request.headers.get("authorization")
        return httpx.Response(200, json={"data": {"viewer": {"name": "x"}}})

    run(linear.gql("query { viewer { name } }", token="lin_api_key123", transport=httpx.MockTransport(handler)))
    assert seen["auth"] == "lin_api_key123"

    run(linear.gql("query { viewer { name } }", token="oauth-token", transport=httpx.MockTransport(handler)))
    assert seen["auth"] == "Bearer oauth-token"
