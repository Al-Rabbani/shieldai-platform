"""A scheduled job must not be able to delete the schedule that runs it.

The patch window script ended with `crontab -l | grep -v 'gds-os-update.sh apply' | crontab -`, which was correct
while the window was a one-shot date and fatal once it became recurring: the first run would erase the entry and
patching would stop for good, silently, with the control still reporting a stale count.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
UPDATE = (ROOT / "scripts/ops/gds-os-update.sh").read_text(encoding="utf-8")
CRONTAB = (ROOT / "config/cron/root.crontab").read_text(encoding="utf-8")
DEPLOY = (ROOT / "scripts/ops/deploy.sh").read_text(encoding="utf-8")


def test_the_patch_window_does_not_delete_its_own_schedule():
    assert "grep -v 'gds-os-update.sh apply'" not in UPDATE
    assert "crontab -l" not in UPDATE or "REMOVED" in UPDATE


def test_the_patch_window_recurs_weekly_rather_than_on_one_date():
    line = next(l for l in CRONTAB.splitlines() if "gds-os-update.sh" in l and not l.strip().startswith("#"))
    spec = " ".join(line.split()[:5])
    assert spec == "0 5 * * 5", spec
    # a day-of-month plus a month is a one-shot date, which is what this was
    fields = spec.split()
    assert fields[2] == "*" and fields[3] == "*"


def test_the_schedule_is_versioned_and_deploy_installs_it():
    for job in ("gds-backup.sh", "gds-backup-watch.sh", "gds-service-watch.sh", "gds-os-update.sh"):
        assert job in CRONTAB
    assert "config/cron/root.crontab" in DEPLOY
    assert "crontab config/cron/root.crontab" in DEPLOY
