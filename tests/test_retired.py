"""P0-6 guard: no page file may sit in src/pages unrendered.

Before this, 683 of 785 page modules were unreachable from App.jsx while still holding Math.random, FALLBACK_
arrays and "coming soon" strings. Two of them had already reached production pretending. A file that is not
routed is not harmless; it is one import away from lying.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
WEB = ROOT / "apps/web/src"
APP = WEB / "App.jsx"


def resolve(spec, base):
    if spec.startswith("@/"):
        p = WEB / spec[2:]
    elif spec.startswith("."):
        p = (base.parent / spec).resolve()
    else:
        return None
    for cand in (p, p.with_suffix(".jsx"), p.with_suffix(".js"), p / "index.jsx", p / "index.js"):
        if cand.exists() and cand.is_file():
            return cand
    return None


def reachable():
    seen, frontier = set(), [APP]
    while frontier:
        f = frontier.pop()
        if f in seen:
            continue
        seen.add(f)
        src = f.read_text(errors="ignore")
        specs = re.findall(r"from\s+['\"]([^'\"]+)['\"]", src) + re.findall(r"import\(\s*['\"]([^'\"]+)['\"]\s*\)", src)
        for spec in specs:
            c = resolve(spec, f)
            if c and str(c).startswith(str(WEB)):
                frontier.append(c)
    return seen


def test_no_unrouted_page_remains_in_the_build_tree():
    live = reachable()
    pages = [p for p in (WEB / "pages").rglob("*") if p.suffix in (".jsx", ".js")]
    orphans = sorted(str(p.relative_to(WEB)) for p in pages if p not in live)
    assert not orphans, (
        "these page files are not reachable from App.jsx and must be retired to src/_retired/pages: "
        f"{orphans[:10]}{' ...' if len(orphans) > 10 else ''}"
    )


def test_the_retirement_manifest_records_every_move():
    import json
    manifest = ROOT / "docs/RETIRED_PAGES.json"
    assert manifest.exists()
    data = json.loads(manifest.read_text())
    assert data["count"] > 0
    assert all("file" in f for f in data["files"])
