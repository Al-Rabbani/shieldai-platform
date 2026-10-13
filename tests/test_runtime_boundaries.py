"""Offline contract tests. No live tools, cloud, database or model calls.

Extract dependency-light functions from the actual source so tests can run
without booting the production API or installing its service dependencies.
"""
import ast
import asyncio
import io
import json
import logging
import os
from pathlib import Path
import secrets
import sys
import types
import unittest
from unittest.mock import patch
import inspect
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parents[1] / "apps/api"


def load_nodes(relative, names, extra=None):
    tree = ast.parse((ROOT / relative).read_text())
    nodes = [node for node in tree.body if getattr(node, "name", None) in names]
    namespace = dict(asyncio=asyncio, inspect=inspect, os=os, secrets=secrets,
                     Dict=Dict, Any=Any, Optional=Optional, List=List,
                     logger=logging.getLogger("test"))
    namespace.update(extra or {})
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(relative), "exec"), namespace)
    return namespace


class DispatchTests(unittest.IsolatedAsyncioTestCase):
    async def test_gateway_receives_payload_not_action(self):
        seen = []
        def executor(name, action="execute", payload=None):
            seen.append((name, action, payload))
            return {"ok": True}
        ns = load_nodes("gds_api/reasoning/kernel_agent_runner.py", ["_safe_execute_tool"], {"execute_tool": executor})
        await ns["_safe_execute_tool"]("scan", {"target": "owned.invalid"})
        self.assertEqual(seen, [("scan", "execute", {"target": "owned.invalid"})])

    async def test_async_bridge_receives_payload(self):
        async def executor(tool_id, payload, pid="agent"):
            return payload
        ns = load_nodes("gds_api/reasoning/kernel_agent_runner.py", ["_safe_execute_tool"], {"execute_tool": executor})
        self.assertEqual(await ns["_safe_execute_tool"]("scan", {"x": 1}), {"x": 1})

    async def test_internal_typeerror_does_not_retry(self):
        calls = []
        def executor(name, payload=None):
            calls.append(name)
            raise TypeError("internal failure after side effect")
        ns = load_nodes("gds_api/reasoning/kernel_agent_runner.py", ["_safe_execute_tool"], {"execute_tool": executor})
        result = await ns["_safe_execute_tool"]("write", {})
        self.assertIn("error", result)
        self.assertEqual(calls, ["write"])

    async def test_custom_awaitable_is_awaited(self):
        class Result:
            def __await__(self):
                async def finish():
                    return {"ok": True}
                return finish().__await__()
        ns = load_nodes("gds_api/reasoning/kernel_agent_runner.py", ["_safe_execute_tool"], {"execute_tool": lambda name, payload: Result()})
        self.assertEqual(await ns["_safe_execute_tool"]("scan", {}), {"ok": True})


class KernelTests(unittest.TestCase):
    def test_auth_fails_closed_and_handles_unicode(self):
        class HTTPException(Exception):
            def __init__(self, status, detail):
                self.status_code = status
        ns = load_nodes("gds_kernel/kernel_router.py", ["_verify_kernel_auth"], {"Header": lambda value: value, "HTTPException": HTTPException})
        with patch.dict(os.environ, {"BRIDGE_API_KEY": "test-only-key"}):
            for value in (None, "Basic test", "Bearer wrong", "Bearer \u2603"):
                with self.assertRaises(HTTPException) as caught:
                    ns["_verify_kernel_auth"](value)
                self.assertEqual(caught.exception.status_code, 401)
            ns["_verify_kernel_auth"]("Bearer test-only-key")
        with patch.dict(os.environ, {"BRIDGE_API_KEY": ""}):
            with self.assertRaises(HTTPException):
                ns["_verify_kernel_auth"]("Bearer test-only-key")

    def test_failed_wiring_is_not_published_and_next_call_recovers(self):
        instances = []
        class Kernel:
            def __init__(self):
                self.sandbox = types.SimpleNamespace(drivers={"scan": object()})
                self.memory = object()
                instances.append(self)
            def boot(self):
                return True
        module = types.ModuleType("gds_kernel.unified_kernel")
        module.GDSUnifiedKernel = Kernel
        ns = load_nodes("gds_kernel/kernel_router.py", ["get_kernel"], {"_kernel": None, "wire_real_tools": lambda k: 0})
        with patch.dict(sys.modules, {"gds_kernel.unified_kernel": module}):
            with self.assertRaises(RuntimeError):
                ns["get_kernel"]()
            self.assertIsNone(ns["_kernel"])
            ns["wire_real_tools"] = lambda k: 1
            kernel = ns["get_kernel"]()
            self.assertIs(kernel, ns["get_kernel"]())
            self.assertEqual(len(instances), 2)


class BridgeTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_process_route_returns_success_data(self):
        expected = {"pid": "agent-1"}
        kernel = types.SimpleNamespace(syscall=types.SimpleNamespace(sys_agent_create=lambda *args: types.SimpleNamespace(success=True, data=expected)))
        # The HTTP decorator is outside the function contract under test.
        ns = self._load_create_route(kernel)
        request = types.SimpleNamespace(agent_id="hunter", task_name="review", goal="review", priority=2, depends_on=[])
        self.assertEqual(await ns["create_process"](request), expected)

    def _load_create_route(self, kernel):
        tree = ast.parse((ROOT / "gds_kernel/kernel_router.py").read_text())
        node = next(n for n in tree.body if getattr(n, "name", None) == "create_process")
        node.decorator_list = []
        ns = {"get_kernel": lambda: kernel, "CreateProcessRequest": object}
        exec(compile(ast.Module(body=[node], type_ignores=[]), "create_route", "exec"), ns)
        return ns

    async def test_all_client_calls_send_auth_and_valid_process_shape(self):
        calls = []
        class Response:
            status = 200
            async def __aenter__(self): return self
            async def __aexit__(self, *args): pass
            async def json(self): return {"success": True}
        class Session:
            def __init__(self, **kwargs): self.options = kwargs
            async def __aenter__(self): return self
            async def __aexit__(self, *args): pass
            def request(self, url, **kwargs):
                calls.append((self.options, url, kwargs))
                return Response()
            post = get = request
        fake = types.SimpleNamespace(ClientSession=Session, ClientTimeout=lambda **kwargs: kwargs)
        ns = load_nodes("gds_api/reasoning/kernel_bridge.py", ["_kernel_headers", "execute_tool", "get_kernel_status", "create_process", "list_tools"], {"KERNEL_API": "http://test.invalid/kernel"})
        with patch.dict(sys.modules, {"aiohttp": fake}), patch.dict(os.environ, {"BRIDGE_API_KEY": "test-only-key"}):
            await ns["execute_tool"]("scan", {"target": "owned.invalid"})
            await ns["get_kernel_status"]()
            await ns["create_process"]("hunter", goal="review")
            await ns["list_tools"]()
        self.assertEqual(len(calls), 4)
        self.assertTrue(all(c[0]["headers"]["Authorization"] == "Bearer test-only-key" for c in calls))
        self.assertEqual(calls[2][2]["json"]["task_name"], "hunter")
        self.assertNotIn("agent_type", calls[2][2]["json"])

    async def test_missing_key_prevents_network(self):
        fake = types.SimpleNamespace(ClientSession=lambda **kwargs: self.fail("network session opened"))
        ns = load_nodes("gds_api/reasoning/kernel_bridge.py", ["_kernel_headers", "execute_tool"])
        with patch.dict(sys.modules, {"aiohttp": fake}), patch.dict(os.environ, {"BRIDGE_API_KEY": ""}):
            with self.assertRaises(RuntimeError):
                await ns["execute_tool"]("scan", {})


class FindingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import importlib.util
        spec = importlib.util.spec_from_file_location("tested_wiring", ROOT / "gds_kernel/tool_wiring.py")
        cls.wiring = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.wiring)

    def test_text_is_stdin_data_not_executable_source(self):
        hostile = '\"; raise RuntimeError("injected"); #\ntriple quotes: \'\'\''
        with patch.object(self.wiring, "_run_python", return_value={"success": True, "finding_id": "1"}) as run:
            self.assertTrue(self.wiring.exec_store_finding({"title": hostile})["success"])
        code = run.call_args.args[0]
        self.assertNotIn(hostile, code)
        self.assertEqual(run.call_args.kwargs["payload"]["payload"]["title"], hostile)
        compile(code, "finding_script", "exec")

    def test_limit_validation_prevents_execution(self):
        for value in (True, 0, -1, 1001, '1; injected', 1.5):
            with self.subTest(value=value), patch.object(self.wiring, "_run_python") as run:
                self.assertFalse(self.wiring.exec_get_findings({"limit": value})["success"])
                run.assert_not_called()

    def test_subprocess_failure_cannot_be_overwritten_as_success(self):
        with patch.object(self.wiring, "_run_python", return_value={"success": False, "error": "failure"}):
            self.assertFalse(self.wiring.exec_store_finding({})["success"])
            self.assertFalse(self.wiring.exec_get_findings({})["success"])

    def test_database_script_uses_env_scope_and_fails_closed(self):
        """The finding subprocess must take its identity from the server-owned
        environment (never the model payload) and emit fail-closed JSON."""
        captured = []
        mod = types.ModuleType("gds_api.security_scope")

        class FakeScopeError(Exception):
            pass

        mod.SecurityScopeError = FakeScopeError

        def build_env(configured=True, scope="scope-from-env"):
            mod.service_scope_configured = lambda: configured
            mod.resolve_service_scope = lambda: scope
            def read_scoped(payload, sc):
                captured.append(("get", payload, sc))
                return [{"id": 1, "title": "t"}]
            def store_scoped(payload, sc):
                captured.append(("store", payload, sc))
                return {"success": True, "finding_id": "f-1"}
            mod.read_scoped_findings = read_scoped
            mod.store_scoped_finding = store_scoped

        build_env()
        pkg = types.ModuleType("gds_api")
        pkg.security_scope = mod
        pkg.__path__ = []

        payload = dict(title='quotes " and newline\n', source="kernel", severity="HIGH",
                       target="owned.invalid", description="evidence", cve_id="", limit=10)

        for operation in ("store", "get"):
            output = io.StringIO()
            with patch.dict(sys.modules, {"gds_api": pkg, "gds_api.security_scope": mod}), \
                 patch.object(sys, "stdin", io.StringIO(json.dumps({"operation": operation, "payload": payload}))), \
                 patch.object(sys, "stdout", output):
                exec(self.wiring.FINDING_DATABASE_SCRIPT, {})
            result = json.loads(output.getvalue())
            self.assertTrue(result.get("success"), result)
            kind, received, scope_used = captured[-1]
            self.assertEqual(kind, operation)
            # Identity came from the env resolver, never the model payload.
            self.assertEqual(scope_used, "scope-from-env")
            self.assertNotIn("tenant_id", received)

        # Unconfigured scope fails closed with clean JSON, no traceback.
        build_env(configured=False)
        output = io.StringIO()
        with patch.dict(sys.modules, {"gds_api": pkg, "gds_api.security_scope": mod}), \
             patch.object(sys, "stdin", io.StringIO(json.dumps({"operation": "store", "payload": payload}))), \
             patch.object(sys, "stdout", output):
            exec(self.wiring.FINDING_DATABASE_SCRIPT, {})
        result = json.loads(output.getvalue())
        self.assertFalse(result.get("success"))
        self.assertIn("not configured", result.get("error", ""))
        self.assertNotIn("Traceback", output.getvalue())

        # Scope errors surface as controlled messages without credential text.
        def raise_scope(payload, sc):
            raise FakeScopeError("private connection detail should not escape")
        mod.store_scoped_finding = raise_scope
        mod.service_scope_configured = lambda: True
        output = io.StringIO()
        with patch.dict(sys.modules, {"gds_api": pkg, "gds_api.security_scope": mod}), \
             patch.object(sys, "stdin", io.StringIO(json.dumps({"operation": "store", "payload": payload}))), \
             patch.object(sys, "stdout", output):
            exec(self.wiring.FINDING_DATABASE_SCRIPT, {})
        result = json.loads(output.getvalue())
        self.assertFalse(result.get("success"))
        self.assertIn("private connection detail", result.get("error", ""))


if __name__ == "__main__":
    unittest.main()
