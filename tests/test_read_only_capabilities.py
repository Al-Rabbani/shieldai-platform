"""A read-only capability must not demand human approval, and its message must not claim it changes anything."""
from gds_api.capabilities.catalog import CAPABILITY_REGISTRY
from gds_api.capabilities.broker import __file__ as broker_path
import pathlib


def test_dependency_scan_runs_without_a_human():
    cap = CAPABILITY_REGISTRY["vulnerability.scan_dependencies"]
    assert cap.requires_human_approval is False, "a read-only dependency scan must not need approval"
    assert str(cap.risk_class).endswith("R1"), cap.risk_class
    assert "READ_EXTERNAL" in str(cap.side_effect_type)


def test_malware_hash_lookup_runs_without_a_human():
    cap = CAPABILITY_REGISTRY["threat_intel.lookup_malware_hash"]
    assert cap.requires_human_approval is False, "a read-only hash lookup must not need approval"
    assert str(cap.risk_class).endswith("R1"), cap.risk_class


def test_offensive_and_write_capabilities_still_need_approval():
    # The fix must not have opened the gate on actions that really do change things.
    assert CAPABILITY_REGISTRY["red_team.assess_attack_surface"].requires_human_approval is True


def test_the_approval_message_names_a_read_as_a_read():
    src = pathlib.Path(broker_path).read_text()
    assert '"READ_EXTERNAL": "reads an external system"' in src
    assert '"WRITE_EXTERNAL": "changes an external system"' in src
