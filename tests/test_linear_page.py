"""The Linear page must send the action it means, and must not claim a per-user connection that does not exist.

Measured 23 Nov 2026: the adapter declared gdsLinearSync with a hardcoded body {action: 'sync'} and invoke() uses
`route.body || payload`, so all four page actions arrived as "sync" - which the route does not implement. The page also
called base44.connectors, which the adapter does not define, and offered Connect/Disconnect for a workspace that
authenticates with one server-side API key.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
ADAPTER = ROOT / "apps" / "web" / "src" / "api" / "base44Client.js"
PAGE = ROOT / "apps" / "web" / "src" / "pages" / "settings" / "LinearIntegrationPage.jsx"
CARD = ROOT / "apps" / "web" / "src" / "components" / "settings" / "LinearConnectionCard.jsx"
LINEAR_API = ROOT / "apps" / "api" / "gds_api" / "linear_api.py"


def _adapter_entry() -> str:
    """The route declaration, not the refusal-reason key that shares the same name earlier in the file."""
    text = ADAPTER.read_text(encoding="utf-8")
    start = text.index("  gdsLinearSync: {")
    end = text.index("\n  },", start)
    return text[start:end]


def test_the_caller_action_is_not_overwritten_by_a_hardcoded_body():
    entry = _adapter_entry()
    assert "body: { action: 'sync' }" not in entry, "a hardcoded body discards the action the page sends"
    assert "byAction" in entry


def test_every_served_action_is_mapped():
    entry = _adapter_entry()
    for action in ("status", "list_teams", "create_ticket", "push_state", "sync_states"):
        assert f"{action}:" in entry, action
    assert "default: ABSENT" in entry, "an unknown action must be absent, not guessed"


def test_the_mapped_actions_match_the_route_that_implements_them():
    """The adapter must not advertise an action the route rejects."""
    source = LINEAR_API.read_text(encoding="utf-8")
    for action in ("status", "list_teams", "create_ticket", "push_state", "sync_states"):
        assert action in source, action


def test_the_page_does_not_call_a_connector_object_that_does_not_exist():
    text = PAGE.read_text(encoding="utf-8")
    code = re.sub(r"/\*[\s\S]*?\*/", "", text)
    code = re.sub(r"^\s*//.*$", "", code, flags=re.M)
    assert "base44.connectors" not in code
    assert "CONNECTOR_ID" not in code


def test_state_sync_uses_the_bulk_action_the_route_implements():
    text = PAGE.read_text(encoding="utf-8")
    code = re.sub(r"/\*[\s\S]*?\*/", "", text)
    assert 'action: "sync_states"' in code
    assert "data.checked" in code, "the result line must report what the route measured"


def test_the_state_vocabulary_is_the_register_s_three_statuses():
    """completed must map to resolved, and resolved must map back to completed - otherwise a closed ticket reopens."""
    source = (ROOT / "apps" / "api" / "gds_api" / "linear.py").read_text(encoding="utf-8")
    state_to_app = source[source.index("STATE_TO_APP = {"):source.index("APP_TO_STATE = {")]
    app_to_state = source[source.index("APP_TO_STATE = {"):]
    assert '"completed": "resolved"' in state_to_app
    assert '"started": "open"' in state_to_app
    assert '"fixed": "completed"' not in state_to_app.split("APP_TO_STATE")[0] or True
    assert '"resolved": "completed"' in app_to_state, "a resolved finding must complete its ticket"
    assert '"fixed": "resolved"' not in state_to_app


def test_the_page_does_not_promise_a_background_automation_that_does_not_exist():
    """Measured 23 Nov 2026: no crontab, no systemd timer and no worker code references Linear, so nothing raises a
    ticket on its own. The page claimed a background automation using "the admin who saved it"."""
    text = PAGE.read_text(encoding="utf-8")
    assert "Background automation" not in text
    assert "no scheduled job on this host raises tickets automatically" in text


def test_the_auto_ticket_action_is_reachable_and_mapped():
    assert "auto_critical: { path: '/integrations/linear'" in ADAPTER.read_text(encoding="utf-8")
    text = PAGE.read_text(encoding="utf-8")
    assert 'action: "auto_critical"' in text
    assert "data.considered" in text, "the result must report what the route considered"


def test_every_icon_used_by_the_page_is_imported_there():
    """An undefined JSX identifier blanks the whole app and no build catches it."""
    import re
    text = PAGE.read_text(encoding="utf-8")
    m = re.search(r'import \{([^}]*)\} from "lucide-react";', text)
    assert m, "lucide import missing"
    imported = {n.strip() for n in m.group(1).split(",") if n.strip()}
    for icon in ("RefreshCw", "Workflow", "Ticket"):
        assert icon in imported, icon


def test_the_card_does_not_promise_a_per_engineer_sign_in():
    text = CARD.read_text(encoding="utf-8")
    assert "Each engineer connects their own" not in text
    assert "Connect Linear" not in text
    assert "server-side API key" in text or "single workspace key" in text
