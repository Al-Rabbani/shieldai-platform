#!/usr/bin/env bash
# Functional health probes + auto-restart. Deliberately NOT just TCP opens:
# a TCP probe reported Temporal healthy for weeks while it was wedged.
set -uo pipefail
LOG=/var/log/gds-service-watch.log
STATE=/var/lib/gds-watch
mkdir -p "$STATE"
ok=0; bad=0
check() { # name probe_cmd restart_cmd
  local name="$1" probe="$2" fix="$3"
  if eval "$probe" >/dev/null 2>&1; then
    rm -f "$STATE/$name.fail"; ok=$((ok+1)); return 0
  fi
  local n=$(( $(cat "$STATE/$name.fail" 2>/dev/null || echo 0) + 1 ))
  echo "$n" > "$STATE/$name.fail"
  echo "[$(date -u +%FT%TZ)] FAIL $name (consecutive $n)" >> "$LOG"
  bad=$((bad+1))
  if [ "$n" -ge 2 ]; then
    echo "[$(date -u +%FT%TZ)] RESTART $name via: $fix" >> "$LOG"
    eval "$fix" >> "$LOG" 2>&1
    rm -f "$STATE/$name.fail"
  fi
}
check qdrant  'curl -sf -m 5 http://127.0.0.1:6333/healthz'            'docker restart qdrant'
check minio   'curl -sf -m 5 http://127.0.0.1:9000/minio/health/live'  'docker restart minio'
check nats    'curl -sf -m 5 http://127.0.0.1:8222/healthz'            'docker restart nats'
check temporal 'cd /opt/gds-os/apps/api && PYTHONPATH=/opt/gds-os/apps/api /opt/gds-os/apps/api/venv/bin/python /usr/local/bin/gds-temporal-probe.py' 'docker restart temporal'
check api     'curl -sf -m 8 http://127.0.0.1:8000/health/ready'       'supervisorctl restart gds-os'
check worker  'supervisorctl status gds-worker | grep -q RUNNING'      'supervisorctl restart gds-worker'
echo "[$(date -u +%FT%TZ)] ok=$ok bad=$bad" >> "$LOG"
