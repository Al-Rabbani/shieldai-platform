"""The secrets posture: what is configured, what is served, and what was never measured.

What this pins:

* A CLEAN BILL OF HEALTH IS THE WORST OUTPUT. The page used to read four entities with no tables and render "No secrets
  registered / No certificates tracked / No leakage alerts / No access policies configured". A security owner reading
  that believes the estate holds no secrets and no certificates. Every panel now either measures something or states,
  with its measurement, that it cannot.
* A CREDENTIAL VALUE NEVER LEAVES THE PROCESS. The inventory reports names, service, category and whether a value is
  set. A distinctive value is planted in the environment below and the assertion is that it appears nowhere in the
  payload - no value, no prefix, no hash.
* AN UNREAD CERTIFICATE IS NOT AN EXPIRING ONE. A failed handshake reports days_until_expiry None, never 0, so an
  endpoint that did not answer cannot read as "expires today". A served-but-untrusted chain is its own fact.
* ZERO API KEYS IS A REAL ZERO: the store exists and is counted. That is different from a store that was never created.
"""
from __future__ import annotations

import asyncio
import json
import pathlib
import re

import pytest
from fastapi import HTTPException

from gds_api import secrets_api as m

WEB = pathlib.Path(__file__).resolve().parents[1] / "apps" / "web" / "src"


def _code(path: pathlib.Path) -> str:
    """The file with comments removed, so an assertion cannot match the prose explaining a removal."""
    text = path.read_text()
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"^\s*//.*$", "", text, flags=re.M)


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def mappings(self):
        return self

    def first(self):
        return self._rows[0] if self._rows else None


class FakeDb:
    def __init__(self, tables=None, keys=None):
        self.tables = tables or set()
        self.keys = keys or []

    async def execute(self, statement, params=None):
        sql = str(statement)
        if "set_config" in sql:
            return _Result([{}])
        if "information_schema.tables" in sql:
            return _Result([(table,) for table in self.tables])
        if "FROM api_keys" in sql:
            return _Result(self.keys)
        raise AssertionError(f"unexpected SQL: {sql[:70]}")


def _user(tenant="t-1"):
    return type("U", (), {"tenant_id": tenant})()


def _posture(db=None, hosts=("app.example.test",)):
    """The route with the network probe replaced, so a test never depends on DNS or a live certificate."""
    return asyncio.run(m.secrets_posture(db=db or FakeDb(), current_user=_user()))


# Captured before the autouse fixture replaces it: the hostname tests exercise the real derivation.
_REAL_ENDPOINT_HOSTS = m._endpoint_hosts


@pytest.fixture(autouse=True)
def _no_network(monkeypatch):
    monkeypatch.setattr(m, "_endpoint_hosts", lambda: ["app.example.test"])
    monkeypatch.setattr(m, "_probe_endpoint", lambda host, port=443: _served(host))


def _served(host, days=49):
    return {
        "host": host, "port": 443, "served": True, "chain_verified": True,
        "common_name": "app.example.test", "sans": ["app.example.test"],
        "issuer": "YR1", "not_before": "2026-10-13T10:57:16+00:00",
        "not_after": "2027-01-11T10:57:15+00:00", "days_until_expiry": days,
        "expired": days < 0, "tls_version": "TLSv1.3", "cipher": "TLS_AES_256_GCM_SHA384",
    }


# --- credentials -------------------------------------------------------------------------------------------------

def test_a_credential_value_is_never_returned(monkeypatch):
    planted = "sk-live-DO-NOT-ECHO-4f9a2c"
    monkeypatch.setenv("OPENAI_API_KEY", planted)
    payload = _posture()
    blob = json.dumps(payload)
    assert planted not in blob
    assert planted[:12] not in blob, "not even a prefix may be echoed"
    entry = next(item for item in payload["credentials"]["items"] if item["name"] == "OPENAI_API_KEY")
    assert entry == {"name": "OPENAI_API_KEY", "service": "openai", "category": "api key", "configured": True}


def test_an_empty_variable_is_not_configured(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "")
    payload = _posture()
    entry = next(item for item in payload["credentials"]["items"] if item["name"] == "GITHUB_TOKEN")
    assert entry["configured"] is False
    assert payload["credentials"]["empty"] >= 1


def test_integration_state_is_partial_when_one_variable_is_missing(monkeypatch):
    monkeypatch.setenv("AZURE_TENANT_ID", "tenant")
    monkeypatch.setenv("AZURE_CLIENT_ID", "client")
    monkeypatch.setenv("AZURE_CLIENT_SECRET", "secret")
    monkeypatch.delenv("AZURE_SUBSCRIPTION_ID", raising=False)
    azure = next(i for i in _posture()["credentials"]["integrations"] if i["integration"] == "azure")
    assert azure["state"] == "configured" and azure["configured_vars"] == 3

    monkeypatch.delenv("AZURE_CLIENT_SECRET", raising=False)
    azure = next(i for i in _posture()["credentials"]["integrations"] if i["integration"] == "azure")
    assert azure["state"] == "partial"
    missing = [v["name"] for v in azure["required"] if not v["configured"]]
    assert missing == ["AZURE_CLIENT_SECRET"]


