"""P0-2 guard: a routed page may not ask for an entity the adapter cannot serve, unless it is on the
recorded list with a reason.

MEASURED 23 Nov 2026: 102 routed page modules reach 317 modules and ask for 96 entity names at 382 call
sites; 44 of those names have no route behind them at 74 sites. An unserved read returns [], so each of
those panels renders "none" or "0" over data nobody read. Fixing 74 call sites is a queue; this test is
what stops the queue growing while it is worked, and it fails in BOTH directions so a name that gets a
route must be removed from the list rather than left behind.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
WEB = ROOT / "apps/web/src"
ADAPTER = WEB / "api/base44Client.js"
APP = WEB / "App.jsx"
BASELINE = ROOT / "apps/web/.entity-coverage-baseline.json"


def served_names() -> set[str]:
    """Every top-level key of an adapter object literal that carries a path:.

    A regex over the whole file is not enough: entries span several lines, so each object is brace-matched
    from its key to its closing brace before deciding whether it declares a route.
    """
    src = ADAPTER.read_text()
    names = set()
    for m in re.finditer(r"(?m)^  ([A-Za-z_][A-Za-z0-9_]*):\s*\{", src):
        i, depth = m.end() - 1, 0
        while i < len(src):
            if src[i] == "{":
                depth += 1
            elif src[i] == "}":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        if "path:" in src[m.end():i]:
            names.add(m.group(1))
    return names


def _resolve(spec: str, base: pathlib.Path) -> pathlib.Path | None:
    if spec.startswith("@/"):
        p = WEB / spec[2:]
    elif spec.startswith("."):
        p = (base.parent / spec).resolve()
    else:
        return None
    for cand in (p, p.with_suffix(".jsx"), p.with_suffix(".js"), p / "index.jsx"):
        if cand.exists() and cand.is_file():
            return cand
    return None


def routed_modules() -> set[pathlib.Path]:
    seeds = {m.group(1) for m in re.finditer(r"from\s+['\"](?:@/|\./)(pages/[^'\"]+)['\"]", APP.read_text())}
    seen, frontier = set(), []
    for s in seeds:
        f = _resolve("./" + s, APP)
        if f:
            frontier.append((f, 0))
    while frontier:
        f, d = frontier.pop()
        if f in seen:
            continue
        seen.add(f)
        if d >= 2:
            continue
        for spec in re.findall(r"from\s+['\"]([^'\"]+)['\"]", f.read_text(errors="ignore")):
            c = _resolve(spec, f)
            if c and ("/pages/" in str(c) or "/components/" in str(c)):
                frontier.append((c, d + 1))
    return seen


def requested_names() -> dict[str, int]:
    used: dict[str, int] = {}
    for f in routed_modules():
        for n in re.findall(r"base44\.entities\.([A-Za-z0-9_]+)", f.read_text(errors="ignore")):
            used[n] = used.get(n, 0) + 1
    return used


def baseline() -> dict:
    assert BASELINE.exists(), "the coverage baseline is missing; it records every unserved name with a reason"
    return json.loads(BASELINE.read_text())


def test_the_guard_measures_something():
    assert len(served_names()) > 50, "the adapter parse found almost nothing, so this test would pass vacuously"
    assert len(routed_modules()) > 100, "the route walk found almost nothing"
    assert len(requested_names()) > 50


def test_no_new_unserved_entity_appears_on_a_routed_page():
    base = baseline()
    allowed = set(base["unserved"])
    unserved = {n: c for n, c in requested_names().items() if n not in served_names()}
    new = sorted(set(unserved) - allowed)
    assert not new, (
        "these entity names are asked for by a routed page with no route behind them and are not on the "
        f"recorded list: {new}. Either serve the name, or add it to .entity-coverage-baseline.json with the "
        "reason it cannot be served yet."
    )


def test_a_name_that_gets_served_is_removed_from_the_list():
    """The list must shrink deliberately. Leaving a served name in it hides that the work was done."""
    still_listed = set(baseline()["unserved"]) & served_names()
    assert not still_listed, f"these names are now served and must leave the baseline: {sorted(still_listed)}"


def test_every_recorded_name_carries_a_reason():
    for name, reason in baseline()["unserved"].items():
        assert isinstance(reason, str) and len(reason) > 20, f"{name} has no usable reason"
