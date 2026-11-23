"""One place that turns a model response into a CostRecord.

WHY THIS EXISTS. Measured 23 Nov 2026: `cost_records` held 175 rows, the newest at 20 Nov 01:50, $1.08 in total since
13 Oct - while `missions` held 203 rows with 16 to 47 new missions a day. The OpenAI key answered 200 to a live
1-token completion, so the platform was spending money it was not recording. The reason is structural: only
`model_router.py` wrote a CostRecord, and the reasoning stack does not use the router. Eight call sites called
`client.chat.completions.create` directly, none of them recorded anything:

    reasoning/agent_loop.py            the loop that runs every mission (this is the bulk of the spend)
    reasoning/bridge.py                the model call that routes a goal to an agent
    reasoning/mission_orchestrator.py  the planner and the report aggregator
    reasoning/kernel_agent_runner.py   the kernel-memory agent runner
    reasoning/kernel_agent_loop.py     no importer on this platform (exempt, measured)
    agentic/planner.py                 the engineering planner
    reasoning/tool_definitions.py      a docstring mention, not a call

A cost row is not bookkeeping: `quota.py` sums `cost_records` to enforce a tenant's token quota, so while this table
went stale the quota was blind too.

RULES THIS MODULE KEEPS.
* The token counts are the provider's own numbers from the response, never an estimate from text length.
* The row is written before the caller uses the response, so a mission that crashes afterwards still leaves the spend.
* A failed write is logged and reported False; it never raises into the caller. Losing the bookkeeping must not turn a
  real mission into a failed one.
* `tenant_id` is required. `cost_records` is FORCE-RLS, so an unbound insert is silently rejected - the failure mode
  that made the old router write look like it worked. Without a tenant this refuses and says so instead.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from gds_api.db import async_session_factory
from gds_api.models import CostRecord

logger = logging.getLogger("gds.llm_cost")


def _tokens(usage: Any) -> tuple[int, int]:
    """Input and output tokens from an SDK usage object or a plain mapping.

    The OpenAI SDK reports prompt_tokens/completion_tokens and the Anthropic SDK reports input_tokens/output_tokens.
    Both shapes appear in this codebase, so both are read rather than assuming one.
    """
    if usage is None:
        return 0, 0
    get = usage.get if isinstance(usage, dict) else lambda key, default=None: getattr(usage, key, default)
    input_tokens = get("prompt_tokens") or get("input_tokens") or 0
    output_tokens = get("completion_tokens") or get("output_tokens") or 0
    return int(input_tokens), int(output_tokens)


def _as_uuid(value: Any) -> uuid.UUID | None:
    if value is None or value == "":
        return None
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError):
        return None


async def record_llm_cost(
    *,
    tenant_id: Any,
    model: str,
    usage: Any,
    mission_id: Any = None,
    provider: str = "openai",
    latency_ms: float | None = None,
    call_site: str = "",
) -> bool:
    """Write one CostRecord for one model call. Returns True when the row was written.

    Every argument that identifies the row comes from the caller's own context: the model name it asked for, the usage
    the provider returned, and the tenant and mission it was working for.
    """
    tenant_uuid = _as_uuid(tenant_id)
    if tenant_uuid is None:
        # Not silently: an unrecorded call is exactly the defect this module exists to end, so it is logged at warning
        # with the site named, and the caller is told False rather than being handed a comfortable True.
        logger.warning("llm cost NOT recorded: no tenant at %s (model=%s)", call_site or "unknown site", model)
        return False

    input_tokens, output_tokens = _tokens(usage)
    try:
        # Imported here rather than at module load: model_router imports this module's siblings, and the price table
        # lives there. One price table, not two that can disagree.
        from gds_api.model_router import _estimate_cost_usd

        cost_usd = _estimate_cost_usd(provider, model, input_tokens, output_tokens)
    except Exception as exc:  # pragma: no cover - only if the price table changes shape
        logger.error("llm cost NOT recorded: price lookup failed at %s: %s", call_site, exc)
        return False

    try:
        from gds_api.tenant_binding import bind_tenant

        async with async_session_factory() as db:
            await bind_tenant(db, str(tenant_uuid))
            db.add(
                CostRecord(
                    tenant_id=tenant_uuid,
                    mission_id=_as_uuid(mission_id),
                    provider=provider,
                    model=model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    cost_usd=cost_usd,
                    latency_ms=float(latency_ms or 0.0),
                )
            )
            await db.commit()
    except Exception as exc:
        logger.error("llm cost NOT recorded at %s (model=%s): %s", call_site, model, exc)
        return False

    logger.info(
        "llm cost recorded at %s: %s %s in=%d out=%d $%.6f",
        call_site, provider, model, input_tokens, output_tokens, cost_usd,
    )
    return True
