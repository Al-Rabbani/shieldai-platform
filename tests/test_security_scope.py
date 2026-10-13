import importlib.util
import os
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch
from uuid import UUID

path = Path(__file__).resolve().parents[1] / "apps/api/gds_api/security_scope.py"
spec = importlib.util.spec_from_file_location("tested_security_scope", path)
scope_module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = scope_module
spec.loader.exec_module(scope_module)
Scope = scope_module.ServiceSecurityScope
Error = scope_module.SecurityScopeError
TENANT = UUID(int=1)
PRINCIPAL = UUID(int=2)
REPOSITORY = UUID(int=3)


class FakeConnection:
    autocommit = False
    role = ("test_runtime", False, False, False)
    protection = (4, True, False)
    binding = (str(REPOSITORY),)
    fail_query = False
    def __init__(self):
        self.queries = []
        self.closed = False
        self.committed = False
        self.rolled_back = False
        self.last_query = ""
    def __enter__(self): return self
    def __exit__(self, kind, value, traceback):
        self.committed = kind is None
        self.rolled_back = kind is not None
    def cursor(self): return FakeCursor(self)
    def close(self): self.closed = True


class FakeCursor:
    def __init__(self, connection): self.connection = connection
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def execute(self, query, values=None):
        if self.connection.fail_query:
            raise RuntimeError("private connection detail should not escape")
        self.connection.last_query = query
        self.connection.queries.append((query, values))
    def fetchone(self):
        query = self.connection.last_query
        if "FROM pg_roles WHERE" in query: return self.connection.role
        if "FROM pg_class" in query: return self.connection.protection
        if "FROM security_repository_bindings" in query: return self.connection.binding
        if "RETURNING id" in query: return (7,)
        return None
    def fetchall(self): return [(7, "kernel", "test finding", "high", "owned.invalid", "open")]


class SecurityScopeTests(unittest.TestCase):
    def setUp(self):
        self.scope = Scope(PRINCIPAL, TENANT, REPOSITORY)
        self.environment = patch.dict(os.environ, {"SECURITY_RUNTIME_ROLE": "test_runtime", "BRIDGE_API_KEY": "test-only-key", "SECURITY_BRIDGE_PRINCIPAL_ID": str(PRINCIPAL), "SECURITY_BRIDGE_TENANT_ID": str(TENANT), "SECURITY_BRIDGE_REPOSITORY_BINDING_ID": str(REPOSITORY)})
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def test_authenticated_bridge_scope_uses_server_mapping(self):
        self.assertEqual(scope_module.authenticate_scoped_bridge("Bearer test-only-key"), self.scope)
        for header in (None, "Basic wrong", "Bearer wrong", "Bearer \u2603"):
            with self.subTest(header=header), self.assertRaises(Error):
                scope_module.authenticate_scoped_bridge(header)

    def test_missing_scope_configuration_fails_closed(self):
        with patch.dict(os.environ, {"SECURITY_BRIDGE_TENANT_ID": ""}), self.assertRaises(Error):
            scope_module.authenticate_scoped_bridge("Bearer test-only-key")

    def test_model_identity_fields_are_rejected_before_database(self):
        for field in ("tenant_id", "principal_id", "repository_binding_id", "trusted_scope", "security_scope"):
            with self.subTest(field=field), self.assertRaises(Error):
                scope_module.store_scoped_finding({field: "forged"}, self.scope, connection_factory=lambda: self.fail("database opened"))

    def test_autocommit_is_rejected_and_connection_closed(self):
        connection = FakeConnection()
        connection.autocommit = True
        with self.assertRaises(Error):
            with scope_module.scoped_security_transaction(self.scope, connection_factory=lambda: connection): pass
        self.assertTrue(connection.closed)
        self.assertEqual(connection.queries, [])

    def test_owner_bypass_elevated_or_wrong_role_is_rejected(self):
        for role in (("wrong", False, False, False), ("test_runtime", True, False, False), ("test_runtime", False, True, False), ("test_runtime", False, False, True)):
            connection = FakeConnection()
            connection.role = role
            with self.subTest(role=role), self.assertRaises(Error):
                with scope_module.scoped_security_transaction(self.scope, connection_factory=lambda: connection): pass
            self.assertTrue(connection.closed)
            self.assertTrue(connection.rolled_back)
        for protection in ((4, True, True), (4, False, False), (3, True, False)):
            connection = FakeConnection()
            connection.protection = protection
            with self.subTest(protection=protection), self.assertRaises(Error):
                with scope_module.scoped_security_transaction(self.scope, connection_factory=lambda: connection): pass

    def test_missing_repository_binding_rolls_back(self):
        connection = FakeConnection()
        connection.binding = None
        with self.assertRaises(Error):
            with scope_module.scoped_security_transaction(self.scope, connection_factory=lambda: connection): pass
        self.assertTrue(connection.rolled_back)
        self.assertTrue(connection.closed)

    def test_reads_use_exact_bound_tenant_repository_and_target(self):
        connection = FakeConnection()
        target = "x' OR TRUE --"
        result = scope_module.read_scoped_findings({"target": target, "severity": "HIGH"}, self.scope, connection_factory=lambda: connection)
        query, values = connection.queries[-1]
        self.assertNotIn(target, query)
        self.assertNotIn("ILIKE", query)
        self.assertEqual(values, (str(TENANT), str(REPOSITORY), target, "high", 100))
        self.assertEqual(result[0]["id"], 7)
        self.assertTrue(connection.committed)
        self.assertIn(("SELECT set_config('gds.tenant_id', %s, true)", (str(TENANT),)), connection.queries)

    def test_explicit_scope_insert_preserves_quotes_as_data(self):
        connection = FakeConnection()
        title = "quotes ' \" and newline\n"
        result = scope_module.store_scoped_finding({"title": title, "severity": "HIGH"}, self.scope, connection_factory=lambda: connection)
        query, values = connection.queries[-1]
        self.assertNotIn(title, query)
        self.assertEqual(values[:2], (str(TENANT), str(REPOSITORY)))
        self.assertEqual(values[3:5], (title, "high"))
        self.assertEqual(result["finding_id"], "7")
        self.assertTrue(connection.closed)

    def test_error_cleanup_and_credentials_are_not_returned(self):
        connection = FakeConnection()
        connection.fail_query = True
        with self.assertRaises(Error) as caught:
            scope_module.read_scoped_findings({}, self.scope, connection_factory=lambda: connection)
        self.assertNotIn("private connection detail", str(caught.exception))
        self.assertTrue(connection.rolled_back)
        self.assertTrue(connection.closed)

    def test_invalid_or_serialized_scope_is_not_accepted(self):
        for scope in ({"tenant_id": str(TENANT)}, Scope(PRINCIPAL, "forged")):
            with self.subTest(scope=scope), self.assertRaises(Error):
                scope_module.read_scoped_findings({}, scope, connection_factory=lambda: self.fail("database opened"))

    def test_limit_is_bounded_before_database(self):
        for limit in (True, 0, 1001, "100", 1.5):
            with self.subTest(limit=limit), self.assertRaises(Error):
                scope_module.read_scoped_findings({"limit": limit}, self.scope, connection_factory=lambda: self.fail("database opened"))


if __name__ == "__main__":
    unittest.main()