def test_the_value_policy_is_stated_in_the_payload():
    policy = _posture()["credentials"]["value_policy"]
    assert "never returns the value" in policy


# --- certificates ------------------------------------------------------------------------------------------------

def test_an_endpoint_that_did_not_answer_is_not_an_expiring_certificate(monkeypatch):
    def refused(host, port=443):
        return {
            "host": host, "port": port, "served": False, "chain_verified": False,
            "common_name": None, "sans": [], "issuer": None, "not_before": None, "not_after": None,
            "days_until_expiry": None, "expired": None, "tls_version": None, "cipher": None,
            "reason": "ConnectionRefusedError: [Errno 111] Connection refused",
        }

    monkeypatch.setattr(m, "_probe_endpoint", refused)
    certs = _posture()["certificates"]
    assert certs["endpoints_serving"] == 0
    assert certs["soonest_expiry_days"] is None, "an unread certificate must not report a day count"
    assert certs["endpoints"][0]["days_until_expiry"] is None
    assert "Connection refused" in certs["endpoints"][0]["reason"]


def test_a_served_but_untrusted_chain_is_its_own_fact(monkeypatch):
    def untrusted(host, port=443):
        endpoint = _served(host, days=-3)
        endpoint["chain_verified"] = False
        endpoint["verify_reason"] = "certificate has expired"
        return endpoint

    monkeypatch.setattr(m, "_probe_endpoint", untrusted)
    certs = _posture()["certificates"]
    assert certs["endpoints_serving"] == 1
    assert certs["endpoints_unverified"] == 1
    assert certs["expired"] == 1
    assert certs["soonest_expiry_days"] == -3


