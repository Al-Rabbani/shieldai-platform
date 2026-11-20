"""A pager that cannot select a row, or cannot read its own credentials, is a log with a schedule.

Measured 20 November 2026 on the live host, two independent defects in the notification path:

  1. `notifications` held 194 rows and **zero** had `requires_ack` set, because no producer ever set it.
     The pager selects `WHERE requires_ack AND acknowledged_at IS NULL`, so it matched nothing even
     though every scheduled run "succeeded". An escalation that cannot be selected is not an alert.
  2. The pager runs as postgres (it must see every tenant's notifications on FORCE-RLS tables) and
     `/opt/.env` is 0600 root:postgres, so `_load_env` raised PermissionError on every run and the
     process then refused with "no delivery channel configured". The two channels were configured the
     whole time; the process could not read them.

Both are pinned here, because both fail silently: the cron entry exits non-zero into a log nobody reads
and the platform looks like it pages.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
OPS = ROOT / "scripts" / "ops"

ESCALATE = (OPS / "escalate_stale_findings.py").read_text()
PAGER = (OPS / "gds-page.py").read_text()
DEPLOY = (OPS / "deploy.sh").read_text()


def test_escalation_notification_is_ackable():
    """The pager's SELECT requires this flag; an escalation without it can never be delivered."""
    assert "requires_ack" in ESCALATE, "escalation must set requires_ack or the pager cannot see the row"
    assert "TRUE, 0, now()" in ESCALATE, "escalation must open the ladder at level 0"
    assert "'sla_escalation', $3, $4" in ESCALATE, "escalation must store a severity so the page is graded"


def test_pager_selects_only_ackable_unacknowledged_rows():
    assert "WHERE n.requires_ack AND n.acknowledged_at IS NULL" in PAGER


def test_pager_can_read_a_file_owned_by_its_own_user():
    """It runs as postgres; /opt/.env is 0600 root:postgres, so a dedicated 0640 file is the only route."""
    assert 'def _load_env(*paths: str)' in PAGER, "the loader must accept more than one path"
    assert '_load_env("/opt/gds-pager.env", "/opt/.env")' in PAGER, (
        "the pager must try the group-readable delivery file before the full secret file"
    )
    assert "continue" in PAGER.split("def _post")[0], "an unreadable path must fall through, not abort"


def test_deploy_writes_the_pager_env_with_narrow_permissions():
    assert "/opt/gds-pager.env" in DEPLOY
    assert "chmod 640 /opt/gds-pager.env" in DEPLOY
    assert "chown root:postgres /opt/gds-pager.env" in DEPLOY
    for var in ("SLACK_WEBHOOK_URL", "RESEND_API_KEY"):
        assert var in DEPLOY.split("/opt/gds-pager.env")[0], f"{var} must be copied into the pager env"


def test_deploy_installs_every_script_its_cron_files_call():
    """Cron runs /usr/local/bin/gds-page.py and gds-webhook-dispatch.py; a script missing from the
    install loop keeps running whatever an earlier manual install left behind."""
    for cron in (ROOT / "config" / "cron").glob("*"):
        for line in cron.read_text().splitlines():
            if line.startswith("#") or "/usr/local/bin/" not in line:
                continue
            script = line.split("/usr/local/bin/")[1].split()[0]
            assert script in DEPLOY, f"{script} is called by cron but deploy never installs it"


def test_scripts_cron_runs_as_postgres_are_executable_by_postgres():
    """The install loop uses root:root 0750. A script cron starts as postgres must be group postgres, or the
    job dies with Permission denied and the schedule reports nothing."""
    postgres_jobs = []
    for cron in (ROOT / "config" / "cron").glob("*"):
        for line in cron.read_text().splitlines():
            if line.startswith("#") or "/usr/local/bin/" not in line:
                continue
            if not line.split()[5:7] or line.split()[5] != "postgres":
                continue
            postgres_jobs.append(line.split("/usr/local/bin/")[1].split()[0])
    assert postgres_jobs, "expected at least one cron job to run as postgres"
    for script in postgres_jobs:
        assert f'install -m 750 -o root -g postgres "scripts/ops/{script}"' in DEPLOY, (
            f"{script} runs as postgres but is not installed group postgres"
        )


def test_pager_identifies_itself_to_the_provider():
    """Resend is behind Cloudflare, which answers urllib's default User-Agent with 403 error 1010.

    Measured 20 November 2026: the identical payload returned 200 through curl and 403 through urllib, and
    the only difference was the header. The pager records a bare status code, so 1010 was written down as
    "email=403" and read for weeks as an unverified domain. It was a header.
    """
    assert 'USER_AGENT = "GDS-OS-Pager/' in PAGER
    assert '"User-Agent": USER_AGENT' in PAGER, "every pager POST must carry the User-Agent"
