"""Structural regression tests for the product shell (gap register C3, C5, C6, C13).

There is no JavaScript runtime on this host, so these tests pin the properties that a broken edit
would destroy and that a reader would notice immediately: an addressable page, a nav that matches the
pages that exist, a busy state that distinguishes "still loading" from "found nothing", and a session
expiry that returns the reader to sign-in instead of showing an empty console.

They are structural, not behavioural. That is stated plainly rather than implied: they cannot prove the
router works in a browser, only that the code implementing it is present and consistent with the markup.
"""
import re
from pathlib import Path

SHELL = Path(__file__).resolve().parents[1] / "web" / "gds_app.html"
HTML = SHELL.read_text(encoding="utf-8")


def page_names():
    return set(re.findall(r'id="page-([a-z]+)"', HTML))


def test_every_page_has_a_nav_route():
    pages = page_names()
    routes = set(re.findall(r'data-route="([a-z]+)"', HTML))
    assert pages, "no page sections found"
    assert pages == routes, f"pages {sorted(pages)} do not match nav routes {sorted(routes)}"


def test_navigation_uses_real_addresses_not_javascript_handlers():
    # onclick="showPage(...)" left pages unlinkable and unbookmarkable; the route must be in the URL.
    assert 'onclick="showPage(' not in HTML
    assert re.search(r'href="#/[a-z]+"', HTML), "no hash addresses in the nav"


def test_router_is_wired_for_history_navigation():
    for token in ("function routeFromHash", "function applyRoute", "hashchange", "aria-current"):
        assert token in HTML, f"router missing {token}"
    # A refresh or a pasted link must land on the right page, not always Overview.
    assert "location.hash" in HTML


def test_unknown_route_falls_back_to_overview():
    # The fallback is the only reason a stale bookmark renders something instead of a blank main area.
    block = HTML[HTML.index("function routeFromHash"):HTML.index("function setActiveNav")]
    assert "overview" in block


def test_busy_state_exists_so_loading_is_not_mistaken_for_empty():
    assert "async function withBusy" in HTML
    assert "aria-busy" in HTML
    # Every loader must run under the busy wrapper.
    for loader in ("loadFindings", "loadIncidents", "loadCloud", "loadAgents"):
        assert re.search(r"withBusy\('%s'|withBusy\(\"[a-z]+\", %s\)" % ("[a-z]+", loader), HTML), \
            f"{loader} is not wrapped in withBusy"


def test_session_expiry_returns_to_sign_in():
    assert "res.status === 401" in HTML
    assert "sessionStorage.removeItem('gds_user')" in HTML


def test_no_demo_or_hardcoded_figures_in_the_shell():
    for marker in ("lorem ipsum", "Math.random", "placeholder data", "dummy"):
        assert marker.lower() not in HTML.lower(), f"demo marker present: {marker}"
