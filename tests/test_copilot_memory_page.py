"""Item 41: the memory page reads the real store, and nothing on it draws a zero for what is not held."""
import pathlib
import re

WEB = pathlib.Path("/opt/gds-os/apps/web/src")
PAGE = WEB / "pages" / "gds" / "GDSCoPilotMemoryPage.jsx"


def code(path: pathlib.Path) -> str:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(?m)^\s*//.*$", "", text)
    text = re.sub(r"(?m)^\s*\*.*$", "", text)
    return text


def test_the_page_reads_the_store_the_planner_is_given():
    src = code(PAGE)
    assert "base44.platform.memories()" in src
    assert "base44.platform.remember(" in src
    assert "base44.platform.forget(" in src
    assert "GET /copilot/memory" in PAGE.read_text()


def test_the_two_stores_that_do_not_exist_are_gone_from_the_running_code():
    src = code(PAGE)
    for dead in ("CopilotMemoryReference", "CopilotRiskDecision"):
        assert dead not in src, f"{dead} has no route and no table; it must not be read"


def test_a_failed_read_is_named_and_never_drawn_as_zero():
    src = code(PAGE)
    assert "setLoadError(" in src
    assert "Nothing below is a measured zero" in src
    # The tiles must show an em dash while loading, not 0.
    assert '{loading ? "—" : memories.length}' in src


def test_a_failed_write_is_reported_rather_than_claimed():
    src = code(PAGE)
    assert "setWriteError(" in src
    assert "That memory could not be recorded." in src
    assert "That memory could not be removed." in src
    assert "setNotice(" in src, "a real success must still be reported"


def test_the_absences_are_stated_on_the_page():
    src = PAGE.read_text()
    assert "Nothing is inferred" in src
    assert "No transcript is kept" in src
    assert "One tenant only" in src


def test_it_is_routed_and_reachable_from_the_sidebar():
    app = (WEB / "App.jsx").read_text()
    assert "import GDSCoPilotMemoryPage from '@/pages/gds/GDSCoPilotMemoryPage';" in app
    assert '<Route path="/copilot/memory" element={<GDSCoPilotMemoryPage />} />' in app
    sidebar = (WEB / "components" / "platform" / "GlobalSidebar.jsx").read_text()
    assert 'label: "Co-Pilot Memory", path: "/copilot/memory"' in sidebar
    assert "Brain," in sidebar, "the icon must be imported or the entry renders blank"


def test_the_adapter_maps_all_three_calls_to_the_real_routes():
    api = code(WEB / "api" / "base44Client.js")
    assert "memories: () => request('/copilot/memory')" in api
    assert "remember: (memory) => request('/copilot/memory', { method: 'POST', body: memory })" in api
    assert "forget: (memoryId) => request(`/copilot/memory/${memoryId}`, { method: 'DELETE' })" in api


def test_the_backend_routes_this_page_depends_on_still_exist():
    from gds_api import copilot_api
    paths = [r.path for r in copilot_api.router.routes]
    assert paths.count("/copilot/memory") == 2
    assert "/copilot/memory/{memory_id}" in paths
