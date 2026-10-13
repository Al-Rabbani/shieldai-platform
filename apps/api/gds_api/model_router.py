"""Model Router: thin wrapper over the Anthropic and OpenAI SDKs. Until 2026-10-13 this
was Anthropic-only ("add a second provider if/when one is actually needed") — that day
arrived: the owner switched the provider to OpenAI because ANTHROPIC_API_KEY in
/opt/.env is truncated (20 chars, rejected 401 by the real API) while OPENAI_API_KEY is
proven live daily by gds_kernel's kernel_executor (gpt-4.1). Provider selection is a
settings switch (model_router_provider: "openai" | "anthropic"); both code paths are
first-class, so switching back needs only a config change once a valid Anthropic key
exists.

Every call writes a real CostRecord row: token counts come from the API response's own
`usage` field (never estimated), latency is measured, and cost is computed from the
pricing tables below. The Anthropic table is a real snapshot (see the date comment).
The OpenAI table is a clearly-labeled BEST-EFFORT ESTIMATE — the Chat Completions API
exposes real token usage but no per-call cost field (the same honesty as
engineering/openai_provider.py) — revisit against real OpenAI billing data before
relying on it beyond a rough dashboard estimate.
"""

import time
import uuid
from collections.abc import AsyncIterator
from decimal import Decimal

import anthropic
import openai as openai_sdk
from anthropic.types import MessageParam
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.config import settings
from gds_api.metrics import llm_call_duration_seconds, llm_calls_total
from gds_api.models import CostRecord

# USD per million tokens (input, output). Snapshot 2026-06-24; Sonnet 5's $2/$10 rate is
# introductory through 2026-08-31 (standard rate is $3/$15) - revisit after that date.
_PRICING_ANTHROPIC_PER_MILLION: dict[str, tuple[Decimal, Decimal]] = {
    "claude-sonnet-5": (Decimal("2.00"), Decimal("10.00")),
    "claude-haiku-4-5": (Decimal("1.00"), Decimal("5.00")),
}

# USD per million tokens (input, output). BEST-EFFORT ESTIMATE for gpt-4.1, not verified
# against a live OpenAI pricing source — token counts below are real (from the API's own
# usage field); only the dollar figure is estimated. Revisit against real billing data.
_PRICING_OPENAI_PER_MILLION: dict[str, tuple[Decimal, Decimal]] = {
    "gpt-4.1": (Decimal("2.00"), Decimal("8.00")),
}

_PRICING_BY_PROVIDER: dict[str, dict[str, tuple[Decimal, Decimal]]] = {
    "anthropic": _PRICING_ANTHROPIC_PER_MILLION,
    "openai": _PRICING_OPENAI_PER_MILLION,
}


def _provider() -> str:
    provider = settings.model_router_provider
    if provider not in ("anthropic", "openai"):
        raise RuntimeError(
            f"model_router_provider must be 'anthropic' or 'openai', got {provider!r}"
        )
    return provider


def _default_model() -> str:
    # gpt-4.1 for OpenAI is the exact model gds_kernel's kernel_executor has used for
    # every daily agent mission since 2026-08-02 — proven live, not speculative.
    if _provider() == "openai":
        return settings.model_router_openai_model
    return settings.model_router_default_model


def _estimate_cost_usd(
    provider: str, model: str, input_tokens: int, output_tokens: int
) -> Decimal:
    table = _PRICING_BY_PROVIDER[provider]
    input_rate, output_rate = table.get(model, table[_default_model()])
    million = Decimal(1_000_000)
    return (Decimal(input_tokens) * input_rate + Decimal(output_tokens) * output_rate) / million


def _get_anthropic_client() -> anthropic.AsyncAnthropic:
    if not settings.anthropic_api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set in .env - required to make model_router calls"
        )
    # Explicit, not implicit SDK defaults: the SDK already retries connection errors and
    # 408/409/429/5xx responses internally with backoff - tune it here rather than
    # stacking a second retry layer (e.g. tenacity) on top, which would just multiply
    # the same retries redundantly.
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, max_retries=3, timeout=60.0)


