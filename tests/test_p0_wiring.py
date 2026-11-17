"""Offline tests for the P0 jobs and the compliance read API.

Each of these covers a decision the job makes about real data, because the failure that
matters here is not a crash: it is labelling a finding resolved when it is not, deleting a
vector another tenant still uses, or reporting a compliance score the schema cannot support.
"""
import ast
import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(path: str, name: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


prune = load("scripts/ops/qdrant_prune.py", "qdrant_prune")
enrich = load("apps/api/enrich_findings.py", "enrich_findings")
reconcile = load("apps/api/reconcile_findings.py", "reconcile_findings")


class VectorPruneTests(unittest.TestCase):
    def test_only_pointed_at_vectors_are_kept(self):
        keep = prune.referenced_point_ids(["a", None, "", "b"])
        self.assertEqual(keep, {"a", "b"})

    def test_missing_reference_never_counts_as_a_reason_to_keep(self):
        # A document with no vector is not a licence to keep an unreferenced point.
        self.assertEqual(prune.referenced_point_ids([None, None]), set())


class EnrichmentTests(unittest.TestCase):
    def test_cve_prefers_the_direct_field(self):
        self.assertEqual(enrich.extract_cve({"cve": "CVE-2024-23342"}), "CVE-2024-23342")

    def test_cve_falls_back_to_aliases_and_ignores_ghsa(self):
        self.assertEqual(enrich.extract_cve({"aliases": ["GHSA-x", "CVE-2026-1234"]}), "CVE-2026-1234")

    def test_no_cve_is_never_invented(self):
        self.assertIsNone(enrich.extract_cve({"aliases": ["GHSA-only"], "package": "mcp"}))
        self.assertIsNone(enrich.extract_cve(None))

    def test_kev_ids_uppercases_and_skips_garbage(self):
        payload = {"vulnerabilities": [{"cveID": "cve-2024-1"}, {"nope": 1}, {"cveID": "CVE-2024-2"}]}
        self.assertEqual(enrich.kev_ids(payload), {"CVE-2024-1", "CVE-2024-2"})


class ReconciliationTests(unittest.TestCase):
    def test_requirement_parsing(self):
        self.assertEqual(reconcile.parse_requirement("mcp==1.23.3"), ("mcp", "1.23.3"))
        self.assertIsNone(reconcile.parse_requirement("mcp>=1.0"))
        self.assertIsNone(reconcile.parse_requirement(""))

    def test_header_detection_requires_a_missing_style_title(self):
        self.assertEqual(reconcile.header_target("Missing Content-Security-Policy header"), "Content-Security-Policy")
        self.assertEqual(reconcile.header_target("Weak HSTS max-age"), "Strict-Transport-Security")
        self.assertIsNone(reconcile.header_target("Server banner discloses nginx version"))

    def test_age_is_timezone_safe(self):
        now = datetime(2026, 11, 17, tzinfo=timezone.utc)
        self.assertEqual(reconcile.age_days(now - timedelta(days=108), now), 108)
        naive = datetime(2026, 11, 7)
        self.assertEqual(reconcile.age_days(naive, now), 10)
        self.assertIsNone(reconcile.age_days(None, now))

    def test_still_present_is_reported_when_osv_query_fails(self):
        # An unreachable feed must never read as "resolved".
        original = reconcile.osv_advisories
        reconcile.osv_advisories = lambda pkg, ver: None
        try:
            verdict = reconcile.dependency_verdict("mcp==1.23.3", {"id": "GHSA-aaaa"})
            self.assertEqual(verdict[0], "unverifiable")
        finally:
            reconcile.osv_advisories = original


class ComplianceApiTests(unittest.TestCase):
    def source(self):
        return (ROOT / "apps/api/gds_api/compliance_api.py").read_text()

    def test_score_excludes_untested_controls(self):
        ns = {}
        tree = ast.parse(self.source())
        fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "score_of")
        exec(compile(ast.Module(body=[fn], type_ignores=[]), "compliance_api", "exec"), ns)
        self.assertEqual(ns["score_of"](3, 1), 75.0)
        self.assertEqual(ns["score_of"](0, 0), 0.0)

    def test_every_endpoint_requires_an_authenticated_user(self):
        tree = ast.parse(self.source())
        routes = [n for n in tree.body
                  if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.decorator_list]
        self.assertTrue(routes)
        for route in routes:
            args = [a.arg for a in route.args.args]
            self.assertIn("user", args, f"{route.name} has no authenticated user")

    def test_responses_state_that_compliance_is_not_tenant_partitioned(self):
        self.assertIn("tenant_scoped", self.source())
        self.assertIn("TENANT_SCOPE_NOTE", self.source())

    def test_router_is_registered_in_the_app(self):
        main = (ROOT / "apps/api/gds_api/main.py").read_text()
        self.assertIn("compliance_api.router", main)


if __name__ == "__main__":
    unittest.main()
