"""Offline contracts from actual backend code; no live services or credentials.

AST loading avoids booting FastAPI/PostgreSQL while exercising production
functions and validators. This is not an HTTP integration test suite.
"""
import ast
import datetime
import os
from pathlib import Path
import re
import secrets
import types
import typing
import urllib.request
import urllib.error
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / "apps/api/gds_api/ci_gate.py"


class HTTPException(Exception):
    def __init__(self, status, detail):
        self.status_code = status


def backend():
    tree = ast.parse(SOURCE.read_text())
    nodes = []
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", "").startswith("_") for t in node.targets):
            nodes.append(node)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            node.decorator_list = []
            nodes.append(node)
        elif isinstance(node, ast.ClassDef) and node.name == "GateRequest":
            for method in node.body:
                if isinstance(method, ast.FunctionDef):
                    method.decorator_list = []
                    nodes.append(method)
    ns = dict(os=os, re=re, datetime=datetime, urllib=urllib, _secrets=secrets,
              Optional=typing.Optional, List=typing.List, Header=lambda x: x,
              HTTPException=HTTPException, GateRequest=object)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(SOURCE), "exec"), ns)
    return ns


def text_diff(value="safe", count=1):
    return "\n".join(f"diff --git a/f{i} b/f{i}\n--- a/f{i}\n+++ b/f{i}\n@@ -0,0 +1 @@\n+{value}" for i in range(count))


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.ns = backend()
        self.req = types.SimpleNamespace(repo_full_name="Al-Rabbani/shieldai-platform", commit_sha="a" * 40, github_token="test-only", fail_on_secrets=True, block_on=["critical"], fail_on_new_critical=True, branch="review", pr_number=14)
        self.ns["_github_commit_diff"] = lambda *args: text_diff()
        self.ns["_db_counts"] = lambda repo: dict(critical=0, high=0, medium=0, low=0, new_critical=0)

    def test_301_files_are_counted_and_scanned(self):
        added, files = self.ns["_scan_diff"](text_diff(count=301))
        self.assertEqual((len(added), files), (301, 301))

    def test_added_line_starting_with_plus_is_not_header(self):
        self.assertEqual(self.ns["_scan_diff"](text_diff("++content"))[0], ["++content"])

    def test_binary_diff_is_not_scanned_as_empty_text(self):
        for marker in ("Binary files a/x and b/x differ", "GIT binary patch"):
            with self.subTest(marker=marker), self.assertRaises(ValueError):
                self.ns["_scan_diff"]("diff --git a/x b/x\n" + marker)

    def test_truncated_malformed_or_extra_hunks_are_rejected(self):
        for content in ("<html>login</html>", "diff --git a/x b/x", text_diff().replace("+safe", ""), text_diff() + "\n+extra", text_diff().replace("@@ -0,0 +1 @@", "@@ invalid @@"), "diff --git a/x b/x\n@@ -1 +1 @@\n+only-new"):
            with self.subTest(content=content), self.assertRaises(ValueError):
                self.ns["_scan_diff"](content)

    def test_deleted_only_and_rename_diffs_have_explicit_coverage(self):
        deletion = "diff --git a/x b/x\n--- a/x\n+++ /dev/null\n@@ -1 +0,0 @@\n-old\n\\ No newline at end of file"
        self.assertEqual(self.ns["_scan_diff"](deletion), ([], 1))
        rename = "diff --git a/x b/y\nsimilarity index 100%\nrename from x\nrename to y"
        self.assertEqual(self.ns["_scan_diff"](rename), ([], 1))

    def test_unsupported_diff_returns_integration_error_before_database(self):
        self.ns["_github_commit_diff"] = lambda *args: "diff --git a/x b/x\nGIT binary patch"
        self.ns["_db_counts"] = lambda repo: self.fail("DB accessed before coverage validation")
        result = self.ns["security_gate"](self.req)
        self.assertEqual(result["status"], "integration_error")
        self.assertFalse(result["pass"])

    def test_missing_diff_and_database_fail_closed(self):
        for diff in (None, "", " "):
            self.ns["_github_commit_diff"] = lambda *args, value=diff: value
            self.assertEqual(self.ns["security_gate"](self.req)["status"], "integration_error")
        self.ns["_github_commit_diff"] = lambda *args: text_diff()
        self.ns["_db_counts"] = lambda repo: None
        self.assertEqual(self.ns["security_gate"](self.req)["status"], "integration_error")

    def test_requested_high_policy_blocks(self):
        self.req.block_on = ["high"]
        self.ns["_db_counts"] = lambda repo: dict(critical=0, high=1, medium=0, low=0, new_critical=0)
        self.assertEqual(self.ns["security_gate"](self.req)["verdict"], "blocked")

    def test_severity_validator_normalizes_and_rejects_unknown(self):
        self.assertEqual(self.ns["_block_on_shape"](None, [" HIGH ", "Critical"]), ["high", "critical"])
        with self.assertRaises(ValueError):
            self.ns["_block_on_shape"](None, ["unknown"])

    def test_secret_result_contains_pattern_name_not_value(self):
        # Assemble synthetic patterns at runtime so CI does not see a key literal.
        value = "gh" + "p_" + "A" * 40
        self.ns["_github_commit_diff"] = lambda *args: text_diff(value)
        result = self.ns["security_gate"](self.req)
        self.assertEqual(result["verdict"], "blocked")
        self.assertIn("github_token", str(result))
        self.assertNotIn(value, str(result))

    def test_repository_allowlist_enforced(self):
        self.req.repo_full_name = "other/repository"
        with self.assertRaises(HTTPException) as caught:
            self.ns["security_gate"](self.req)
        self.assertEqual(caught.exception.status_code, 403)

    def test_server_credential_fails_closed(self):
        with patch.dict(os.environ, {"CI_GATE_API_KEY": "test-only-key"}):
            for auth in (None, "Bearer wrong", "Basic wrong"):
                with self.assertRaises(HTTPException) as caught:
                    self.ns["_verify_gate_auth"](auth)
                self.assertEqual(caught.exception.status_code, 401)
            self.ns["_verify_gate_auth"]("Bearer test-only-key")

    def test_http_diff_size_encoding_and_downstream_failures(self):
        ns = backend()
        class Response:
            def __init__(self, content): self.content = content
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit): return self.content[:limit]
        with patch.object(urllib.request, "urlopen") as request:
            for value in (b"x" * (ns["_MAX_DIFF_BYTES"] + 1), b"\xff"):
                request.return_value = Response(value)
                self.assertIsNone(ns["_github_commit_diff"]("Al-Rabbani/shieldai-platform", "a" * 40, "test-only"))
            request.side_effect = urllib.error.URLError("test unavailable")
            self.assertIsNone(ns["_github_commit_diff"]("Al-Rabbani/shieldai-platform", "a" * 40, "test-only"))
            request.side_effect = urllib.error.HTTPError("https://api.github.com", 401, "test", {}, None)
            with self.assertRaises(HTTPException):
                ns["_github_commit_diff"]("Al-Rabbani/shieldai-platform", "a" * 40, "test-only")

    def test_case_normalized_queries_and_connection_close(self):
        queries = []
        class Cursor:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def execute(self, sql, values): queries.append(sql)
            def fetchall(self): return [("critical", 1), ("high", 2)]
            def fetchone(self): return (1,)
        class Connection:
            closed = False
            def cursor(self): return Cursor()
            def close(self): self.closed = True
        connection = Connection()
        ns = backend()
        ns["psycopg2"] = types.SimpleNamespace(connect=lambda *args, **kwargs: connection)
        with patch.dict(os.environ, {"DATABASE_URL": "test-only-dsn"}):
            result = ns["_db_counts"]("Al-Rabbani/shieldai-platform")
        self.assertEqual((result["critical"], result["high"]), (1, 2))
        self.assertTrue(all("LOWER(severity)" in query for query in queries))
        self.assertTrue(connection.closed)

    def test_handler_uses_sync_threadpool_contract(self):
        node = next(n for n in ast.parse(SOURCE.read_text()).body if getattr(n, "name", None) == "security_gate")
        self.assertIsInstance(node, ast.FunctionDef)


if __name__ == "__main__":
    unittest.main()
