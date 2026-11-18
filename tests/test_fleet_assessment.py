"""The assessment allowlist cannot drift into writes, scans or false receipts."""
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from gds_api.bridge import super_agent_bridge as bridge
from gds_api.bridge.fleet_assessment import READ_ONLY_CASES, assessment_plan, verified_case
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
