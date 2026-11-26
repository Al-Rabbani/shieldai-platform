"""Recording a scan's findings must never decide whether the scan succeeded.

The first version of this hook sat inside the same try that wraps the governed execution, so an ImportError, a reset
connection or a cancellation during the write would have taken the except branch and returned EXECUTION_FAILED -
discarding a successful scan and every finding it had just produced. That is the exact loss the persistence work
exists to stop, reintroduced by its own patch, and it would have written a bookkeeping fault into the governance trace
as a tool failure so the SLO blamed the scanner.
"""
import asyncio
import pathlib

from gds_api.reasoning import governed_tools

REPO = pathlib.Path("/opt/gds-os")


def test_a_raising_persistence_keeps_the_scan_result():
    async def boom(*_a, **_k):
        raise ConnectionResetError("the database went away mid-write")

    original = governed_tools.persist_scan_output if hasattr(governed_tools, "persist_scan_output") else None
    import gds_api.scanner_persistence as sp
    real = sp.persist_scan_output
    sp.persist_scan_output = boom
    try:
        out = asyncio.run(governed_tools._persist_findings_safely(
            "t", "nuclei_scan", "target", {"findings": [{"info": {"name": "x"}}]}))
    finally:
        sp.persist_scan_output = real
    assert out["persisted"] is False
    assert "ConnectionResetError" in out["reason"]
    assert "the scan succeeded" in out["note"], "the note must say the findings are still in the result"


def test_an_import_failure_is_also_contained():
    # A missing module must not propagate: the helper imports inside its own try.
    body = (REPO / "apps/api/gds_api/reasoning/governed_tools.py").read_text()
    helper = body.split("async def _persist_findings_safely(")[1].split("async def execute_governed_tool(")[0]
    assert "from gds_api.scanner_persistence import persist_scan_output" in helper
    import_at = helper.find("from gds_api.scanner_persistence")
    try_at = helper.find("try:")
    assert try_at != -1 and import_at > try_at, "the import must be inside the try"


def test_the_hook_is_not_inside_the_execution_try():
    body = (REPO / "apps/api/gds_api/reasoning/governed_tools.py").read_text()
    tail = body.split("result = await execute_capability_request(")[1]
    # Between the call and the persistence hook there must be no except clause: the hook cannot be in that try.
    between = tail.split("_persist_findings_safely(")[0]
    assert "except Exception" not in between, (
        "the persistence hook sits inside the execution try, so its failure would be reported as a failed scan"
    )
