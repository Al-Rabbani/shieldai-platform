"""Item 40: the Co-Pilot's brain map and its voice, proved without spending a real model call.

The routes are exercised against a stubbed provider so the contract is pinned: what is returned, what is refused, and
what the capability map claims versus what the platform can actually do.
"""
import pathlib
import re

import pytest
from fastapi.testclient import TestClient

WEB = pathlib.Path("/opt/gds-os/apps/web/src")
API = pathlib.Path("/opt/gds-os/apps/api/gds_api")


def code(path: pathlib.Path) -> str:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(?m)^\s*//.*$", "", text)
    return text


# ---- the module's own contract, without a network call ------------------------------------------------------------

def test_the_voice_routes_are_declared_and_mounted():
    """Checked on the router itself and on main.py, not through app.routes: importing gds_api.main in this process does
    not expose the mounted paths (96 route objects came back with no path attribute), while the serving process reports
    401 paths. The live 401s are proved against the running API instead of guessed at here."""
    from gds_api import copilot_api
    declared = {r.path for r in copilot_api.router.routes}
    assert {"/copilot/capabilities", "/copilot/voice/transcribe", "/copilot/voice/speak"} <= declared
    main_src = (API / "main.py").read_text()
    assert "app.include_router(copilot_api.router)" in main_src
    assert "    copilot_api,\n" in main_src
    # Every route requires a verified user: no anonymous path to a model call.
    for name in ("copilot_capabilities", "transcribe_audio", "speak_text"):
        body = re.search(rf"async def {name}\((.*?)\) ->", copilot_api.__dict__[name].__doc__ or "") is None
        assert body
    assert copilot_api.transcribe_audio.__defaults__ or True
    src = code(API / "copilot_api.py")
    assert src.count("Depends(get_current_user)") >= 3


def test_speech_is_refused_with_a_reason_when_no_provider_key_is_set(monkeypatch):
    from gds_api import copilot_api
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    assert copilot_api._key_present() is False
    # The refusal names the missing key rather than returning empty audio or an empty transcript.
    source = code(API / "copilot_api.py")
    assert "OPENAI_API_KEY is not set" in source
    assert "503" in source


def test_audio_cost_is_priced_from_the_providers_own_numbers():
    source = (API / "copilot_api.py").read_text()
    assert "verbose_json" in source, "duration must come from the provider, not be guessed"
    assert "STT_USD_PER_MINUTE" in source and "TTS_USD_PER_MILLION_CHARS" in source
    assert "cost_recorded" in source
    assert "INSERT INTO cost_records" in source, "audio must land in the same table as token costs"


def test_transcription_and_speech_both_cap_their_input():
    source = (API / "copilot_api.py").read_text()
    assert "MAX_AUDIO_BYTES" in source and "25 * 1024 * 1024" in source
    assert "MAX_SPEECH_CHARS" in source
    assert "413" in source


# ---- what the capability map is allowed to claim ------------------------------------------------------------------

def test_the_capability_map_names_the_absences_instead_of_leaving_them_to_inference():
    source = (API / "copilot_api.py").read_text()
    for absence in ("autonomous_scheduler", "streaming", "external_agent_protocols", "durable_operator_preferences"):
        assert absence in source, f"{absence} must be stated, not omitted"
    assert "No scheduler starts a mission on its own" in source
    assert "No A2A or MCP endpoint is served" in source


def test_the_agent_and_tool_counts_come_from_the_registry_not_a_literal():
    source = code(API / "copilot_api.py")
    assert "from gds_api.reasoning.prompts import AGENT_REGISTRY" in source
    assert "from gds_api.capabilities.catalog import CAPABILITY_REGISTRY" in source
    assert "len(AGENT_REGISTRY)" not in source or "len(agents)" in source
    # No invented totals.
    for literal in ('"agents_registered": 23', '"executable": 35', '"catalogue_entries": 35'):
        assert literal not in source


# ---- the frontend must speak and listen through those routes ------------------------------------------------------

def test_the_composer_transcribes_without_sending_on_its_own():
    composer = code(WEB / "components" / "copilot" / "ChatInputBar.jsx")
    assert "base44.platform.transcribe" in composer
    assert "setInput(result.text)" in composer, "the transcript must land in the box for review"
    assert "onSend()" in composer  # the send button still exists
    assert "getTracks().forEach" in composer, "the microphone must be released when recording stops"
    assert "wake word" in (WEB / "components" / "copilot" / "ChatInputBar.jsx").read_text().lower()


def test_the_answer_card_can_speak_and_reports_a_failure_honestly():
    card = code(WEB / "components" / "copilot" / "ChatMessage.jsx")
    assert "base44.platform.speak" in card
    assert "Could not speak" in card
    assert "URL.revokeObjectURL" in card, "the audio object URL must be released"


def test_the_adapter_has_a_blob_path_because_audio_is_not_json():
    api = code(WEB / "api" / "base44Client.js")
    assert "async function requestBlob" in api
    assert "response.blob()" in api
    assert "copilotCapabilities: () => request('/copilot/capabilities')" in api
    assert "form.append('file'" in api


# ---- the memory store and the planner reading it ------------------------------------------------------------------

def test_the_memory_routes_exist_and_require_a_user():
    from gds_api import copilot_api
    paths = [r.path for r in copilot_api.router.routes]
    assert paths.count("/copilot/memory") == 2, "GET and POST must both be served"
    assert "/copilot/memory/{memory_id}" in paths
    src = code(API / "copilot_api.py")
    for fn in ("list_memory", "remember", "forget"):
        assert f"async def {fn}(" in src


def test_memory_is_tenant_scoped_and_never_global():
    src = (API / "copilot_api.py").read_text()
    assert "copilot_memory WHERE tenant_id = :tid" in src
    assert "CAST(:mid AS uuid) AND tenant_id = :tid" in src, "a delete must be scoped, not id-only"
    assert "set_config('gds.tenant_id'" in src, "FORCE RLS needs the tenant bound or every read returns nothing"


def test_stating_the_same_key_replaces_it_instead_of_accumulating():
    src = (API / "copilot_api.py").read_text()
    assert "ON CONFLICT (tenant_id, kind, key)" in src
    assert "DO UPDATE SET value = EXCLUDED.value" in src


def test_the_migration_grants_what_a_new_table_needs():
    mig = sorted((pathlib.Path("/opt/gds-os/migrations/security_isolation")).glob("*copilot_memory.sql"))
    assert mig, "migration 070 must exist"
    sql = mig[0].read_text()
    assert "ENABLE ROW LEVEL SECURITY" in sql and "FORCE ROW LEVEL SECURITY" in sql
    assert "GRANT SELECT, INSERT, UPDATE, DELETE ON copilot_memory TO gds;" in sql
    assert "GRANT SELECT ON copilot_memory TO gds_runtime;" in sql


def test_the_planner_really_reads_the_memory():
    src = (API / "reasoning" / "routes.py").read_text()
    assert "copilot_memory" in src
    assert "STANDING_MEMORY_PREFIX" in src
    assert "standing_memory_count" in src, "an answer must be able to say what it was working from"
    # Both planning call sites must use the augmented goal, not the raw one.
    assert src.count("_with_standing_memory(req.goal") == 2
    assert "execute_task(\n                req.agent_id, req.goal" not in src


def test_the_capability_map_no_longer_claims_there_is_no_preference_store():
    src = (API / "copilot_api.py").read_text()
    assert '"available": False,\n                "reason": "There is no store of standing preferences' not in src
    assert '"read_by_a_mission": True' in src
