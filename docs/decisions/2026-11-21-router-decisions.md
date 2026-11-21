# Router decisions — the twelve retired routers (B19)

Measured 21 November 2026 against the live platform (main `0646a7e`, schema 047). Inventory item B19 asks for
one decision per router: either it serves real data from a real table, or it returns an honest 404.

The measurement first had to establish what "retired" meant, because the answer was not the one the item
assumed. **None of the twelve exists as a router any more.** Seven have no route of any kind, four survive as
seven `/actions` dispatch endpoints, and one is real.

| Router | What exists today | Decision | Evidence |
|---|---|---|---|
| `webhook` | 5 endpoints (`/webhooks`, `/webhooks/{id}`, `/webhooks/deliveries`, ...) | **KEEP — real** | Tables `webhook_endpoints` and `webhook_deliveries` exist and are queried by the router. Both are empty because no endpoint has been registered, which is an honest zero. |
| `attack_graph` | 2 dispatch endpoints: `/actions/attack-graph/rebuild`, `/actions/attack-graph/blast-radius` | **RETIRE → 404** | No table stores attack graphs (the only tables matching path/graph/twin/market/resid were `evidence`, `webhook_endpoints`, `webhook_deliveries`). Assigned to `agent-graph-engine`, an id absent from both agent registries. Zero tasks of type `attack_graph_build` ever enqueued. |
| `digital_twin` | 2 dispatch endpoints: `/actions/digital-twin/{env_id}/chaos`, `/actions/digital-twin/sync-state` | **RETIRE → 404** | No digital twin table. Assigned to `agent-digital-twin`, absent from both registries. Zero tasks of types `chaos_experiment` / `digital_twin_state_sync` ever enqueued. |
| `marketplace` | 2 dispatch endpoints: `/actions/marketplace/{listing_id}/auto-certify`, `/actions/marketplace/publish-agent` | **RETIRE → 404** | No marketplace listing table. Assigned to `agent-marketplace-evaluator`, absent from both registries. Zero tasks of type `certification` / `agent_publication_check` ever enqueued. |
| `residency` | 1 dispatch endpoint: `/actions/data-residency/verify` | **RETIRE → 404** | No residency record table. Assigned to `agent-compliance-officer`, absent from both registries. Zero tasks of type `data_residency_verification` ever enqueued. |
| `redteam_sim` | 2 dispatch endpoints: `/actions/adversary-sim/run`, `/actions/adversary-sim/emulate-apt` | **KEEP, repointed** | The red-team machinery itself is real (`engagements`, `authorized_targets`, emergency stop), so the capability is not hollow; only the agent id was wrong. Repointed from the non-existent `agent-red-team` to the roster's `ai-redteam-director`. |
| `ai_security` | no route | **ALREADY 404** | FastAPI answers 404 for an unmounted path. Pinned by test so it cannot quietly return. |
| `autofix` | no route | **ALREADY 404** | As above. `agent-auto-fixer` dispatchers elsewhere were repointed to `ai-autofix-agent`. |
| `sso` | no route | **ALREADY 404** | As above. |
| `compliance_autofix` | no route | **ALREADY 404** | As above. |
| `compliance_evidence` | no route | **ALREADY 404** | As above. The `evidence` table (4 rows) is real and served by the compliance router, not by a `compliance_evidence` router. |
| `ci_cd` | no route | **ALREADY 404** | As above. |

## What was wrong with the four that returned 200

Each answered `200` with `{"status": "queued", "agent_assigned": "agent-digital-twin"}`. That is worse than a
404. A 404 says the capability is absent; a 200 said the work had been accepted and assigned to an agent that
does not exist, against a table that does not exist, for a task type that has never once run.

The scale of the pattern: **all 49 dispatchers** in `agentic/action_triggers.py` named one of 21 `agent-*` ids,
and not one of those ids appears anywhere in the codebase. The real roster uses `ai-*` ids
(`gds_api.reasoning.governed_tools.REASONING_AGENT_REGISTERED_MAP`, 23 agents).

## The fix, in three parts

1. **Seven endpoints removed and answered honestly.** `gds_api/retired_endpoints.py` registers those exact
   seven paths, authenticated like every other `/actions` route, returning `404` with
   `error: capability_not_built`, the capability name, and a reason naming what is missing. Registered
   explicitly rather than as a wildcard, because a wildcard under `/actions` would shadow real routes.
2. **Phantom agents resolved at dispatch time.** `ActionTriggerRouter.resolve_dispatch_agent` maps the eleven
   legacy ids with an unambiguous counterpart onto the real roster, passes real `ai-*` ids through unchanged,
   and dispatches anything else **unassigned** while logging the id it could not resolve. The response now
   says `auto-assigned` instead of naming an agent that cannot receive the work. Guessing a counterpart for
   the ten ids with no clear one would have been the same lie in a new spelling.
3. **A guard against the next one.** A test fails if a dispatcher names an agent that is neither in the roster
   nor one of the seven documented unmapped ids, so a new endpoint cannot invent an agent name.

## Deliberately not done

- **Not rebuilt.** Attack graph, digital twin, marketplace and data residency are four subsystems with four
  data models, not four endpoints. Building them to satisfy an inventory line would have produced exactly the
  fabrication this item exists to remove.
- **Not repointed to guesses.** `agent-k8s-defender`, `agent-container-scanner`, `agent-verifier`,
  `agent-policy-engine`, `agent-ml-analytics`, `agent-integrations` and `agent-crypto-analyst` have no
  counterpart in the roster, so their dispatchers now run unassigned rather than aimed at a wrong agent.
