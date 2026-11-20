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

run_tests() {
  # A red suite must never reach production. Before this gate the only thing standing between a failing test and
  # a live host was the HTTP smoke test, and smoke cannot see a broken unit, a wrong SQL cast or a schema mismatch
  # that happens to return 200. Skip is explicit and announces itself, so a bypass is visible in the log.
  if [ "${GDS_DEPLOY_SKIP_TESTS:-0}" = "1" ]; then
    echo "  [tests] SKIPPED by GDS_DEPLOY_SKIP_TESTS=1 - this deploy is NOT test-gated"
    return 0
  fi
  echo "  [tests] running suite"
  if bash -c 'set -a; . /opt/.env 2>/dev/null; set +a; cd '"$REPO"' && PYTHONPATH='"$REPO"'/apps/api ./apps/api/venv/bin/python -m pytest tests -q' >/tmp/deploy-tests.log 2>&1; then
    echo "  [tests] $(tail -1 /tmp/deploy-tests.log)"
    return 0
  fi
  echo "  [tests] FAILED - deploy aborted, nothing was migrated or restarted"
  tail -12 /tmp/deploy-tests.log
  return 1
}


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

run_tests || { fail "test suite is red"; exit 1; }

echo "  installing node-exporter listen config..."
if [ -f config/prometheus/node-exporter.default ]; then
  install -m 644 config/prometheus/node-exporter.default /etc/default/prometheus-node-exporter
  systemctl restart prometheus-node-exporter 2>/dev/null || true
fi

# Nginx site config is versioned for the same reason the scrape config is: a rebuilt host must not lose
# the SSE locations, and a hand-edited server block is invisible to review. Test before reloading, and
# restore the previous file if the test fails, so a bad config can never take the site down.
if [ -f config/nginx/gds-os ]; then
  if ! cmp -s config/nginx/gds-os /etc/nginx/sites-available/gds-os; then
    echo "  installing nginx site config..."
    cp /etc/nginx/sites-available/gds-os "/etc/nginx/sites-available/gds-os.bak.$(date +%s)"
    install -m 644 config/nginx/gds-os /etc/nginx/sites-available/gds-os
    if nginx -t >/dev/null 2>&1; then
      systemctl reload nginx && echo "    nginx reloaded"
    else
      echo "    ERROR: nginx -t failed; restoring the previous config"
      cp "$(ls -t /etc/nginx/sites-available/gds-os.bak.* | head -1)" /etc/nginx/sites-available/gds-os
      nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
    fi
  fi
fi
echo "  installing prometheus scrape config..."
if [ -f config/prometheus/gds.yml ]; then
  # Scheduled jobs were hand-typed on the host, so a rebuild silently lost paging and webhook delivery.
  # The log directory must exist and be postgres-writable: /var/log itself is not, which is why both jobs ran
  # for days with no output anywhere and nobody could prove they had ever executed.
  if [ -f config/cron/root.crontab ]; then
    # The root crontab carries patching, backups, scans, reapers and the paging watchers. It used to exist only on
    # the host, so a rebuild lost every job and a hand edit was invisible to review.
    if ! crontab -l 2>/dev/null | cmp -s - config/cron/root.crontab; then
      echo "  installing root crontab from config/cron/root.crontab"
      crontab config/cron/root.crontab
    fi
  fi
  install -d -o postgres -g postgres -m 0755 /var/log/gds
  for f in config/cron/*; do
    [ -f "$f" ] || continue
    install -m 644 "$f" "/etc/cron.d/$(basename "$f")"
    # only create when absent: install from /dev/null TRUNCATES, which wiped the cron evidence on every deploy
    [ -f "/var/log/gds/$(basename "$f").log" ] || install -o postgres -g postgres -m 0644 /dev/null "/var/log/gds/$(basename "$f").log"
  done
  install -m 644 config/prometheus/gds.yml /etc/prometheus/gds.yml
  chown prometheus:prometheus /etc/prometheus/gds.yml
  systemctl is-active --quiet prometheus && systemctl reload prometheus || true
else
  echo "  WARNING: config/prometheus/gds.yml missing, leaving the scrape config untouched"
fi

echo "  installing web assets..."
if [ -f web/gds_app.html ]; then
  echo "  building the client..."
  if ! apps/api/venv/bin/python scripts/ops/build_client.py; then
    fail "client build failed"
  fi
  # Install the built artifact, never the source, and prove the bytes served are the bytes recorded.
  install -m 644 web/dist/gds_app.html /var/www/gds_app.html
  SERVED_SHA=$(sha256sum /var/www/gds_app.html | cut -d' ' -f1)
  MANIFEST_SHA=$(python3 -c "import json;print(json.load(open('web/dist/manifest.json'))['sha256'])")
  if [ "$SERVED_SHA" != "$MANIFEST_SHA" ]; then
    fail "served client does not match its build manifest"
  fi
  echo "    client installed and verified ($(echo $SERVED_SHA | cut -c1-16))"
else
  echo "  WARNING: web/gds_app.html missing, leaving the served file untouched"
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

# Install the ops scripts that now live in version control. Without this the host copy in
# /usr/local/bin silently keeps running an older backup/watcher/drill than the repo holds - the
# failure mode where a fix is committed, reviewed and deployed, and the scheduled job never sees it.
echo "  installing ops scripts..."
for script in gds-backup.sh gds-backup-watch.sh gds-restore-drill.sh gds-wal-prune.sh gds-service-watch.sh gds-b2-upload.py assess_compliance.py gds-os-update.sh onboard_tenant.py gds-page.py gds-webhook-dispatch.py; do
  if [ -f "scripts/ops/$script" ]; then
    install -m 750 -o root -g root "scripts/ops/$script" "/usr/local/bin/$script" \
      && echo "    installed $script" || fail "could not install $script"
  fi
done

# The pager runs as postgres because it must see every tenant's notifications, and /opt/.env is
# 0600 root:postgres, so it could not read one delivery credential and reported "no delivery channel
# configured" on every five-minute run. It gets its own file with only the channel variables rather
# than widening the permissions of the whole secret set.
if [ -r /opt/.env ]; then
  ( grep -E '^(SLACK_WEBHOOK_URL|RESEND_API_KEY|RESEND_FROM)=' /opt/.env || true ) > /opt/gds-pager.env
  chown root:postgres /opt/gds-pager.env
  chmod 640 /opt/gds-pager.env
  echo "    wrote /opt/gds-pager.env ($(wc -l < /opt/gds-pager.env) delivery variables)"
fi

# Two of these scripts run from cron as postgres (config/cron/gds-paging and gds-webhooks), and the loop
# above installs root:root 0750. That is correct for every root-run script and fatal for these two: postgres
# cannot execute a root:root 0750 file, so the pager and the webhook dispatcher stop running entirely. Caught
# on the host immediately after they were added to the loop - the pager failed with Permission denied.
install -m 750 -o root -g postgres "scripts/ops/gds-page.py" "/usr/local/bin/gds-page.py" \
  && echo "    installed gds-page.py (group postgres, runs as postgres)" || fail "could not install gds-page.py"
install -m 750 -o root -g postgres "scripts/ops/gds-webhook-dispatch.py" "/usr/local/bin/gds-webhook-dispatch.py" \
  && echo "    installed gds-webhook-dispatch.py (group postgres, runs as postgres)" || fail "could not install gds-webhook-dispatch.py"

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
