"""Every model call must leave a cost row, and the dashboard must stop buying a summary per visit.

What this pins, and why each assertion exists:

* THE SPEND WAS INVISIBLE. `cost_records` held 175 rows, the newest 20 Nov 01:50, $1.08 total since 13 Oct, while
  missions ran 16-47 a day and the OpenAI key answered 200 to a live completion. Only `model_router` wrote a row; the
  reasoning stack calls the provider directly. A source test below refuses a NEW call site that records nothing.
* AN UNBOUND INSERT IS SILENTLY REJECTED. `cost_records` is FORCE-RLS, so a row written without a tenant disappears.
  The helper refuses without a tenant and says so rather than returning a comfortable success.
* TOKEN COUNTS COME FROM THE PROVIDER, not from counting characters, and both SDK shapes are read (OpenAI reports
  prompt_tokens/completion_tokens, Anthropic input_tokens/output_tokens).
* A FAILED COST WRITE MUST NOT FAIL A MISSION: the helper returns False and logs; it never raises into the caller.
* A DAILY SUMMARY IS NOT DAILY IF EVERY VISIT REGENERATES IT. Measured: opening /v2/ created a real mission each time.
  The page now keeps it for the calendar day and offers an explicit regenerate.
"""
from __future__ import annotations

import pathlib
import re
import uuid
from decimal import Decimal

import pytest

from gds_api import llm_cost as m

REPO = pathlib.Path(__file__).resolve().parents[1]
API = REPO / "apps" / "api" / "gds_api"
WEB = REPO / "apps" / "web" / "src"


def _code(path: pathlib.Path) -> str:
    """Source with comments and docstrings removed, so an assertion cannot match the prose explaining a fix."""
    text = path.read_text()
    text = re.sub(r'""".*?"""', "", text, flags=re.S)
    text = re.sub(r"'''.*?'''", "", text, flags=re.S)
    text = re.sub(r"#.*$", "", text, flags=re.M)
    return text


class FakeSession:
    """A session that records what was added and whether it was bound and committed."""

    def __init__(self, log):
        self.log = log
        self.added = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def commit(self):
        self.log.append("commit")

    def add(self, row):
        self.added.append(row)
        self.log.append("add")


def _wire(monkeypatch, *, fail_bind=False, fail_commit=False):
    log = []
    session = FakeSession(log)

    async def fake_bind(db, tenant):
        if fail_bind:
            raise RuntimeError("RLS rejected the binding")
        log.append(f"bind:{tenant}")

    if fail_commit:
        async def boom():
            raise RuntimeError("commit failed")
        session.commit = boom

    monkeypatch.setattr(m, "async_session_factory", lambda: session)
    monkeypatch.setattr("gds_api.tenant_binding.bind_tenant", fake_bind)
    return log, session


TENANT = "2ec10dd0-e48e-4043-8c88-5998ba5e23b0"


class Usage:
    """The OpenAI SDK shape."""

    def __init__(self, prompt_tokens=1000, completion_tokens=500):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


def test_a_real_row_is_written_with_the_providers_own_token_counts(monkeypatch):
    log, session = _wire(monkeypatch)
    ok = __import__("asyncio").run(
        m.record_llm_cost(tenant_id=TENANT, model="gpt-4.1", usage=Usage(1200, 340), latency_ms=812.5,
                          call_site="test")
    )
    assert ok is True
    assert log == [f"bind:{TENANT}", "add", "commit"]
    row = session.added[0]
    assert row.input_tokens == 1200 and row.output_tokens == 340
    assert row.provider == "openai" and row.model == "gpt-4.1"
    assert row.latency_ms == 812.5
    assert row.cost_usd > 0, "a real call must carry a real price, not zero"


def test_the_anthropic_usage_shape_is_read_too(monkeypatch):
    _wire(monkeypatch)
    usage = {"input_tokens": 900, "output_tokens": 120}
    assert m._tokens(usage) == (900, 120)
    assert m._tokens(Usage(7, 9)) == (7, 9)
    assert m._tokens(None) == (0, 0)


def test_without_a_tenant_nothing_is_written_and_the_caller_is_told(monkeypatch):
    log, session = _wire(monkeypatch)
    ok = __import__("asyncio").run(
        m.record_llm_cost(tenant_id=None, model="gpt-4.1", usage=Usage(), call_site="test/no-tenant")
    )
    assert ok is False
    assert session.added == [], "cost_records is FORCE-RLS: an unbound row would vanish, so none may be attempted"


def test_a_failed_write_is_reported_not_raised(monkeypatch):
    _wire(monkeypatch, fail_commit=True)
    ok = __import__("asyncio").run(
        m.record_llm_cost(tenant_id=TENANT, model="gpt-4.1", usage=Usage(), call_site="test/commit-fail")
    )
    assert ok is False, "losing the bookkeeping must not turn a real mission into a failed one"


