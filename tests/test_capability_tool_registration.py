"""Every declared capability's tool must exist in the tool registry.

`capabilities/catalog.py` declares capabilities with the tool ids they need, and
`repository_api._REPOSITORY_CAPABILITY_TOOLS` maps repository capabilities to tool names. The
capability broker resolves those names through `tool_gateway.TOOL_REGISTRY` and raises KeyError
when one is missing - which the API reports as a bare 500 (that is exactly how
`discover_cloud_environment` and `evaluate_cloud_posture` were broken, and how all ten repository
capabilities were broken).

This test is deliberately static: it parses the source instead of importing it, so it needs no
database and no environment, and it fails with the exact missing name before anything is deployed.
"""
from __future__ import annotations

import ast
import unittest
from pathlib import Path

API = Path(__file__).resolve().parents[1] / "apps/api/gds_api"


def _registry_keys() -> set[str]:
    """The string keys of the TOOL_REGISTRY dict literal in tool_gateway.py."""
    tree = ast.parse((API / "tool_gateway.py").read_text())
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == "TOOL_REGISTRY" for t in node.targets
        ):
            if isinstance(node.value, ast.Dict):
                return {k.value for k in node.value.keys if isinstance(k, ast.Constant)}
    raise AssertionError("TOOL_REGISTRY dict literal not found in tool_gateway.py")


def _catalog_tool_ids() -> set[str]:
    """Every string in a `required_tool_ids=(...)` tuple across the capability catalogue."""
    found: set[str] = set()
    for path in API.rglob("*.py"):
        text = path.read_text()
        if "required_tool_ids" not in text:
            continue
        tree = ast.parse(text)
        for node in ast.walk(tree):
            if isinstance(node, ast.keyword) and node.arg == 'required_tool_ids':
                for element in getattr(node.value, "elts", []):
                    if isinstance(element, ast.Constant) and isinstance(element.value, str):
                        found.add(element.value)
    return found


def _repository_capability_tools() -> set[str]:
    """The tool names in repository_api._REPOSITORY_CAPABILITY_TOOLS."""
    tree = ast.parse((API / "repository_api.py").read_text())
    for node in tree.body:
        if isinstance(node, ast.AnnAssign) and getattr(node.target, "id", "") == "_REPOSITORY_CAPABILITY_TOOLS":
            if isinstance(node.value, ast.Dict):
                names = set()
                for value in node.value.values:
                    # Each entry is (capability_key, tool_name): only the tool name is looked up in
                    # TOOL_REGISTRY. Taking both would report capability keys as missing tools.
                    if isinstance(value, ast.Tuple) and len(value.elts) >= 2:
                        tool = value.elts[1]
                        if isinstance(tool, ast.Constant) and isinstance(tool.value, str):
                            names.add(tool.value)
                return names
    raise AssertionError("_REPOSITORY_CAPABILITY_TOOLS not found in repository_api.py")


# Declared capabilities whose tool is NOT implemented yet. This is a measured list, not a
# convenience: each name below currently makes the capability broker raise KeyError, so asking for
# that capability returns a 500. It is checked in both directions - a new gap fails the test, and
# so does an entry that has since been implemented - so it can only ever shrink.
#
# Measured 17 Nov 2026 against the real registry; nothing close exists for any of them:
#   check_credential_leaks           darkweb/credential_leak tables -> real implementation
#   detect_identity_threats          platform_data + identity_threats -> real implementation
#   start_mission_plan/commit_mission_plan         kernel plan tables
#   start_engineering_session/commit_engineering_session   no schema exists yet
KNOWN_UNIMPLEMENTED_TOOLS = {
    "check_credential_leaks",
    "commit_engineering_session",
    "commit_mission_plan",
    "detect_identity_threats",
    "start_engineering_session",
    "start_mission_plan",
}


class CapabilityToolRegistrationTests(unittest.TestCase):
    def test_every_catalog_tool_is_registered_or_a_known_gap(self):
        registered = _registry_keys() | set(_dynamically_registered())
        new_gaps = sorted(_catalog_tool_ids() - registered - KNOWN_UNIMPLEMENTED_TOOLS)
        self.assertEqual(
            new_gaps, [],
            f"capabilities declare tools that are in neither TOOL_REGISTRY nor the known-gap list: {new_gaps}",
        )

    def test_known_gap_list_does_not_rot(self):
        registered = _registry_keys() | set(_dynamically_registered())
        implemented = sorted(KNOWN_UNIMPLEMENTED_TOOLS & registered)
        self.assertEqual(
            implemented, [], f"these are registered now - remove them from KNOWN_UNIMPLEMENTED_TOOLS: {implemented}"
        )

    def test_every_repository_capability_tool_is_registered(self):
        registered = _registry_keys() | set(_dynamically_registered())
        missing = sorted(_repository_capability_tools() - registered)
        self.assertEqual(missing, [], f"repository capabilities map to unregistered tools: {missing}")


def _dynamically_registered() -> set[str]:
    """Keys added via `TOOL_REGISTRY.update(HANDLERS)` from another module.

    Specifically gds_api.repository.tools.REPOSITORY_TOOL_HANDLERS. Parsed statically, including
    which module supplies it, so a renamed or dropped group shows up as missing rather than passing
    on a stale reading.
    """
    gateway = (API / "tool_gateway.py").read_text()
    names: set[str] = set()
    for node in ast.walk(ast.parse(gateway)):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "update"
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "TOOL_REGISTRY"
        ):
            for arg in node.args:
                source = _handler_dict_source(arg)
                names |= source
    return names


def _handler_dict_source(node: ast.AST) -> set[str]:
    module_name = None
    attr_name = None
    if isinstance(node, ast.Name):
        attr_name = node.id
    elif isinstance(node, ast.Attribute):
        attr_name = node.attr
    if attr_name is None:
        return set()

    for path in API.rglob("*.py"):
        text = path.read_text()
        if f"{attr_name}:" not in text and f"{attr_name} =" not in text:
            continue
        tree = ast.parse(text)
        for sub in tree.body:
            targets = []
            if isinstance(sub, ast.AnnAssign) and getattr(sub.target, "id", None) == attr_name:
                targets = [sub.value]
            elif isinstance(sub, ast.Assign) and any(
                getattr(t, "id", None) == attr_name for t in sub.targets
            ):
                targets = [sub.value]
            for value in targets:
                if isinstance(value, ast.Dict):
                    return {k.value for k in value.keys if isinstance(k, ast.Constant)}
    return set()


if __name__ == "__main__":
    unittest.main()
