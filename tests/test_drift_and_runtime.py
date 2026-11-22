"""Configuration drift and runtime posture.

Both panels were empty because neither store existed. These tests pin the two things that made them wrong: the response
models must accept what a real row carries (uuid ids, real timestamps, a jsonb array), and the payload the page reads
must be built from the measurement rather than guessed.
"""
import importlib.util
import json
import uuid
from datetime import UTC, datetime
from pathlib import Path

import pytest

from gds_api.drift import DriftOut, RuntimePostureOut, _posture_payload

OPS = Path("/opt/gds-os/scripts/ops")


def _load(name):
    spec = importlib.util.spec_from_file_location(name, OPS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def drift_scan():
    return _load("drift_scan")


@pytest.fixture(scope="module")
def posture():
    return _load("collect_runtime_posture")


def drift_row(**over):
    base = dict(
        id=uuid.uuid4(), asset="api-host", setting_key="api.header.csp", drift_type="changed", severity="medium",
        expected_value="present", actual_value="absent", status="detected", auto_correctable=False, risk_score=40,
        detected_at=datetime.now(UTC), corrected_at=None,
    )
    base.update(over)
    return base


def test_a_real_drift_row_validates_and_serialises_its_id_as_a_string():
    out = DriftOut(**drift_row())
    assert isinstance(json.loads(out.model_dump_json())["id"], str)


def test_a_corrected_row_carries_its_timestamp():
    when = datetime.now(UTC)
    assert DriftOut(**drift_row(status="corrected", corrected_at=when)).corrected_at == when


def posture_row(**over):
    base = dict(
        id=uuid.uuid4(), container_name="neo4j", posture_violations=["writable_rootfs", "runs_as_root"],
        mitre_technique="T1610", severity="low", container_id="abc", host="gds-api-host", image="neo4j:5",
        state="running", privileged=False, host_network=False, host_pid=False, host_ipc=False,
        read_only_rootfs=False, user_account="root (default)", caps_added=[], mounts_count=2, risk_score=10,
        collected_at=datetime.now(UTC),
    )
    base.update(over)
    return base


def test_the_page_reads_the_container_name_as_service_name():
    out = _posture_payload(posture_row())
    assert out.service_name == "neo4j"
    assert out.threat_type == "writable rootfs, runs as root"


def test_the_measurements_are_kept_beside_the_page_fields():
    out = _posture_payload(posture_row())
    assert out.posture_violations == ["writable_rootfs", "runs_as_root"]
    assert out.read_only_rootfs is False


def test_a_jsonb_array_arriving_as_a_string_is_parsed():
    out = _posture_payload(posture_row(posture_violations='["privileged"]'))
    assert out.posture_violations == ["privileged"]


def test_a_container_with_no_violation_is_named_as_such_not_as_a_threat():
    assert _posture_payload(posture_row(posture_violations=[])).threat_type == "no violation"


def test_drift_names_a_changed_setting_with_its_policy_severity(drift_scan):
    rows = drift_scan.diff({"ssh.password_authentication": "no"}, {"ssh.password_authentication": "yes"})
    assert rows == [{"setting_key": "ssh.password_authentication", "drift_type": "changed",
                     "expected": "no", "actual": "yes", "severity": "high"}]


def test_a_setting_that_is_no_longer_measurable_is_a_missing_control(drift_scan):
    rows = drift_scan.diff({"api.header.csp": "present"}, {})
    assert rows[0]["drift_type"] == "control_missing"
    assert rows[0]["actual"] == "not measurable now"


def test_a_matching_setting_is_not_drift(drift_scan):
    assert drift_scan.diff({"listen.ports": "22,80"}, {"listen.ports": "22,80"}) == []


def test_the_checksum_changes_when_a_setting_changes(drift_scan):
    a = drift_scan.checksum({"listen.ports": "22,80"})
    assert a == drift_scan.checksum({"listen.ports": "22,80"})
    assert a != drift_scan.checksum({"listen.ports": "22,80,443"})


def test_a_privileged_container_is_high_with_the_escape_technique(posture):
    found, score, severity, technique = posture.assess(
        {"HostConfig": {"Privileged": True}, "Config": {"User": "app"}, "State": {"Running": True}})
    assert found == ["privileged"]
    assert severity == "high" and technique == "T1611" and score >= 40


def test_host_namespaces_are_named_individually(posture):
    found, *_ = posture.assess({"HostConfig": {"PidMode": "host", "NetworkMode": "host", "IpcMode": "host"},
                                "Config": {"User": "app"}, "State": {"Running": True}})
    assert set(found) == {"host_pid", "host_network", "host_ipc"}


def test_a_stopped_container_is_not_called_root(posture):
    """runs_as_root describes a running process; a stopped container has none."""
    found, *_ = posture.assess({"HostConfig": {}, "Config": {"User": ""}, "State": {"Running": False}})
    assert "runs_as_root" not in found


def test_a_plain_container_still_reports_a_writable_rootfs(posture):
    found, score, severity, technique = posture.assess(
        {"HostConfig": {"ReadonlyRootfs": False}, "Config": {"User": "app"}, "State": {"Running": True}})
    assert found == ["writable_rootfs"] and severity == "low" and technique == "T1610"
