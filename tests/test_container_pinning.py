"""A tag is a moving target; a digest is not.

Rebuilding this host used to pull whatever ":latest" pointed at on that day. That is how qdrant drifted four
months behind and collected six critical CVEs, and how an unreviewed upgrade could arrive during a routine
rebuild. These pin the rule that every service image names its digest.
"""
from pathlib import Path

SCRIPT = (Path(__file__).resolve().parents[1] / "scripts" / "ops" / "docker_services.sh").read_text(encoding="utf-8")

IMAGES = ("nats", "qdrant/qdrant", "temporalio/auto-setup", "minio/minio")


def test_every_service_image_is_digest_pinned():
    for image in IMAGES:
        assert f"{image}@sha256:" in SCRIPT, f"{image} is not pinned by digest"


def test_no_service_image_is_referenced_by_a_floating_tag():
    for image in IMAGES:
        assert f"{image}:latest" not in SCRIPT, f"{image}:latest reintroduced a floating tag"
    assert "qdrant/qdrant \\" not in SCRIPT, "bare qdrant image reference reintroduced"


def test_the_pinning_rationale_is_recorded():
    assert "Images are pinned by digest" in SCRIPT
    assert "pull access denied" in SCRIPT, "the reason minio cannot be upgraded must stay on the record"
