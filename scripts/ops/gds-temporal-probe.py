#!/usr/bin/env python3
"""Functional Temporal probe: a real gRPC round-trip, not a TCP open.

The exit code is a contract with gds-service-watch.sh, because a slow answer and a dead server are different facts and
were being treated as the same one:

    0  healthy
    2  reachable but SLOW - the gRPC call exceeded its deadline, which is a load symptom, not an outage
    1  refused / unreachable - the frontend is genuinely not answering
    3  any other failure (import, unexpected error)

Why the distinction matters, measured on 22 Nov 2026: the watchdog restarted this container twice in one evening
(21:25, 21:40) and kept failing its probe afterwards (21:45, 21:50, 22:15, 22:20), while Temporal's own log held ZERO
error lines across those same 40 minutes and eight of eight manual runs returned in under a second. Restarting a healthy
Temporal cancels in-flight activities, so a timeout under load was costing real work to "fix" a server that was fine.

Two attempts with a short backoff, and generous per-phase deadlines: a single dropped handshake through the docker proxy
is not evidence of anything.
"""
from __future__ import annotations

import asyncio
import os
import sys

ADDRESS = os.environ.get("GDS_TEMPORAL_ADDRESS", "127.0.0.1:7233")
ATTEMPTS = 2
CONNECT_TIMEOUT = 20.0
CALL_TIMEOUT = 20.0
BACKOFF = 3.0

EXIT_OK = 0
EXIT_REFUSED = 1
EXIT_SLOW = 2
EXIT_OTHER = 3


async def _once(address: str):
    from temporalio.api.workflowservice.v1 import GetSystemInfoRequest
    from temporalio.client import Client

    client = await asyncio.wait_for(Client.connect(address), timeout=CONNECT_TIMEOUT)
    return await asyncio.wait_for(
        client.workflow_service.get_system_info(GetSystemInfoRequest()), timeout=CALL_TIMEOUT
    )


def _classify(exc: BaseException) -> tuple[int, str]:
    if isinstance(exc, (asyncio.TimeoutError, TimeoutError)):
        return EXIT_SLOW, "SLOW"
    text = str(exc).lower()
    if "refused" in text or "connectionrefused" in type(exc).__name__.lower():
        return EXIT_REFUSED, "REFUSED"
    if "unavailable" in text or "not enough hosts" in text:
        return EXIT_REFUSED, "UNAVAILABLE"
    return EXIT_OTHER, "ERROR"


async def main() -> int:
    last_code, last_kind, last_detail = EXIT_OTHER, "ERROR", "no attempt ran"
    for attempt in range(1, ATTEMPTS + 1):
        try:
            info = await _once(ADDRESS)
        except Exception as exc:  # noqa: BLE001 - the class of failure is the whole point of this probe
            last_code, last_kind = _classify(exc)
            last_detail = f"{type(exc).__name__}: {str(exc)[:110]}"
            if attempt < ATTEMPTS:
                await asyncio.sleep(BACKOFF)
                continue
        else:
            print(
                f"OK temporal server={info.server_version} "
                f"capabilities_present={bool(info.capabilities)} address={ADDRESS} attempt={attempt}"
            )
            return EXIT_OK
    print(f"{last_kind} temporal address={ADDRESS} attempts={ATTEMPTS} {last_detail}")
    return last_code


def _exit(code: int) -> None:
    """Leave without running interpreter teardown.

    Measured on the live host, 22 Nov 2026: 1 run in 30 printed "OK temporal server=1.29.3" and then died with SIGABRT
    (exit 134, core dumped) during shutdown, so gds-service-watch.sh recorded "FAIL temporal (consecutive 1) rc=134
    reason=OK temporal server=1.29.3..." - a successful check counted as a strike. On a five-minute cron that is about
    nine false failures a day, which is what kept restarting a healthy Temporal. The abort happens after the verdict is
    printed, so the verdict is sound; only the teardown is unsafe. Skipping it keeps the exit code honest.
    """
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(code)


_exit(asyncio.run(main()))
