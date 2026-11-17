"""Auth contract for the live API: which endpoints may be reached unauthenticated, and proof they refuse.

DESCENDANT OF tests/integration/test_route_auth.py, which is why this file exists. That test asserted
`Depends(get_current_user)` on 56 routes by parsing the source of six router modules (marketplace,
attack_graph, autofix, digital_twin, redteam_sim, ai_security). When those six were retired the
assertion had nothing left to assert and the file was deleted, taking the coverage with it. This
version reads the LIVE route table, so retiring a router cannot make it vacuous: an endpoint added
without authentication fails the test instead of quietly joining the surface.

THREE CATEGORIES, because "not using get_current_user" is not the same as "unauthenticated":

  * user-authenticated  - Depends(get_current_user); a cookie session is the only way in.
  * public by design    - health probes, the auth endpoints themselves, the public plan list. These
                          must keep answering without a session or the platform cannot be used.
  * machine-authenticated - /bridge/* and /kernel/* use the BRIDGE_API_KEY bearer token, /ci/gate
                          verifies a repository token, /billing/webhook verifies Stripe's signature.
                          They legitimately have no user session, so the honest question is not
                          "do they call get_current_user" but "do they refuse an anonymous caller",
                          which the live tests below measure.

MEASURED BEHAVIOUR PINNED HERE (17 Nov 2026): a valid signature with no tenant_id claim still returns
200 on user-protected routes. That is correct, not a defect: get_current_user resolves the identity
from the token subject and then reads the tenant from the user row, so the tenant claim is decorative
and cannot widen access. Earlier notes claimed a tenant-less token gets 403; that is true only of the
gap routes that read the claim directly. Both are pinned below rather than left as folklore.
"""
from __future__ import annotations

import os
import subprocess
import uuid

import pytest

# --- the route inventory ------------------------------------------------------------------------

PUBLIC_BY_DESIGN = {
    "GET /health": "liveness probe - must answer before anyone can authenticate",
    "GET /health/live": "liveness probe",
    "GET /health/ready": "readiness probe",
    "GET /health/version": "deployed version, needed to confirm a release",
    "POST /auth/login": "the endpoint that creates a session cannot require one",
    "POST /auth/register": "account creation happens before any session exists",
    "GET /billing/plans": "public price list, no tenant data",
    "GET /bridge/health": "bridge reachability probe; returns registry state only, no tenant data",
}

MACHINE_AUTH = {
    "POST /billing/webhook": "Stripe signature verified with STRIPE_WEBHOOK_SECRET",
    "POST /ci/gate": "repository token verified by _verify_gate_auth",
    "POST /auth/refresh": "authenticates with the refresh cookie, not the access session",
    "GET /bridge/agents": "BRIDGE_API_KEY bearer",
    "GET /bridge/diagnostics": "BRIDGE_API_KEY bearer",
    "GET /bridge/mission/{mission_id}": "BRIDGE_API_KEY bearer",
    "GET /bridge/missions": "BRIDGE_API_KEY bearer",
    "POST /bridge/agent/{agent_id}/invoke": "BRIDGE_API_KEY bearer",
    "POST /bridge/auto": "BRIDGE_API_KEY bearer",
    "POST /bridge/mission": "BRIDGE_API_KEY bearer",
    "GET /kernel/audit": "BRIDGE_API_KEY bearer",
    "GET /kernel/ipc/recv/{pid}": "BRIDGE_API_KEY bearer",
    "GET /kernel/memory/global-stats": "BRIDGE_API_KEY bearer",
    "GET /kernel/memory/stats/{pid}": "BRIDGE_API_KEY bearer",
    "GET /kernel/processes": "BRIDGE_API_KEY bearer",
    "GET /kernel/stats": "BRIDGE_API_KEY bearer",
    "GET /kernel/status": "BRIDGE_API_KEY bearer",
    "GET /kernel/tools": "BRIDGE_API_KEY bearer",
    "POST /kernel/approval/grant": "BRIDGE_API_KEY bearer",
    "POST /kernel/approval/request": "BRIDGE_API_KEY bearer",
    "POST /kernel/ipc/send": "BRIDGE_API_KEY bearer",
    "POST /kernel/llm/request": "BRIDGE_API_KEY bearer",
    "POST /kernel/memory/alloc": "BRIDGE_API_KEY bearer",
    "POST /kernel/memory/build-context": "BRIDGE_API_KEY bearer",
    "POST /kernel/memory/page-in": "BRIDGE_API_KEY bearer",
    "POST /kernel/memory/search": "BRIDGE_API_KEY bearer",
    "POST /kernel/process/create": "BRIDGE_API_KEY bearer",
    "POST /kernel/process/terminate": "BRIDGE_API_KEY bearer",
    "POST /kernel/tool/execute": "BRIDGE_API_KEY bearer",
}

