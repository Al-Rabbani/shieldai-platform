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
    for loader in ("loadFindings", "loadIncidents", "loadCloud", "loadCompliance", "loadMssp", "loadAgents"):
        assert re.search(r"withBusy\('%s'|withBusy\(\"[a-z]+\", %s\)" % ("[a-z]+", loader), HTML), \
            f"{loader} is not wrapped in withBusy"


def test_session_expiry_returns_to_sign_in():
    assert "res.status === 401" in HTML
    assert "sessionStorage.removeItem('gds_user')" in HTML


def test_no_demo_or_hardcoded_figures_in_the_shell():
    for marker in ("lorem ipsum", "Math.random", "placeholder data", "dummy"):
        assert marker.lower() not in HTML.lower(), f"demo marker present: {marker}"


def test_branding_name_is_not_overwritten_by_the_router():
    # The router must own the route suffix and branding the customer name. An earlier edit wrapped the
    # router line instead of the branding one, which would have set the "brand name" to "Overview".
    assert "window.__gdsBrandName = brand.display_name;" in HTML
    assert "window.__gdsBrandName = (ROUTES" not in HTML
    router = HTML[HTML.index("function setActiveNav"):HTML.index("async function withBusy")]
    assert "__gdsBrandName || 'GDS OS'" in router


def test_compliance_view_reads_real_endpoints_and_states_its_basis():
    # A compliance percentage with no stated basis is the most misleading number a console can show:
    # 92% of 52 assessed controls is not 92% of the framework.
    assert "apiGet('/compliance/frameworks')" in HTML
    assert "apiGet('/compliance/assessments')" in HTML
    assert "data.score_basis" in HTML and "data.note" in HTML


def test_mssp_view_treats_403_as_a_permission_boundary_not_an_empty_list():
    # /mssp/customers is cross-tenant and provider-only. Rendering a refused request as an empty table
    # would tell the reader they have no customers, which is a different and false statement.
    assert "res.status === 403" in HTML
    assert "provider administrator" in HTML
    assert "/mssp/customers" in HTML


def test_views_do_not_invent_numbers_when_a_call_fails():
    # "Unavailable" and "Restricted" are answers; a zero would be a lie.
    assert "'Unavailable'" in HTML
    assert "'Restricted'" in HTML


def test_mssp_count_is_labelled_as_tenants_not_paying_customers():
    # The endpoint lists every tenant, including the provider's own and test tenants. Calling that a
    # customer count would overstate the business, which is the one number an owner must never see wrong.
    assert "Managed tenants" in HTML
    assert 'id="msspScope"' in HTML
    assert "not a count of paying customers" in HTML


def test_session_is_verified_against_the_server_not_assumed():
    # The cookie is httpOnly, so the page cannot read its own expiry; the only honest claim is the one
    # the server just confirmed.
    assert "apiGet" in HTML and "/auth/refresh" in HTML
    assert "async function verifySession" in HTML
    assert "Session verified " in HTML


def test_an_expired_session_remembers_where_the_reader_was():
    assert "gds_return_to" in HTML
    assert "function sessionExpired" in HTML
    assert "returnRoute" in HTML


def test_no_mfa_screen_is_offered_because_the_api_has_no_second_factor():
    # A code box that nothing verifies is worse than an honest absence. This checks the rendered markup
    # only: the script comment explaining why MFA is absent legitimately mentions the word.
    markup = HTML.split("<script>")[0].lower()
    assert "mfa" not in markup
    assert 'id="mfa' not in HTML.lower()


def test_the_console_subscribes_to_the_real_stream_and_states_its_health():
    # A live indicator that cannot say "interrupted" is worse than none: it teaches people to trust a
    # silent screen.
    assert "new EventSource(API + '/stream/platform')" in HTML
    assert "addEventListener('finding'" in HTML
    assert "Live stream connecting" in HTML
    assert "Live stream interrupted" in HTML
    assert "function stopLiveStream" in HTML
    assert 'id="liveState"' in HTML and 'role="status"' in HTML
    assert 'id="liveActivity"' in HTML and 'aria-live="polite"' in HTML


def test_the_stream_is_closed_on_sign_out():
    logout = HTML[HTML.index("function logout"):]
    assert "stopLiveStream()" in logout[:400]
