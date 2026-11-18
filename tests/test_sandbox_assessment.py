"""The bridge canary must execute only through a dedicated, governed sandbox identity."""

import os
import uuid
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from gds_api.bridge import super_agent_bridge as bridge
from gds_api.reasoning import governed_tools
from gds_api import db as database
from gds_api import tenant_binding


TENANT = "11111111-1111-4111-8111-111111111111"
PRINCIPAL = "22222222-2222-4222-8222-222222222222"
MISSION = uuid.UUID("33333333-3333-4333-8333-333333333333")


class SessionContext:
    def __init__(self, session):
        self.session = session

    async def __aenter__(self):
        return self.session

    async def __aexit__(self, *_):
        return False


class SandboxAssessmentTests(unittest.IsolatedAsyncioTestCase):
    async def test_customer_tenant_cannot_be_used_as_sandbox(self):
        db = SimpleNamespace(get=AsyncMock(side_effect=[
            SimpleNamespace(id=uuid.UUID(TENANT), slug="customer-tenant"),
            SimpleNamespace(tenant_id=uuid.UUID(TENANT), is_active=True),
        ]))
        with patch.object(database, "async_session_factory", return_value=SessionContext(db)), patch.object(
            tenant_binding, "bind_tenant", AsyncMock()
        ):
            with self.assertRaises(HTTPException) as raised:
                await bridge._assert_sandbox_principal(TENANT, PRINCIPAL)
        self.assertEqual(raised.exception.status_code, 503)

    async def test_sandbox_marker_and_principal_are_checked(self):
        db = SimpleNamespace(get=AsyncMock(side_effect=[
            SimpleNamespace(id=uuid.UUID(TENANT), slug="gds-assessment-sandbox"),
            SimpleNamespace(tenant_id=uuid.UUID(TENANT), is_active=True),
        ]))
        with patch.object(database, "async_session_factory", return_value=SessionContext(db)), patch.object(
            tenant_binding, "bind_tenant", AsyncMock()
        ) as bound:
            await bridge._assert_sandbox_principal(TENANT, PRINCIPAL)
        bound.assert_awaited_once_with(db, TENANT)

    async def test_bridge_key_is_required_before_assessment(self):
        with patch.object(bridge, "BRIDGE_API_KEY", "secret"):
            with self.assertRaises(HTTPException) as raised:
                await bridge.assess_platform_health(authorization=None)
        self.assertEqual(raised.exception.status_code, 401)

    async def test_unconfigured_or_platform_tenant_fails_closed(self):
        with patch.object(bridge, "BRIDGE_API_KEY", "secret"):
            with patch.dict(os.environ, {"GDS_ASSESSMENT_TENANT_ID": "", "GDS_ASSESSMENT_PRINCIPAL_ID": ""}):
                with self.assertRaises(HTTPException) as raised:
                    await bridge.assess_platform_health(authorization="Bearer secret")
                self.assertEqual(raised.exception.status_code, 503)
            with patch.dict(os.environ, {
                "GDS_ASSESSMENT_TENANT_ID": TENANT,
                "GDS_ASSESSMENT_PRINCIPAL_ID": PRINCIPAL,
                "SECURITY_SERVICE_TENANT_ID": TENANT,
            }):
                with self.assertRaises(HTTPException) as raised:
                    await bridge.assess_platform_health(authorization="Bearer secret")
                self.assertEqual(raised.exception.status_code, 503)

    async def test_governed_receipt_and_mission_outcome(self):
        opened = AsyncMock(return_value=MISSION)
        executed = AsyncMock(return_value={"success": True, "status": {"status": "ready"}})
        closed = AsyncMock(return_value=True)
        with patch.object(bridge, "BRIDGE_API_KEY", "secret"), patch.object(
            bridge, "_assert_sandbox_principal", AsyncMock()
        ), patch.dict(os.environ, {
            "GDS_ASSESSMENT_TENANT_ID": TENANT,
            "GDS_ASSESSMENT_PRINCIPAL_ID": PRINCIPAL,
            "SECURITY_SERVICE_TENANT_ID": "44444444-4444-4444-8444-444444444444",
        }), patch.object(governed_tools, "open_reasoning_mission", opened), patch.object(
            governed_tools, "execute_governed_tool", executed
        ), patch.object(governed_tools, "set_mission_outcome", closed):
            receipt = await bridge.assess_platform_health(authorization="Bearer secret")

        self.assertEqual(receipt["verification_status"], "tool_executed")
        self.assertEqual(receipt["mission_id"], str(MISSION))
        self.assertEqual(executed.await_args.kwargs["tool_name"], "check_platform_health")
        self.assertEqual(executed.await_args.kwargs["agent_id"], "platform_operations")
        self.assertEqual(executed.await_args.kwargs["tenant_id"], TENANT)
        self.assertEqual(executed.await_args.kwargs["user_id"], PRINCIPAL)
        self.assertEqual(executed.await_args.kwargs["args"], {})
        self.assertTrue(closed.await_args.kwargs["success"])

    async def test_denial_is_not_a_verified_tool_receipt(self):
        opened = AsyncMock(return_value=MISSION)
        executed = AsyncMock(return_value={"success": False, "code": "DENY", "execution_mode": "not_executed"})
        closed = AsyncMock(return_value=True)
        with patch.object(bridge, "BRIDGE_API_KEY", "secret"), patch.object(
            bridge, "_assert_sandbox_principal", AsyncMock()
        ), patch.dict(os.environ, {
            "GDS_ASSESSMENT_TENANT_ID": TENANT,
            "GDS_ASSESSMENT_PRINCIPAL_ID": PRINCIPAL,
            "SECURITY_SERVICE_TENANT_ID": "44444444-4444-4444-8444-444444444444",
        }), patch.object(governed_tools, "open_reasoning_mission", opened), patch.object(
            governed_tools, "execute_governed_tool", executed
        ), patch.object(governed_tools, "set_mission_outcome", closed):
            receipt = await bridge.assess_platform_health(authorization="Bearer secret")

        self.assertEqual(receipt["verification_status"], "not_verified")
        self.assertFalse(closed.await_args.kwargs["success"])


if __name__ == "__main__":
    unittest.main()
