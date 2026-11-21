"""The service watchdog: what it restarts, when, and whether anyone hears about it.

Three defects found on the live host on 21 Nov 2026, all fixed here and pinned so they cannot come back.

1. The API probe used /health/ready, which reports the state of every dependency. Stopping NATS by hand made the API
   probe fail twice and the watchdog restarted a healthy API process three seconds later. A dependency outage is an
   alert, not a reason to bounce the component that reports it. The probe now uses /health (liveness).

2. Every check restarted on two consecutive failures, including the stateful containers. The temporal probe failed
   twice thirty minutes apart while returning in 300ms on eight of eight manual runs, so a transient stall restarted
   the whole container - which cancels in-flight activities and produces the RuntimeError storms this platform has
   already spent time cleaning up. Containers now need three strikes; the stateless API and worker keep two.

3. Restarts were silent. The watchdog wrote to a log and nothing else ever learned about them. It now raises an
   acknowledgeable notification, which the paging ladder re-raises until somebody acks it.

The behaviour is tested by sourcing the script with GDS_WATCH_LIB_ONLY=1 and driving check() with a probe that always
fails and a restart command that records the fact instead of touching anything.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
WATCH = REPO / "scripts" / "ops" / "gds-service-watch.sh"
RAISE = REPO / "scripts" / "ops" / "gds-raise-alert.py"


def _run_check(tmp_path: Path, calls: list[str], strikes: int | None = None) -> list[str]:
    """Source the watchdog functions and call check() with a failing probe.

    Each call in `calls` is one watchdog run against the same state directory, so the consecutive-failure counter
    behaves exactly as it does on the five-minute cron.
    """
    state = tmp_path / "state"
    state.mkdir(exist_ok=True)
    log = tmp_path / "watch.log"
    restarts = tmp_path / "restarts.txt"
    fix = f"echo restarted >> {restarts}"
    extra = f" {strikes}" if strikes is not None else ""

    script = f"""
    set -uo pipefail
    export GDS_WATCH_LIB_ONLY=1
    export GDS_WATCH_STATE={state}
    export GDS_WATCH_LOG={log}
    export GDS_WATCH_ALERT_CMD='echo STUB-ALERT'
    source {WATCH}
    """
    for _ in calls:
        script += f'\ncheck probe-{strikes or "default"} \'false\' \'{fix}\'{extra}\n'
    script += f'\ncat {log} 2>/dev/null || true\n'

    result = subprocess.run(["bash", "-c", script], capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stderr
    return (restarts.read_text().splitlines() if restarts.exists() else []), result.stdout


def test_a_transient_failure_does_not_restart_a_stateful_container(tmp_path):
    restarts, log = _run_check(tmp_path, ["run"] * 2, strikes=3)
    assert restarts == [], f"restarted after two failures with three strikes required: {log}"
    assert "FAIL" in log


def test_the_third_consecutive_failure_restarts_and_alerts(tmp_path):
    restarts, log = _run_check(tmp_path, ["run"] * 3, strikes=3)
    assert len(restarts) == 1, log
    assert "RESTART" in log
    assert "STUB-ALERT" in log, "a restart happened and no alert was raised"


def test_the_default_threshold_still_restarts_on_two(tmp_path):
    restarts, log = _run_check(tmp_path, ["run"] * 2)
    assert len(restarts) == 1, f"the stateless default no longer restarts on two failures: {log}"


def test_a_success_resets_the_counter(tmp_path):
    state = tmp_path / "state"
    state.mkdir(exist_ok=True)
    log = tmp_path / "watch.log"
    restarts = tmp_path / "restarts.txt"
    script = f"""
    set -uo pipefail
    export GDS_WATCH_LIB_ONLY=1
    export GDS_WATCH_STATE={state}
    export GDS_WATCH_LOG={log}
    export GDS_WATCH_ALERT_CMD='echo STUB-ALERT'
    source {WATCH}
    check probe 'false' 'echo restarted >> {restarts}'
    check probe 'true'  'echo restarted >> {restarts}'
    check probe 'false' 'echo restarted >> {restarts}'
    """
    subprocess.run(["bash", "-c", script], capture_output=True, text=True, timeout=60, check=True)
    assert not restarts.exists(), "a failure after a success was counted as consecutive"


def test_a_second_restart_escalates_because_the_repair_is_not_holding(tmp_path):
    restarts, log = _run_check(tmp_path, ["run"] * 6)
    assert len(restarts) == 3, log
    assert "critical" in log, "two failed repairs produced no escalation"
    assert "is not holding" in log


def test_the_api_probe_tests_liveness_not_readiness():
    """A dependency outage must not bounce the API. This is the exact mistake the live host made."""
    text = WATCH.read_text()
    api_line = next(line for line in text.splitlines() if line.startswith("check api"))
    assert "/health/ready" not in api_line, f"the api probe is readiness-coupled again: {api_line}"
    assert "/health" in api_line


def test_stateful_containers_require_three_strikes():
    text = WATCH.read_text()
    for name in ("qdrant", "minio", "nats", "temporal"):
        line = next(l for l in text.splitlines() if l.startswith(f"check {name}"))
        assert line.rstrip().endswith(" 3"), f"{name} restarts without the third strike: {line}"


def test_every_restart_path_raises_an_alert():
    """A restart nobody hears about is the defect this whole file exists to prevent."""
    text = WATCH.read_text()
    check_body = text.split("check() {", 1)[1]
    assert "raise_alert" in check_body
    assert "restarts" in check_body, "the restart counter that drives escalation is gone"


def test_the_alert_sink_is_not_hardcoded():
    """A hardcoded sudo call cannot be exercised by a test, and an untested alert path is an unproven one."""
    text = WATCH.read_text()
    assert "GDS_WATCH_ALERT_CMD" in text
    assert "out=$($ALERT_CMD" in text


def test_the_raiser_writes_an_acknowledgeable_notification():
    """requires_ack is what makes the 5/15/60 ladder apply; without it the alert is delivered once and forgotten."""
    text = RAISE.read_text()
    assert "requires_ack" in text
    assert "TRUE, 0, now()" in text, "the notification is not inserted as an unacknowledged level-0 alert"


def test_the_raiser_refuses_to_run_with_nobody_to_page():
    text = RAISE.read_text()
    assert "no active user" in text
    assert "return 2" in text, "a missing recipient must fail loudly, not silently skip the alert"


def test_the_raiser_dedupes_a_repeating_failure():
    """The watchdog runs every five minutes; an alert that repeats every run is noise nobody reads."""
    text = RAISE.read_text()
    assert "suppressed duplicate" in text
    assert "acknowledged_at IS NULL" in text, "dedupe ignores acknowledgement, so an acked alert is never re-raised"


def test_the_raiser_is_registered_for_deploy():
    """A script that only exists on this host is lost on the next rebuild."""
    deploy = (REPO / "scripts" / "ops" / "deploy.sh").read_text()
    assert "gds-raise-alert.py" in deploy, "gds-raise-alert.py is not installed by deploy.sh"


def test_the_raiser_is_installed_for_the_postgres_group():
    """Being in the install list is not enough, which the live host proved.

    The generic loop installs root:root 0750. The watchdog runs the raiser as postgres, so that mode makes it
    unreadable and every alert fails with Permission denied while the restart itself looks fine. Deploying 1cf1103
    reproduced exactly this: "can't open file ... Permission denied" on the first real attempt to raise an alert.
    """
    deploy = (REPO / "scripts" / "ops" / "deploy.sh").read_text()
    lines = [l for l in deploy.splitlines() if "gds-raise-alert.py" in l and "install" in l]
    assert lines, "no explicit install line for gds-raise-alert.py"
    assert any("-g postgres" in l for l in lines), (
        f"gds-raise-alert.py is not installed readable by postgres: {lines}"
    )
