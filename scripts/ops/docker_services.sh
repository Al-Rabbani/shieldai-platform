#!/usr/bin/env bash
# Infrastructure containers, defined once and reproducibly.
#
# Every service binds to 127.0.0.1. Publishing on 0.0.0.0 bypasses UFW entirely: Docker writes its
# own DNAT rules ahead of the firewall's, which is how NATS, Qdrant and Temporal were reachable from
# the public internet and how MinIO had earlier answered with root credentials. Only nginx needs a
# public port, and it is not one of these.
#
# Healthchecks: qdrant, temporal and minio carry a real probe. Temporal binds its container IP, not
# loopback, so its probe must use hostname -i - a 127.0.0.1 probe reports a healthy server as down. The NATS image is scratch (no shell,
# no curl), so it cannot host a healthcheck at all - gds-container-watch.sh probes it from the host
# instead of shipping a probe that would fail for lack of a shell and mark a healthy service down.
set -euo pipefail
source /opt/docker-services.env

NET=bridge

run_nats() {
  docker rm -f nats >/dev/null 2>&1 || true
  docker run -d --name nats --restart unless-stopped \
    -p 127.0.0.1:4222:4222 -p 127.0.0.1:8222:8222 \
    -v /opt/nats/nats-server.conf:/nats-server.conf:ro \
    nats:latest --config /nats-server.conf >/dev/null
}

run_qdrant() {
  docker rm -f qdrant >/dev/null 2>&1 || true
  docker run -d --name qdrant --restart unless-stopped \
    -p 127.0.0.1:6333:6333 \
    -v /opt/qdrant/storage:/qdrant/storage \
    -e RUN_MODE=production -e TZ=Etc/UTC \
    --health-cmd 'bash -c "timeout 2 bash -c \"cat < /dev/null > /dev/tcp/127.0.0.1/6333\""' \
    --health-interval 30s --health-timeout 5s --health-retries 3 --health-start-period 20s \
    qdrant/qdrant >/dev/null
}

run_temporal() {
  docker rm -f temporal >/dev/null 2>&1 || true
  docker run -d --name temporal --restart unless-stopped \
    -p 127.0.0.1:7233:7233 \
    -e DB=postgres12 -e DB_PORT=5432 -e POSTGRES_USER=gds \
    -e POSTGRES_PWD="$TEMPORAL_DB_PWD" -e POSTGRES_SEEDS=172.17.0.1 \
    -e POSTGRES_DB=temporal -e SKIP_DB_CREATE=true \
    --health-cmd 'nc -z -w 2 $(hostname -i | cut -d" " -f1) 7233' \
    --health-interval 30s --health-timeout 5s --health-retries 3 --health-start-period 40s \
    temporalio/auto-setup:latest autosetup >/dev/null
}

run_minio() {
  docker rm -f minio >/dev/null 2>&1 || true
  docker run -d --name minio --restart unless-stopped \
    -p 127.0.0.1:9000:9000 -p 127.0.0.1:9001:9001 \
    -v /opt/minio/data:/data \
    -e MINIO_ROOT_USER="$MINIO_ROOT_USER" -e MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
    --health-cmd 'curl -f -s http://127.0.0.1:9000/minio/health/live' \
    --health-interval 30s --health-timeout 5s --health-retries 3 --health-start-period 20s \
    minio/minio:latest server /data >/dev/null
}

case "${1:-all}" in
  nats) run_nats ;;
  qdrant) run_qdrant ;;
  temporal) run_temporal ;;
  minio) run_minio ;;
  all) run_nats; run_qdrant; run_temporal; run_minio ;;
  *) echo "usage: $0 [all|nats|qdrant|temporal|minio]" >&2; exit 2 ;;
esac
