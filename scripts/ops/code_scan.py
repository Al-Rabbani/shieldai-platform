"""Nightly static analysis of the platform's own code, because no scanner was doing it.

WHY THIS EXISTS. Measured 26 Nov 2026: semgrep held 15 findings in the register, ALL dated 1 August and none open, and
nothing had scheduled it since. Investigating why produced a worse answer than "it was idle": the semgrep in the app venv
had been broken by the application's own dependency upgrades - its entry point died with ImportError on
opentelemetry.util.types._ExtendedAttributes - and because a crashed process exits 1, which semgrep's contract defines as
"findings found", the runner parsed empty stdout as zero results. A CRASHED SCANNER WAS INDISTINGUISHABLE FROM A CLEAN
CODEBASE for nearly four months. semgrep now lives in its own venv (/opt/gds-tools/semgrep) and the runner refuses to
call an unparsable run clean.

WHAT IT DOES. Static analysis over the platform's own source with a fixed ruleset per language, persisted through the
same writer every other scanner uses, and stamped into scan_schedules so a night that does not run is OVERDUE rather
than assumed clean.

Usage:
    python code_scan.py                 # every configured target
    python code_scan.py --only api
    python code_scan.py --dry-run
"""
from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import os
import pathlib
import sys

sys.path.insert(0, "/opt/gds-os/apps/api")

from gds_api.db import async_session_factory  # noqa: E402
from gds_api.scan_schedules import stamp_schedule  # noqa: E402
from gds_api.scanner_engines import semgrep_findings, store_findings  # noqa: E402
from gds_api.tenant_binding import bind_tenant  # noqa: E402

TENANT = os.environ.get("GDS_TENANT_ID", "")

#: One entry per source tree we own and can actually fix. A scanner pointed at code nobody maintains is theatre.
TARGETS: tuple[dict[str, str], ...] = (
    {"key": "api", "path": "/opt/gds-os/apps/api/gds_api", "config": "p/python",
     "name": "Code scan: semgrep (API)"},
    {"key": "web", "path": "/opt/gds-os/apps/web/src", "config": "p/javascript",
     "name": "Code scan: semgrep (web)"},
    {"key": "ops", "path": "/opt/gds-os/scripts/ops", "config": "p/python",
     "name": "Code scan: semgrep (ops scripts)"},
)


#: The blanket rule that flags EVERY sqlalchemy text() call, and why it is filtered rather than excluded.
#:
#: MEASURED 26 Nov 2026: p/python reports 50 "avoid-sqlalchemy-text" HIGH findings across gds_api, because the platform
#: uses text() throughout with BOUND PARAMETERS (:name) - which is the safe way to write SQL in SQLAlchemy. Filing 50
#: highs for it would bury the five findings that matter and inflate the register. But the rule CANNOT simply be
#: excluded: proved with a canary holding a request-tainted f-string query, this rule is the ONLY one in p/python 1.187
#: that fires on it, so excluding it would lose real injection detection.
#:
#: So the filter keeps the rule and drops only the calls that CANNOT be injected: a text() call whose source carries no
#: f-string, no % formatting and no .format(). A call that does interpolate is kept, because whether the interpolated
#: value is a constant or a request parameter is a judgement a human must make, not a rule.
_BLANKET_SQL_RULE = "avoid-sqlalchemy-text"


def _first_argument(window: str) -> str:
    """The SQL argument of the first text( call in this span, so the judgement is made on the SQL and not on the code
    around it. Measured on assignment_api.py: the span is `text(sql), {"tenant_id": ...}` - a bound-parameter call whose
    braces come from the parameter DICT, so a naive "does this contain {" test kept 37 safe calls as high findings."""
    idx = window.find("text(")
    if idx < 0:
        return ""
    i, depth, quote, arg = idx + 5, 1, None, []
    while i < len(window) and depth > 0:
        ch = window[i]
        if quote:
            arg.append(ch)
            if ch == quote and window[i - 1] != "\\":
                quote = None
        elif ch in "\"'":
            quote = ch
            arg.append(ch)
        elif ch in "([{":
            depth += 1
            arg.append(ch)
        elif ch in ")]}":
            depth -= 1
            if depth == 0:
                break
            arg.append(ch)
        elif ch == "," and depth == 1:
            break
        else:
            arg.append(ch)
        i += 1
    return "".join(arg).strip()


