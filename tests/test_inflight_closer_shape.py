"""The deploy-time closer must report a number, not a psql transcript.

MEASURED 26 Nov 2026: the first version returned the INSERT's own row AND the count, so psql printed "0\nINSERT 0 1",
int() raised, and the step printed a warning on EVERY deploy while the deploy continued. A step that fails on every run
looks exactly like a step with nothing to do - which is why the guard is on the shape of the query, not just on it
running.
"""
import pathlib
import re

SRC = pathlib.Path("/opt/gds-os/scripts/ops/close_inflight_missions.py").read_text()


def test_only_one_value_is_selected():
    body = SRC[SRC.index("WITH closed AS ("):SRC.index('"""', SRC.index("WITH closed AS ("))]
    assert re.search(r"SELECT count\(\*\) FROM closed;\s*$", body.strip()), \
        "the statement must end by selecting exactly one scalar"
    assert "RETURNING 1" in body, "the audit insert is inside the CTE, so it must not emit its own result row"


def test_it_only_ever_touches_running_missions():
    assert "WHERE status = 'running'" in SRC


def test_a_failure_does_not_block_a_deploy():
    deploy = pathlib.Path("/opt/gds-os/scripts/ops/deploy.sh").read_text()
    line = [l for l in deploy.splitlines() if "close_inflight_missions.py" in l][0]
    assert "||" in line, "a bookkeeping failure must not abort a release"


def test_the_reason_states_the_outcome_is_unknown():
    assert "outcome of its actions is unknown" in SRC
