#!/usr/bin/env bash
# GDS deploy: checkout -> migrate -> release stamp -> restart -> smoke -> rollback on failure.
# A deploy that cannot prove itself healthy returns to the previous commit instead of
# leaving a half-working platform. Usage: deploy.sh [ref]   (default: current branch)
set -uo pipefail
REPO=/opt/gds-os
API=http://127.0.0.1:8000
REF="${1:-$(git -C "$REPO" rev-parse --abbrev-ref HEAD)}"
cd "$REPO" || exit 2

fail() { echo "DEPLOY FAILED: $*"; }

if [ -n "$(git status --porcelain)" ]; then
  fail "working tree is dirty - refusing to deploy over uncommitted changes"
  git status --porcelain | head -5
  exit 3
fi

PREV=$(git rev-parse HEAD)
PREV_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "deploying $REF (previous $PREV on $PREV_BRANCH)"

git fetch --all --prune >/dev/null 2>&1 || echo "  note: fetch failed, using local refs"
if ! git checkout "$REF" >/dev/null 2>&1; then
  fail "cannot checkout $REF"; exit 4
fi
NEW=$(git rev-parse HEAD)
echo "  target commit: $NEW"

stamp_release() {
  printf '{"sha":"%s","branch":"%s","deployed_at":"%s"}\n' "$1" "$(git rev-parse --abbrev-ref HEAD)" "$(date -u +%FT%TZ)" > "$REPO/RELEASE"
}

echo "  applying migrations..."
if ! apps/api/venv/bin/python scripts/ops/migrate.py; then
  fail "migration failed, rolling back"
  git checkout "$PREV" >/dev/null 2>&1; stamp_release "$PREV"
  supervisorctl restart gds-os gds-worker gds-kernel >/dev/null 2>&1
  exit 5
fi
stamp_release "$NEW"

echo "  restarting services..."
supervisorctl restart gds-os gds-worker gds-kernel >/dev/null 2>&1

smoke() {
  local i
  for i in $(seq 1 15); do
    sleep 2
    local h r
    h=$(curl -sS -m 5 -o /dev/null -w '%{http_code}' "$API/health" 2>/dev/null)
    r=$(curl -sS -m 5 -o /dev/null -w '%{http_code}' "$API/health/ready" 2>/dev/null)
    [ "$h" = "200" ] && [ "$r" = "200" ] && break
    [ "$i" = "15" ] && { echo "  health never reached 200 (h=$h r=$r)"; return 1; }
  done
  local sha
  sha=$(curl -sS -m 5 "$API/health/version" 2>/dev/null | sed -n 's/.*"sha": *"\([0-9a-f]*\)".*/\1/p')
  if [ -n "$sha" ] && [ "$sha" != "$NEW" ]; then
    echo "  runtime reports $sha but expected $NEW"; return 1
  fi
  local count
  count=$(sudo -u postgres psql -d gds_os -tAc "SELECT count(*) FROM security_findings;" 2>/dev/null | tr -d ' ')
  if [ -z "$count" ] || [ "$count" -lt 1 ]; then
    echo "  findings read returned '$count' - data layer unreachable"; return 1
  fi
  echo "  smoke ok: health 200, version $sha, findings $count"
  return 0
}

if [ "${GDS_DEPLOY_FORCE_FAIL:-0}" = "1" ]; then
  echo "  [self-test] forcing smoke failure to exercise rollback"
else
  if smoke; then echo "DEPLOY OK: $NEW"; exit 0; fi
fi

echo "  rolling back to $PREV"
# Restore the BRANCH, not the bare sha. Rolling back to a commit leaves the repo
# detached, so a later commit would be orphaned off the tip.
git checkout "$PREV_BRANCH" >/dev/null 2>&1 || git checkout "$PREV" >/dev/null 2>&1
stamp_release "$PREV"
supervisorctl restart gds-os gds-worker gds-kernel >/dev/null 2>&1
sleep 5
if GDS_DEPLOY_FORCE_FAIL=0 smoke >/dev/null 2>&1; then
  fail "rollback complete, platform restored to $PREV"
  exit 6
else
  fail "ROLLBACK VERIFICATION FAILED - manual intervention required"
  exit 7
fi
