"""A deploy that recreates its own log files destroys the evidence it was added to keep.

The first version of the cron install step ran `install /dev/null <log>` on every deploy. That truncates an
existing file, so every deploy silently wiped the paging and webhook history - the opposite of the intent.
"""
import pathlib

DEPLOY = (pathlib.Path(__file__).resolve().parents[1] / "scripts" / "ops" / "deploy.sh").read_text()


def test_cron_logs_are_only_created_when_absent():
    assert '[ -f "/var/log/gds/$(basename "$f").log" ] || install' in DEPLOY


def test_no_unconditional_truncating_install_remains():
    for line in DEPLOY.splitlines():
        if "install -o postgres" in line and "/var/log/gds/" in line:
            assert line.lstrip().startswith("[ -f"), f"unconditional install would truncate: {line.strip()[:80]}"