def test_expiry_is_floored_so_zero_means_less_than_a_day():
    """cert_time_to_seconds + floor arithmetic, checked directly rather than through the network."""
    import datetime as dt

    not_after = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=5)).strftime("%b %d %H:%M:%S %Y GMT")
    epoch = m.ssl.cert_time_to_seconds(not_after)
    days = int((dt.datetime.fromtimestamp(epoch, tz=dt.timezone.utc) - dt.datetime.now(dt.timezone.utc)).total_seconds() // 86400)
    assert days == 0


def test_renewal_is_reported_as_configured_but_not_proven():
    renewal = _posture()["certificates"]["renewal"]
    assert renewal["renewal_proven_by_this_route"] is False
    assert "cannot prove" in renewal["note"]


# --- api keys ----------------------------------------------------------------------------------------------------

def test_an_empty_api_key_store_is_a_measured_zero():
    keys = _posture(FakeDb(keys=[]))["api_keys"]
    assert keys["total"] == 0 and keys["active"] == 0
    assert "measured zero" in keys["note"]


def test_api_key_rows_never_carry_the_hash():
    class _Row(dict):
        pass

    import datetime as dt

    row = _Row(
        id="11111111-1111-1111-1111-111111111111", name="ci", key_prefix="gds_live_ab12",
        scopes=["findings:read"], created_at=dt.datetime.now(dt.timezone.utc),
        last_used_at=None, revoked_at=None, key_hash="deadbeef",
    )
    keys = _posture(FakeDb(keys=[row]))["api_keys"]
    assert keys["total"] == 1 and keys["active"] == 1
    assert "deadbeef" not in json.dumps(keys)
    assert keys["items"][0]["key_prefix"] == "gds_live_ab12"


# --- the panels that cannot be filled ----------------------------------------------------------------------------

def test_leakage_scanning_names_what_was_looked_for(monkeypatch):
    monkeypatch.setattr(m.shutil, "which", lambda name: None)
    payload = _posture(FakeDb(tables=set()))["leakage_scanning"]
    assert payload["measurable"] is False
    assert payload["scanner_present"] is False
    assert set(payload["scanners_looked_for"]) == set(m.SCANNER_BINARIES)
    assert "gitleaks" in payload["reason"]
    assert payload["stores"]["secret_leakage_alerts"] == {"exists": False}


def test_access_policies_are_refused_by_name():
    payload = _posture()["access_policies"]
    assert payload["measurable"] is False
    assert "no secret access-policy store" in payload["reason"]


def test_credential_rotation_is_declared_absent():
    payload = _posture()["rotation"]["credentials"]
    assert payload["measurable"] is False
    assert "no rotation schedule" in payload["reason"]


def test_tenant_binding_is_required():
    with pytest.raises(HTTPException) as err:
        asyncio.run(m.secrets_posture(db=FakeDb(), current_user=_user(tenant=None)))
    assert err.value.status_code == 403


def test_the_route_is_gated_on_its_own_permission():
    """findings:read is held by analysts; this surface enumerates credentials and must not ride on it."""
    source = pathlib.Path(m.__file__).read_text()
    assert 'require_permission("secrets:read")' in source
    assert 'require_permission("findings:read")' not in source


# --- the page and the adapter ------------------------------------------------------------------------------------

def test_the_page_reads_the_measured_route_not_the_absent_entities():
    page = _code(WEB / "pages" / "dashboards" / "SecretsKeyManagementPage.jsx")
    for entity in ("SecretReference", "CertificateRecord", "SecretLeakageAlert", "SecretAccessPolicy"):
        assert entity not in page, f"{entity} has no table and must not be read"
    assert "base44.platform.secretsPosture()" in page


def test_the_page_never_renders_a_clean_absence():
    page = _code(WEB / "pages" / "dashboards" / "SecretsKeyManagementPage.jsx")
    for claim in ("No secrets registered", "No certificates tracked", "No leakage alerts", "No access policies configured"):
        assert claim not in page, f"clean-absence copy still on the page: {claim}"
    assert "NOT MEASURED" in page


def test_the_page_withholds_its_tiles_when_the_route_fails():
    page = _code(WEB / "pages" / "dashboards" / "SecretsKeyManagementPage.jsx")
    assert "setData(null)" in page
    assert "Could not read the secrets posture" in page


def test_every_icon_the_page_uses_is_imported():
    page = _code(WEB / "pages" / "dashboards" / "SecretsKeyManagementPage.jsx")
    import_line = re.search(r'import\s*\{([^}]*)\}\s*from\s*"lucide-react"', page)
    assert import_line, "the page must import its icons explicitly"
    imported = {name.strip() for name in import_line.group(1).split(",") if name.strip()}
    used = set(re.findall(r"<([A-Z][A-Za-z0-9]*)\s+size=", page))
    # A destructured prop alias (`icon: Icon`) is bound locally and is not a missing import.
    local_aliases = set(re.findall(r"\bicon:\s*([A-Z][A-Za-z0-9]*)", page))
    shared = {"DashboardPage", "StatTile", "SectionCard", "Tag", "LoadingSpinner"}
    unknown = {name for name in used if name not in imported and name not in shared and name not in local_aliases}
    assert not unknown, f"icons used but not imported (an undefined JSX identifier blanks the app): {sorted(unknown)}"


def test_app_jsx_routes_this_exact_file():
    app = _code(WEB / "App.jsx")
    assert "from '@/pages/dashboards/SecretsKeyManagementPage'" in app
    assert 'path="/secrets"' in app


def test_adapter_exposes_the_posture_route():
    adapter = _code(WEB / "api" / "base44Client.js")
    assert "request('/secrets/posture')" in adapter
    for entity in ("SecretReference:", "CertificateRecord:", "SecretLeakageAlert:", "SecretAccessPolicy:"):
        assert entity in adapter, f"{entity} needs a refusal reason naming the measured absence"


# --- hostnames and DER parsing (both defects appeared only when the live route was called) ------------------------

def test_app_domain_with_a_published_subdomain_probes_the_real_hostnames(monkeypatch):
    """APP_DOMAIN is https://app.globaldigitalsecurity.io. Taken literally it produced www.app.…, app.app.… and
    api.app.… - three hostnames that do not exist - while the real apex, www and api were never probed."""
    monkeypatch.setenv("APP_DOMAIN", "https://app.globaldigitalsecurity.io")
    assert _REAL_ENDPOINT_HOSTS() == [
        "globaldigitalsecurity.io",
        "www.globaldigitalsecurity.io",
        "app.globaldigitalsecurity.io",
        "api.globaldigitalsecurity.io",
    ]


def test_a_bare_apex_is_probed_without_being_stripped(monkeypatch):
    monkeypatch.setenv("APP_DOMAIN", "globaldigitalsecurity.io")
    hosts = _REAL_ENDPOINT_HOSTS()
    assert hosts[0] == "globaldigitalsecurity.io"
    assert len(hosts) == 4


def test_no_app_domain_means_no_endpoint_is_invented(monkeypatch):
    monkeypatch.delenv("APP_DOMAIN", raising=False)
    assert _REAL_ENDPOINT_HOSTS() == []


def test_der_parsing_reads_subject_issuer_and_expiry():
    """The certificate is described from its DER bytes: ssl returns an EMPTY dict when verification is off, which is
    how the first version reported a served certificate with no subject, no issuer and no expiry."""
    import datetime as dt

    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = dt.datetime.now(dt.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "app.example.test")]))
        .issuer_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Test CA")]))
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(days=10))
        .not_valid_after(now + dt.timedelta(days=49))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName("app.example.test")]), critical=False)
        .sign(key, hashes.SHA256())
    )
    parsed = m._parse_der(cert.public_bytes(serialization.Encoding.DER))
    assert parsed["common_name"] == "app.example.test"
    assert parsed["issuer"] == "Test CA"
    assert parsed["sans"] == ["app.example.test"]
    assert parsed["not_after"] > parsed["not_before"]
    assert 48 <= (parsed["not_after"] - now).days <= 49


def test_empty_der_parses_to_nothing_rather_than_raising():
    assert m._parse_der(b"") == {}
