"""Run the fixed, read-only GDS sandbox cases and print 23 honest outcomes.

Requires BRIDGE_API_KEY and GDS_ASSESSMENT_* in the environment. Safe cases
create real missions and capability receipts. Unsupported roles never execute.
"""
import asyncio
import json
import os

from gds_api.bridge.fleet_assessment import assessment_plan
from gds_api.bridge.super_agent_bridge import assess_registered_agent


async def main():
    key = os.environ.get("BRIDGE_API_KEY")
    if not key:
        raise SystemExit("BRIDGE_API_KEY missing")
    results = []
    for row in assessment_plan():
        result = dict(row)
        if row["assessment_status"] == "read_only_case_available":
            try:
                outcome = await assess_registered_agent(
                    row["agent_id"], authorization="Bearer " + key
                )
                result.update({"assessment_status": outcome["verification_status"],
                               "mission_id": outcome["mission_id"], "receipt": outcome["receipt"],
                               "tool_success": outcome["tool_result"].get("success") if isinstance(outcome["tool_result"], dict) else False,
                               "error_code": outcome["tool_result"].get("code") if isinstance(outcome["tool_result"], dict) else None})
            except Exception as exc:  # report the failure and continue to the next role
                result.update({"assessment_status": "not_verified", "error_code": type(exc).__name__})
        results.append(result)
    print(json.dumps({"scope": "gds-assessment-sandbox", "total": len(results),
                      "tool_executed": sum(r["assessment_status"] == "tool_executed" for r in results),
                      "results": results}, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
