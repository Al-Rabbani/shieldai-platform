"""A restart must not leave a mission silent for two hours and then call it a capability failure.

MEASURED 26 Nov 2026: six remediation missions on 25 Nov ran from 16:16 and were closed by the mission reaper at 18:30
with "no outcome was ever recorded" and recorded as failures. The work in them had been applied - the SSH SHA-1 MACs
were gone and those findings are closed - so the register was calling completed security work a failure because the
runner process was replaced by a deploy while it ran. The bridge closes a mission on success and on an exception;
nothing survives the process being killed, which is exactly what a deploy does.

The fix is not to hide those rows. It is to close them at the moment the restart happens, name the restart, and say the
outcome of their actions is unknown.
"""
import pathlib

REPO = pathlib.Path("/opt/gds-os")
SCRIPT = REPO / "scripts/ops/close_inflight_missions.py"
DEPLOY = REPO / "scripts/ops/deploy.sh"


def test_the_script_exists_and_only_touches_running_missions():
    src = SCRIPT.read_text()
    assert "WHERE status = 'running'" in src, "a closed or completed mission must never be rewritten"
    assert "interrupted by a platform restart at" in src, "the reason must name the restart"


def test_the_restart_is_named_not_guessed():
    src = SCRIPT.read_text()
    # The outcome of the mission's actions is unknown, and the text must say so rather than assert a failure reason.
    assert "outcome of its actions is unknown" in src
    assert "verify before retrying" in src


def test_a_deploy_closes_in_flight_missions_before_restarting():
    src = DEPLOY.read_text()
    assert "close_inflight_missions.py" in src, "deploy must close in-flight missions"
    close_at = src.index("close_inflight_missions.py")
    restart_at = src.index('restarting services')
    assert close_at < restart_at, "the close must run BEFORE the restart, not after it"
    assert "bookkeeping must not block a deploy" in src, "a bookkeeping failure must not abort a deploy"


def test_the_close_is_recorded_in_the_audit_trail():
    src = SCRIPT.read_text()
    assert "mission.interrupted_by_restart" in src
    assert "audit_events" in src
