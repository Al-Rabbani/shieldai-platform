"""Every permission a route guards must be holdable by some role.

MEASURED 25 Nov 2026: require_permission() named 78 distinct permissions across the API and 25 of them appeared in no
role's list. CATALOGUE_PERMISSIONS is derived from ROLE_PERMISSIONS, so POST /admin/roles rejected those names as unknown
and no operator could grant them; require_permission() passes on the permission OR a "*" wildcard, so the routes were
reachable only by a wildcard role. That is how the entire Co-Pilot came to be admin-only (copilot:orchestrate,
migration 080). This test makes the class impossible to reintroduce: a new guard must ship with a role that holds it.
"""
from __future__ import annotations

import pathlib
import re

API = pathlib.Path(__file__).resolve().parents[1] / "apps/api"
GUARD = re.compile(r'require_permission\(\s*"([^"]+)"')


def _guards() -> dict[str, set[str]]:
    found: dict[str, set[str]] = {}
    for f in (API / "gds_api").rglob("*.py"):
        if "__pycache__" in str(f):
            continue
        for m in GUARD.finditer(f.read_text(errors="ignore")):
            found.setdefault(m.group(1), set()).add(f.name)
    return found


def _catalogue() -> set[str]:
    import sys

    sys.path.insert(0, str(API))
    from gds_api.seed_data import ROLE_PERMISSIONS  # noqa: PLC0415

    return {p for perms in ROLE_PERMISSIONS.values() for p in perms}


def test_every_guarded_permission_is_holdable():
    catalogue = _catalogue()
    unholdable = {
        perm: sorted(files) for perm, files in _guards().items()
        if perm not in catalogue and perm != "*"
    }
    assert not unholdable, (
        "these routes are guarded by a permission no role holds, so only a wildcard role can reach them "
        "and POST /admin/roles rejects the name as unknown: "
        + "; ".join(f"{p} ({', '.join(f)})" for p, f in sorted(unholdable.items()))
    )


def test_the_catalogue_is_not_empty_and_stays_sane():
    catalogue = _catalogue()
    assert len(catalogue) >= 60, f"catalogue shrank to {len(catalogue)}; roles lost permissions"
    # every catalogue entry must look like resource:action, so a typo cannot silently create a dead grant
    malformed = [p for p in catalogue if not re.fullmatch(r"[a-z_]+(:[a-z_-]+)+", p)]
    assert not malformed, f"malformed permission names: {sorted(malformed)[:10]}"


def test_the_guard_actually_finds_guards():
    # a regex that stopped matching would make the first test pass vacuously
    assert len(_guards()) >= 50, "the guard scan found almost nothing, so the check above proves nothing"
