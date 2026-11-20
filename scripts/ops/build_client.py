#!/usr/bin/env python3
"""Build the served client (gap C1).

There is no bundler here and pretending otherwise would be theatre: this host has no node, and the client
is a single hand-maintained file. What the file genuinely needs is a build step that refuses to publish a
broken one. Until now deploy installed the source straight to /var/www, so a typo in an element id, a route
with no section, or a stray hex colour would ship silently and only surface as a blank panel in a browser.

So this build does what this stack actually needs: it validates the invariants the page depends on, writes
a dist copy, and records a manifest with hashes so the served artifact is identifiable. deploy installs the
dist and fails if the served bytes do not match the manifest.

Each check below corresponds to a failure that has already happened once in this project:

  1. exactly one inline <script>, no external script/link tags - the page must carry no third-party code
  2. the script parses in the embedded JS engine - a syntax error must not reach production
  3. every getElementById('x') target exists in the markup - a missing id is a silently dead panel
  4. every ROUTES key has a section id="page-<key>" - a route with no section renders nothing
  5. every data-route in the nav is a known route - a nav link that routes nowhere
  6. no hex colour outside the :root token block - C2 made tokens the only place colour is defined, and
     before that the same severity wore two different colours in a badge and in a chart

Exit code is non-zero if any check fails, which is what makes deploy roll back.
"""

import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "web" / "gds_app.html"
DIST = ROOT / "web" / "dist"


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _script_parses(script: str) -> tuple[bool, str]:
    """Parse the inline script with a real JavaScript engine. Returns (ok, engine_or_error)."""
    import shutil
    import subprocess
    import tempfile

    node = shutil.which("node")
    if node:
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as handle:
            handle.write(script)
            path = handle.name
        try:
            result = subprocess.run([node, "--check", path], capture_output=True, text=True)
            if result.returncode == 0:
                return True, "node"
            detail = (result.stderr or "").strip().splitlines()
            return False, f"node: {detail[0][:160] if detail else 'syntax error'}"
        finally:
            Path(path).unlink(missing_ok=True)

    try:
        sys.path.insert(0, str(ROOT / "apps" / "api"))
        import dukpy  # noqa: PLC0415
    except ImportError:
        return False, "no JavaScript engine available (install node)"

    # Parsed, not executed: the body is wrapped in a function so the engine compiles every statement
    # without running any of it. Evaluating it directly needs window/document.
    try:
        dukpy.evaljs("var __parse_only = function(){\n" + script + "\n}; 1;")
        return True, "dukpy"
    except Exception as exc:  # noqa: BLE001 - any parse failure is fatal
        return False, f"dukpy: {str(exc).splitlines()[0][:160]}"


def validate(html: str) -> tuple[list[str], dict]:
    """Return (problems, facts). Problems are fatal; facts are recorded in the manifest."""
    problems: list[str] = []
    facts: dict = {}

    scripts = re.findall(r"<script\b[^>]*>(.*?)</script>", html, re.S)
    facts["inline_scripts"] = len(scripts)
    if len(scripts) != 1:
        problems.append(f"expected exactly 1 inline script, found {len(scripts)}")
    if re.search(r"<script[^>]+src=", html):
        problems.append("external <script src=...> found; the client must not load third-party code")
    if re.search(r"<link[^>]+href=\"http", html):
        problems.append("external stylesheet found; the client must not load third-party CSS")

    script = scripts[0] if scripts else ""

    # 2. the script must parse
    #
    # This check used to depend on dukpy, which is not installed here, so it printed a warning and skipped
    # itself on every build - the build said it verified the script and verified nothing. dukpy is also ES5,
    # so the optional chaining the client legitimately uses would have failed it anyway. Node parses the
    # language the browser actually runs, and there is now no "skipped" outcome: if no engine can check the
    # script, the build fails, because a syntax error in this one file blanks every view at once.
    parsed, how = _script_parses(script)
    facts["script_parse"] = "ok" if parsed else "failed"
    facts["script_parse_engine"] = how
    if not parsed:
        problems.append(f"script does not parse ({how})")

    markup = html.split("<script", 1)[0]

    # 3. no dead element references
    defined = set(re.findall(r'id="([^"]+)"', markup))
    referenced = set(re.findall(r"getElementById\('([^']+)'\)", script))
    dead = sorted(referenced - defined)
    facts["element_ids_defined"] = len(defined)
    facts["element_ids_referenced"] = len(referenced)
    if dead:
        problems.append(f"getElementById targets with no element: {dead}")

    # 4. every route has a section
    routes_match = re.search(r"const ROUTES = \{(.*?)\};", script, re.S)
    routes = re.findall(r"(\w+):\s*'[^']*'", routes_match.group(1)) if routes_match else []
    facts["routes"] = routes
    missing_sections = [r for r in routes if f'id="page-{r}"' not in markup]
    if missing_sections:
        problems.append(f"routes with no page section: {missing_sections}")

    # 5. every nav link points at a known route
    nav_routes = re.findall(r'data-route="(\w+)"', html)
    unknown = sorted({r for r in nav_routes if r not in routes})
    facts["nav_routes"] = sorted(set(nav_routes))
    if unknown:
        problems.append(f"nav links to unknown routes: {unknown}")

    # 6. colour lives only in the token block
    root_block = re.search(r":root\{.*?\}", html, re.S)
    without_root = html.replace(root_block.group(0), "", 1) if root_block else html
    stray = re.findall(r"#[0-9a-fA-F]{3,6}", without_root)
    facts["hex_outside_tokens"] = len(stray)
    if stray:
        problems.append(f"hex colours outside the token block: {sorted(set(stray))}")

    return problems, facts


def build() -> int:
    html = SOURCE.read_text(encoding="utf-8")
    problems, facts = validate(html)
    if problems:
        print("  CLIENT BUILD FAILED")
        for problem in problems:
            print(f"    - {problem}")
        return 1

    DIST.mkdir(parents=True, exist_ok=True)
    data = html.encode("utf-8")
    (DIST / "gds_app.html").write_bytes(data)
    manifest = {
        "built_at": datetime.now(timezone.utc).isoformat(),
        "source": "web/gds_app.html",
        "bytes": len(data),
        "sha256": _sha256(data),
        "source_sha256": _sha256(SOURCE.read_bytes()),
        "facts": facts,
    }
    (DIST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"  client built: {len(data)} bytes, sha256 {manifest['sha256'][:16]}, "
          f"{len(facts.get('routes', []))} routes, {facts.get('hex_outside_tokens', 0)} stray colours")
    return 0


if __name__ == "__main__":
    raise SystemExit(build())
