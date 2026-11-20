"""The PITR rehearsal must stay scheduled, and must keep the guards that make its verdict meaningful.

scripts/ops/README.md states the point-in-time window is seven days. That is only a measured property while a
rehearsal actually replays WAL, so this pins three things that were each wrong at least once on 20 Nov 2026:

1. The rehearsal is in the installed crontab. It was a script nobody ran, which proves nothing.
2. It waits for the WAL segment holding the target LSN to reach the archive. A fixed sleep let recovery start
   before the one segment it needed had been copied, which fails looking exactly like an unrecoverable archive.
3. It starts from an empty probe table. A row left by an aborted run predates the target LSN, so recovery restores
   it and the check reports a post-target write that was never written.
"""
from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SCRIPT = REPO / "scripts" / "ops" / "gds-pitr-rehearsal.sh"
CRONTAB = REPO / "config" / "cron" / "root.crontab"
DEPLOY = REPO / "scripts" / "ops" / "deploy.sh"


def test_the_rehearsal_runs_on_a_schedule():
    crontab = CRONTAB.read_text()
    assert "gds-pitr-rehearsal.sh" in crontab, "the rehearsal is not in the installed crontab"
    line = next(entry for entry in crontab.splitlines() if "gds-pitr-rehearsal.sh" in entry)
    # A weekly job, on a day and at a time - not a commented placeholder.
    assert not line.lstrip().startswith("#")
    assert line.split()[0].isdigit(), f"no minute field: {line}"
    assert ">> /var/log/gds-pitr.log" in line, "rehearsal output is not captured anywhere"


def test_deploy_installs_the_script_it_schedules():
    deploy = DEPLOY.read_text()
    assert "gds-pitr-rehearsal.sh" in deploy, (
        "cron calls /usr/local/bin/gds-pitr-rehearsal.sh but deploy never installs it"
    )


def test_the_rehearsal_waits_for_the_segment_it_needs():
    script = SCRIPT.read_text()
    assert "pg_walfile_name" in script, "the target segment is not identified"
    assert "wal_archive/$SEG" in script, "the rehearsal does not wait for that segment to be archived"
    # The wait must be a poll loop straight after the switch, not a bare sleep. The promote wait later in the script
    # is a different thing and may sleep.
    after_switch = script.split('pg_switch_wal()" >/dev/null')[1][:700]
    assert "ARCHIVED=1" in after_switch, "the segment wait is not a poll loop"
    assert "for _ in $(seq" in after_switch, "no bounded poll after the switch"
    assert "sleep 5" not in after_switch.split("ARCHIVED=1")[0], (
        "a fixed sleep sits between the switch and the archive check; it raced the archiver on 20 Nov 2026"
    )


def test_the_rehearsal_starts_from_an_empty_probe_table():
    script = SCRIPT.read_text()
    assert 'DROP TABLE IF EXISTS pitr_probe' in script, (
        "a row from an earlier aborted run would be restored and read as a post-target write"
    )
    assert "cleanup()" in script and "pitr_probe" in script.split("cleanup()")[1][:400], (
        "an aborted run leaves the probe table in production"
    )


def test_a_failure_pages_instead_of_waiting_to_be_noticed():
    script = SCRIPT.read_text()
    assert "backup_ops alert" in script, "a failed rehearsal must alert, not just log"
    assert "trap on_failure ERR" in script, "an unexpected error must take the same alerting path"