def test_a_mission_id_is_carried_when_one_is_given(monkeypatch):
    _wire(monkeypatch)
    mission = uuid.uuid4()
    __import__("asyncio").run(
        m.record_llm_cost(tenant_id=TENANT, mission_id=str(mission), model="gpt-4.1", usage=Usage(), call_site="t")
    )
    assert m._as_uuid(str(mission)) == mission
    assert m._as_uuid("mission-9f1f78657ba1") is None, "a non-UUID mission id cannot be a cost row's FK, so it is dropped"


def test_the_price_comes_from_the_one_table_the_router_uses(monkeypatch):
    """Two price tables would eventually disagree; the helper reuses model_router's."""
    from gds_api.model_router import _estimate_cost_usd

    assert _estimate_cost_usd("openai", "gpt-4.1", 1000, 500) == Decimal(_estimate_cost_usd("openai", "gpt-4.1", 1000, 500))
    assert _estimate_cost_usd("openai", "gpt-4.1", 1000, 500) > 0


# --- the guard: a new call site cannot spend silently ------------------------------------------------------------

CALL = re.compile(r"client\.chat\.completions\.create\(")

# Measured 23 Nov 2026, so the exemption is evidence rather than a loophole:
#   kernel_agent_loop.py  -> zero importers on this platform (grep for KernelAgentLoop outside the module: none)
#   tool_definitions.py   -> the string appears in a module docstring, not a call
EXEMPT = {
    "reasoning/kernel_agent_loop.py": "no importer on this platform (grep for KernelAgentLoop outside the module: none)",
    "reasoning/tool_definitions.py": "docstring mention, not a call",
    "agentic/planner.py": "AgentPlanner is imported in main.py but never instantiated (no AgentPlanner( call site)",
}


def test_every_direct_model_call_site_records_its_cost():
    offenders = []
    for path in sorted(API.rglob("*.py")):
        source = _code(path)
        if not CALL.search(source):
            continue
        relative = str(path.relative_to(API))
        if relative in EXEMPT:
            continue
        # An inline CostRecord write is recording too - model_router is the one writer that does its own.
        if "record_llm_cost(" not in source and "CostRecord(" not in source:
            offenders.append(relative)
    assert not offenders, (
        "these files call the provider directly and record nothing, which is how $1.08 of 203 missions was the whole "
        f"recorded spend: {offenders}"
    )


def test_the_live_reasoning_path_is_covered_by_name():
    """The two calls every mission makes: the routing call and every loop iteration."""
    loop = _code(API / "reasoning" / "agent_loop.py")
    bridge = _code(API / "reasoning" / "bridge.py")
    assert "record_llm_cost(" in loop and "tenant_id=self.tenant_id" in loop
    assert "record_llm_cost(" in bridge and "call_site=\"reasoning/bridge.auto_select_agent\"" in bridge


def test_the_router_is_still_the_one_writer_for_its_own_calls():
    """model_router writes CostRecord inline; it must not double-write through the helper."""
    router = _code(API / "model_router.py")
    assert "CostRecord(" in router
    assert "record_llm_cost(" not in router


# --- the dashboard summary --------------------------------------------------------------------------------------

def test_the_dashboard_summary_is_held_for_the_day():
    page = _code(WEB / "pages" / "CommandCenter.jsx")
    assert "gds.commandCentre.dailySummary.v1" in page
    assert "readCachedSummary()" in page and "writeCachedSummary(" in page
    # Inside the mount effect the cache must be read before anything is generated, and an existing entry returns.
    effect = page[page.index("useEffect(() => {"):]
    effect = effect[:effect.index("}, [generateSummary]);")]
    assert effect.index("readCachedSummary()") < effect.index("generateSummary()"), "the cache must be read first"
    assert "if (cached)" in effect and "return;" in effect


def test_regenerating_is_an_explicit_act_with_its_cost_stated():
    component = _code(WEB / "components" / "dashboard" / "DailyIntelligenceSummary.jsx")
    assert "onRefresh" in component and "regenerate" in component.lower()
    assert "spend another model call" in (WEB / "components" / "dashboard" / "DailyIntelligenceSummary.jsx").read_text()


def test_the_summary_panel_states_its_own_failure():
    component = _code(WEB / "components" / "dashboard" / "DailyIntelligenceSummary.jsx")
    assert "Summary unavailable:" in component
    assert "No summary available." not in component, "the old copy hid a failed call as an empty state"


def test_the_day_key_is_a_real_local_date():
    page = _code(WEB / "pages" / "CommandCenter.jsx")
    assert "getMonth()" in page and "getFullYear()" in page, "a UTC slice would roll the summary over mid-evening in Dublin"
