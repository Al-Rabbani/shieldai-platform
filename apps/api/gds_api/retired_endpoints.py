"""Capabilities that were never built answer 404 with the reason, instead of queueing work into a void.

B19's done-when is "each router either serves real data from a real table or returns an honest 404". Seven
endpoints under /actions named capabilities with no data model behind them:

  /actions/attack-graph/rebuild            /actions/attack-graph/blast-radius
  /actions/digital-twin/{env_id}/chaos     /actions/digital-twin/sync-state
  /actions/marketplace/{listing_id}/auto-certify   /actions/marketplace/publish-agent
  /actions/data-residency/verify

Measured 21 Nov 2026 before removing them: no table exists for attack graphs, digital twins, marketplace
listings or data residency (the only matching tables in the whole database were evidence, webhook_endpoints
and webhook_deliveries); the agent ids they assigned the work to (agent-graph-engine, agent-digital-twin,
agent-marketplace-evaluator, agent-compliance-officer) appear nowhere in the codebase, while the real roster
uses ai-* ids; and of 1,825 tasks ever enqueued, 1,823 were security_scan, so none of these task types had
ever run once.

Each answered 200 with "status": "queued" and "agent_assigned": "agent-digital-twin". That is worse than a
404: a 404 says the capability is absent, while a 200 said the work was accepted and assigned to an agent
that does not exist.

These paths now answer 404 with the decision recorded, so a caller learns the truth and a future reader
learns why. The reason is deliberately specific: "not built" and "built then withdrawn" are different facts
and only one of them is true here.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from gds_api.security import get_current_user

# Authenticated like every other /actions route: a retired capability should not be discoverable by
# anonymous probing, and the API contract requires every endpoint to declare its auth.
router = APIRouter(
    prefix="/actions", tags=["retired"], dependencies=[Depends(get_current_user)]
)

_NOT_BUILT = (
    "Not built. This capability has no data model on this platform: no table stores {what}, so an endpoint "
    "could only acknowledge the request without doing anything. It answered 200 'queued' and named an agent "
    "that does not exist until 21 Nov 2026. Retired under inventory item B19 (decision record "
    "docs/decisions/2026-11-21-router-decisions.md)."
)

_RETIRED = {
    "/attack-graph/rebuild": ("attack_graph_rebuild", "attack graphs"),
    "/attack-graph/blast-radius": ("attack_graph_blast_radius", "attack graphs"),
    "/digital-twin/{env_id}/chaos": ("digital_twin_chaos", "digital twins"),
    "/digital-twin/sync-state": ("digital_twin_sync", "digital twins"),
    "/marketplace/{listing_id}/auto-certify": ("marketplace_auto_certify", "marketplace listings"),
    "/marketplace/publish-agent": ("marketplace_publish_agent", "marketplace listings"),
    "/data-residency/verify": ("data_residency_verify", "data residency records"),
}


def _retire(capability: str, what: str):
    # No parameters at all. An earlier version took **kwargs, which FastAPI cannot model, so a request with
    # any body answered 422 (a validation error) instead of the 404 that states the capability is absent.
    async def _endpoint() -> None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "capability_not_built",
                "capability": capability,
                "reason": _NOT_BUILT.format(what=what),
            },
        )

    return _endpoint


# Registered explicitly rather than as a catch-all: a wildcard under /actions would shadow real routes.
for _path, (_capability, _what) in _RETIRED.items():
    router.add_api_route(
        _path,
        _retire(_capability, _what),
        methods=["POST"],
        name=f"retired_{_capability}",
        include_in_schema=True,
    )
