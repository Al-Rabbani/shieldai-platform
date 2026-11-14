
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
        client = types.ModuleType("gds_api.temporal_client")
        client.get_temporal_client = AsyncMock(return_value=object())
        with patch.dict(sys.modules, {"gds_api.temporal_client": client}):
            result = await self.ns["_timed"]("temporal", self.ns["_check_temporal"])
        self.assertEqual(result.status, "healthy")
        self.assertIn("gRPC", result.detail)

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
    def test_every_legacy_router_has_the_fail_closed_dependency(self):
        tree = ast.parse((ROOT / "apps/api/gds_api/gap_routes.py").read_text())
        routers = [node for node in ast.walk(tree) if isinstance(node, ast.Call)
                   and isinstance(node.func, ast.Name) and node.func.id == "APIRouter"]
        self.assertEqual(len(routers), 6)
        for router in routers:
            dependencies = next((keyword.value for keyword in router.keywords if keyword.arg == "dependencies"), None)
            self.assertIsNotNone(dependencies)
            self.assertIn("require_verified_legacy_route", ast.unparse(dependencies))

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

class WorkflowIdentifierTests(unittest.TestCase):
    def parser(self):
        import uuid
        class ApplicationError(Exception):
            def __init__(self, message, **kwargs):
                self.type = kwargs["type"]
                self.non_retryable = kwargs["non_retryable"]
        tree = ast.parse((ROOT / "apps/api/gds_api/workflows/identifiers.py").read_text())
        node = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "parse_mission_id")
        namespace = {"uuid": uuid, "ApplicationError": ApplicationError}
        exec(compile(ast.Module(body=[node], type_ignores=[]), "<identifier-boundary>", "exec"), namespace)
        return namespace["parse_mission_id"], ApplicationError

    def test_invalid_mission_identifiers_are_permanent_failures(self):
        parser, error = self.parser()
        for value in [None, "", "not-a-uuid", "../private"]:
            with self.subTest(value=value), self.assertRaises(error) as caught:
                parser(value)
            self.assertTrue(caught.exception.non_retryable)
            self.assertEqual(caught.exception.type, "InvalidMissionId")

    def test_valid_mission_uuid_is_preserved(self):
        import uuid
        parser, _ = self.parser()
        value = uuid.uuid4()
        self.assertEqual(parser(str(value)), value)

class LegacyFeatureMountTests(unittest.TestCase):
    def test_unverified_feature_mounts_require_the_quarantine_guard(self):
        expected = {
            "compliance_autofix_routes.router", "autofix_routes.router",
            "compliance_evidence_routes.router", "ci_cd_routes.router", "webhook_routes.router",
            "sso_routes.router", "residency_routes.router", "ai_security_routes.router",
            "attack_graph_routes.router", "redteam_sim_routes.router",
            "digital_twin_routes.router", "marketplace_routes.router", "reasoning_router",
        }
        tree = ast.parse((ROOT / "apps/api/gds_api/main.py").read_text())
        found = set()
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute) or node.func.attr != "include_router" or not node.args:
                continue
            name = ast.unparse(node.args[0])
            if name not in expected:
                continue
            dependency = next((keyword.value for keyword in node.keywords if keyword.arg == "dependencies"), None)
            self.assertIsNotNone(dependency, name)
            self.assertIn("require_verified_legacy_route", ast.unparse(dependency), name)
            found.add(name)
        self.assertEqual(found, expected)
