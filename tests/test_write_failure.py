"""A refused write must never look like a saved one.

MEASURED 25 Nov 2026: eight routed sites ended a write with `.catch(() => {})` and then updated local state anyway.
Three wrote to IncidentTask, which this platform does not serve: the adapter threw, the catch ate it, and the screen
showed a task that never existed. attemptWrite() now reports the failure to a banner in the shell, and callers apply
their optimistic change only when the result is not null.
"""
from __future__ import annotations

import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import test_entity_coverage as cov

WEB = pathlib.Path(__file__).resolve().parents[1] / "apps/web/src"
WRITE = re.compile(r"(entities\.[A-Za-z_][A-Za-z0-9_]*\.(create|update|delete|bulkCreate|bulkUpdate|bulkDelete)\s*\(|auth\.(updateMe|logout)\s*\()")
SWALLOW = re.compile(r"catch\(\s*(\(\s*\)|\w+)\s*=>\s*(\{\s*\}|null|\[\s*\]|undefined)\s*\)")


def _strip_comments(src: str) -> str:
    """Comments describing the old defect must not count as the defect."""
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"(?m)//.*$", "", src)


def _offenders():
    """Flag a write whose OWN call chain ends in a swallowing catch.

    A three-line window was too loose: it caught `auth.me().catch(() => null)` sitting near a perfectly good write in
    SlackAlertSettingsCard and ConfigurationDriftPage. The catch must belong to the write, so the write's argument list
    is paren-matched and only the text immediately after it is inspected.
    """
    found = []
    for f in sorted(cov.routed_modules()):
        src = _strip_comments(f.read_text(errors="ignore"))
        for match in WRITE.finditer(src):
            i = match.end() - 1
            depth = 0
            while i < len(src):
                if src[i] == "(":
                    depth += 1
                elif src[i] == ")":
                    depth -= 1
                    if depth == 0:
                        break
                i += 1
            tail = src[i + 1:i + 120].lstrip()
            if tail.startswith(".catch(") and SWALLOW.match(tail):
                line = src[:match.start()].count("\n") + 1
                found.append(f"{str(f).replace(str(WEB) + '/', '')}:{line}")
    return found


def test_no_routed_module_swallows_a_failed_write():
    offenders = _offenders()
    assert not offenders, (
        "these writes discard their failure and then show the change anyway: "
        + ", ".join(offenders)
    )


def test_the_failure_path_exists_and_is_mounted():
    helper = (WEB / "lib/writeFailure.js").read_text()
    assert "export async function attemptWrite" in helper
    assert "export function reportWriteFailure" in helper
    shell = (WEB / "components/platform/PlatformShell.jsx").read_text()
    assert "<WriteFailureBanner" in shell, "the banner must sit in the shell, not one page"


def test_the_banner_does_not_auto_dismiss():
    banner = (WEB / "components/platform/WriteFailureBanner.jsx").read_text()
    # a discarded write is not a transient message: no timer may clear it
    assert "setTimeout" not in banner and "setInterval" not in banner
