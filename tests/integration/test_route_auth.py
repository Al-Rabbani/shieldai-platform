"""Real FastAPI dependency-resolution tests, with fixture identity/data providers.

Loads the actual marketplace stats handler without importing the full service stack.
This verifies HTTP dependency wiring and tenant forwarding, not JWT or database RLS.
"""
import ast
from dataclasses import dataclass
from pathlib import Path
from typing import Any
import unittest

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2] / 'apps/api/gds_api'
MODULES = ('ai_security', 'attack_graph', 'autofix', 'digital_twin', 'marketplace', 'redteam_sim')


@dataclass
class FixtureUser:
    tenant_id: str


class RouteDependencyTests(unittest.TestCase):
    def test_all_affected_routes_use_authenticated_resolver(self):
        checked = 0
        for module in MODULES:
            tree = ast.parse((ROOT / module / 'routes.py').read_text())
            for node in tree.body:
                if not isinstance(node, ast.AsyncFunctionDef):
                    continue
                for arg, default in zip(node.args.args[-len(node.args.defaults):], node.args.defaults):
                    if arg.arg != 'user':
                        continue
                    with self.subTest(module=module, route=node.name):
                        self.assertIsInstance(default, ast.Call)
                        self.assertEqual(ast.unparse(default), 'Depends(get_current_user)')
                    checked += 1
        self.assertEqual(checked, 56)

    def setUp(self):
        self.calls = []
        router = APIRouter(prefix='/marketplace')
        async def get_db():
            return object()
        async def get_current_user(request: Request):
            tenant = {'fixture-a': 'tenant-a', 'fixture-b': 'tenant-b'}.get(
                request.cookies.get('fixture_session'))
            if tenant is None:
                raise HTTPException(401, 'Not authenticated')
            return FixtureUser(tenant)
        async def stats(db, tenant_id):
            self.calls.append(tenant_id)
            return {'tenant_id': tenant_id}
        tree = ast.parse((ROOT / 'marketplace/routes.py').read_text())
        handler = next(n for n in tree.body if getattr(n, 'name', '') == 'api_marketplace_stats')
        namespace = dict(router=router, Depends=Depends, get_db=get_db,
                         get_current_user=get_current_user, CurrentUser=FixtureUser,
                         AsyncSession=object, Any=Any, get_marketplace_stats=stats)
        exec(compile(ast.Module(body=[handler], type_ignores=[]), 'marketplace/routes.py', 'exec'), namespace)
        self.app = FastAPI()
        self.app.include_router(router)

    def test_missing_or_invalid_session_never_reaches_data_provider(self):
        with TestClient(self.app) as client:
            for headers in ({}, {'Cookie': 'fixture_session=invalid'}):
                response = client.get('/marketplace/stats', headers=headers)
                self.assertEqual(response.status_code, 401)
        self.assertEqual(self.calls, [])

    def test_each_authenticated_tenant_reaches_stats_without_function_default(self):
        with TestClient(self.app) as client:
            for session, tenant in [('fixture-a', 'tenant-a'), ('fixture-b', 'tenant-b')]:
                response = client.get('/marketplace/stats', headers={'Cookie': f'fixture_session={session}'})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {'tenant_id': tenant})
        self.assertEqual(self.calls, ['tenant-a', 'tenant-b'])

    def test_query_cannot_substitute_authenticated_tenant(self):
        with TestClient(self.app) as client:
            response = client.get('/marketplace/stats?tenant_id=tenant-b&user=forged',
                                  headers={'Cookie': 'fixture_session=fixture-a'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.calls, ['tenant-a'])
