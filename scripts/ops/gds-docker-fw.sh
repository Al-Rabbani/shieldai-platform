#!/usr/bin/env bash
# Blocks external access to Docker-published service ports on BOTH stacks.
# Docker's DNAT rules bypass UFW, and it publishes on 0.0.0.0 AND [::], so an
# ipv4-only rule leaves every port reachable over IPv6. Both are required.
set -uo pipefail
PORTS="4222,5432,6222,6333,6334,7233,8222,9000,9001"
add() { # binary
  local BIN="$1"
  command -v "$BIN" >/dev/null 2>&1 || return 0
  "$BIN" -C DOCKER-USER -p tcp -m multiport --dports "$PORTS" -j DROP 2>/dev/null \
    || "$BIN" -I DOCKER-USER 1 -p tcp -m multiport --dports "$PORTS" -j DROP
}
add iptables
add ip6tables
