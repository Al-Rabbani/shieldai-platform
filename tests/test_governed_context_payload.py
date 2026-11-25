"""Mission-scoped tools must receive the governed mission and actor.

Measured 25 Nov 2026: coordinate_pentest_engagement refused MISSION_REQUIRED because engagements.mission_id
is NOT NULL and the wrapper never passed the mission it already knew.
"""
import pathlib

SRC = (pathlib.Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api"
       / "reasoning" / "governed_tools.py").read_text()


def test_mission_and_actor_are_supplied_to_the_tool():
    assert 'payload.setdefault("mission_id", str(mid))' in SRC
    assert 'payload.setdefault("_actor_id", str(uid))' in SRC


def test_an_explicit_value_still_wins():
    # setdefault, not assignment: a caller that supplies its own mission must not be overridden
    assert 'payload["mission_id"] =' not in SRC
