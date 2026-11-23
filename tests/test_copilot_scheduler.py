"""Item 42: the autonomous loop is reported, controllable, and its claim in the capability map is corrected."""
import pathlib
import re

ROOT = pathlib.Path("/opt/gds-os")
API = ROOT / "apps" / "api" / "gds_api"
WEB = ROOT / "apps" / "web" / "src"
RUNNER = ROOT / "apps" / "api" / "run_autonomous_missions.py"
PAGE = WEB / "pages" / "gds" / "GDSCoPilotSchedulerPage.jsx"


def code(path):
    text = pathlib.Path(path).read_text(encoding="utf-8")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(?m)^\s*#.*$", "", text)
    text = re.sub(r'(?m)^\s*""".*?"""', "", text, flags=re.S)
    return text


def test_the_routes_exist_and_are_gated_on_their_own_permission():
    src = code(API / "scheduler_api.py")
    assert 'prefix="/copilot/scheduler"' in src
    assert 'require_permission("scheduler:read")' in src
    assert src.count('require_permission("scheduler:write")') == 2, "pause and resume both write"
    assert "_require_bridge(authorization)" in src, "the runner routes must not accept a user session"
    for route in ('@router.get("")', '@router.post("/{name}/pause")', '@router.post("/{name}/resume")',
                  '@router.get("/guard")', '@router.post("/runs")'):
        assert route in src, route


def test_the_scheduler_is_registered_and_the_old_false_claim_is_gone():
    main = (API / "main.py").read_text()
    assert "app.include_router(scheduler_api.router)" in main
    caps = (API / "copilot_api.py").read_text()
    assert '"reason": "No scheduler starts a mission on its own' not in caps
    assert '"available": True,\n                "how": "A cron job on this host' in caps
    assert "corrected" in caps, "the correction must be stated, not silently swapped"


def test_the_guard_enforces_pause_cost_and_the_bridge_limiter():
    src = code(API / "scheduler_api.py")
    assert "interval_seconds is 0 in the registry" in src
    assert "daily cost cap reached" in src
    assert "ratelimit:bridge_mission" in src, "the live 429 must be visible before a run starts"
    assert "resets in" in src
    assert "measured" in src, "an unreadable limiter must say so rather than read as clear"


def test_the_tenant_is_resolved_from_the_environment_not_a_slug_search():
    src = code(API / "scheduler_api.py")
    assert 'os.getenv("GDS_TENANT_ID")' in src
    assert "cannot be searched by slug before a tenant" in src
    assert "SELECT id FROM tenants WHERE slug = :slug LIMIT 1" not in src, (
        "tenants is RLS-bound on its own id; that lookup returns zero rows and did so live"
    )


def test_the_runner_asks_permission_and_records_what_happened():
    src = RUNNER.read_text()
    assert "def guard(name, key)" in src
    assert "def record_run(payload, key)" in src
    assert "verdict = guard(name, key)" in src
    assert '"status": "skipped"' in src, "a refused run must be recorded, not silently dropped"
    assert '"status": "completed" if summary.get("ok") else "failed"' in src
    assert '"/copilot/scheduler/runs"' in src


def test_the_migration_adds_the_log_table_and_permissions():
    mig = sorted((ROOT / "migrations" / "security_isolation").glob("*copilot_scheduler.sql"))
    assert mig, "migration 072 must exist"
    sql = mig[0].read_text()
    assert "copilot_scheduler_log" in sql
    assert '"scheduler:read", "scheduler:write"' in sql
    assert "FORCE ROW LEVEL SECURITY" in sql
    assert "NULLIF(current_setting('gds.tenant_id', true), '')" in sql, "unbound must read zero rows, not raise"
    assert "GRANT SELECT ON copilot_scheduler_log TO gds_runtime;" in sql


def test_the_page_reads_the_routes_and_offers_both_controls():
    src = code(PAGE)
    assert "base44.platform.scheduler()" in src
    assert "base44.platform.pauseSchedule(" in src
    assert "base44.platform.resumeSchedule(" in src
    assert "not cancelled" in src, "pausing must say it does not stop a running mission"


def test_the_page_is_routed_and_in_the_sidebar():
    app = (WEB / "App.jsx").read_text()
    assert "import GDSCoPilotSchedulerPage from '@/pages/gds/GDSCoPilotSchedulerPage';" in app
    assert '<Route path="/copilot/scheduler" element={<GDSCoPilotSchedulerPage />} />' in app
    sidebar = (WEB / "components" / "platform" / "GlobalSidebar.jsx").read_text()
    assert 'label: "Co-Pilot Scheduler", path: "/copilot/scheduler"' in sidebar
    assert "Timer," in sidebar, "the icon must be imported or the entry renders blank"


def test_the_adapter_maps_all_three_calls():
    api = code(WEB / "api" / "base44Client.js")
    assert "scheduler: () => request('/copilot/scheduler')" in api
    assert "pauseSchedule: (name) => request(`/copilot/scheduler/${encodeURIComponent(name)}/pause`" in api
    assert "resumeSchedule: (name) => request(`/copilot/scheduler/${encodeURIComponent(name)}/resume`" in api
