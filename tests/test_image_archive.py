"""Every running image must be recreatable from this host, not from a registry.

Measured 25 Nov 2026: minio/minio:latest answered "object not found" on Docker Hub and quay.io answered 401
to an anonymous query, so the object store could not have been recreated if its image were pruned. The
archive script closes that, and these guards stop it being quietly broken or unscheduled.
"""
from __future__ import annotations

import pathlib
import stat

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/ops/image_archive.sh"
CRON = ROOT / "config/cron/root.crontab"


def test_archive_script_exists_and_is_executable():
    assert SCRIPT.is_file(), "scripts/ops/image_archive.sh is missing"
    mode = SCRIPT.stat().st_mode
    assert mode & stat.S_IXUSR, "image_archive.sh is not executable"


def test_archive_script_verifies_what_it_wrote():
    src = SCRIPT.read_text()
    # an archive that is written but never validated is how the first version shipped 8 files for 5 images
    assert "gzip -t" in src, "the script does not verify gzip integrity"
    assert "manifest.json" in src, "the script does not verify the archive holds an image manifest"
    assert "pinned-" in src, "the script does not create a digest tag"
    # image names contain slashes; the destination path must be sanitised or writes land in a subdirectory
    assert "sed 's#[/:]#_#g'" in src, "image names are not sanitised before being used as a filename"


def test_archive_is_scheduled_from_the_crontab_source_of_truth():
    cron = CRON.read_text()
    assert "image_archive.sh" in cron, "the archive script is not scheduled"
    assert "/var/log/gds-image-archive.log" in cron, "scheduled output is not captured anywhere"


def test_script_never_reports_success_when_a_save_failed():
    src = SCRIPT.read_text()
    assert '[ "$failed" -eq 0 ]' in src, "the script can exit 0 with failed saves"
