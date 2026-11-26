"""The OWASP scanner had never recorded a finding, and invented eight criticals on a hardened estate.

MEASURED 26 Nov 2026 by running it against the authorised estate for the first time (it sat at 0.0% coverage):

1. EVERY WRITE WAS REFUSED. `findings` held 317 rows and not one was source='owasp_pentest' - each insert failed with
   "new row violates row-level security policy" because the session carried no gds.tenant_id binding. The scanner
   reported findings_created: 0, which inside the product is indistinguishable from a hardened estate.
2. ONE REFUSED WRITE DISABLED THE REST OF THE RUN. The first failure left the transaction aborted, so all nine
   remaining categories died with "this Session's transaction has been rolled back" while the run still reported itself
   complete.
3. IT INVENTED EIGHT CRITICALS. A01 flagged /admin, /admin/dashboard, /admin/users, /admin/settings, /api/admin,
   /api/v1/admin, /manage and /management as "accessible without authentication" because the test asked only for status
   200 and no "login" in the body - and the www host answers every unknown path with 200 and its marketing placeholder.
"""
import asyncio

import pytest

from gds_api.pentest.owasp_scanner import OWASPScanner

TENANT = "2ec10dd0-e48e-4043-8c88-5998ba5e23b0"
PLACEHOLDER = ("GDSA Radar - The Agentic AI Security Operating System. Console: app.globaldigitalsecurity.io. "
               "Contact: president@globaldigitalstreams.com")


class Resp:
    """Just enough of an httpx.Response: the scanner reads status, text, content and headers."""

    def __init__(self, status_code=200, text=""):
        self.status_code = status_code
        self.text = text
        self.content = text.encode()
        self.headers = {"content-type": "text/plain", "server": "nginx"}

    def json(self):
        raise ValueError("not json")


class FakeDb:
    """Records what the scanner asked of it; can refuse the first commit."""

    def __init__(self, refuse_first: bool = False, refuse_all: bool = False):
        self.calls: list[str] = []
        self.commits = 0
        self.rollbacks = 0
        self.refuse_first = refuse_first
        self.refuse_all = refuse_all

    async def execute(self, statement, params=None):
        self.calls.append(f"set_config:{params.get('tid') if params else ''}")
        return None

    def add(self, _obj):
        self.calls.append("add")

    async def commit(self):
        self.commits += 1
        if self.refuse_all or (self.refuse_first and self.commits == 1):
            raise RuntimeError("new row violates row-level security policy for table \"findings\"")

    async def rollback(self):
        self.rollbacks += 1


def scanner(db, routes):
    s = OWASPScanner("https://www.globaldigitalsecurity.io", tenant_id=TENANT, db=db)

    async def fake_get(path, **kwargs):
        return routes.get(path, Resp(404, "not found"))

    s._get = fake_get
    return s


def test_a_catch_all_200_is_not_an_exposed_admin_endpoint():
    # Every path, including the impossible one, answers with the same placeholder.
    db = FakeDb()
    routes = {p: Resp(200, PLACEHOLDER) for p in
              ["/admin", "/admin/dashboard", "/admin/users", "/admin/settings", "/api/admin", "/api/v1/admin",
               "/manage", "/management", "/"]}
    s = scanner(db, routes)

    async def run():
        # Any unlisted path (the random catch-all probe) also answers 200 placeholder.
        async def fake_get(path, **kwargs):
            return routes.get(path, Resp(200, PLACEHOLDER))
        s._get = fake_get
        return await s.test_broken_access_control()

    findings = asyncio.run(run())
    assert findings == [], f"a catch-all 200 was reported as exposed admin: {findings}"
    assert len(s.catch_all_suppressed) >= 8
    assert db.commits == 0, "nothing should have been written"


def test_a_real_admin_page_is_still_reported():
    db = FakeDb()
    s = scanner(db, {"/": Resp(200, PLACEHOLDER)})

    async def fake_get(path, **kwargs):
        if path.startswith("/gds-catchall-probe"):
            return Resp(200, PLACEHOLDER)
        if path == "/admin":
            return Resp(200, "Admin Dashboard: users, roles, audit log")
        return Resp(404, "not found")

    s._get = fake_get
    findings = asyncio.run(s.test_broken_access_control())
    assert [f["path"] for f in findings] == ["/admin"]
    assert s.findings_created == 1 and s.critical_count == 1


def test_a_login_page_is_not_reported():
    db = FakeDb()
    s = scanner(db, {})

    async def fake_get(path, **kwargs):
        if path.startswith("/gds-catchall-probe"):
            return Resp(200, PLACEHOLDER)
        return Resp(200, "Please login to continue")

    s._get = fake_get
    assert asyncio.run(s.test_broken_access_control()) == []


def test_the_tenant_is_bound_before_the_first_write():
    db = FakeDb()
    s = scanner(db, {})

    async def fake_get(path, **kwargs):
        if path.startswith("/gds-catchall-probe") or path == "/":
            return Resp(200, PLACEHOLDER)
        return Resp(200, "Admin area: users")

    s._get = fake_get
    asyncio.run(s.test_broken_access_control())
    assert db.calls[0] == f"set_config:{TENANT}", "the RLS policy needs gds.tenant_id before any insert"
    assert db.calls.count("add") == 8


