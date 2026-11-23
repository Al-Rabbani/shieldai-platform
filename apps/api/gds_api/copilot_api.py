"""Item 40: the Co-Pilot's brain, its voice, and an honest map of both.

WHAT THIS ROUTE IS FOR. The Co-Pilot screen could already run a reasoning mission, but nothing on the platform said
what that brain actually consists of: how many agents exist, how many of their declared tools are executable rather
than planned, whether anything is remembered between missions, and what the orchestration can and cannot do. An
operator asking "is this thing autonomous?" had no measured answer, so this module returns one and names every
absence instead of leaving it to be inferred.

VOICE. Speech is not a new engine: the platform already holds an OPENAI_API_KEY used by the reasoning engine, so
transcription and speech synthesis are the same provider reached through two more endpoints. Both report the model
that answered and the latency, and both write a real cost row (audio is priced per minute of audio and per character,
not per token, so the numbers come from the provider's own response rather than a guess).

NOT CLAIMED: no wake word, no always-on listening, no streaming audio (there is no WebSocket here), and no voice
approval of a write. The browser records, the operator reviews the transcript before it is sent, and a spoken answer
is audio of text that was already produced.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, get_current_user

logger = logging.getLogger("gds.copilot")

router = APIRouter(prefix="/copilot", tags=["copilot"])

MAX_AUDIO_BYTES = 25 * 1024 * 1024          # the provider's own upload ceiling
MAX_SPEECH_CHARS = 4000                      # keeps a single synthesis request bounded
STT_MODEL = "whisper-1"                      # verbose_json carries the audio duration, which is what audio is priced on
TTS_MODEL = "tts-1"
TTS_VOICE = "alloy"
STT_USD_PER_MINUTE = 0.006                   # provider list price, applied to the duration the provider returns
TTS_USD_PER_MILLION_CHARS = 15.0


def _tenant(user: CurrentUser) -> str:
    tid = getattr(user, "tenant_id", None)
    if not tid:
        raise HTTPException(403, "Token carries no tenant identity")
    return str(tid)


def _key_present() -> bool:
    import os
    return bool(os.environ.get("OPENAI_API_KEY"))


async def _record_audio_cost(
    db: AsyncSession, tenant_id: str, model: str, cost_usd: float, latency_ms: int, kind: str
) -> bool:
    """A real row in the same table the token costs land in, so audio is not a blind spot.

    Never raises: a failed cost write must not fail the operator's transcription, but it must not be reported as
    recorded either, so the caller returns what this returns.
    """
    try:
        await db.execute(
            text(
                "INSERT INTO cost_records (id, tenant_id, mission_id, provider, model, input_tokens, output_tokens,"
                " cost_usd, latency_ms, created_at)"
                " VALUES (gen_random_uuid(), :tenant_id, NULL, 'openai', :model, 0, 0, :cost_usd, :latency_ms, now())"
            ),
            {
                "tenant_id": tenant_id,
                "model": f"{model} ({kind})",
                "cost_usd": round(float(cost_usd), 6),
                "latency_ms": int(latency_ms),
            },
        )
        await db.commit()
        return True
    except Exception as exc:  # noqa: BLE001 - reported, never swallowed silently
        logger.warning("audio cost row not written: %s", exc)
        await db.rollback()
        return False


@router.get("/capabilities")
async def copilot_capabilities(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """What this Co-Pilot is made of, measured now, with every gap named."""
    tenant_id = _tenant(current_user)

    from gds_api.reasoning.prompts import AGENT_REGISTRY

    agents = []
    declared_tools: set[str] = set()
    for agent_key, spec in AGENT_REGISTRY.items():
        agents.append(
            {
                "agent_id": agent_key,
                "name": spec.get("name"),
                "risk_level": spec.get("risk_level"),
                "tools": spec.get("tools") or [],
            }
        )
        declared_tools.update(spec.get("tools") or [])

    catalogue: List[Dict[str, Any]] = []
    try:
        from gds_api.capabilities.catalog import CAPABILITY_REGISTRY

        for key, cap in CAPABILITY_REGISTRY.items():
            catalogue.append(
                {
                    "stable_key": key,
                    "status": str(getattr(cap, "status", "")).rsplit(".", 1)[-1],
                    "risk_class": str(getattr(cap, "risk_class", "")).rsplit(".", 1)[-1],
                    "requires_approval": bool(getattr(cap, "requires_human_approval", False)),
                }
            )
    except Exception as exc:  # noqa: BLE001 - an unreadable catalogue is reported, not shown as zero
        logger.warning("capability catalogue unreadable: %s", exc)
        catalogue = []

    # The catalogue's own word for an executable capability is OPERATIONAL. Measured: 65 OPERATIONAL, 2 PLANNED,
    # 3 DISABLED. Comparing against "ACTIVE" counted zero of seventy, which would have read as nothing executable.
    executable = [c for c in catalogue if c["status"] == "OPERATIONAL"]
    planned = [c for c in catalogue if c["status"] == "PLANNED"]
    disabled = [c for c in catalogue if c["status"] == "DISABLED"]

    async def scalar(sql: str, **params: Any) -> Optional[int]:
        try:
            result = await db.execute(text(sql), params)
            value = result.scalar()
            return int(value) if value is not None else 0
        except Exception as exc:  # noqa: BLE001
            logger.warning("count failed (%s): %s", sql.split()[3] if len(sql.split()) > 3 else sql, exc)
            await db.rollback()
            return None

    missions = await scalar("SELECT count(*) FROM missions WHERE tenant_id = :t", t=tenant_id)
    threads = await scalar("SELECT count(*) FROM conversation_threads WHERE tenant_id = :t", t=tenant_id)
    turns = await scalar(
        "SELECT count(*) FROM missions WHERE tenant_id = :t AND conversation_thread_id IS NOT NULL", t=tenant_id
    )
    knowledge = await scalar("SELECT count(*) FROM knowledge_documents WHERE tenant_id = :t", t=tenant_id)
    # A receipt is a decision the broker recorded AND executed: capability_requests has no status column at all, so
    # counting "requests with status executed" raised and returned None, which printed as null.
    receipts = await scalar(
        "SELECT count(*) FROM capability_decisions WHERE tenant_id = :t AND executed_at IS NOT NULL", t=tenant_id
    )
    decisions_allowed = await scalar(
        "SELECT count(*) FROM capability_decisions WHERE tenant_id = :t AND decision = 'ALLOW'", t=tenant_id
    )
    decisions_denied = await scalar(
        "SELECT count(*) FROM capability_decisions WHERE tenant_id = :t AND decision = 'DENY'", t=tenant_id
    )
    decisions_approval = await scalar(
        "SELECT count(*) FROM capability_decisions WHERE tenant_id = :t AND decision = 'REQUIRE_APPROVAL'", t=tenant_id
    )
    cost_rows = await scalar("SELECT count(*) FROM cost_records WHERE tenant_id = :t", t=tenant_id)
    memories = await scalar("SELECT count(*) FROM copilot_memory WHERE tenant_id = :t", t=tenant_id)

    # A count that could not be read is named here rather than left as a null the reader has to interpret.
    measured = {
        "missions": missions,
        "conversation_threads": threads,
        "thread_turns": turns,
        "knowledge_documents": knowledge,
        "executed_receipts": receipts,
        "decisions_allowed": decisions_allowed,
        "decisions_denied": decisions_denied,
        "decisions_require_approval": decisions_approval,
        "cost_rows": cost_rows,
        "memories": memories,
    }
    counts_unavailable = [name for name, value in measured.items() if value is None]

    return {
        "brain": {
            "route": "POST /reasoning/mission",
            "engine": "reasoning engine with a per-agent tool loop, guarded by ai_guard before any model call",
            "agents_registered": len(agents),
            "agents": agents,
            "distinct_agent_tools": len(declared_tools),
            "models": "chosen by the reasoning engine at call time; the model that answered is reported per mission",
            "guard": "high-severity instructions are refused with 422 before reaching a model; medium-severity ones are recorded and allowed",
        },
        "tools": {
            "catalogue_entries": len(catalogue),
            "executable": len(executable),
            "planned": len(planned),
            "disabled": len(disabled),
            "requiring_approval": len([c for c in executable if c["requires_approval"]]),
            "executed_receipts": receipts,
            "decisions_allowed": decisions_allowed,
            "decisions_denied": decisions_denied,
            "decisions_require_approval": decisions_approval,
            "basis": "gds_api.capabilities.catalog.CAPABILITY_REGISTRY counted now; executable means status OPERATIONAL. "
                     "A receipt is a capability_decisions row the broker executed (executed_at set).",
            "counts_unavailable": counts_unavailable,
            "entries": catalogue,
        },
        "memory": {
            "missions_recorded": missions,
            "conversation_threads": threads,
            "thread_turns": turns,
            "knowledge_documents": knowledge,
            "cost_rows": cost_rows,
            "counts_unavailable": counts_unavailable,
            "durable_operator_preferences": {
                "available": True,
                "store": "copilot_memory (tenant-scoped, FORCE RLS)",
                "routes": ["GET /copilot/memory", "POST /copilot/memory", "DELETE /copilot/memory/{id}"],
                "memories_recorded": memories,
                "read_by_a_mission": True,
                "how": "POST /reasoning/mission prefixes the goal with up to 20 recorded memories, most important first, "
                       "and reports standing_memory_count on the mission context so an answer can state what it used.",
                "limit": "A memory changes how a mission answers; it does not create, schedule or run one on its own.",
            },
        },
        "orchestration": {
            "mode": "on request",
            "approval_gate": True,
            "writes_default_off": True,
            "autonomous_scheduler": {
                "available": True,
                "how": "A cron job on this host runs /opt/gds-os/apps/api/run_autonomous_missions.py every 30 minutes "
                       "under flock, against a schedule registry (/opt/gds-os/mission_registry.json). Runs are recorded "
                       "in copilot_scheduler_log and reported by GET /copilot/scheduler.",
                "corrected": "An earlier version of this map said no scheduler existed. That was wrong: the cron entry has "
                             "been launching missions since October. What was missing was visibility and a control, not a "
                             "scheduler.",
                "visible_from": "GET /copilot/scheduler",
                "limits": "One registry entry today; pausing writes interval 0 into the file, and a mission already "
                          "running is not cancelled.",
            },
            "streaming": {
                "available": False,
                "reason": "There is no WebSocket or server-sent event stream: a mission returns when it is done, and the "
                          "screen reports elapsed time rather than progress it cannot see.",
            },
            "external_agent_protocols": {
                "available": False,
                "reason": "No A2A or MCP endpoint is served, so no outside agent can be delegated to or called from here.",
            },
        },
        "voice": {
            "speech_to_text": {
                "endpoint": "POST /copilot/voice/transcribe",
                "model": STT_MODEL,
                "key_present": _key_present(),
                "priced_by": f"audio duration returned by the provider, at ${STT_USD_PER_MINUTE}/minute",
                "wake_word": False,
                "always_listening": False,
            },
            "text_to_speech": {
                "endpoint": "POST /copilot/voice/speak",
                "model": TTS_MODEL,
                "voice": TTS_VOICE,
                "key_present": _key_present(),
                "max_characters": MAX_SPEECH_CHARS,
                "priced_by": f"${TTS_USD_PER_MILLION_CHARS}/million characters",
            },
            "streaming": False,
            "note": "The browser records, the transcript is shown for review before it is sent, and a spoken answer is "
                    "audio of text already produced. A spoken instruction is not an approval of a write.",
        },
        "measured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "tenant_scoped": True,
    }


@router.post("/voice/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Speech to text. Returns the transcript, the model that produced it, and whether the cost row was written."""
    if not _key_present():
        raise HTTPException(503, "OPENAI_API_KEY is not set on this host, so no transcription can be made")
    audio = await file.read()
    if not audio:
        raise HTTPException(422, "Empty audio upload")
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(413, f"Audio is {len(audio)} bytes; the limit is {MAX_AUDIO_BYTES}")

    started = time.monotonic()
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=__import__("os").environ.get("OPENAI_API_KEY"))
        result = await client.audio.transcriptions.create(
            model=STT_MODEL,
            file=(file.filename or "audio.webm", audio, file.content_type or "audio/webm"),
            response_format="verbose_json",
        )
    except Exception as exc:  # noqa: BLE001 - the operator sees the provider's reason, not a silent empty string
        raise HTTPException(502, f"Transcription failed: {type(exc).__name__}: {exc}") from exc

    latency_ms = int((time.monotonic() - started) * 1000)
    transcript = (getattr(result, "text", None) or "").strip()
    duration = float(getattr(result, "duration", 0) or 0)
    cost = (duration / 60.0) * STT_USD_PER_MINUTE
    recorded = await _record_audio_cost(db, _tenant(current_user), STT_MODEL, cost, latency_ms, "transcription")

    return {
        "text": transcript,
        "model": STT_MODEL,
        "audio_seconds": round(duration, 2),
        "latency_ms": latency_ms,
        "cost_usd": round(cost, 6),
        "cost_recorded": recorded,
        "empty_transcript": transcript == "",
    }


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1)
    voice: Optional[str] = None


