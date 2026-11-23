"""Item 38: the Co-Pilot chrome must state only what it measures.

Three assertions lived on the routed Co-Pilot page that nothing measured: a Math.random() progress percentage,
"Reading 6 live data sources" with a "Zero Trust gate: CLEARED" verdict, and "GPT-4.1 parallel execution: IN PROGRESS";
plus an invented "v2.0" version beside a sidebar reading v9.076.2, and a bell badge hardcoded to 8.
"""
import pathlib
import re

ROOT = pathlib.Path("/opt/gds-os")
WEB = ROOT / "apps" / "web" / "src"

PAGE = WEB / "pages" / "gds" / "GDSCoPilotPage.jsx"
PANEL = WEB / "components" / "copilot" / "MissionControlPanel.jsx"
BAR = WEB / "components" / "copilot" / "CoPilotTopBar.jsx"
ADAPTER = WEB / "api" / "base44Client.js"


def code(path: pathlib.Path) -> str:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(?m)^\s*//.*$", "", text)
    return text


def test_the_mission_panel_draws_no_invented_progress():
    text = code(PANEL)
    for banned in ("Math.random", "setProgress", "Activating agents", "live data sources", "Zero Trust gate", "GPT-4.1"):
        assert banned not in text, f"MissionControlPanel still asserts {banned!r}"


def test_the_mission_panel_reports_the_three_observable_facts():
    text = code(PANEL)
    assert "startedAt" in text, "elapsed time must come from when the request was sent"
    assert "setElapsed" in text
    assert "agentLabel" in text and "commandType" in text, "the panel must name what was actually sent"
    assert "synchronous" in text, "the absence of a progress channel must be stated, not implied"


def test_the_header_reads_the_deployed_release_instead_of_inventing_a_version():
    text = code(BAR)
    assert "v2.0" not in text, "the invented version string is still here"
    assert "version?.sha" in text and "release unknown" in text
    page = code(PAGE)
    assert "base44.platform.version()" in page, "the page must read GET /health/version"


def test_the_bell_count_is_measured_and_the_bell_goes_somewhere():
    page = code(PAGE)
    assert "notificationCount={8}" not in page, "the badge is still hardcoded"
    assert "unreadNotificationCount()" in page
    bar = code(BAR)
    assert 'to="/notifications"' in bar, "the bell had no handler and must link to the store it counts"
    assert "unreadCount == null" in bar, "an unreadable count must omit the badge, not draw a zero"


def test_the_page_hands_the_panel_what_it_knows_not_a_fake_agent_list():
    page = code(PAGE)
    assert "thinkingAgents" not in page, "the fake in-flight agent list is still wired"
    assert "<MissionControlPanel agentLabel={mission?.agentLabel}" in page


def test_the_adapter_exposes_the_two_measured_reads():
    text = code(ADAPTER)
    assert "async version()" in text and "'/health/version'" in text
    assert "async unreadNotificationCount()" in text
    assert "unread_only: true" in text, "the count must be the unread set, not a fetched page"
    assert "return Array.isArray(list) ? list.length : null" in text, "an unreadable count must be null, not 0"


def test_every_icon_used_is_imported_in_the_file_that_uses_it():
    for path in (BAR, PANEL):
        text = path.read_text(encoding="utf-8")
        imported = set(re.findall(r"import\s*\{([^}]+)\}\s*from", text))
        names = {n.strip() for group in imported for n in group.split(",")}
        used = set(re.findall(r"<([A-Z][A-Za-z0-9]*)", text))
        builtin = {"React"}
        missing = {u for u in used - builtin if u not in names and u not in {"MissionControlPanel", "CoPilotTopBar"}}
        assert not missing, f"{path.name} renders {missing} without importing it"


def test_the_routed_component_is_the_one_under_test():
    app = (WEB / "App.jsx").read_text(encoding="utf-8")
    assert 'path="/copilot" element={<GDSCoPilotPage />}' in app
    assert "import GDSCoPilotPage from '@/pages/gds/GDSCoPilotPage'" in app
