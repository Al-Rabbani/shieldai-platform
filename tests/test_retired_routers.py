"""B19: one decision per retired router, and the dispatchers stop naming agents that do not exist.

The inventory item lists twelve routers (marketplace, attack_graph, digital_twin, redteam_sim, ai_security,
autofix, sso, compliance_autofix, compliance_evidence, ci_cd, webhook, residency) and asks that each either
serves real data from a real table or returns an honest 404.

Measured 21 Nov 2026:
  * None of the twelve exists as a router any more. Seven of them (ai_security, autofix, sso,
    compliance_autofix, compliance_evidence, ci_cd, redteam_sim) have no route at all, so FastAPI already
    answers 404 - an honest 404 by absence, which this file pins so it cannot quietly return.
  * webhooks is real: five endpoints over the webhook_endpoints and webhook_deliveries tables.
  * marketplace, attack_graph, digital_twin and residency survived only as seven /actions dispatch
    endpoints with no table behind them, no agent to receive the work, and zero tasks ever enqueued of
    their types (1,823 of 1,825 tasks ever enqueued were security_scan). They answered 200 "queued" and
    "agent_assigned": "agent-digital-twin" - an agent that exists nowhere in the codebase.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from gds_api.retired_endpoints import _RETIRED, router as retired_router  # noqa: E402

RETIRED_PATHS = sorted(_RETIRED)


# ------------------------------------------------------------------ the seven answer 404, with a reason
def test_every_retired_path_is_registered():
    assert len(RETIRED_PATHS) == 7, RETIRED_PATHS


def test_a_retired_path_answers_404_and_names_why():
    for path in RETIRED_PATHS:
        endpoint = _RETIRED[path][0]
        handler = next(
            r.endpoint for r in retired_router.routes if getattr(r, "name", "") == f"retired_{endpoint}"
        )
        with pytest.raises(HTTPException) as exc:
            import asyncio

            asyncio.run(handler())
        assert exc.value.status_code == 404
        detail = exc.value.detail
        assert detail["error"] == "capability_not_built"
        assert detail["capability"] == endpoint
        assert "no table stores" in detail["reason"], (
            "the reason must say what is missing, not merely that something is unavailable"
        )


def test_a_retired_path_never_answers_422():
    """A validation error would mean the route still accepts a body and never reaches the 404.

    The first version of these handlers took **kwargs, which FastAPI cannot model, so a POST with any body
    answered 422 - the caller learned nothing about the capability.
    """
    import inspect

    for path in RETIRED_PATHS:
        endpoint = _RETIRED[path][0]
        handler = next(
            r.endpoint for r in retired_router.routes if getattr(r, "name", "") == f"retired_{endpoint}"
        )
        params = [
            p
            for p in inspect.signature(handler).parameters.values()
            if p.kind not in (p.VAR_POSITIONAL, p.VAR_KEYWORD)
        ]
        assert params == [], f"{path} declares {[p.name for p in params]}, so a body can fail validation"


def test_the_endpoints_are_gone_from_the_action_router():
    """A 404 only means something if the 200 that preceded it is gone."""
    src = (ROOT / "apps" / "api" / "gds_api" / "agentic" / "action_triggers.py").read_text(encoding="utf-8")
    for path in ("/attack-graph/", "/digital-twin/", "/marketplace/", "/data-residency/"):
        assert path not in src, f"{path} still dispatches; the retired route would never be reached"


def test_webhooks_still_serves_real_tables():
    """The one real router in the list must not be retired along with the rest."""
    src = (ROOT / "apps" / "api" / "gds_api").glob("*.py")
    joined = "\n".join(f.read_text(encoding="utf-8") for f in src)
    assert "webhook_endpoints" in joined and "webhook_deliveries" in joined


# ------------------------------------------------------------------ no more phantom agents
def test_a_legacy_id_maps_to_a_real_roster_agent():
    from gds_api.agentic.action_triggers import ActionTriggerRouter

    resolved, label = ActionTriggerRouter.resolve_dispatch_agent("agent-red-team")
    assert resolved == "ai-redteam-director"
    assert label == "ai-redteam-director"


def test_an_id_with_no_counterpart_is_dispatched_unassigned_not_guessed():
    from gds_api.agentic.action_triggers import ActionTriggerRouter

    resolved, label = ActionTriggerRouter.resolve_dispatch_agent("agent-digital-twin")
    assert resolved is None, "pointing it at a guessed agent would be the same lie in a new spelling"
    assert label == "auto-assigned"


def test_a_real_roster_id_passes_through():
    from gds_api.agentic.action_triggers import ActionTriggerRouter

    resolved, label = ActionTriggerRouter.resolve_dispatch_agent("ai-vuln-director")
    assert resolved == "ai-vuln-director"
    assert label == "ai-vuln-director"


def test_every_agent_id_the_dispatchers_name_is_accounted_for():
    """Either it resolves to a roster agent, or it is one of the documented unmapped ids.

    This is the guard that stops a new dispatcher inventing an agent name: the list below is short and
    every entry is a capability this platform does not have an agent for.
    """
    import re

    from gds_api.agentic.action_triggers import ActionTriggerRouter

    src = (ROOT / "apps" / "api" / "gds_api" / "agentic" / "action_triggers.py").read_text(encoding="utf-8")
    used = set(re.findall(r'agent_id="([a-z0-9-]+)"', src))
    unmapped = {a for a in used if ActionTriggerRouter.resolve_dispatch_agent(a)[0] is None}
    assert unmapped <= {
        "agent-k8s-defender",
        "agent-container-scanner",
        "agent-verifier",
        "agent-policy-engine",
        "agent-ml-analytics",
        "agent-integrations",
        "agent-crypto-analyst",
    }, f"new dispatcher names an agent with no roster counterpart: {sorted(unmapped)}"


def test_the_response_no_longer_claims_an_assignment_that_did_not_happen():
    src = (ROOT / "apps" / "api" / "gds_api" / "agentic" / "action_triggers.py").read_text(encoding="utf-8")
    assert '"agent_assigned": agent_label' in src
    assert '"agent_assigned": agent_id or "auto-assigned"' not in src
