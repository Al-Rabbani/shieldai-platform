"""Linear ticketing: a real client, ported from the builder app's gdsLinearSync.

That function was one of nine in the builder app that made a genuine outbound call, so it is worth
carrying across rather than rewriting from a name. Three things change in the move.

It reads the platform's own findings. Every identifier it records came back from Linear. And it
never reports a success it did not earn: the Jira function in the same app invented ticket keys with
Math.random() and stored them, which made an untracked vulnerability read as tracked. Here a refusal,
a timeout, or a GraphQL error raises, and nothing is written.

This module holds no database code on purpose. It talks to Linear and returns what Linear said; the
router decides what to persist, so the client can be tested without a database and the persistence
can be tested without a network.
"""

from __future__ import annotations

import os
from typing import Any, Mapping, Sequence

import httpx

LINEAR_API = "https://api.linear.app/graphql"
TIMEOUT_SECONDS = 15.0

# Linear's workflow state types are a fixed vocabulary; the platform's finding statuses are not. The
# mapping is declared in both directions so a push and a pull cannot disagree about what "fixed"
# means, which is how a ticket and its finding drift apart while both look correct.
STATE_TO_APP = {
    "completed": "fixed",
    "canceled": "accepted_risk",
    "started": "in_remediation",
    "unstarted": "open",
    "backlog": "open",
    "triage": "open",
}
APP_TO_STATE = {
    "open": "unstarted",
    "in_remediation": "started",
    "fixed": "completed",
    "accepted_risk": "canceled",
    "false_positive": "canceled",
}


class LinearError(Exception):
    """Linear refused, or could not be reached. Never swallowed into a success."""

    def __init__(self, message: str, *, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


def api_token() -> str:
    """The workspace API key, or a refusal that names the missing setting."""
    token = os.getenv("LINEAR_API_KEY", "").strip()
    if not token:
        raise LinearError("LINEAR_API_KEY is not configured on this platform.", status_code=409)
    return token


async def gql(
    query: str,
    variables: Mapping[str, Any] | None = None,
    *,
    token: str | None = None,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict:
    """One GraphQL round trip. Raises rather than returning an empty dict on failure."""
    bearer = token or api_token()
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, transport=transport) as client:
            response = await client.post(
                LINEAR_API,
                json={"query": query, "variables": dict(variables or {})},
                headers={"Authorization": f"Bearer {bearer}", "Content-Type": "application/json"},
            )
    except httpx.HTTPError as exc:
        raise LinearError(f"Linear could not be reached: {exc}") from exc

    body = response.json() if response.content else {}
    # GraphQL reports failures with HTTP 200 and an errors array, so status alone is not evidence.
    errors = body.get("errors") or []
    if errors:
        raise LinearError(str(errors[0].get("message") or "Linear API error"))
    if response.status_code >= 400:
        raise LinearError(f"Linear returned {response.status_code}")
    return body.get("data") or {}


def ticket_description(finding: Mapping[str, Any]) -> str:
    """The issue body. Every line is either measured from the finding or absent."""
    severity = str(finding.get("severity") or "unknown").upper()
    asset = finding.get("asset_name") or finding.get("target") or "unknown"
    lines = [
        f"**{severity}** finding from GDSA Radar",
        "",
        f"- **Asset:** {asset}",
    ]
    if finding.get("cve"):
        lines.append(f"- **CVE:** {finding['cve']}")
    if finding.get("cvss") is not None:
        lines.append(f"- **CVSS:** {finding['cvss']}")
    if finding.get("epss") is not None:
        lines.append(f"- **EPSS:** {float(finding['epss']) * 100:.1f}%")
    if finding.get("kev_listed"):
        lines.append("- **CISA KEV:** listed as exploited in the wild")
    if finding.get("exploitability"):
        lines.append(f"- **Exploitability:** {str(finding['exploitability']).replace('_', ' ')}")
    if finding.get("business_impact"):
        lines += ["", str(finding["business_impact"])]
    if finding.get("remediation"):
        lines += ["", "### Remediation", str(finding["remediation"])]
    return "\n".join(lines)


async def list_teams(
    token: str | None = None, *, transport: httpx.AsyncBaseTransport | None = None
) -> dict:
    """Who the key belongs to, and the teams it can file against."""
    data = await gql(
        "query { viewer { name email } teams(first: 50) { nodes { id key name } } }",
        token=token,
        transport=transport,
    )
    viewer = data.get("viewer") or None
    teams = [
        {"id": node["id"], "key": node.get("key"), "name": node.get("name")}
        for node in (data.get("teams") or {}).get("nodes") or []
    ]
    return {"viewer": viewer, "teams": teams}


async def create_issue(
    finding: Mapping[str, Any],
    team_id: str,
    token: str | None = None,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict:
    """File one issue and return it. Raises when Linear does not return an issue."""
    data = await gql(
        """
        mutation CreateIssue($teamId: String!, $title: String!, $description: String) {
          issueCreate(input: { teamId: $teamId, title: $title, description: $description }) {
            success
            issue { id identifier url state { name type } team { id key } }
          }
        }
        """,
        {
            "teamId": team_id,
            "title": str(finding.get("title") or "Untitled finding")[:255],
            "description": ticket_description(finding),
        },
        token=token,
        transport=transport,
    )
    result = data.get("issueCreate") or {}
    issue = result.get("issue")
    # success can be true with no issue in the payload; the issue is the evidence, not the flag.
    if not issue or not issue.get("identifier"):
        raise LinearError("Linear accepted the request but returned no issue identifier.")
    return issue


async def team_states(
    team_id: str, token: str | None = None, *, transport: httpx.AsyncBaseTransport | None = None
) -> list[dict]:
    data = await gql(
        "query GetStates($teamId: String!) { team(id: $teamId) { states(first: 50) { nodes { id name type } } } }",
        {"teamId": team_id},
        token=token,
        transport=transport,
    )
    return list(((data.get("team") or {}).get("states") or {}).get("nodes") or [])


async def move_issue(
    issue_id: str,
    state_id: str,
    token: str | None = None,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict:
    data = await gql(
        """
        mutation MoveIssue($id: String!, $stateId: String!) {
          issueUpdate(id: $id, input: { stateId: $stateId }) {
            success
            issue { id identifier state { name type } }
          }
        }
        """,
        {"id": issue_id, "stateId": state_id},
        token=token,
        transport=transport,
    )
    result = data.get("issueUpdate") or {}
    if not result.get("success") or not result.get("issue"):
        raise LinearError("Linear rejected the state change.")
    return result["issue"]


async def issues_by_id(
    issue_ids: Sequence[str],
    token: str | None = None,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict[str, dict]:
    """Read many issues in one round trip, aliased. Missing ids are simply absent from the result."""
    ids = [i for i in issue_ids if i]
    if not ids:
        return {}
    aliases = "\n".join(
        f'i{index}: issue(id: "{issue_id}") {{ id identifier state {{ name type }} }}'
        for index, issue_id in enumerate(ids)
    )
    data = await gql(f"query {{ {aliases} }}", token=token, transport=transport)
    return {issue_id: data[f"i{index}"] for index, issue_id in enumerate(ids) if data.get(f"i{index}")}
