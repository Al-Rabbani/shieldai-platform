"""Item 14: a UI analysis action must not be able to write to the estate.

Measured live: clicking AI Fix on a container finding created security_findings row 1025 (scanner "manual", no CVE) because
the reasoning agent chose store_finding, moving the open count 849 -> 850. The public reasoning route now offers no
mutating tool unless the caller asks for writes.
"""
from __future__ import annotations

import inspect

from gds_api.reasoning.agent_loop import AgenticLoop
from gds_api.reasoning.routes import MissionRequest
from gds_api.reasoning.tool_definitions import (
    WRITE_TOOL_NAMES,
    get_tool_definitions,
    read_only_tools,
)


def test_the_public_route_is_read_only_unless_asked():
    assert MissionRequest(goal="explain this finding").allow_writes is False
    assert MissionRequest(goal="x", allow_writes=True).allow_writes is True


def test_mutating_tools_are_named_and_dropped():
    assert "store_finding" in WRITE_TOOL_NAMES
    tools = get_tool_definitions()
    names = {t["function"]["name"] for t in tools}
    assert names & WRITE_TOOL_NAMES, "the registry must actually contain a writer for this to matter"
    kept = {t["function"]["name"] for t in read_only_tools(tools)}
    assert not (kept & WRITE_TOOL_NAMES), f"read-only tools still contain {kept & WRITE_TOOL_NAMES}"
    assert "get_findings" in kept, "reading must survive the filter"


def test_the_loop_honours_the_flag():
    src = inspect.getsource(AgenticLoop.run)
    assert "if not self.allow_writes:" in src, "the loop must filter when told"
    assert "read_only_tools(tools)" in src
    # tool_names must follow the filtered list, not the unfiltered registry, or the model is told about a tool it lacks
    assert 'tool_names = [t["function"]["name"] for t in tools]' in src
    init = inspect.getsource(AgenticLoop.__init__)
    assert "allow_writes: bool = True" in init, "internal callers keep writing by default"
