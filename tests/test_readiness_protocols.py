
"""Offline readiness regressions: no production database, scanner, or model calls."""
import ast
import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import sys
import time
import types
import unittest
from unittest.mock import AsyncMock, patch

ROOT = Path(__file__).resolve().parents[1]
@dataclass
class Health:
    name: str
    status: str
    detail: str
    latency_ms: float

def extracted(path, names, namespace):
    tree = ast.parse((ROOT / path).read_text())
    nodes = [node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name in names]
    for node in nodes:
        node.decorator_list = []
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), "exec"), namespace)
    return namespace

class ProtocolHealthTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.ns = extracted("apps/api/gds_api/health.py", {"_timed", "_check_temporal", "_check_nats"}, {
            "asyncio": asyncio, "time": time, "Callable": Callable, "Awaitable": Awaitable,
            "ServiceHealth": Health, "settings": types.SimpleNamespace(nats_host="test", nats_port=4222),
        })

    async def test_listening_port_does_not_make_temporal_healthy(self):
        client = types.ModuleType("gds_api.temporal_client")
        client.get_temporal_client = AsyncMock(side_effect=RuntimeError("secret-password-in-error"))
        with patch.dict(sys.modules, {"gds_api.temporal_client": client}):
            result = await self.ns["_timed"]("temporal", self.ns["_check_temporal"])
        self.assertEqual(result.status, "unhealthy")
        self.assertNotIn("secret-password", result.detail)
        client.get_temporal_client.assert_awaited_once()

    async def test_temporal_requires_successful_protocol_handshake(self):
        # The probe is not satisfied by a client object existing: it must obtain a positive
        # answer from Temporal's WorkflowService health RPC. A bare object() used to be faked
        # here, which is exactly the "port is listening, therefore healthy" bug this probe
        # was rewritten to catch.
        service = types.SimpleNamespace(check_health=AsyncMock(return_value=True))
        client = types.ModuleType("gds_api.temporal_client")
        client.get_temporal_client = AsyncMock(return_value=types.SimpleNamespace(service_client=service))
        with patch.dict(sys.modules, {"gds_api.temporal_client": client}):
            result = await self.ns["_timed"]("temporal", self.ns["_check_temporal"])
        self.assertEqual(result.status, "healthy")
        self.assertIn("gRPC", result.detail)
        service.check_health.assert_awaited_once()

    async def test_temporal_reporting_not_serving_is_unhealthy(self):
        service = types.SimpleNamespace(check_health=AsyncMock(return_value=False))
        client = types.ModuleType("gds_api.temporal_client")
        client.get_temporal_client = AsyncMock(return_value=types.SimpleNamespace(service_client=service))
        with patch.dict(sys.modules, {"gds_api.temporal_client": client}):
            result = await self.ns["_timed"]("temporal", self.ns["_check_temporal"])
        self.assertEqual(result.status, "unhealthy")
        # The detail is sanitised: a failing handshake never echoes broker internals.
        self.assertIn("service check failed", result.detail)

    async def nats_probe(self, lines):
        reader = types.SimpleNamespace(readline=AsyncMock(side_effect=lines))
        writer = types.SimpleNamespace(write=lambda data: None, drain=AsyncMock(), close=lambda: None, wait_closed=AsyncMock())
        with patch.object(asyncio, "open_connection", AsyncMock(return_value=(reader, writer))):
            result = await self.ns["_timed"]("nats", self.ns["_check_nats"])
        writer.wait_closed.assert_awaited_once()
        return result

    async def test_nats_requires_pong(self):
        result = await self.nats_probe([b"INFO {}\r\n", b"PONG\r\n"])
        self.assertEqual(result.status, "healthy")

    async def test_nats_auth_rejection_is_unhealthy(self):
        result = await self.nats_probe([b"INFO {}\r\n", b"-ERR 'Authorization Violation'\r\n"])
        self.assertEqual(result.status, "unhealthy")

    async def test_non_nats_service_is_unhealthy(self):
        result = await self.nats_probe([b"HTTP/1.1 200 OK\r\n"])
        self.assertEqual(result.status, "unhealthy")

class ReadinessTests(unittest.IsolatedAsyncioTestCase):
    async def readiness(self, services):
        class Response:
            def __init__(self, status_code, content):
                self.status_code, self.content = status_code, content
        responses = types.ModuleType("fastapi.responses")
        responses.JSONResponse = Response
        ns = extracted("apps/api/gds_api/main.py", {"health_ready"}, {
            "check_all_services": AsyncMock(return_value=services),
            "datetime": datetime, "UTC": timezone.utc,
        })
        with patch.dict(sys.modules, {"fastapi.responses": responses}):
            return await ns["health_ready"]()

    async def test_dependency_failure_returns_503(self):
        response = await self.readiness([Health("temporal", "unhealthy", "", 0)])
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.content["status"], "not_ready")

    async def test_all_healthy_returns_200(self):
        response = await self.readiness([Health("postgres", "healthy", "", 0)])
        self.assertEqual(response.status_code, 200)

    async def test_empty_health_results_fail_closed(self):
        response = await self.readiness([])
        self.assertEqual(response.status_code, 503)