def _get_openai_client() -> openai_sdk.AsyncOpenAI:
    if not settings.openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set in .env - required to make model_router calls"
        )
    # Same retry/timeout posture as the Anthropic client above, and the same client
    # shape gds_kernel's kernel_executor (GPT_MODEL="gpt-4.1") has used live daily.
    return openai_sdk.AsyncOpenAI(api_key=settings.openai_api_key, max_retries=3, timeout=60.0)


async def _complete(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    mission_id: uuid.UUID | None,
    system: str,
    messages: list[MessageParam],
    model: str,
    max_tokens: int,
) -> str:
    """Shared implementation for complete()/complete_multi_turn() - identical
    CostRecord/metrics/load_test_mode handling, only the messages shape differs."""
    if settings.load_test_mode:
        # See Settings.load_test_mode's docstring - Phase 9's k6 load test needs to
        # exercise the real mission pipeline at real volume without real per-call
        # Anthropic cost. The CostRecord is real and written the same way, just with an
        # unmistakable provider label and zero cost/tokens.
        db.add(
            CostRecord(
                tenant_id=tenant_id,
                mission_id=mission_id,
                provider="anthropic-load-test-stub",
                model=model,
                input_tokens=0,
                output_tokens=0,
                cost_usd=Decimal("0"),
                latency_ms=0.0,
            )
        )
        await db.flush()
        return "[load-test-mode] stub completion - no real Anthropic call was made."

    start = time.perf_counter()
    if _provider() == "openai":
        client = _get_openai_client()
        try:
            response = await client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                # Same temperature gds_kernel's kernel_executor uses for agent
                # reasoning - low, deterministic-leaning, proven live daily.
                temperature=0.1,
                messages=[{"role": "system", "content": system}, *messages],
            )
        except Exception:
            llm_calls_total.labels(model=model, outcome="error").inc()
            raise
        text = response.choices[0].message.content or ""
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
        provider_label = "openai"
    else:
        client = _get_anthropic_client()
        try:
            response = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                # Ephemeral prompt caching on the system prompt: Phase 10's decide_next_step
                # (workflows/activities.py) sends the same large, registry-derived system
                # prompt on every one of up to 5 iterations per mission - a stable, repeated
                # prefix that's exactly what this is for. Additive and free for every
                # existing caller too (_ASSESS_SYSTEM_PROMPT/_REPORT_SYSTEM_PROMPT are
                # already static strings). This SDK version exposes cache_control as a
                # top-level create() argument, not nested per system content block (an
                # older-SDK shape) - confirmed via mypy's real overload signature, not
                # assumed from memory.
                cache_control={"type": "ephemeral"},
                output_config={"effort": "medium"},
                messages=messages,
            )
        except Exception:
            llm_calls_total.labels(model=model, outcome="error").inc()
            raise
        text = "".join(block.text for block in response.content if block.type == "text")
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        provider_label = "anthropic"

    duration_seconds = time.perf_counter() - start
    latency_ms = duration_seconds * 1000
    llm_call_duration_seconds.labels(model=model).observe(duration_seconds)
    llm_calls_total.labels(model=model, outcome="success").inc()

    db.add(
        CostRecord(
            tenant_id=tenant_id,
            mission_id=mission_id,
            provider=provider_label,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=_estimate_cost_usd(provider_label, model, input_tokens, output_tokens),
            latency_ms=latency_ms,
        )
    )
    await db.flush()
    return text


async def complete(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    mission_id: uuid.UUID | None,
    system: str,
    user_message: str,
    model: str | None = None,
    max_tokens: int = 4096,
) -> str:
    """One-shot text completion. Writes a real CostRecord (added to the session, not
    committed - the caller's transaction boundary decides when) before returning."""
    return await _complete(
        db,
        tenant_id=tenant_id,
        mission_id=mission_id,
        system=system,
        messages=[{"role": "user", "content": user_message}],
        model=model if model is not None else _default_model(),
        max_tokens=max_tokens,
    )


