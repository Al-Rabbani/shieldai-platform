"""Invariants for the NIS2 catalog and for the auth-declaration collector.

NIS2 publishes no official control list, so this catalog is our own decomposition of Articles 20, 21 and 23.
That makes its honesty entirely a matter of construction: every control must either be evidenced by a
collector that actually exists, or say in writing what evidence is missing. A control with neither is
indistinguishable from one nobody thought about.
"""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location(
    "assess_compliance", ROOT / "scripts" / "ops" / "assess_compliance.py"
)
assess = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(assess)

NIS2 = [c for c in assess.CATALOG if c[0] == "nis2"]


def test_the_catalog_covers_the_three_articles_it_claims():
    assert len(NIS2) == 75, f"catalog drifted: {len(NIS2)} controls"
    refs = [c[1] for c in NIS2]
    assert len(set(refs)) == len(refs), "duplicate control refs"
    for ref in refs:
        assert ref.startswith(("Art.20", "Art.21", "Art.23")), f"{ref} is outside the claimed articles"


def test_every_control_is_either_evidenced_or_explains_why_not():
    collectors = set(assess.COLLECTORS)
    for _fw, ref, _title, _cat, check, _sev, basis in NIS2:
        if check:
            assert check in collectors, f"{ref} names a collector that does not exist: {check}"
        else:
            assert basis and len(basis) > 25, f"{ref} has no collector and no explanation"


def test_the_framework_is_declared_as_an_eu_instrument_with_our_own_count():
    entry = next(f for f in assess.FRAMEWORKS if f[0] == "nis2")
    assert entry[4] == "EU", "NIS2 is an EU directive and must not be filed elsewhere"
    assert "no official control list" in entry[5], (
        "the source must say the count is ours, because NIS2 publishes no official control list"
    )


def test_public_routes_are_not_counted_as_undeclared():
    # A missing security key means nobody decided; an empty list means deliberately public. Collapsing the
    # two made this control fail forever on /auth/login.
    spec = {"paths": {
        "/auth/login": {"post": {"security": []}},
        "/findings": {"get": {"security": [{"AccessCookie": []}]}},
        "/forgotten": {"get": {}},
    }}
    counts = assess.classify_operations(spec)
    assert counts["public"] == 1
    assert counts["declared"] == 1
    assert counts["missing"] == 1
    assert counts["missing_operations"] == ["GET /forgotten"]
    assert counts["operations"] == 3
