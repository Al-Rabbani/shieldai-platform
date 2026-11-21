"""Boot supervision is a measurement now, not a configuration claim.

The platform asserted for months that services come back after a reboot because supervisor had autostart=true. On
21 Nov 2026 the host was actually rebooted for a kernel update, and /var/lib/gds-boot-proof.json is the record of
what happened. These tests keep that record honest: they fail if a service started late, if a container needed a
human, or if the record is shaped in a way that could only be true on paper.

The file exists only on the host, so the tests skip where it is absent rather than pretending to pass.
"""
import json
from datetime import datetime
from pathlib import Path

import pytest

PROOF = Path("/var/lib/gds-boot-proof.json")
HARDEN = Path(__file__).resolve().parents[1] / "scripts" / "ops" / "harden_host_units.sh"
SERVICES = {"gds-os", "gds-worker", "gds-kernel"}
CONTAINERS = {"neo4j", "qdrant", "temporal", "minio", "nats"}


@pytest.fixture(scope="module")
def proof():
    if not PROOF.exists():
        pytest.skip("no boot proof on this host: run scripts/ops/record_boot_proof.py after a reboot")
    return json.loads(PROOF.read_text())


def test_the_record_is_anchored_to_the_kernel_boot_time(proof):
    booted = datetime.fromisoformat(proof["booted_at"].replace("Z", "+00:00"))
    recorded = datetime.fromisoformat(proof["recorded_at"].replace("Z", "+00:00"))
    assert booted <= recorded, "the proof was recorded before the machine booted"
    assert proof["kernel"], "no kernel release recorded, so the reboot that applied the update is unproven"


def test_every_supervised_service_started_at_boot(proof):
    assert set(proof["services"]) == SERVICES
    for name, entry in proof["services"].items():
        assert entry["state"] == "RUNNING", f"{name} is {entry['state']} in the boot record"
        offset = entry["seconds_after_boot"]
        assert offset is not None, f"{name} has no start time, so it was never measured"
        assert 0 <= offset <= proof["grace_seconds"], (
            f"{name} started {offset}s after boot, outside the {proof['grace_seconds']}s grace window: it did not "
            "come up on its own"
        )


def test_every_container_was_restored_at_boot(proof):
    assert set(proof["containers"]) == CONTAINERS
    for name, entry in proof["containers"].items():
        offset = entry["seconds_after_boot"]
        assert offset is not None, f"{name} has no start time: the record cannot say whether it came back"
        assert 0 <= offset <= proof["grace_seconds"], f"{name} started {offset}s after boot"


def test_the_record_agrees_with_its_own_flags(proof):
    late = [n for n, e in proof["services"].items() if (e["seconds_after_boot"] or 0) > proof["grace_seconds"]]
    assert proof["supervised_without_intervention"] == (not late), (
        "supervised_without_intervention disagrees with the measured offsets"
    )
    assert proof["supervised_without_intervention"] is True, "services did not come back unaided"
    assert proof["containers_restored_without_intervention"] is True, "containers did not come back unaided"


def test_the_grace_window_is_not_widenable_to_nothing(proof):
    """A 24-hour grace window would make "started at boot" mean nothing."""
    assert proof["grace_seconds"] <= 180


def test_the_hardening_script_will_not_mask_without_a_container_to_fall_back_on():
    source = HARDEN.read_text()
    assert "refusing to mask" in source, "the script would disable the host package with no container to serve the graph"
    assert "docker ps -a" in source, "the container check is gone"


def test_the_hardening_script_compares_state_rather_than_piping_is_enabled():
    """Regression: pipefail made `systemctl is-enabled | grep masked` a false negative, so a masked unit was
    re-masked on every run."""
    source = HARDEN.read_text()
    assert 'state="$(systemctl is-enabled' in source, "the pipefail-safe state comparison was removed"
    assert "is-enabled neo4j.service 2>&1 | grep" not in source, "the pipefail bug is back"
