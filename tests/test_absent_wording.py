"""The absent-store wording must come from the measurement, not from a module's imagination.

A module that reads an entity the API does not serve used to render "No phases logged yet" or a zero. That is a claim
about the world - "we looked, there are none" - made over a store that does not exist. The fix is one shipped map of
reasons plus a shared notice, and these tests keep the map honest.
"""
from __future__ import annotations

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
MAP = ROOT / "apps/web/src/api/absentStores.js"
COMPONENT = ROOT / "apps/web/src/components/platform/AbsentStore.jsx"
BASELINE = ROOT / "apps/web/.entity-coverage-baseline.json"


def shipped() -> dict[str, str]:
    src = MAP.read_text()
    return dict(re.findall(r'(?m)^  ([A-Za-z_][A-Za-z0-9_]*): "(.*)",$', src))


def baseline_unserved() -> dict[str, str]:
    return json.loads(BASELINE.read_text())["unserved"]


def test_the_shipped_map_covers_exactly_the_names_the_guard_measures():
    """Neither a missing reason nor an invented one: the two sets must be identical."""
    assert set(shipped()) == set(baseline_unserved())


def test_every_reason_matches_the_measured_reason():
    for name, reason in shipped().items():
        assert reason == baseline_unserved()[name].replace('"', '\\"'), name


def test_every_reason_says_what_is_missing_rather_than_that_nothing_was_found():
    for name, reason in shipped().items():
        assert len(reason) > 20, f"{name} has no real explanation"
        # a reason must name the absence, not assert an emptiness
        assert not reason.lower().startswith("no records"), name


def test_the_component_reads_the_shipped_map_and_renders_nothing_for_a_served_name():
    src = COMPONENT.read_text()
    assert 'from "@/api/absentStores"' in src
    assert "absentStoreReason(entity)" in src
    assert "if (!reason) return null" in src


def test_the_map_is_generated_so_it_cannot_be_hand_edited_into_a_lie():
    src = MAP.read_text()
    assert "GENERATED from apps/web/.entity-coverage-baseline.json" in src
    assert "tests/test_absent_store_wording.py" in src
