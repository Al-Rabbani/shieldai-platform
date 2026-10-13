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


# ---------------------------------------------------------------------------
# Phase C wiring tests — service scope, scoped missions, counts, bindings
# ---------------------------------------------------------------------------

class PhaseCFakeCursor:
    description = [('tenant_id',), ('repository_binding_id',), ('mission_id',), ('goal',), ('status',), ('completed_at',)]
    def __init__(self, connection): self.connection = connection
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def execute(self, query, values=None):
        if self.connection.fail_query:
            raise RuntimeError("private connection detail should not escape")
        self.connection.last_query = query
        self.connection.queries.append((query, values))
    def fetchone(self):
        q = self.connection.last_query
        if "FROM pg_roles WHERE" in q:
            return ("test_runtime", False, False, False)
        if "FROM pg_class" in q:
            return (4, True, False)
        if "FROM security_repository_bindings" in q:
            if self.connection.binding_row is None:
                return None
            return self.connection.binding_row
        if "RETURNING mission_id" in q:
            return ("mission-1",)
        if "SELECT COUNT(*) FROM security_findings" in q:
            return (self.connection.total_findings,)
        if "SELECT * FROM mission_results" in q:
            return self.connection.mission_row
        return None
    def fetchall(self):
        q = self.connection.last_query
        if "GROUP BY 1" in q:
            return list(self.connection.severity_rows)
        return []


class PhaseCFakeConnection:
    autocommit = False
    def __init__(self):
        self.queries = []
        self.last_query = ""
        self.fail_query = False
        self.binding_row = (str(scope_module.UUID(int=3)), "al-rabbani/shieldai-platform", "active")
        self.total_findings = 2
        self.severity_rows = [("critical", 2)]
        self.mission_row = None
    def __enter__(self): return self
    def __exit__(self, kind, value, traceback): return kind is None
    def cursor(self): return PhaseCFakeCursor(self)
    def close(self): pass


SCOPE_ENV = {
    "SECURITY_SERVICE_PRINCIPAL_ID": str(PRINCIPAL),
    "SECURITY_SERVICE_TENANT_ID": str(TENANT),
    "SECURITY_RUNTIME_ROLE": "test_runtime",
    "SECURITY_DATABASE_URL": "postgresql://test/test",
}
GOOD_SCOPE = Scope(PRINCIPAL, TENANT)


class ResolveServiceScopeTests(unittest.TestCase):
    def test_fail_closed_when_unconfigured(self):
        with patch.dict(os.environ, {}, clear=False):
            for key in ("SECURITY_SERVICE_PRINCIPAL_ID", "SECURITY_SERVICE_TENANT_ID"):
                os.environ.pop(key, None)
            self.assertFalse(scope_module.service_scope_configured())
            with self.assertRaises(Error):
                scope_module.resolve_service_scope()

    def test_fail_closed_on_malformed(self):
        with patch.dict(os.environ, {**SCOPE_ENV, "SECURITY_SERVICE_TENANT_ID": "not-a-uuid"}):
            with self.assertRaises(Error):
                scope_module.resolve_service_scope()

    def test_resolves_without_repository(self):
        with patch.dict(os.environ, SCOPE_ENV):
            scope = scope_module.resolve_service_scope()
            self.assertEqual(scope.principal_id, PRINCIPAL)
            self.assertEqual(scope.tenant_id, TENANT)
            self.assertIsNone(scope.repository_binding_id)

    def test_resolves_with_repository(self):
        env = dict(SCOPE_ENV, SECURITY_SERVICE_REPOSITORY_BINDING_ID=str(REPOSITORY))
        with patch.dict(os.environ, env):
            scope = scope_module.resolve_service_scope()
            self.assertEqual(scope.repository_binding_id, REPOSITORY)