def test_a_refused_write_is_recorded_and_does_not_poison_the_run():
    db = FakeDb(refuse_first=True)
    s = scanner(db, {})

    async def fake_get(path, **kwargs):
        if path.startswith("/gds-catchall-probe") or path == "/":
            return Resp(200, PLACEHOLDER)
        return Resp(200, "Admin area: users")

    s._get = fake_get
    asyncio.run(s.test_broken_access_control())
    assert len(s.write_errors) == 1
    assert "row-level security" in s.write_errors[0]
    assert db.rollbacks == 1, "the aborted transaction must be rolled back so later categories can run"
    assert s.findings_created == 7, "seven writes still succeeded; only the refused one is lost"


def test_the_run_reports_refused_writes_rather_than_a_clean_zero():
    db = FakeDb(refuse_all=True)
    s = scanner(db, {})

    async def fake_get(path, **kwargs):
        if path.startswith("/gds-catchall-probe") or path == "/":
            return Resp(200, PLACEHOLDER)
        return Resp(200, "Admin area: users")

    s._get = fake_get
    out = asyncio.run(s.run_all_tests())
    assert out["findings_created"] == 0
    # At least the eight admin paths; other categories also report against this fake, so the count is a floor.
    assert out["writes_refused"] >= 8
    assert out["tests_run"] == 10
    # The whole point: "found nothing" and "recorded nothing" must not look the same.
    assert out["write_errors"] and "row-level security" in out["write_errors"][0]
    assert out["baseline_measured"] is True


def test_an_unmeasurable_baseline_does_not_silence_a_finding():
    # If the host cannot be probed at all, a finding is still reported rather than suppressed by a guess.
    db = FakeDb()
    s = scanner(db, {})

    async def fake_get(path, **kwargs):
        if path.startswith("/gds-catchall-probe") or path == "/":
            return None
        if path == "/admin":
            return Resp(200, "Admin Dashboard")
        return Resp(404, "nope")

    s._get = fake_get
    findings = asyncio.run(s.test_broken_access_control())
    assert [f["path"] for f in findings] == ["/admin"]


# ---------------------------------------------------------------------------------------------------------------
# The same defect in the other categories: a bare 200 read as proof of vulnerability on a catch-all host.
# ---------------------------------------------------------------------------------------------------------------

SECURE_HEADERS = {
    "content-type": "text/plain", "server": "nginx",
    # The header test reads real evidence, so it is given real (hardened) headers: this test is about the paths that
    # concluded from a status code alone, not about header posture.
    "x-frame-options": "SAMEORIGIN", "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'", "referrer-policy": "no-referrer",
    "strict-transport-security": "max-age=63072000",
}


def _all_catch_all():
    """Every path answers with the placeholder, exactly as the www host does."""
    db = FakeDb()
    s = OWASPScanner("https://www.globaldigitalsecurity.io", tenant_id=TENANT, db=db)

    def answer():
        r = Resp(200, PLACEHOLDER)
        r.headers = SECURE_HEADERS
        return r

    async def fake_get(path, **kwargs):
        return answer()

    async def fake_post(path, **kwargs):
        return answer()

    s._get = fake_get
    s._post = fake_post
    return s


def test_ssrf_does_not_fire_on_a_catch_all_host():
    # Measured live before this guard: 24 SSRF findings against a static marketing page.
    s = _all_catch_all()
    assert asyncio.run(s.test_ssrf()) == []


def test_deserialization_does_not_fire_on_a_catch_all_host():
    s = _all_catch_all()
    assert asyncio.run(s.test_data_integrity()) == []


def test_weak_password_and_empty_credential_tests_do_not_fire_on_a_catch_all_host():
    s = _all_catch_all()
    assert asyncio.run(s.test_auth_failures()) == []


def test_sensitive_path_test_does_not_fire_on_a_catch_all_host():
    s = _all_catch_all()
    assert asyncio.run(s.test_security_misconfiguration()) == []


def test_rate_limiting_does_not_fire_on_a_catch_all_host():
    # Measured live before this guard: "No rate limiting on authentication endpoint - 20 were processed" against a host
    # with no authentication endpoint at all. Twenty placeholder responses are not twenty processed logins.
    s = _all_catch_all()
    assert asyncio.run(s.test_insecure_design()) == []


def test_a_real_429_storm_is_not_reported_as_missing_rate_limiting():
    # The platform now rate-limits credential submission at the edge, so a real auth host answers 429 and the test must
    # stay silent rather than call a throttled endpoint unthrottled.
    db = FakeDb()
    s = OWASPScanner("https://api.globaldigitalsecurity.io", tenant_id=TENANT, db=db)

    async def fake_post(path, **kwargs):
        return Resp(429, "Too Many Requests")

    async def fake_get(path, **kwargs):
        return Resp(200, PLACEHOLDER)

    s._post = fake_post
    s._get = fake_get
    assert asyncio.run(s.test_insecure_design()) == []