# Routes that were anonymous until this work. Kept as an explicit list so a regression is named.
RECENTLY_CLOSED = (
    "POST /pentest/cvss/score",
    "POST /pentest/exploit-chain",
    "POST /pentest/intelligence/{target}",
    "POST /pentest/multi-target",
    "POST /pentest/regression",
    "POST /pentest/schedule/continuous",
)

# Sample of user-authenticated routes exercised live, covering four different routers.
PROTECTED_SAMPLE = ("/findings/security", "/missions", "/approvals", "/monitoring/schedules")

# What an anonymous caller must receive, MEASURED 17 Nov 2026 rather than assumed. Two of these are
# not 401 and that is correct: a Stripe webhook with no signature is rejected as a bad signature
# (400), and FastAPI validates a request body before an in-handler guard runs, so a malformed body
# can return 422 - which is why the probe below sends a valid-shaped body to reach the guard.
EXPECTED_ANONYMOUS = {"POST /billing/webhook": {400}}
PROBE_BODY = {
    "POST /bridge/auto": {"goal": "auth probe, do not execute", "agent_id": "nonexistent-agent"},
    "POST /bridge/mission": {"goal": "auth probe, do not execute", "agent_id": "nonexistent-agent"},
    "POST /bridge/agent/{agent_id}/invoke": {"goal": "auth probe, do not execute"},
    "POST /pentest/cvss/score": {"vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"},
    "POST /pentest/intelligence/{target}": {},
}


def _endpoint_inventory() -> dict[str, bool]:
    """Map "METHOD /path" -> is it protected by get_current_user, for every route the app serves.

    This FastAPI version stores included routers as lazy _IncludedRouter objects, so a naive walk of
    app.routes sees 5 endpoints out of 292 and would report a clean surface from an empty sample.
    """
    from fastapi.routing import APIRoute

    from gds_api.main import app
    from gds_api.security import get_current_user

    def has_auth(route) -> bool:
        stack = [route.dependant]
        while stack:
            dependency = stack.pop()
            if dependency.call is get_current_user:
                return True
            stack.extend(dependency.dependencies)
        return False

    def walk(routes, prefix=""):
        for route in routes:
            kind = type(route).__name__
            if kind == "_IncludedRouter":
                sub = getattr(route, "original_router", None)
                context = getattr(route, "include_context", None)
                if sub is not None:
                    yield from walk(getattr(sub, "routes", []), prefix + (getattr(context, "prefix", "") or ""))
            elif kind == "Mount":
                yield from walk(getattr(getattr(route, "app", None), "routes", []) or [], prefix + (route.path or ""))
            elif isinstance(route, APIRoute):
                yield prefix + route.path, route

    inventory: dict[str, bool] = {}
    for path, route in walk(app.routes):
        for method in sorted(route.methods - {"HEAD", "OPTIONS"}):
            inventory[f"{method} {path}"] = has_auth(route)
    return inventory


class TestRouteContract:
    def test_the_inventory_actually_sees_the_whole_surface(self):
        """Guards the guard: if the walk silently stops expanding, every assertion below passes vacuously."""
        inventory = _endpoint_inventory()
        assert len(inventory) > 250, f"only {len(inventory)} endpoints enumerated"

    def test_no_endpoint_is_anonymous_without_a_documented_reason(self):
        unexplained = [
            endpoint
            for endpoint, protected in _endpoint_inventory().items()
            if not protected and endpoint not in PUBLIC_BY_DESIGN and endpoint not in MACHINE_AUTH
        ]
        assert unexplained == [], f"endpoints reachable without a documented auth mechanism: {unexplained}"

    def test_every_exemption_still_exists(self):
        """A stale exemption is a hole nobody is watching: it would silently authorise a future route."""
        inventory = _endpoint_inventory()
        stale = [e for e in {**PUBLIC_BY_DESIGN, **MACHINE_AUTH} if e not in inventory]
        assert stale == [], f"allowlisted endpoints that no longer exist: {stale}"

    def test_the_pentest_endpoints_are_no_longer_anonymous(self):
        inventory = _endpoint_inventory()
        still_open = [e for e in RECENTLY_CLOSED if not inventory.get(e, True)]
        assert still_open == [], f"pentest endpoints still anonymous: {still_open}"