class MemoryWrite(BaseModel):
    kind: str = Field(pattern="^(preference|instruction|fact)$")
    key: str = Field(min_length=1, max_length=120)
    value: str = Field(min_length=1, max_length=2000)


def _set_tenant(tid: str):
    """The store is FORCE RLS, so every statement runs under the caller's tenant or returns nothing at all."""
    from sqlalchemy import text as _text
    return _text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": str(tid)}


@router.get("/memory")
async def list_memory(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Every standing preference, instruction and fact this tenant's Co-Pilot holds, newest first."""
    tid = _tenant(current_user)
    stmt, params = _set_tenant(tid)
    await db.execute(stmt, params)
    rows = (
        await db.execute(
            text(
                "SELECT id, kind, key, value, source, confidence, pinned, use_count, created_at, updated_at"
                " FROM copilot_memory WHERE tenant_id = :tid ORDER BY pinned DESC, updated_at DESC"
            ),
            {"tid": tid},
        )
    ).mappings().all()
    return {
        "count": len(rows),
        "memories": [
            {
                "id": str(r["id"]),
                "kind": r["kind"],
                "key": r["key"],
                "value": r["value"],
                "source": r["source"],
                "confidence": r["confidence"],
                "pinned": r["pinned"],
                "use_count": r["use_count"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
            }
            for r in rows
        ],
        "basis": "copilot_memory for the calling tenant only. A memory is what the operator stated or what a page "
                 "recorded; nothing here is inferred from a mission.",
    }


@router.post("/memory")
async def remember(
    body: MemoryWrite,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Record a standing preference. Stating the same key again replaces it rather than accumulating duplicates."""
    tid = _tenant(current_user)
    actor = str(getattr(current_user, "user_id", None) or getattr(current_user, "id", "") or "") or None
    stmt, params = _set_tenant(tid)
    await db.execute(stmt, params)
    row = (
        await db.execute(
            text(
                "INSERT INTO copilot_memory (tenant_id, kind, key, value, source, confidence, created_by)"
                " VALUES (:tid, :kind, :key, :value, 'operator_stated', 'stated', :actor)"
                " ON CONFLICT (tenant_id, kind, key)"
                " DO UPDATE SET value = EXCLUDED.value, updated_at = now(), source = 'operator_stated'"
                " RETURNING id, (xmax = 0) AS inserted"
            ),
            {"tid": tid, "kind": body.kind, "key": body.key, "value": body.value, "actor": actor},
        )
    ).mappings().first()
    await db.commit()
    return {
        "id": str(row["id"]),
        "kind": body.kind,
        "key": body.key,
        "value": body.value,
        "created": bool(row["inserted"]),
        "note": "Recorded for this tenant. It is read back by GET /copilot/memory; it does not change a mission's "
                "behaviour on its own.",
    }


@router.delete("/memory/{memory_id}")
async def forget(
    memory_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Forget one memory. Scoped to the caller's tenant, so another tenant's id deletes nothing."""
    tid = _tenant(current_user)
    stmt, params = _set_tenant(tid)
    await db.execute(stmt, params)
    result = await db.execute(
        text("DELETE FROM copilot_memory WHERE id = CAST(:mid AS uuid) AND tenant_id = :tid"),
        {"mid": memory_id, "tid": tid},
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(404, "No memory with that id belongs to this tenant")
    return {"deleted": True, "id": memory_id}


@router.post("/voice/speak")
async def speak_text(
    body: SpeakRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Text to speech. Returns MP3 bytes; the caller plays them and nothing is stored on this host."""
    if not _key_present():
        raise HTTPException(503, "OPENAI_API_KEY is not set on this host, so no speech can be synthesised")
    spoken = body.text.strip()
    if not spoken:
        raise HTTPException(422, "Nothing to speak")
    if len(spoken) > MAX_SPEECH_CHARS:
        raise HTTPException(413, f"Text is {len(spoken)} characters; the limit is {MAX_SPEECH_CHARS}")

    started = time.monotonic()
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=__import__("os").environ.get("OPENAI_API_KEY"))
        audio = await client.audio.speech.create(
            model=TTS_MODEL, voice=body.voice or TTS_VOICE, input=spoken, response_format="mp3"
        )
        payload = audio.content if hasattr(audio, "content") else audio.read()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"Speech synthesis failed: {type(exc).__name__}: {exc}") from exc

    latency_ms = int((time.monotonic() - started) * 1000)
    cost = (len(spoken) / 1_000_000.0) * TTS_USD_PER_MILLION_CHARS
    recorded = await _record_audio_cost(db, _tenant(current_user), TTS_MODEL, cost, latency_ms, "speech")

    return Response(
        content=payload,
        media_type="audio/mpeg",
        headers={
            "X-GDS-Model": TTS_MODEL,
            "X-GDS-Latency-Ms": str(latency_ms),
            "X-GDS-Cost-Usd": f"{cost:.6f}",
            "X-GDS-Cost-Recorded": "true" if recorded else "false",
            "Cache-Control": "no-store",
        },
    )
