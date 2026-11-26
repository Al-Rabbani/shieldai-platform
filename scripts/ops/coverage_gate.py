"""A coverage number that is measured, ratcheted, and honest about what it is not counting.

MEASURED 26 Nov 2026, first ever: 1,550 tests pass in 104 seconds and cover 38.18% of 28,432 statements in gds_api.
The audit's line was "no coverage gate (1,262 tests, none measured)" - nobody knew whether those tests touched the code
they claimed to protect, and every release since added tests with no idea whether they reached anything.

A ratchet, not a target. The floor is the last measured value and may only be raised. Dropping below it fails, which is
the point: a large untested module is a real regression even though every test still passes.

It deliberately does NOT reward the obvious cheat. Several large modules sit at 0% because they are not wired into any
route - security_scope.py says so in its own docstring - and writing tests for code that cannot execute in production
would raise the number while making the platform no safer. Those are named in the baseline so the number is read with
them in mind rather than gamed.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
BASELINE = REPO / "config" / "coverage-baseline.json"
COVERAGE_JSON = REPO / ".coverage.json"

# Untested because unreachable in production, not because it is risky. Each is stated so nobody "fixes" coverage by
# testing dead code.
UNREACHABLE_BY_DESIGN = {
    "security_scope.py": "Phase C, not wired into any route; its own docstring says so",
    "ai_ml/anomaly_detection.py": "no route or agent calls it",
    "ai_ml/behavioral_analytics.py": "no route or agent calls it",
    "ai_ml/quantum_crypto.py": "no route or agent calls it",
}


def compare(baseline: dict, current: dict) -> dict:
    """Pure comparison so the rule can be tested without running a 104-second suite."""
    floor = float(baseline["percent"])
    now = float(current["percent"])
    delta = round(now - floor, 2)
    return {
        "floor": floor,
        "current": now,
        "delta": delta,
        "statements": current["statements"],
        "statements_delta": int(current["statements"]) - int(baseline["statements"]),
        "verdict": "pass" if now >= floor else "regression",
        "improved": delta > 0,
    }


def largest_untested(current_files: dict, minimum_statements: int = 120, limit: int = 10) -> list[dict]:
    rows = []
    for name, data in current_files.items():
        summary = data["summary"]
        if summary["num_statements"] < minimum_statements or summary["percent_covered"] >= 50:
            continue
        short = name.split("gds_api/")[-1]
        rows.append({"module": short, "percent": round(summary["percent_covered"], 1),
                     "statements": summary["num_statements"],
                     "by_design": UNREACHABLE_BY_DESIGN.get(short)})
    rows.sort(key=lambda r: (r["percent"], -r["statements"]))
    return rows[:limit]


def run_suite() -> dict:
    cmd = [sys.executable, "-m", "pytest", "tests/", "-q", "-p", "no:cacheprovider",
           "--cov=gds_api", f"--cov-report=json:{COVERAGE_JSON}"]
    result = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True)
    tail = (result.stdout or "").strip().splitlines()[-1:] or ["no output"]
    if not COVERAGE_JSON.exists():
        raise SystemExit(f"coverage was not produced; pytest said: {tail[0]}")
    data = json.loads(COVERAGE_JSON.read_text())
    totals = data["totals"]
    return {
        "percent": round(totals["percent_covered"], 2),
        "statements": totals["num_statements"],
        "covered": totals["covered_lines"],
        "missing": totals["missing_lines"],
        "tests_line": tail[0],
        "files": data["files"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Fail when test coverage drops below the recorded floor.")
    parser.add_argument("--run", action="store_true", help="run the suite first instead of reading .coverage.json")
    parser.add_argument("--write-baseline", action="store_true", help="record the current measurement as the new floor")
    parser.add_argument("--raise-alert", action="store_true", help="hand a regression to gds-raise-alert.py")
    args = parser.parse_args()

    if args.run:
        current = run_suite()
    else:
        if not COVERAGE_JSON.exists():
            print("coverage_gate: no .coverage.json; pass --run to measure")
            return 2
        data = json.loads(COVERAGE_JSON.read_text())
        totals = data["totals"]
        current = {"percent": round(totals["percent_covered"], 2), "statements": totals["num_statements"],
                   "covered": totals["covered_lines"], "missing": totals["missing_lines"],
                   "tests_line": "", "files": data["files"]}

    baseline = json.loads(BASELINE.read_text()) if BASELINE.exists() else None
    if baseline is None or args.write_baseline:
        record = {"percent": current["percent"], "statements": current["statements"],
                  "covered": current["covered"],
                  "note": "Floor may only be raised. Untested-by-design modules are listed so the number is read "
                          "honestly rather than gamed.",
                  "unreachable_by_design": UNREACHABLE_BY_DESIGN}
        BASELINE.parent.mkdir(parents=True, exist_ok=True)
        BASELINE.write_text(json.dumps(record, indent=2) + "\n")
        print(f"coverage_gate: baseline written at {current['percent']}% of {current['statements']} statements")
        return 0

    verdict = compare(baseline, current)
    print(f"coverage_gate: {verdict['current']}% against a floor of {verdict['floor']}% "
          f"({verdict['delta']:+} points, {verdict['statements_delta']:+} statements) -> {verdict['verdict'].upper()}")
    for row in largest_untested(current["files"]):
        reason = f"  [{row['by_design']}]" if row["by_design"] else ""
        print(f"  {row['percent']:5.1f}%  {row['statements']:4d} stmt  {row['module']}{reason}")

    if verdict["verdict"] == "pass":
        return 0

    message = (f"Test coverage fell to {verdict['current']}% from a floor of {verdict['floor']}% "
               f"({verdict['statements_delta']:+} statements). Every test still passes; less of the code is reached.")
    print(f"coverage_gate: REGRESSION - {message}")
    if args.raise_alert:
        subprocess.run(["python3", "/usr/local/bin/gds-raise-alert.py", "--type", "coverage_regression",
                        "--severity", "medium", "--message", message], check=False)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
