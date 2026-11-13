"""Health contracts against extracted production functions; no live services."""
from dataclasses import dataclass
import sys
import time
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from test_runtime_boundaries import load_nodes


class TemporalHealthTests(unittest.IsolatedAsyncioTestCase):
    async def probe(self, *, serving=True, connection_error=None):
        check_health = AsyncMock(return_value=serving)
        connect = AsyncMock(
            return_value=SimpleNamespace(service_client=SimpleNamespace(check_health=check_health)),
            side_effect=connection_error,
        )
        module = ModuleType('gds_api.temporal_client')
        module.get_temporal_client = connect
        ns = load_nodes('gds_api/health.py', ['_check_temporal'])
        with patch.dict(sys.modules, {'gds_api.temporal_client': module}):
            result = await ns['_check_temporal']()
        connect.assert_awaited_once()
        check_health.assert_awaited_once_with()
        return result

    async def test_serving_is_protocol_checked_and_does_not_certify_workers(self):
        self.assertIn('worker execution unverified', await self.probe())

    async def test_open_socket_with_nonserving_service_is_not_healthy(self):
        with self.assertRaises(RuntimeError):
            await self.probe(serving=False)

    async def test_connection_failure_is_not_swallowed(self):
        with self.assertRaises(ConnectionError):
            await self.probe(connection_error=ConnectionError('reset'))

    async def test_public_health_does_not_leak_driver_credentials(self):
        # The function annotations require the real typing protocols.
        from collections.abc import Awaitable, Callable
        ns = load_nodes('gds_api/health.py', ['ServiceHealth', '_timed'], {
            'dataclass': dataclass, 'time': time,
            'Callable': Callable, 'Awaitable': Awaitable,
        })
        async def failing():
            raise RuntimeError('postgres://user:private-password@host/db')
        result = await ns['_timed']('postgres', failing)
        self.assertEqual(result.status, 'unhealthy')
        self.assertEqual(result.detail, 'RuntimeError: service check failed')

