"""The assessment allowlist cannot drift into writes, scans or false receipts."""
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from gds_api.bridge import super_agent_bridge as bridge
from gds_api.bridge.fleet_assessment import (MISSION_CONTRACTS, READ_ONLY_CASES,
                                             assessment_plan, outcome_verified, verified_case)
from gds_api import platform_data
from gds_api.capabilities.definitions import RiskClass, SideEffectType
from gds_api.capabilities.catalog import CAPABILITY_REGISTRY
from gds_api.agents.registry import AGENT_REGISTRY


class FleetAssessmentTests(unittest.IsolatedAsyncioTestCase):
    def test_all_cases_are_unique_r0_none_and_registered(self):
        self.assertEqual(len(AGENT_REGISTRY), 23)
        self.assertEqual(len(READ_ONLY_CASES), 11)
        for agent_id, case in READ_ONLY_CASES.items():
            with self.subTest(agent_id=agent_id):
                self.assertEqual(verified_case(agent_id), case)
                matches = [c for c in CAPABILITY_REGISTRY.values() if case.tool in c.required_tool_ids]
                self.assertEqual(len(matches), 1)
                self.assertEqual(matches[0].risk_class, RiskClass.R0)
                self.assertEqual(matches[0].side_effect_type, SideEffectType.NONE)

    def test_degraded_agents_are_not_promoted_by_assessment(self):
        for agent_id in ("validation_retest", "defensive_remediation_autofix", "penetration_testing_coordinator"):
            self.assertIsNone(verified_case(agent_id))
            row = next(r for r in assessment_plan() if r["agent_id"] == agent_id)
            self.assertEqual(row["assessment_status"], "not_executed")
        self.assertEqual(len(assessment_plan()), 23)
        self.assertEqual(set(MISSION_CONTRACTS), set(AGENT_REGISTRY))
        for row in assessment_plan():
            self.assertTrue(row["mission"] and row["outcome_check"] and row["required_fixture"])

    async def test_identity_inventory_is_observed_but_not_graded(self):
        values = {"users": 2, "active_users": 1, "roles": 2, "ciem_findings": 0,
                  "sessions": 3, "current_sessions": 1, "users_without_tenant_role": 0}
        fetch = AsyncMock(side_effect=[[values], [{"column_name": "id"}]])
        with patch.object(platform_data, "_tenant_or_raise", return_value="sandbox"), \
                patch.object(platform_data, "_fetch", fetch):
            result = await platform_data.identity_posture()
        self.assertTrue(outcome_verified("identity_access_management", result))
        self.assertEqual(result["grade"], None)
        self.assertIn("user MFA enrollment", result["unmeasured_controls"])
        self.assertEqual(result["checks"]["current_sessions"], 1)
        self.assertIn("roles WHERE tenant_id = :tid", fetch.call_args_list[0].args[0])
        self.assertFalse(outcome_verified("identity_access_management", {"success": True}))

    def test_all_read_only_results_require_structural_outcome_evidence(self):
        valid = {
            "knowledge_memory": {"results": [], "count": 0},
            "data_intelligence": {"tenant_scoped": True, "missions": {}, "model_usage": {}},
            "automation_workflow": {"approvals": [], "count": 0},
            "platform_operations": {"status": {"status": "ready"}},
            "executive_advisor": {"missions": [], "count": 0},
            "blue_team": {"tenant_scoped": True, "findings": [], "returned": 0, "total_open": 0},
            "incident_response": {"incidents": [], "count": 0},
            "security_architecture": {"tables_total": 1, "tenant_tables_without_rls_list": []},
            "compliance_grc": {"tenant_scoped": False, "frameworks": [], "total_controls": 0,
                               "tenant_scoped_note": "platform-wide"},
            "risk_business_intelligence": {"tenant_scoped": True, "inputs": {},
                                           "exposure_score": 100},
        }
        for agent_id, fields in valid.items():
            with self.subTest(agent_id=agent_id):
                result = {"success": True, "tool": READ_ONLY_CASES[agent_id].tool, **fields}
                self.assertTrue(outcome_verified(agent_id, result))
                self.assertFalse(outcome_verified(agent_id, {"success": True, "tool": result["tool"]}))
                self.assertFalse(outcome_verified(agent_id, {**result, "tool": "wrong_tool"}))
                self.assertFalse(outcome_verified(agent_id, {**result, "success": False}))

    async def test_auth_precedes_case_lookup_and_no_case_dispatches(self):
        with patch.object(bridge, "BRIDGE_API_KEY", "secret"):
            with self.assertRaises(HTTPException) as e:
                await bridge.assess_registered_agent("platform_operations", authorization=None)
            self.assertEqual(e.exception.status_code, 401)
            with self.assertRaises(HTTPException) as e:
                await bridge.assess_registered_agent("penetration_testing_coordinator", authorization="Bearer secret")
            self.assertEqual(e.exception.status_code, 409)


if __name__ == "__main__":
    unittest.main()
