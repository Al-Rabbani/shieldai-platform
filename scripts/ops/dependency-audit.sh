#!/bin/bash
# Dependency gate: runs inside deploy.sh before the frontend build and in CI.
# WHY IT EXISTS: pip-audit had never been run on this host and npm carried 16 high advisories while
# deploy.sh only ran the test suites. A security platform shipping known-vulnerable dependencies is a
# finding against itself, so the gate refuses a deploy that introduces one.
#
# RULES
#   python  : any known vulnerability fails the deploy (currently 0; torch is skipped by pip-audit
#             because the installed 2.14.1+cpu local version is not on PyPI, stated, not hidden).
#   npm     : critical fails the deploy. High is allowed only up to the number recorded in
#             apps/web/.audit-baseline.json, and every entry there must carry a reason. The count may
#             never grow silently; fixing advisories is expected to lower it.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API="$ROOT/apps/api"; WEB="$ROOT/apps/web"
BASELINE="$WEB/.audit-baseline.json"
py_rc=0
js_rc=0

echo "--- python dependencies (pip-audit)"
if ! "$API/venv/bin/python" -m pip_audit --version >/dev/null 2>&1; then
  echo "DEPENDENCY GATE FAILED: pip-audit is not installed in the API venv"
  echo "  fix: $API/venv/bin/python -m pip install pip-audit"
  exit 20
fi
if ! ( cd "$API" && "$API/venv/bin/python" -m pip_audit --progress-spinner off --format json -o /tmp/pipaudit-gate.json ) >/tmp/pipaudit-gate.log 2>&1; then
  echo "DEPENDENCY GATE FAILED: python vulnerabilities"
  python3 - <<'PY' 2>/dev/null || tail -20 /tmp/pipaudit-gate.log
import json
d = json.load(open("/tmp/pipaudit-gate.json"))
for dep in d.get("dependencies", []):
    for v in dep.get("vulns", []):
        print(f"  {dep['name']} {dep['version']}: {v['id']} fix={v.get('fix_versions')}")
PY
  py_rc=21
else
  echo "    ok: no known python vulnerabilities"
fi

echo "--- javascript dependencies (npm audit)"
if ! ( cd "$WEB" && npm audit --json > /tmp/npmaudit-gate.json 2>/dev/null ); then
  python3 - "$BASELINE" <<'PY'
import json, sys
try:
    d = json.load(open("/tmp/npmaudit-gate.json"))
except Exception:
    print("    npm audit produced no JSON; skipping (network or registry error)"); raise SystemExit(0)
meta = d.get("metadata", {}).get("vulnerabilities", {})
crit, high = meta.get("critical", 0), meta.get("high", 0)
try:
    base = json.load(open(sys.argv[1]))
except Exception:
    base = {"high_allowed": 0, "accepted": []}
allowed = base.get("high_allowed", 0)
print(f"    critical={crit} high={high} (baseline allows {allowed} high)")
if crit:
    print("DEPENDENCY GATE FAILED: npm critical advisory"); raise SystemExit(22)
if high > allowed:
    print("DEPENDENCY GATE FAILED: npm high advisories grew past the baseline")
    for name, info in d.get("vulnerabilities", {}).items():
        if info.get("severity") in ("high", "critical"):
            print(f"  {name}: {info.get('range')}")
    raise SystemExit(23)
for item in base.get("accepted", []):
    print(f"    accepted: {item['package']} - {item['reason']}")
PY
  js_rc=$?
else
  echo "    ok: no known javascript vulnerabilities"
fi

# A stage failure is never overwritten by a later stage's success: that is how a gate reports red and
# still lets the deploy through.
if [ "$py_rc" -ne 0 ]; then echo "DEPENDENCY GATE FAILED: python (rc=$py_rc)"; exit "$py_rc"; fi
if [ "$js_rc" -ne 0 ]; then echo "DEPENDENCY GATE FAILED: javascript (rc=$js_rc)"; exit "$js_rc"; fi
echo "--- dependency gate passed"