# --- live behaviour -----------------------------------------------------------------------------

BASE_URL = os.environ.get("GDS_TEST_BASE_URL", "http://127.0.0.1:8000")


def _host_env(name):
    """A setting from the process environment, else from the host config file.

    The full suite is normally run without sourcing /opt/.env, and requiring the caller to remember
    made all 63 live cases SKIP on the very host where they matter. Reading the deployed config is
    enough to run them; on CI the file does not exist and the cases still skip honestly.
    """
    value = os.environ.get(name)
    if value:
        return value
    try:
        for line in open("/opt/.env", encoding="utf-8", errors="ignore"):
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        return None
    return None


def _pair_from_env():
    user = _host_env("SECURITY_ALERT_RECIPIENT_USER_ID")
    tenant = _host_env("SECURITY_ALERT_TENANT_ID")
    if not user or not tenant:
        return None, None
    return uuid.UUID(user), uuid.UUID(tenant)


def _live_client():
    """A client for the running API, or None when it is not reachable (offline CI)."""
    import httpx

    try:
        if httpx.get(f"{BASE_URL}/health", timeout=5).status_code != 200:
            return None
    except Exception:
        return None
    return httpx


def _require_live():
    httpx = _live_client()
    if httpx is None:
        pytest.skip(f"live API not reachable at {BASE_URL}")
    user, tenant = _pair_from_env()
    if user is None:
        pytest.skip("SECURITY_ALERT_RECIPIENT_USER_ID / SECURITY_ALERT_TENANT_ID not configured")
    return httpx, user, tenant


def _token(user, tenant):
    from gds_api.security import create_access_token

    return create_access_token(user_id=user, tenant_id=tenant)


def _get(httpx, path, token=None):
    client = httpx.Client(base_url=BASE_URL, timeout=30)
    try:
        if token:
            from gds_api.security import ACCESS_COOKIE_NAME

            client.cookies.set(ACCESS_COOKIE_NAME, token)
        return client.get(path)
    finally:
        client.close()