def _keeps(finding: dict, cache: dict[str, list[str]]) -> bool:
    """Whether this finding should reach a human.

    Reads the SOURCE the match points at, because semgrep's evidence field is unreliable here: on integrations_api.py it
    came back as the string 'requires login', unrelated text.
    """
    rule = str(finding.get("rule") or "")
    if not rule.endswith(_BLANKET_SQL_RULE):
        return True
    path = str(finding.get("target") or "")
    line = finding.get("line")
    if not path or not isinstance(line, int) or line < 1:
        return True  # cannot judge it, so it is kept
    if path not in cache:
        try:
            cache[path] = pathlib.Path(path).read_text(errors="ignore").splitlines()
        except OSError:
            cache[path] = []
    lines = cache[path]
    if not lines:
        return True
    end_line = finding.get("end_line")
    end_line = end_line if isinstance(end_line, int) and end_line >= line else line
    window = "\n".join(lines[max(0, line - 1): end_line])
    sql = _first_argument(window)
    if not sql:
        return True
    return sql.startswith(("f\"", "f'", "F\"", "F'")) or ("%" in sql) or (".format(" in sql)


def filter_findings(found: list[dict]) -> tuple[list[dict], int]:
    """Split the findings a human should see from bound-parameter noise, and say how many were dropped."""
    cache: dict[str, list[str]] = {}
    kept = [f for f in found if _keeps(f, cache)]
    return kept, len(found) - len(kept)


async def scan_target(spec: dict[str, str], dry_run: bool) -> dict:
    started = dt.datetime.now(dt.timezone.utc)
    if not os.path.isdir(spec["path"]):
        return {"key": spec["key"], "error": f"path does not exist: {spec['path']}", "created": 0}
    if dry_run:
        return {"key": spec["key"], "would_scan": spec["path"], "config": spec["config"], "created": 0}
    try:
        raw = await semgrep_findings(spec["path"], spec["config"])
    except Exception as exc:  # noqa: BLE001 - the error is the result, and it must be recorded
        return {"key": spec["key"], "error": f"{type(exc).__name__}: {exc}"[:400], "created": 0}
    found, dropped = filter_findings(raw)
    async with async_session_factory() as session:
        await bind_tenant(session, TENANT)
        stored = await store_findings(session, TENANT, "semgrep", spec["path"], found)
        await session.commit()
    # The schedule stamp runs in its OWN session, bound immediately before the write. store_findings commits, and a
    # commit returns the connection to the pool: the session-level set_config that RLS reads does not survive it, so
    # stamping in the same session failed with "new row violates row-level security policy for table scan_schedules".
    async with async_session_factory() as stamp_session:
        await bind_tenant(stamp_session, TENANT)
        await stamp_schedule(
            stamp_session, TENANT, spec["name"], "code_scan", 1440,
            findings=stored.get("findings_created", 0),
            error=None if not stored.get("failures") else f"{len(stored['failures'])} write failure(s)",
            when=started,
        )
        await stamp_session.commit()
    return {
        "key": spec["key"], "path": spec["path"], "config": spec["config"],
        "found": len(found), "bound_parameter_noise": dropped,
        "created": stored.get("findings_created", 0),
        "duplicates": stored.get("duplicates_skipped", 0),
        "failures": stored.get("failures", []),
        "by_severity": _count(found),
        "top": [f"{f['severity']}: {f['title'][:70]}" for f in found[:4]],
    }


def _count(found: list[dict]) -> dict[str, int]:
    out: dict[str, int] = {}
    for f in found:
        sev = str(f.get("severity", "unknown"))
        out[sev] = out.get(sev, 0) + 1
    return out


async def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    if not TENANT:
        print("ERROR GDS_TENANT_ID is not set", file=sys.stderr)
        return 2
    wanted = {k.strip() for k in args.only.split(",") if k.strip()}
    specs = [s for s in TARGETS if not wanted or s["key"] in wanted]
    failures = 0
    for spec in specs:
        result = await scan_target(spec, args.dry_run)
        if result.get("error"):
            failures += 1
            print(f"{spec['key']:<5} FAILED  {result['error']}")
        elif args.dry_run:
            print(f"{spec['key']:<5} would scan {result['would_scan']} with {result['config']}")
        else:
            print(f"{spec['key']:<5} found {result['found']}, recorded {result['created']}, "
                  f"already known {result['duplicates']}, FAILED TO WRITE {len(result.get('failures') or [])}, "
                  f"bound-parameter noise dropped {result.get('bound_parameter_noise', 0)}  {result['by_severity']}")
            for failure in (result.get("failures") or [])[:3]:
                print(f"        WRITE FAILURE: {str(failure)[:160]}")
            for line in result["top"]:
                print(f"        {line}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