class ScopedMissionTests(unittest.TestCase):
    def setUp(self):
        self._env = patch.dict(os.environ, SCOPE_ENV)
        self._env.start()
        self.addCleanup(self._env.stop)

    _UNSET = object()

    def persist(self, conn, data=None, scope=_UNSET):
        data = data or {"mission_id": "mission-1", "goal": "g", "status": "completed"}
        if scope is self._UNSET:
            scope = GOOD_SCOPE
        return scope_module.scoped_mission_persist(
            data, scope, connection_factory=lambda: conn)

    def test_persist_inserts_explicit_identity(self):
        conn = PhaseCFakeConnection()
        result = self.persist(conn)
        self.assertTrue(result["success"])
        insert = [q for q, v in conn.queries if "INSERT INTO mission_results" in q][0]
        values = [v for q, v in conn.queries if "INSERT INTO mission_results" in q][0]
        self.assertIn("tenant_id", insert)
        self.assertIn("repository_binding_id", insert)
        self.assertEqual(values[0], str(TENANT))
        self.assertIn("ON CONFLICT (mission_id)", insert)

    def test_persist_rejects_reserved_identity(self):
        conn = PhaseCFakeConnection()
        with patch.dict(os.environ, SCOPE_ENV):
            with self.assertRaises(Error):
                self.persist(conn, data={"mission_id": "m", "tenant_id": str(TENANT)})

    def test_persist_rejects_bad_metrics(self):
        conn = PhaseCFakeConnection()
        with self.assertRaises(Error):
            self.persist(conn, data={"mission_id": "m", "total_agents": "many"})

    def test_persist_requires_scope(self):
        conn = PhaseCFakeConnection()
        with self.assertRaises(Error):
            self.persist(conn, scope=None)

    def test_load_returns_row(self):
        conn = PhaseCFakeConnection()
        conn.mission_row = (str(TENANT), None, "mission-1", "goal", "completed")
        with patch.dict(os.environ, SCOPE_ENV):
            data = scope_module.scoped_mission_load(
                "mission-1", GOOD_SCOPE, connection_factory=lambda: conn)
        self.assertEqual(data["mission_id"], "mission-1")

    def test_load_missing_returns_none(self):
        conn = PhaseCFakeConnection()
        conn.mission_row = None
        data = scope_module.scoped_mission_load(
            "mission-1", GOOD_SCOPE, connection_factory=lambda: conn)
        self.assertIsNone(data)


class ScopedFindingCountsTests(unittest.TestCase):
    def setUp(self):
        self._env = patch.dict(os.environ, SCOPE_ENV)
        self._env.start()
        self.addCleanup(self._env.stop)

    def test_counts_scoped_to_exact_binding(self):
        conn = PhaseCFakeConnection()
        result = scope_module.scoped_finding_counts(
            GOOD_SCOPE, repository_binding_id=REPOSITORY,
            connection_factory=lambda: conn)
        self.assertEqual(result["total"], 2)
        self.assertEqual(result["by_severity"]["critical"], 2)
        grouped = [q for q, v in conn.queries if "GROUP BY 1" in q][0]
        self.assertIn("repository_binding_id = %s", grouped)
        self.assertNotIn("ILIKE", grouped)

    def test_counts_rejects_non_uuid_binding(self):
        conn = PhaseCFakeConnection()
        with self.assertRaises(Error):
            scope_module.scoped_finding_counts(
                GOOD_SCOPE, repository_binding_id="shieldai",
                connection_factory=lambda: conn)


class RepositoryBindingTests(unittest.TestCase):
    def setUp(self):
        self._env = patch.dict(os.environ, SCOPE_ENV)
        self._env.start()
        self.addCleanup(self._env.stop)

    def resolve(self, conn, repo_id=1273433852, name="Al-Rabbani/shieldai-platform"):
        return scope_module.resolve_repository_binding(
            GOOD_SCOPE, provider="github", provider_repository_id=repo_id,
            provider_full_name=name, connection_factory=lambda: conn)

    def test_resolves_by_immutable_id_and_name(self):
        conn = PhaseCFakeConnection()
        binding = self.resolve(conn)
        self.assertEqual(binding, REPOSITORY)

    def test_unknown_id_fails_closed(self):
        conn = PhaseCFakeConnection()
        conn.binding_row = None
        with self.assertRaises(Error):
            self.resolve(conn)

    def test_name_mismatch_fails_closed(self):
        conn = PhaseCFakeConnection()
        with self.assertRaises(Error):
            self.resolve(conn, name="other/repo")

    def test_inactive_fails_closed(self):
        conn = PhaseCFakeConnection()
        conn.binding_row = (str(REPOSITORY), "al-rabbani/shieldai-platform", "revoked")
        with self.assertRaises(Error):
            self.resolve(conn)

    def test_bad_provider_fails_closed(self):
        conn = PhaseCFakeConnection()
        with self.assertRaises(Error):
            scope_module.resolve_repository_binding(
                GOOD_SCOPE, provider="gitlab", provider_repository_id=1,
                provider_full_name="a/b", connection_factory=lambda: conn)

    def test_bad_repo_id_fails_closed(self):
        conn = PhaseCFakeConnection()
        with self.assertRaises(Error):
            self.resolve(conn, repo_id=0)
