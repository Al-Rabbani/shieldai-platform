#!/usr/bin/env bash
# One host unit fights a container, and every boot pays for it.
#
# Measured 21 Nov 2026 after a real reboot: neo4j.service, from the apt package, started at boot, found 7474/7687
# already held by the neo4j Docker container, and died about 55 seconds later, leaving a failed unit on every boot.
# Nothing depends on the unit (reverse dependencies are only multi-user.target) and the graph this platform uses is
# the container, healthy on the same ports.
#
# The noise is not the hazard. If the host package ever won the race it would serve 7687 from /var/lib/neo4j, the
# API would connect successfully to an EMPTY graph, and every graph-backed answer would be quietly wrong while the
# readiness probe reported healthy. Masking is the only form that survives a package reinstall, because it points
# the unit at /dev/null.
#
# Idempotent, and it refuses to act if there is no container to fall back on.
set -uo pipefail

rc=0

if docker ps -a --format '{{.Names}}' | grep -qx neo4j; then
  # is-enabled exits 1 for a masked unit, and pipefail would turn that into a false negative, so compare the state
  # string rather than piping it through grep.
  state="$(systemctl is-enabled neo4j.service 2>/dev/null || true)"
  if [ "$state" != "masked" ]; then
    systemctl disable --now neo4j.service >/dev/null 2>&1
    systemctl mask neo4j.service >/dev/null 2>&1
    echo "masked neo4j.service: the graph is the Docker container, not the apt package"
  else
    echo "neo4j.service already masked"
  fi
  systemctl reset-failed neo4j.service >/dev/null 2>&1 || true
else
  echo "refusing to mask neo4j.service: no Docker container named neo4j is present" >&2
  rc=1
fi

failed=$(systemctl --failed --no-legend | wc -l)
echo "failed systemd units: $failed"
if [ "$failed" -ne 0 ]; then
  systemctl --failed --no-legend
  rc=1
fi

exit $rc
