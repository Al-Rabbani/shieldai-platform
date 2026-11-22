"""A slow Temporal is not a dead Temporal, and the watchdog must say why it fired.

Measured on the live host, 22 Nov 2026: gds-service-watch.sh restarted the temporal container at 21:25 and again at
21:40, then kept failing its probe at 21:45, 21:50, 22:15 and 22:20. Over those same 40 minutes Temporal's own log
carried ZERO error lines, and eight of eight manual runs of the identical command returned OK in under a second. Two
things were wrong, and neither was Temporal:

1. The probe reported every failure the same way, so a gRPC deadline under load was indistinguishable from a refused
   connection. Restarting a stateful container cancels in-flight activities, so "slow" was costing real work.
2. check() ran the probe as `eval "$probe" >/dev/null 2>&1`, throwing away the only explanation there was. The log
   recorded nine failures that evening as the bare line "FAIL temporal (consecutive 3)".

The probe now exits 2 for slow, 1 for refused, 3 for anything else, and the watchdog records the reason and refuses to
count slowness as a strike.
"""
from __future__ import annotations

import os
import subprocess
import sys

import pytest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
WATCH = REPO / "scripts" / "ops" / "gds-service-watch.sh"
PROBE = REPO / "scripts" / "ops" / "gds-temporal-probe.py"


def _run(tmp_path: Path, probe_body: str, runs: int = 1, strikes: int = 2):
    state = tmp_path / "state"
    state.mkdir(exist_ok=True)
    log = tmp_path / "watch.log"
    restarts = tmp_path / "restarts.txt"
    probe = tmp_path / "probe.sh"
    probe.write_text("#!/usr/bin/env bash\n" + probe_body + "\n")
    probe.chmod(0o755)
    script = f"""
set -uo pipefail
export GDS_WATCH_LIB_ONLY=1
export GDS_WATCH_STATE={state}
export GDS_WATCH_LOG={log}
export GDS_WATCH_ALERT_CMD="echo stub-alert"
source {WATCH}
check stub '{probe}' 'echo restarted >> {restarts}' {strikes}
echo "ok=$ok bad=$bad"
"""
    results = [subprocess.run(["bash", "-c", script], capture_output=True, text=True) for _ in range(runs)]
    return {
        "log": log.read_text() if log.exists() else "",
        "restarts": restarts.read_text() if restarts.exists() else "",
        "strike_file": (state / "stub.fail").exists(),
        "stdout": results[-1].stdout,
        "stderr": results[-1].stderr,
    }


def test_slow_is_recorded_and_is_not_a_strike(tmp_path):
    # Five slow answers in a row must never restart the container.
    out = _run(tmp_path, 'echo "SLOW temporal address=127.0.0.1:7233 attempts=2 TimeoutError: deadline"; exit 2', runs=5)
    assert out["restarts"] == "", "a slow probe must not restart a healthy container"
    assert not out["strike_file"], "slowness must not accumulate strikes"
    assert "SLOW stub" in out["log"]
    assert "FAIL" not in out["log"]
    # Each run is its own process, so the counter reports one check per invocation.
    assert "bad=0" in out["stdout"], out["stdout"] + out["stderr"]


def test_a_refused_probe_records_its_reason_and_restarts_at_the_strike_limit(tmp_path):
    out = _run(tmp_path, 'echo "REFUSED temporal connection refused"; exit 1', runs=2, strikes=2)
    assert "FAIL stub (consecutive 1) rc=1 reason=REFUSED temporal connection refused" in out["log"]
    assert "FAIL stub (consecutive 2) rc=1 reason=REFUSED temporal connection refused" in out["log"]
    assert out["restarts"].count("restarted") == 1, "the second strike is the one that restarts"
    assert "restarted via" in out["log"]


def test_the_probe_has_one_definition_of_slow_and_refused():
    source = PROBE.read_text(encoding="utf-8")
    assert "EXIT_SLOW = 2" in source
    assert "EXIT_REFUSED = 1" in source
    assert "ATTEMPTS = 2" in source, "a single dropped handshake is not evidence of an outage"
    assert "CONNECT_TIMEOUT = 20.0" in source
    assert "GDS_TEMPORAL_ADDRESS" in source, "the address must be overridable for a test or a different host"
    # The distinction must be made on the exception, not on a generic catch.
    assert "isinstance(exc, (asyncio.TimeoutError, TimeoutError))" in source
    assert '"refused" in text' in source


def test_the_watchdog_still_discards_output_for_probes_that_cannot_signal_slowness():
    # curl -f and supervisorctl exit 0 or 1, so the new branch cannot silently excuse a genuinely dead service.
    source = WATCH.read_text(encoding="utf-8")
    assert 'if [ "$rc" -eq 2 ]' in source
    assert "out=$(eval \"$probe\" 2>&1); rc=$?" in source


def test_the_probe_cannot_report_a_successful_check_as_a_failure():
    """The probe aborted AFTER printing OK, so a healthy Temporal was counted as a failed strike.

    Measured on the live host, 22 Nov 2026: `FAIL temporal (consecutive 1) rc=134 reason=OK temporal server=1.29.3
    capabilities_present=True address=127.0.0.1:7233 attempt=1`. A re-run of 30 executions produced 29 zeros and one
    SIGABRT (exit 134, core dumped) - about 3.3%, i.e. roughly nine false failures a day on a five-minute cron. That is
    what restarted a container whose own log held zero errors. The verdict is printed before the abort, so the probe now
    leaves through os._exit and never runs interpreter teardown.
    """
    source = PROBE.read_text(encoding="utf-8")
    assert "os._exit(code)" in source
    assert "sys.exit(asyncio.run(main()))" not in source, "module-level sys.exit runs teardown, which is what aborted"
    assert "sys.stdout.flush()" in source, "os._exit skips buffered output, so the verdict must be flushed first"


def test_the_probe_returns_zero_on_every_run_when_the_server_is_up():
    """Behavioural: 20 runs against the live server. An abort is a real defect; an unreachable server is skipped."""
    import subprocess

    def run_once():
        return subprocess.run(
            [sys.executable, str(PROBE)], capture_output=True, text=True, timeout=120,
            env={**os.environ, "GDS_TEMPORAL_ADDRESS": "127.0.0.1:7233"},
        )

    first = run_once()
    if first.returncode == 1:
        pytest.skip("temporal is not reachable on this host, so the abort path cannot be exercised")
    codes = [first.returncode] + [run_once().returncode for _ in range(19)]
    assert codes == [0] * 20, f"a successful check must always exit 0, got {codes}"
