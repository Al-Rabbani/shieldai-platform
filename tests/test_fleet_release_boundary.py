"""Provenance and auto-fix must fail closed without a governed workspace."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from gds_api.bridge import super_agent_bridge as bridge
from gds_api import tool_actions


class FleetReleaseBoundaryTests(unittest.IsolatedAsyncioTestCase):
    async def test_autofix_does_not_checkout_or_commit_registered_repository(self):
        with patch.object(tool_actions, "async_session_factory", side_effect=AssertionError("DB touched")), \
                patch.object(tool_actions, "subprocess", create=True) as subprocess:
            result = await tool_actions.autofix_finding(42)
        self.assertFalse(result["success"])
        self.assertEqual(result["code"], "GOVERNED_ENGINEERING_REQUIRED")
        subprocess.run.assert_not_called()

    def test_diagnostics_reads_release_stamp_and_rejects_invalid_sha(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "RELEASE"
            path.write_text(json.dumps({"sha": "a" * 40}))
            with patch.object(bridge, "RELEASE_PATH", str(path)), \
                    patch.dict("os.environ", {"GDS_RELEASE_SHA": ""}):
                self.assertEqual(bridge._release_sha(), "a" * 40)
                path.write_text(json.dumps({"sha": "not-a-commit"}))
                self.assertIsNone(bridge._release_sha())


if __name__ == "__main__":
    unittest.main()