class LegacyRouteBoundaryTests(unittest.IsolatedAsyncioTestCase):
    """The gap_routes raw-SQL routers must be either gated or explicitly tenant-scoped.

    History: all six were gated behind require_verified_legacy_route. Five were then released
    after being rewritten with explicit tenant predicates, so asserting "all six are gated"
    is no longer true. The invariant that still holds, and is what this test enforces, is that
    no router in this module exposes data without one of those two protections.
    """

    def routers_and_handlers(self):
        tree = ast.parse((ROOT / "apps/api/gds_api/gap_routes.py").read_text())
        routers = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call):
                call = node.value
                if isinstance(call.func, ast.Name) and call.func.id == "APIRouter":
                    name = node.targets[0].id
                    deps = next((kw.value for kw in call.keywords if kw.arg == "dependencies"), None)
                    routers[name] = deps

        def decorator_router(node):
            for dec in node.decorator_list:
                target = dec.func if isinstance(dec, ast.Call) else dec
                if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name):
                    if target.value.id in routers:
                        return target.value.id
            return None

        handlers = {name: [] for name in routers}
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                owner = decorator_router(node)
                if owner:
                    handlers[owner].append(node)
        return routers, handlers

    def test_every_legacy_router_is_gated_or_tenant_scoped(self):
        routers, handlers = self.routers_and_handlers()
        self.assertGreaterEqual(len(routers), 1)
        for name, deps in routers.items():
            gated = deps is not None and "require_verified_legacy_route" in ast.unparse(deps)
            if gated:
                continue
            self.assertTrue(handlers[name], f"{name} is neither gated nor has visible handlers")
            for handler in handlers[name]:
                body = ast.unparse(handler)
                self.assertIn(
                    "_tenant_id(", body,
                    f"{name}.{handler.name} is un-gated and never resolves a tenant",
                )

    def test_tenant_less_token_is_refused_not_widened(self):
        # _tenant_id must raise 403 rather than falling back to an unscoped read.
        class HTTPError(Exception):
            def __init__(self, status_code, detail):
                self.status_code = status_code
                self.detail = detail

        class Bare:
            tenant_id = None

        tree = ast.parse((ROOT / "apps/api/gds_api/gap_routes.py").read_text())
        node = next(n for n in ast.walk(tree)
                    if isinstance(n, ast.FunctionDef) and n.name == "_tenant_id")
        ns = {"CurrentUser": object, "HTTPException": HTTPError}
        exec(compile(ast.Module(body=[node], type_ignores=[]), "gap_routes", "exec"), ns)
        with self.assertRaises(HTTPError) as caught:
            ns["_tenant_id"](Bare())
        self.assertEqual(caught.exception.status_code, 403)

    async def test_authenticated_legacy_request_is_blocked_before_query_execution(self):
        class HTTPError(Exception):
            def __init__(self, status_code, detail):
                self.status_code = status_code
        ns = extracted("apps/api/gds_api/gap_routes.py", {"require_verified_legacy_route"}, {
            "CurrentUser": object, "Depends": lambda callback: callback,
            "get_current_user": lambda: object(), "HTTPException": HTTPError,
        })
        with self.assertRaises(HTTPError) as caught:
            await ns["require_verified_legacy_route"](object())
        self.assertEqual(caught.exception.status_code, 503)


class RetiredModuleAbsenceTests(unittest.TestCase):
    """Retired scaffold modules are deleted, not merely commented out.

    Each was retired because the tables it queried were never created, so its handlers could
    only 500. Keeping the source invited exactly the confusion this test now prevents: a fix
    applied to code that no process can reach.
    """

    RETIRED_PATHS = (
        "apps/api/gds_api/marketplace",
        "apps/api/gds_api/attack_graph",
        "apps/api/gds_api/digital_twin",
        "apps/api/gds_api/redteam_sim",
        "apps/api/gds_api/ai_security",
        "apps/api/gds_api/autofix",
        "apps/api/gds_api/sso",
        "apps/api/gds_api/compliance/autofix_routes.py",
        "apps/api/gds_api/compliance/evidence_routes.py",
        "apps/api/gds_api/integrations/routes.py",
        "apps/api/gds_api/webhooks/routes.py",
        "apps/api/gds_api/data_residency/routes.py",
    )

    def test_retired_modules_have_no_source_tree(self):
        for rel in self.RETIRED_PATHS:
            self.assertFalse((ROOT / rel).exists(), f"retired module still present: {rel}")

    def test_main_py_no_longer_mentions_retired_routers(self):
        source = (ROOT / "apps/api/gds_api/main.py").read_text()
        for token in ("marketplace_routes", "attack_graph_routes", "digital_twin_routes",
                      "redteam_sim_routes", "ai_security_routes", "autofix_routes",
                      "sso_routes", "ci_cd_routes", "webhook_routes", "residency_routes",
                      "compliance_autofix_routes", "compliance_evidence_routes"):
            self.assertNotIn(token, source, f"main.py still references {token}")

    def test_retirement_is_documented(self):
        doc = (ROOT / "docs/RETIRED_MODULES.md").read_text()
        for module in ("marketplace", "attack_graph", "digital_twin", "redteam_sim",
                       "ai_security", "autofix", "sso"):
            self.assertIn(module, doc, f"{module} missing from docs/RETIRED_MODULES.md")


