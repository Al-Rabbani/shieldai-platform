"""A scanner that calls a status code a vulnerability manufactures criticals on a clean estate.

MEASURED 26 Nov 2026, from the nightly sweep's own summary. The sweep showed owasp_pentest "PARTIAL: 2 write(s)
refused" on the app host, and chasing that refusal uncovered four separate ways the two in-platform scanners invent
findings - three of which were only being stopped by the refusal itself, so fixing the refusal alone would have
published them:

  * command_injection grepped the response for the bare words "root", "uid=", "www-data" and reported CRITICAL command
    injection. The app host's page contains those words, so the check proved nothing about the parameter.
  * no_logging reported "no evidence of security event logging" whenever a login response lacked a "logged" or "audit"
    key. No API echoes its audit status to an unauthenticated caller, so that fires on every correct system.
  * A05 reported /v2/api-docs as an exposed sensitive file because the response was 200 and larger than 10 bytes. It
    was a second SPA shell with the same <title> as the app - 4,209 bytes against the 94,917-byte index.
  * authentication_bypass reported /api/health as CRITICAL four times. A health endpoint is public by design.

And the refusal itself: set_config('gds.tenant_id', ..., false) is session-scoped, so it does not survive the
connection returning to the pool between commits, and the _tenant_bound flag assumed it did.
"""
import pathlib

OWASP = pathlib.Path("apps/api/gds_api/pentest/owasp_scanner.py").read_text()
API = pathlib.Path("apps/api/gds_api/pentest/api_scanner.py").read_text()


def test_the_tenant_binding_is_transaction_scoped_on_every_write():
    # A session-scoped setting does not survive a commit returning the connection to the pool.
    for name, src in (("owasp", OWASP), ("api", API)):
        assert "CAST(:local AS boolean)" in src, f"{name}: set_config is not parameterised"
        assert "_bind_tenant(local=True)" in src, f"{name}: writes are not bound per transaction"
    assert "if not self._tenant_bound:\n                await self._bind_tenant()" not in OWASP


def test_command_injection_is_proved_by_a_marker_not_by_a_word_in_the_page():
    assert "token_hex" in OWASP
    assert 'cmd_outputs = ["uid=", "root"' not in OWASP, "the word-root check is back"
    assert "marker in resp.text" in OWASP
    # and the catch-all must be excluded before the marker test can conclude anything
    assert "if resp is None or await self._is_catch_all(resp):" in OWASP


def test_missing_logging_is_declared_untestable_rather_than_reported_as_a_vulnerability():
    assert 'data.get("logged")' not in OWASP, "no_logging is concluding a vulnerability from a response shape again"
    assert '"category": "no_logging"' in OWASP
    assert "self.untestable.append" in OWASP
    assert '"untestable": self.untestable' in OWASP, "the untestable bucket must reach the run report"


def test_sensitive_file_detection_requires_the_file_to_look_like_itself():
    # status 200 + size > 10 is not evidence that /.env exists.
    for signature in ('"DB_PASSWORD="', '"[core]"', '"ref: refs/"', '"CREATE TABLE"', '"openapi"'):
        assert signature in OWASP, f"A05 lost its {signature} signature"
    assert "no signature" in OWASP, "a path that answered without matching must be recorded as suppressed"
    # the old check concluded from status and size alone
    assert 'if resp and resp.status_code == 200 and len(resp.content) > 10' not in OWASP


def test_a_public_health_endpoint_is_not_an_authentication_bypass():
    assert "PUBLIC_BY_DESIGN" in API
    for endpoint in ('"/api/health"', '"/health"', '"/metrics"'):
        assert endpoint in API, f"{endpoint} is missing from the public-by-design list"
    start = API.index("authentication_bypass") if "authentication_bypass" in API else API.index("PUBLIC_BY_DESIGN")
    body = API[start:]
    body = body[: body.index("findings.append")] if "findings.append" in body else body
    assert "PUBLIC_BY_DESIGN" in body, "the bypass test does not consult the list"


def test_the_api_scanner_does_not_multiply_a_finding_on_every_run():
    # Four identical /api/health rows were written by four runs because this writer had no dedupe.
    assert "duplicates_skipped" in API
    assert "SELECT id FROM findings WHERE tenant_id = :tid AND source = :src AND title = :title" in API


def test_both_scanners_report_what_they_could_not_test():
    for name, src in (("owasp", OWASP), ("api", API)):
        assert "untestable: list[dict]" in src, f"{name}: untestable is not initialised"
        assert '"untestable": self.untestable' in src, f"{name}: untestable is not reported"
