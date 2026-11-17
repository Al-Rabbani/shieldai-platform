"""Tests for the P1 cloud-wiring decisions.

Each case pins a decision that was wrong once, against real data shapes, so the defect cannot
return silently:

  * a governed execution whose stored parameters are redacted must still be allowed when the
    real values are supplied (it was denied by exact equality, which killed every parametrized
    tool call);
  * discovered asset metadata must be JSON-serialisable on the way in (datetimes are common in
    provider payloads, and the flush used to fail with "Object of type datetime is not JSON
    serializable");
  * both new capability tools must actually be registered, because the capability broker looks
    them up by name and a missing name surfaces as a bare 500.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from gds_api.cloud.assets import _bounded_metadata
from gds_api.tool_gateway import TOOL_REGISTRY, _parameters_match_redacted


class TestRedactedParameterMatching:
    def test_redacted_value_is_a_wildcard(self):
        assert _parameters_match_redacted(
            {"environment_id": "[REDACTED]", "discovery_categories": []},
            {"environment_id": "1e5302e4-bad4-4e0f-84e5-267525642411", "discovery_categories": []},
        )

    def test_unredacted_values_still_must_match(self):
        assert not _parameters_match_redacted(
            {"environment_id": "[REDACTED]", "limit": 10},
            {"environment_id": "abc", "limit": 999},
        )

    def test_missing_or_extra_key_is_a_mismatch(self):
        assert not _parameters_match_redacted(
            {"environment_id": "[REDACTED]"}, {"environment_id": "abc", "limit": 10}
        )
        assert not _parameters_match_redacted(
            {"environment_id": "[REDACTED]", "limit": 10}, {"environment_id": "abc"}
        )

    def test_a_different_real_target_is_not_authorised(self):
        # The binding must still refuse a run against an environment nobody authorised.
        assert not _parameters_match_redacted(
            {"environment_id": "11111111-1111-1111-1111-111111111111"},
            {"environment_id": "22222222-2222-2222-2222-222222222222"},
        )


class TestAssetMetadataSerialisation:
    def test_datetime_metadata_becomes_a_string(self):
        out = _bounded_metadata({"created": datetime(2026, 11, 17, tzinfo=timezone.utc), "name": "x"})
        assert isinstance(out["created"], str)
        assert out["name"] == "x"

    def test_output_is_json_ready(self):
        import json

        out = _bounded_metadata({"nested": {"created": datetime.now(timezone.utc)}})
        json.dumps(out)  # must not raise: this is what the JSONB flush does

    def test_sensitive_keys_are_still_redacted(self):
        out = _bounded_metadata({"secret_access_key": "AKIA", "name": "x"})
        assert "secret_access_key" not in out


class TestNewCloudToolsAreRegistered:
    @pytest.mark.parametrize("tool", ["discover_cloud_environment", "evaluate_cloud_posture"])
    def test_tool_registered(self, tool):
        assert tool in TOOL_REGISTRY, f"{tool} missing: the capability broker will 500"

    def test_runners_import_cleanly(self):
        from gds_api.cloud.discovery_runner import run_discovery
        from gds_api.cloud.posture.evaluation_runner import run_evaluation

        assert callable(run_discovery) and callable(run_evaluation)
