"""Item 44: the chat can run a real multi-agent mission, and says what that costs and cannot do."""
import pathlib
import re

ROOT = pathlib.Path("/opt/gds-os")
API = ROOT / "apps" / "api" / "gds_api"
WEB = ROOT / "apps" / "web" / "src"
MOD = API / "copilot_orchestrate_api.py"
PAGE = WEB / "pages" / "gds" / "GDSCoPilotPage.jsx"


def code(path):
    text = pathlib.Path(path).read_text(encoding="utf-8")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(?m)^\s*#.*$", "", text)
    text = re.sub(r'(?m)^\s*""".*?"""', "", text, flags=re.S)
    return text


def test_the_route_exists_gated_and_rate_limited():
    src = code(MOD)
    assert 'prefix="/copilot/mission"' in src
    assert '@router.post(\n    "/orchestrate",' in src or '@router.post("/orchestrate"' in src
    assert 'require_permission("copilot:orchestrate")' in src
    assert 'tenant_rate_limit("copilot_orchestrate", max_requests=8, window_seconds=3600)' in src, (
        "a chat loop must not be able to spend money without a cap"
    )
    main = (API / "main.py").read_text()
    assert "app.include_router(copilot_orchestrate_api.router)" in main


def test_the_goal_is_guarded_before_it_reaches_the_orchestrator():
    src = code(MOD)
    assert "ai_guard.scan(body.goal, None)" in src
    assert "prompt_guard_refused" in src
    assert src.index("ai_guard.scan(") < src.index("await execute_mission("), "guard must run first"


def test_the_mission_is_read_only_unless_asked_and_carries_the_caller():
    src = code(MOD)
    assert "allow_writes: bool = False" in src, "a typed sentence must not be able to write by default"
    assert '"tenant_id": tenant_id' in src and '"user_id": actor_id' in src, (
        "the governed loop refuses unbound tools; the mission must carry tenant and user"
    )
    assert '"allow_writes": body.allow_writes' in src


def test_standing_memory_is_applied_and_the_cost_is_measured_not_guessed():
    src = code(MOD)
    assert "_with_standing_memory(" in src, "the same memory the single-agent route uses"
    assert "cost_records" in src and "created_at >= :since" in src
    assert "cost_basis" in src
    assert "float(value) if value is not None else None" in src, "an unmeasured cost must be None, not 0"


def test_the_limits_are_stated_in_words():
    src = (MOD).read_text()
    limits_block = src.split("LIMITS = [", 1)[1].split("]", 1)[0]
    for claim in ("Nothing streams", "planner chooses the agents", "Read-only unless", "costs real money",
                  "No chat transcript is stored"):
        assert claim in limits_block, claim


def test_the_migration_grants_its_own_permission():
    mig = sorted((ROOT / "migrations" / "security_isolation").glob("*copilot_orchestrate.sql"))
    assert mig
    sql = mig[0].read_text()
    assert '"copilot:orchestrate"' in sql
    assert "platform_owner" in sql
    assert "analyst is deliberately left without" in sql


def test_the_page_defaults_to_one_agent_and_only_orchestrates_on_request():
    src = code(PAGE)
    assert "const [missionMode, setMissionMode] = useState(false);" in src
    assert "base44.platform.orchestrateMission(userInput)" in src
    mission_branch = src.split("if (missionMode) {", 1)[1].split("const result = await invokeAction", 1)[0]
    assert "orchestrateMission" in mission_branch
    # the cheap path must not have gained the orchestrator call
    single = src.split("const result = await invokeAction", 1)[1]
    assert "orchestrateMission" not in single.split("} catch", 1)[0]


def test_the_mission_path_clears_loading_and_reports_cost():
    src = code(PAGE)
    branch = src.split("if (missionMode) {", 1)[1].split("const result = await invokeAction", 1)[0]
    assert "setLoading(false);" in branch, "the early return would otherwise leave the composer spinning"
    assert "cost_usd: run.cost_usd" in branch
    assert "setMission(null);" in branch


def test_unknown_agents_get_a_neutral_card_not_an_invented_identity():
    src = code(PAGE)
    assert "AGENT_LOOK[a.agent_id] || { emoji:" in src
    assert "This agent returned no summary." in src


def test_the_toggle_is_wired_and_the_footer_shows_the_cost():
    bar = code(WEB / "components" / "copilot" / "ChatInputBar.jsx")
    assert "missionMode, setMissionMode" in bar
    assert "ASK · one agent" in bar and "MISSION · multi-agent" in bar
    msg = code(WEB / "components" / "copilot" / "ChatMessage.jsx")
    assert "message.cost_usd != null" in msg
    page = code(PAGE)
    assert "<ChatInputBar missionMode={missionMode} setMissionMode={setMissionMode}" in page


def test_the_adapter_posts_the_goal_and_the_write_flag():
    api = code(WEB / "api" / "base44Client.js")
    assert "orchestrateMission: (goal, options = {}) =>" in api
    assert "request('/copilot/mission/orchestrate', { method: 'POST'" in api
    assert "allow_writes: !!options.allow_writes" in api
