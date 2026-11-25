"""A capability whose tool takes a LIST of targets must still derive a target.

Measured 25 Nov 2026: coordinate_pentest_engagement takes `targets` as a list, _derive_target only scanned
scalar keys, the broker saw target_type=None and refused "The requested target type is not valid".
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "api"))
from gds_api.reasoning.governed_tools import _derive_target


class Cap:
    target_types = ("domain", "ip")


def test_list_of_targets_derives_the_first():
    ttype, ref = _derive_target({"targets": ["www.example.com", "app.example.com"]}, Cap())
    assert ref == "www.example.com", (ttype, ref)


def test_scalar_target_still_wins():
    _, ref = _derive_target({"target": "one.example.com", "targets": ["two.example.com"]}, Cap())
    assert ref == "one.example.com"


def test_empty_list_derives_nothing():
    assert _derive_target({"targets": []}, Cap()) == (None, None)


def test_no_target_types_still_returns_none():
    class NoTarget:
        target_types = ("none",)
    assert _derive_target({"targets": ["x.example.com"]}, NoTarget()) == (None, None)
