#!/usr/bin/env python3
"""Functional Temporal probe: a real gRPC round-trip, not a TCP open."""
import asyncio, sys

async def main() -> int:
    try:
        from temporalio.client import Client
        from temporalio.api.workflowservice.v1 import GetSystemInfoRequest
        c = await asyncio.wait_for(Client.connect("127.0.0.1:7233"), timeout=9)
        info = await asyncio.wait_for(
            c.workflow_service.get_system_info(GetSystemInfoRequest()), timeout=9)
        print(f"OK temporal server={info.server_version} capabilities_present={bool(info.capabilities)}")
        return 0
    except Exception as e:
        print(f"FAIL temporal {type(e).__name__}: {str(e)[:90]}")
        return 1

sys.exit(asyncio.run(main()))