class TestLiveAuth:
    @pytest.mark.parametrize("path", PROTECTED_SAMPLE)
    def test_protected_routes_refuse_an_anonymous_caller(self, path):
        httpx, _, _ = _require_live()
        assert _get(httpx, path).status_code == 401

    @pytest.mark.parametrize("path", PROTECTED_SAMPLE)
    def test_protected_routes_refuse_a_forged_token(self, path):
        httpx, _, _ = _require_live()
        assert _get(httpx, path, "not-a-jwt").status_code == 401

    @pytest.mark.parametrize("path", PROTECTED_SAMPLE)
    def test_protected_routes_accept_a_real_session(self, path):
        httpx, user, tenant = _require_live()
        assert _get(httpx, path, _token(user, tenant)).status_code == 200

    @pytest.mark.parametrize("endpoint", sorted(MACHINE_AUTH))
    def test_machine_surfaces_refuse_an_anonymous_caller(self, endpoint):
        """The allowlist claims these authenticate themselves; this is the measurement, not the claim."""
        httpx, _, _ = _require_live()
        method, path = endpoint.split(" ", 1)
        concrete = path.replace("{mission_id}", "probe").replace("{pid}", "1").replace("{agent_id}", "probe")
        client = httpx.Client(base_url=BASE_URL, timeout=30)
        try:
            response = client.request(method, concrete, json=PROBE_BODY.get(endpoint, {}))
        finally:
            client.close()
        allowed = EXPECTED_ANONYMOUS.get(endpoint, {401, 403})
        assert response.status_code in allowed, f"{endpoint} answered {response.status_code} anonymously"

    @pytest.mark.parametrize("endpoint", sorted(PUBLIC_BY_DESIGN))
    def test_public_endpoints_answer_without_a_session(self, endpoint):
        httpx, _, _ = _require_live()
        method, path = endpoint.split(" ", 1)
        client = httpx.Client(base_url=BASE_URL, timeout=30)
        try:
            response = client.request(method, path, json={})
        finally:
            client.close()
        assert response.status_code not in (401, 403), f"{endpoint} requires a session but is declared public"

    @pytest.mark.parametrize("endpoint", RECENTLY_CLOSED)
    def test_pentest_endpoints_refuse_an_anonymous_caller(self, endpoint):
        httpx, _, _ = _require_live()
        method, path = endpoint.split(" ", 1)
        concrete = path.replace("{target}", "example.com")
        client = httpx.Client(base_url=BASE_URL, timeout=30)
        try:
            response = client.request(method, concrete, json=PROBE_BODY.get(endpoint, {}))
        finally:
            client.close()
        assert response.status_code in (401, 403, 422), (
            f"{endpoint} still answers {response.status_code} anonymously"
        )

    def test_bridge_mission_refuses_an_anonymous_caller(self):
        """Found live: this was the one bridge handler that forgot _verify_auth, and an anonymous POST
        returned 200 with a real mission id (mission-d40432e49588). Guarded like its siblings."""
        httpx, _, _ = _require_live()
        client = httpx.Client(base_url=BASE_URL, timeout=30)
        try:
            response = client.post("/bridge/mission", json=PROBE_BODY["POST /bridge/mission"])
        finally:
            client.close()
        assert response.status_code == 401

    def test_tenant_claim_cannot_override_the_users_real_tenant(self):
        """Identity comes from the token subject and the tenant from the user row, so a token claiming
        another tenant must still return only the user's own data."""
        httpx, user, tenant = _require_live()
        mine = _get(httpx, "/findings/security", _token(user, tenant))
        assert mine.status_code == 200

        second = _second_user(tenant)
        if second is None:
            pytest.skip("no second tenant exists; cross-tenant comparison not possible")
        claimed = _get(httpx, "/findings/security", _token(user, second[1]))
        assert claimed.status_code == 200
        assert _ids(claimed) == _ids(mine), "a token claiming another tenant changed the data returned"

    def test_two_tenants_see_disjoint_findings(self):
        """The isolation the deleted route-auth test could no longer assert: two real accounts in two
        real tenants must never see a single shared row."""
        httpx, user, tenant = _require_live()
        second = _second_user(tenant)
        if second is None:
            pytest.skip("no second tenant exists; cross-tenant comparison not possible")

        mine = _get(httpx, "/findings/security", _token(user, tenant))
        theirs = _get(httpx, "/findings/security", _token(second[0], second[1]))
        assert mine.status_code == 200 and theirs.status_code == 200
        overlap = _ids(mine) & _ids(theirs)
        assert overlap == set(), f"{len(overlap)} findings visible to both tenants"
        assert _ids(mine), "the owner tenant unexpectedly sees no findings; the comparison is vacuous"

    def test_tenantless_token_is_scoped_to_the_real_tenant_not_everything(self):
        """Documents the measured contract: no tenant claim still resolves to the user's own tenant."""
        httpx, user, tenant = _require_live()
        from datetime import UTC, datetime, timedelta

        import jwt

        from gds_api.config import settings

        payload = {
            "sub": str(user),
            "iat": datetime.now(UTC),
            "exp": datetime.now(UTC) + timedelta(minutes=5),
        }
        token = jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")
        response = _get(httpx, "/findings/security", token)
        assert response.status_code == 200
        assert _ids(response) == _ids(_get(httpx, "/findings/security", _token(user, tenant)))


def _ids(response):
    body = response.json()
    rows = body if isinstance(body, list) else body.get("items") or body.get("findings") or []
    return {row.get("id") for row in rows}


def _psql(sql: str):
    """Rows from the database as the postgres superuser.

    The environment is cleaned first: the API's /opt/.env is sourced before pytest runs and carries
    PG* variables that silently redirect psql, which is why the first version of this helper returned
    nothing and the isolation test skipped instead of running.
    """
    clean = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
    try:
        out = subprocess.run(
            ["sudo", "-u", "postgres", "psql", "-X", "-q", "-d", "gds_os", "-tAc", sql],
            capture_output=True, text=True, timeout=20, env=clean, cwd="/tmp",
        )
    except Exception:
        return []
    if out.returncode != 0:
        return []
    return [line.split() for line in out.stdout.splitlines() if line.strip()]


def _second_user(mine_tenant):
    """A real user in a different tenant, so isolation is proven against actual accounts rather than
    against a fixture that cannot exist (users is FORCE-RLS; the superuser path is how we see them)."""
    # Concatenated deliberately: psql -tAc joins multiple columns with "|", so a comma-separated
    # select produced one field per line and the parser silently matched nothing.
    for parts in _psql(f"select id::text || ' ' || tenant_id::text from users where tenant_id <> '{mine_tenant}'"):
        if len(parts) == 2:
            try:
                return uuid.UUID(parts[0]), uuid.UUID(parts[1])
            except ValueError:
                continue
    return None
