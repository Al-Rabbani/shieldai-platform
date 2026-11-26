"""The API scanner had never recorded a finding either, and would abandon the run on the first refusal.

MEASURED 26 Nov 2026: `findings` held 317 rows and NOT ONE was source='api_pentest' - the same missing
gds.tenant_id binding that silenced the OWASP scanner, so every insert was refused by row-level security while the run
reported findings_created: 0. Worse than its sibling, this scanner had NO per-test isolation: one exception, including
the first refused write, abandoned all seven remaining categories and the engine recorded a bare error for the target.
Seven sites also concluded "vulnerable" from a bare HTTP 200, which on a host whose catch-all answers 200 to any path
is not evidence of anything.
"""
import asyncio

from gds_api.pentest.api_scanner import APIScanner

TENANT = "2ec10dd0-e48e-4043-8c88-5998ba5e23b0"
PLACEHOLDER = ("GDSA Radar - The Agentic AI Security Operating System. Console: app.globaldigitalsecurity.io.")


class Resp:
    def __init__(self, status_code=200, text="", headers=None):
        self.status_code = status_code
        self.text = text
        self.content = text.encode()
        self.headers = headers or {"content-type": "text/plain", "server": "nginx"}

    def json(self):
        raise ValueError("not json")


class FakeDb:
    def __init__(self, refuse_first=False, refuse_all=False):
        self.calls = []
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
            raise RuntimeError('new row violates row-level security policy for table "findings"')

    async def rollback(self):
        self.rollbacks += 1


def catch_all_scanner(db=None):
    """Every request, including the impossible probe, answers with the same placeholder."""
    s = APIScanner("https://www.globaldigitalsecurity.io", tenant_id=TENANT, db=db or FakeDb())

    async def fake_send(method, path, **kwargs):
        return Resp(200, PLACEHOLDER)

    s._send = fake_send
    return s


def admin_scanner(db):
    """The probe and the root answer the placeholder; every other path answers real API content."""
    s = APIScanner("https://api.globaldigitalsecurity.io", tenant_id=TENANT, db=db)

    async def fake_send(method, path, **kwargs):
        if path.startswith("/gds-catchall-probe") or path == "/":
            return Resp(200, PLACEHOLDER)
        return Resp(200, '{"id": 1, "email": "someone@example.com", "role": "admin"}')

    s._send = fake_send
    return s


def test_the_tenant_is_bound_before_the_first_write():
    db = FakeDb()
    s = admin_scanner(db)
    asyncio.run(s.test_authentication_bypass())
    assert db.calls and db.calls[0] == f"set_config:{TENANT}", "the RLS policy needs gds.tenant_id before any insert"
    assert s.findings_created >= 1


def test_a_catch_all_200_is_not_an_authentication_bypass():
    s = catch_all_scanner()
    assert asyncio.run(s.test_authentication_bypass()) == []
    assert s.findings_created == 0


def test_a_catch_all_200_is_not_a_permitted_http_method():
    # TRACE/PUT/DELETE answering 200 with the catch-all body is not "the method is enabled".
    s = catch_all_scanner()
    assert asyncio.run(s.test_http_method_fuzzing()) == []


def test_a_catch_all_200_is_not_excessive_data_exposure_or_graphql_exposure():
    s = catch_all_scanner()
    assert asyncio.run(s.test_excessive_data_exposure()) == []
    assert asyncio.run(s.test_graphql()) == []


def test_a_refused_write_is_recorded_and_does_not_poison_the_run():
    db = FakeDb(refuse_first=True)
    s = admin_scanner(db)
    out = asyncio.run(s.run_all_tests())
    assert len(s.write_errors) == 1
    assert "row-level security" in s.write_errors[0]
    assert db.rollbacks >= 1, "the aborted transaction must be rolled back so later categories can run"
    assert out["findings_created"] >= 1, "the categories after the refusal still recorded their findings"


def test_a_run_whose_writes_were_all_refused_is_not_a_clean_run():
    db = FakeDb(refuse_all=True)
    s = admin_scanner(db)
    out = asyncio.run(s.run_all_tests())
    assert out["findings_created"] == 0
    assert out["writes_refused"] >= 1
    assert out["write_errors"] and "row-level security" in out["write_errors"][0]
    assert out["baseline_measured"] is True


def test_one_failing_category_does_not_abandon_the_others():
    # Before this, a single raise left every remaining category unrun and the engine recorded one bare error.
    db = FakeDb()
    s = APIScanner("https://api.globaldigitalsecurity.io", tenant_id=TENANT, db=db)

    async def fake_send(method, path, **kwargs):
        if path.startswith("/gds-catchall-probe") or path == "/":
            return Resp(200, PLACEHOLDER)
        return Resp(404, "not found")

    s._send = fake_send

    async def boom():
        raise RuntimeError("scanner exploded")

    s.test_authentication_bypass = boom
    out = asyncio.run(s.run_all_tests())
    assert out["tests_run"] == 8
    assert out["tests_failed"] == 1
    assert out["failed_tests"] == ["auth_bypass"]
    assert "RuntimeError: scanner exploded" in out["results"]["auth_bypass"]["error"]
    # every other category still produced a result
    assert len([k for k in out["results"] if k != "auth_bypass"]) == 7


def test_the_baseline_is_measured_even_when_no_path_answers_200():
    # The API host answers 401/404/429 and never 200, so a lazily probed baseline reported False there - which reads as
    # "could not measure the host" when it meant "never needed". The field must be a fact.
    s = APIScanner("https://api.globaldigitalsecurity.io", tenant_id=TENANT, db=FakeDb())

    async def fake_send(method, path, **kwargs):
        return Resp(404, '{"detail": "Not Found"}')

    s._send = fake_send
    out = asyncio.run(s.run_all_tests())
    assert out["baseline_measured"] is True
    assert out["findings_created"] == 0