async def complete_streaming(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    mission_id: uuid.UUID | None,
    system: str,
    user_message: str,
    model: str | None = None,
    max_tokens: int = 4096,
) -> AsyncIterator[str]:
    """Streaming counterpart to complete() - same one-shot single-user-message shape and
    identical real CostRecord/metrics bookkeeping (written once the stream is fully
    consumed, from the stream's final `usage` when the API sends one), but yields real
    text deltas as they arrive instead of blocking until the whole completion is done.
    Built for Phase 11's chat-reply streaming (workflows/activities.py's
    synthesize_report) so a chat reply appears token-by-token instead of
    spinner-then-dump.

    A caller must fully consume this generator (e.g. `async for chunk in
    complete_streaming(...)`) for the CostRecord to actually get written - the same real
    requirement complete()'s callers already satisfy by awaiting it to completion.
    """
    model = model if model is not None else _default_model()
    if settings.load_test_mode:
        # Same real, labeled stub as complete()/_complete() - see that docstring.
        db.add(
            CostRecord(
                tenant_id=tenant_id,
                mission_id=mission_id,
                provider="anthropic-load-test-stub",
                model=model,
                input_tokens=0,
                output_tokens=0,
                cost_usd=Decimal("0"),
                latency_ms=0.0,
            )
        )
        await db.flush()
        yield "[load-test-mode] stub completion - no real Anthropic call was made."
        return

    start = time.perf_counter()
    if _provider() == "openai":
        client = _get_openai_client()
        usage = None
        try:
            stream = await client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                temperature=0.1,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_message},
                ],
                stream=True,
                # Real usage arrives on the final chunk when this is set - without it
                # a streamed OpenAI response carries no token counts at all.
                stream_options={"include_usage": True},
            )
            async for chunk in stream:
                if chunk.usage is not None:
                    usage = chunk.usage
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception:
            llm_calls_total.labels(model=model, outcome="error").inc()
            raise
        duration_seconds = time.perf_counter() - start
        latency_ms = duration_seconds * 1000
        llm_call_duration_seconds.labels(model=model).observe(duration_seconds)
        llm_calls_total.labels(model=model, outcome="success").inc()

        db.add(
            CostRecord(
                tenant_id=tenant_id,
                mission_id=mission_id,
                provider="openai",
                model=model,
                input_tokens=usage.prompt_tokens if usage else 0,
                output_tokens=usage.completion_tokens if usage else 0,
                cost_usd=_estimate_cost_usd(
                    "openai", model,
                    usage.prompt_tokens if usage else 0,
                    usage.completion_tokens if usage else 0,
                ),
                latency_ms=latency_ms,
            )
        )
        await db.flush()
        return

    client = _get_anthropic_client()
    try:
        async with client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            system=system,
            # Same ephemeral system-prompt caching as _complete() - see its comment.
            cache_control={"type": "ephemeral"},
            output_config={"effort": "medium"},
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
            final_message = await stream.get_final_message()
    except Exception:
        llm_calls_total.labels(model=model, outcome="error").inc()
        raise
    duration_seconds = time.perf_counter() - start
    latency_ms = duration_seconds * 1000
    llm_call_duration_seconds.labels(model=model).observe(duration_seconds)
    llm_calls_total.labels(model=model, outcome="success").inc()

    db.add(
        CostRecord(
            tenant_id=tenant_id,
            mission_id=mission_id,
            provider="anthropic",
            model=model,
            input_tokens=final_message.usage.input_tokens,
            output_tokens=final_message.usage.output_tokens,
            cost_usd=_estimate_cost_usd(
                "anthropic", model,
                final_message.usage.input_tokens,
                final_message.usage.output_tokens,
            ),
            latency_ms=latency_ms,
        )
    )
    await db.flush()
