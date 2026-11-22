#!/usr/bin/env bash
# Functional health probes + auto-restart. Deliberately NOT just TCP opens:
# a TCP probe reported Temporal healthy for weeks while it was wedged.
set -uo pipefail
LOG="${GDS_WATCH_LOG:-/var/log/gds-service-watch.log}"
STATE="${GDS_WATCH_STATE:-/var/lib/gds-watch}"
# Overridable so a test can drive check() with a stubbed alert sink instead of writing to the
# production database.
ALERT_CMD="${GDS_WATCH_ALERT_CMD:-sudo -u postgres /opt/gds-os/apps/api/venv/bin/python /usr/local/bin/gds-raise-alert.py}"
mkdir -p "$STATE"
ok=0; bad=0
raise_alert() { # severity message
  # A restart that nobody hears about is a silent failure. This creates the notification that gds-page.py then
  # re-raises on its acknowledgement ladder; without it the pager has nothing to carry.
  local out
  out=$($ALERT_CMD --type service_failure --severity "$1" --message "$2" 2>&1)
  echo "[$(date -u +%FT%TZ)] ALERT $1: $out" >> "$LOG"
}

check() { # name probe_cmd restart_cmd [strikes]
  # Strikes default to 2. Stateful containers get 3: restarting temporal cancels in-flight activities and produces
  # the RuntimeError storms this platform has already spent time cleaning up, so one transient stall should not be
  # enough. Measured 21 Nov 2026: the temporal probe failed twice 30 minutes apart while returning in 300ms on 8 of
  # 8 manual runs, i.e. a transient, and the second failure restarted the whole container for nothing.
  local name="$1" probe="$2" fix="$3" strikes="${4:-2}"
  # The probe's own words are kept, not discarded. Measured 22 Nov 2026: the log recorded nine temporal failures in one
  # evening as the bare line "FAIL temporal (consecutive 3)", so the reason was unknowable and the same fault was
  # re-diagnosed from scratch. A watchdog that cannot say why it fired is only half a watchdog.
  local out rc
  out=$(eval "$probe" 2>&1); rc=$?
  if [ "$rc" -eq 0 ]; then
    rm -f "$STATE/$name.fail" "$STATE/$name.restarts"; ok=$((ok+1)); return 0
  fi
  # Exit 2 is a probe saying "answered, but too slowly" - a load symptom, not an outage. Restarting a stateful container
  # cancels in-flight activities, so slowness is recorded and does not count as a strike. Only a probe that signals this
  # can reach this branch; the curl and supervisor probes exit 0 or 1.
  if [ "$rc" -eq 2 ]; then
    echo "[$(date -u +%FT%TZ)] SLOW $name (not a strike): ${out:-no output}" >> "$LOG"
    ok=$((ok+1)); return 0
  fi
  local n=$(( $(cat "$STATE/$name.fail" 2>/dev/null || echo 0) + 1 ))
  echo "$n" > "$STATE/$name.fail"
  echo "[$(date -u +%FT%TZ)] FAIL $name (consecutive $n) rc=$rc reason=${out:-no output}" >> "$LOG"
  bad=$((bad+1))
  if [ "$n" -ge "$strikes" ]; then
    echo "[$(date -u +%FT%TZ)] RESTART $name via: $fix" >> "$LOG"
    eval "$fix" >> "$LOG" 2>&1
    rm -f "$STATE/$name.fail"
    local r=$(( $(cat "$STATE/$name.restarts" 2>/dev/null || echo 0) + 1 ))
    echo "$r" > "$STATE/$name.restarts"
    raise_alert high "$name probe failed $n times in a row (rc=$rc ${out:-no output}); restarted via '$fix' (restart $r of this outage)"
    if [ "$r" -ge 2 ]; then
      # Two automatic repairs have not held, so this is not a transient blip and the fix is not working.
      raise_alert critical "$name still failing after $r restarts; the automatic repair is not holding"
    fi
  fi
}
# Sourcing this file with GDS_WATCH_LIB_ONLY=1 loads the functions without probing or restarting
# anything, so a test can call check() against a stub probe and a stub alert sink.
if [ "${GDS_WATCH_LIB_ONLY:-0}" = "1" ]; then return 0 2>/dev/null || exit 0; fi

check qdrant  'curl -sf -m 5 http://127.0.0.1:6333/healthz'            'docker restart qdrant' 3
check minio   'curl -sf -m 5 http://127.0.0.1:9000/minio/health/live'  'docker restart minio' 3
check nats    'curl -sf -m 5 http://127.0.0.1:8222/healthz'            'docker restart nats' 3
check temporal 'cd /opt/gds-os/apps/api && PYTHONPATH=/opt/gds-os/apps/api /opt/gds-os/apps/api/venv/bin/python /usr/local/bin/gds-temporal-probe.py' 'docker restart temporal' 3
# Liveness, not readiness. /health/ready reports the state of every dependency, so stopping nats made the
# API probe fail twice and the watchdog restarted a perfectly healthy API process - measured 21 Nov 2026,
# nats stopped by hand, 'RESTART api via: supervisorctl restart gds-os' three seconds later. A dependency
# outage is an alert, not a reason to bounce the thing that reports it.
check api     'curl -sf -m 8 http://127.0.0.1:8000/health'             'supervisorctl restart gds-os'
check worker  'supervisorctl status gds-worker | grep -q RUNNING'      'supervisorctl restart gds-worker'
# A failed systemd unit is not something this watchdog manages, so it is recorded rather than "fixed": auto-masking
# an unknown unit could disable something real. The case that prompted this was neo4j.service, an apt package that
# fought the Docker container for 7687 and failed on every boot until it was masked.
units=$(systemctl --failed --no-legend 2>/dev/null | wc -l)
if [ "$units" -ne 0 ]; then
  echo "[$(date -u +%FT%TZ)] FAILED-UNITS $units: $(systemctl --failed --no-legend 2>/dev/null | awk '{print $1}' | tr '\n' ' ')" >> "$LOG"
fi
echo "[$(date -u +%FT%TZ)] ok=$ok bad=$bad" >> "$LOG"
