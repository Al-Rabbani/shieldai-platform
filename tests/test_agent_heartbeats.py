"""Heartbeat acceptance rules and status derivation.

The point of these tests is that "online" can only ever come from a fresh, verified heartbeat, and
that absence of evidence is "unknown" rather than a default.
"""
from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta

import pytest

from gds_api import agent_heartbeats as hb

KEY = "test-heartbeat-master-key"
TENANT = str(uuid.uuid4())


@pytest.fixture(autouse=True)
def _key(monkeypatch):
    monkeypatch.setenv(hb.SIGNING_KEY_ENV, KEY)


def _payload(**over):
    base = {
        "agent_id": "vulnerability_management",
        "tenant_id": TENANT,
        "worker_id": "worker-1",
        "release_sha": "20afde1",
        "observed_at": datetime.now(UTC).isoformat(),
        "health_signal": "ok",
        "task_ref": None,
        "nonce": str(uuid.uuid4()),
    }
    base.update(over)
    return base


def test_status_requires_a_heartbeat_before_it_can_say_online():
    unknown = hb.derive_status(age_seconds=None, health_signal=None, executed_receipts=0)
    assert unknown["state"] == "unknown"
    assert unknown["capable"] is False


@pytest.mark.parametrize(
    "age,health,receipts,expected",
    [
        (10, "ok", 3, "online"),
        (400, "ok", 3, "idle"),
        (5000, "ok", 3, "offline"),
        (10, "degraded", 3, "degraded"),
        (10, "ok", 0, "degraded"),
    ],
)
def test_state_mapping_uses_the_stated_thresholds(age, health, receipts, expected):
    assert hb.derive_status(age_seconds=age, health_signal=health, executed_receipts=receipts)["state"] == expected


def test_capable_is_never_implied_by_online():
    online = hb.derive_status(age_seconds=5, health_signal="ok", executed_receipts=0)
    assert online["state"] == "degraded"
    assert online["capable"] is False
    proven = hb.derive_status(age_seconds=5, health_signal="ok", executed_receipts=1)
    assert proven["capable"] is True


def test_signature_round_trip_and_tamper_rejection():
    payload = _payload()
    signature = hb.sign(payload, hb.tenant_key(TENANT, KEY))
    hb.verify(payload, signature, hb.tenant_key(TENANT, KEY))
    with pytest.raises(hb.HeartbeatRejected) as caught:
        hb.verify({**payload, "health_signal": "degraded"}, signature, hb.tenant_key(TENANT, KEY))
    assert caught.value.code == "BAD_SIGNATURE"


def test_a_heartbeat_signed_for_one_tenant_cannot_be_used_for_another():
    payload = _payload()
    other_tenant = str(uuid.uuid4())
    signature = hb.sign(payload, hb.tenant_key(other_tenant, KEY))
    with pytest.raises(hb.HeartbeatRejected):
        hb.verify(payload, signature, hb.tenant_key(TENANT, KEY))


def test_unknown_agent_is_rejected():
    with pytest.raises(hb.HeartbeatRejected) as caught:
        hb.validate(_payload(agent_id="ai-vuln-director"), signature="x", expected_tenant=TENANT)
    assert caught.value.code == "UNKNOWN_AGENT"


def test_future_timestamp_is_rejected():
    future = (datetime.now(UTC) + timedelta(seconds=hb.MAX_CLOCK_SKEW_SECONDS + 60)).isoformat()
    with pytest.raises(hb.HeartbeatRejected) as caught:
        hb.parse_observed_at(future)
    assert caught.value.code == "FUTURE_TIMESTAMP"


def test_tenant_mismatch_is_rejected():
    payload = _payload()
    with pytest.raises(hb.HeartbeatRejected) as caught:
        hb.validate(payload, signature="x", expected_tenant=str(uuid.uuid4()))
    assert caught.value.code == "TENANT_MISMATCH"


def test_missing_signing_key_fails_closed(monkeypatch):
    monkeypatch.delenv(hb.SIGNING_KEY_ENV, raising=False)
    with pytest.raises(hb.HeartbeatRejected) as caught:
        hb.signing_key()
    assert caught.value.code == "SIGNING_KEY_NOT_CONFIGURED"
