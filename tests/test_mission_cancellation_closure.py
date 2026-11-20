"""A cancelled request must not leave its mission running.

Measured 20 Nov 2026: eight cloud_security_assessment missions sat in `running` from 10:29 to 11:16, none with a
discovery job behind it, each broker decision DENY (agent_required). The code that opens the mission is
synchronous and takes minutes, so when the client gave up the coroutine was cancelled. asyncio.CancelledError is
a BaseException, not an Exception, so `except Exception` never saw it and the mission was never closed.

These tests hold the guarantee rather than the wording: the durable write must survive cancellation of the
request that asked for it.
"""
import asyncio
import sys
import uuid
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from gds_api import mission_reaper  # noqa: E402

DISCOVERY = (ROOT / "apps" / "api" / "gds_api" / "cloud" / "discovery.py").read_text(encoding="utf-8")
EVALUATION = (
    ROOT / "apps" / "api" / "gds_api" / "cloud" / "posture" / "evaluation.py"
).read_text(encoding="utf-8")

MISSION = uuid.uuid4()
TENANT = uuid.uuid4()


def test_the_closure_still_completes_after_the_request_is_cancelled():
    """The real guarantee: cancel the caller mid-flight and the mission write still lands."""
    written = []

    async def stub(mission_id, tenant_id, reason, *, action="mission.failed"):
        await asyncio.sleep(0.05)  # a real database write is not instantaneous
        written.append((mission_id, reason))
        return True

    async def scenario():
        with mock.patch.object(mission_reaper, "fail_mission_durably", stub):
            task = asyncio.create_task(
                mission_reaper.fail_mission_on_cancellation(MISSION, TENANT)
            )
            await asyncio.sleep(0)  # let it reach its first await
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            await asyncio.sleep(0.15)  # the shielded write finishes on its own

    asyncio.run(scenario())
    assert written, "the mission write was abandoned when the request was cancelled"
    assert written[0][0] == MISSION
    assert "cancelled" in written[0][1]


def test_a_failing_durable_write_is_not_reported_as_success_or_leaked():
    async def boom(*args, **kwargs):
        raise RuntimeError("database unavailable")

    async def scenario():
        with mock.patch.object(mission_reaper, "fail_mission_durably", boom):
            await mission_reaper.fail_mission_on_cancellation(MISSION, TENANT)
            await asyncio.sleep(0.05)

    asyncio.run(scenario())  # must not raise: the request is already gone


def test_the_uncancelled_path_awaits_the_real_write():
    written = []

    async def stub(mission_id, tenant_id, reason, *, action="mission.failed"):
        written.append(mission_id)
        return True

    async def scenario():
        with mock.patch.object(mission_reaper, "fail_mission_durably", stub):
            await mission_reaper.fail_mission_on_cancellation(MISSION, TENANT)

    asyncio.run(scenario())
    assert written == [MISSION]


def test_both_minutes_long_cloud_routes_guard_cancellation():
    for source, label in ((DISCOVERY, "discovery"), (EVALUATION, "posture evaluation")):
        assert "except BaseException:" in source, label
        assert "fail_mission_on_cancellation(" in source, label
        # the guard must sit AFTER the Exception handler so typed errors keep their own mapping
        assert source.index("except Exception as exc:") < source.index("except BaseException:"), label


def test_the_guard_does_not_rely_on_a_bare_await_inside_the_handler():
    """Awaiting directly in a cancellation handler raises again immediately; the write must be shielded."""
    helper = Path(ROOT / "apps" / "api" / "gds_api" / "mission_reaper.py").read_text(encoding="utf-8")
    body = helper.split("async def fail_mission_on_cancellation", 1)[1].split("def _configured_tenants", 1)[0]
    assert "asyncio.create_task(" in body
    assert "asyncio.shield(" in body
