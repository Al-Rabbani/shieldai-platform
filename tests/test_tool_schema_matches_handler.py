"""A tool must actually read every parameter its schema declares as required.

Measured 25 Nov 2026: six of the twelve security scanners declared `target` in their reasoning
schema but read `url`, `domain` or `path` in the handler, so a model following its own schema got
"url required" every single time. The tools were not broken; the contract was.
"""
from __future__ import annotations

import inspect
import re

from gds_api.reasoning.tool_definitions import _ALL_TOOL_DEFINITIONS
from gds_api.tool_gateway import TOOL_REGISTRY


def _schema() -> dict[str, list[str]]:
    out = {}
    for entry in _ALL_TOOL_DEFINITIONS:
        fn = entry["function"]
        params = fn.get("parameters") or {}
        out[fn["name"]] = list(params.get("required") or [])
    return out


def _read_keys(handler) -> set[str]:
    src = inspect.getsource(handler)
    keys = set(re.findall(r'params\.get\(\s*"([^"]+)"', src))
    keys |= set(re.findall(r'params\[\s*"([^"]+)"\s*\]', src))
    keys |= set(re.findall(r'\.get\(\s*"([^"]+)"', src))
    return keys


def test_every_required_parameter_is_read_by_its_handler():
    schema = _schema()
    offenders = []
    for name, handler in TOOL_REGISTRY.items():
        required = schema.get(name) or []
        if not required:
            continue
        read = _read_keys(handler)
        missing = [r for r in required if r not in read]
        if missing:
            offenders.append(f"{name} declares {missing} but reads {sorted(read)[:6]}")
    assert not offenders, "tools whose declared parameter is never read: " + "; ".join(offenders)


def test_scanners_accept_target_because_that_is_what_their_schema_promises():
    for name in ("semgrep_scan", "sqlmap_scan", "subfinder_scan", "ffuf_scan", "gobuster_scan", "wpscan_scan"):
        src = inspect.getsource(TOOL_REGISTRY[name])
        assert 'params.get("target")' in src, f"{name} does not read the declared target parameter"
