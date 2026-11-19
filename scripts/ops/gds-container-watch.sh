#!/usr/bin/env bash
# Host-side liveness for containers that cannot report their own health.
#
# nats:latest is a scratch image - no shell, no curl, no nc - so it cannot host a docker
# healthcheck. Rather than ship a healthcheck that fails for want of a shell and marks a healthy
# service unhealthy, this probes the port from the host. Every other service carries a real
# healthcheck and is judged by docker's own verdict.
set -uo pipefail
LOG=/var/log/gds-container-watch.log
say() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >> "$LOG"; }

probe() {  # probe <port>
  timeout 3 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/$1" 2>/dev/null
}

check_tcp() {  # check_tcp <container> <port>
  local name=$1 port=$2
  if probe "$port"; then return 0; fi
  say "ALERT $name not answering on 127.0.0.1:$port - restarting"
  docker restart "$name" >/dev/null 2>&1
  sleep 10
  if probe "$port"; then say "RECOVERED $name after restart"; else say "STILL DOWN $name after restart"; fi
  return 1
}

check_docker_health() {  # check_docker_health <container>
  local name=$1 status
  status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null)
  case "$status" in
    healthy|none) return 0 ;;
    unhealthy)
      say "ALERT $name reported unhealthy - restarting"
      docker restart "$name" >/dev/null 2>&1
      sleep 15
      say "post-restart $name status: $(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null)"
      return 1 ;;
    *) say "WARN $name health is $status" ; return 0 ;;
  esac
}

rc=0
check_tcp nats 4222 || rc=1
for c in qdrant temporal minio; do check_docker_health "$c" || rc=1; done
exit $rc
