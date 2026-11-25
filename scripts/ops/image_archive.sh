#!/bin/bash
# Archive every image this host is running, so the platform can be rebuilt without any registry.
#
# Why: minio/minio:latest no longer resolves on Docker Hub ("object not found") and quay.io refuses
# anonymous queries (401), so the object store could not be recreated if its image were pruned. Measured
# 25 Nov 2026. One archive per RUNNING IMAGE, named by its immutable image id, plus a digest tag, makes
# every running image recreatable from this host alone.
set -uo pipefail
DEST=/opt/backups/images
mkdir -p "$DEST"
saved=0; skipped=0; failed=0
declare -A seen

for image in $(docker ps --format '{{.Image}}' 2>/dev/null | sort -u); do
  id=$(docker inspect "$image" --format '{{.Id}}' 2>/dev/null)
  [ -z "$id" ] && { failed=$((failed+1)); continue; }
  short=$(echo "${id#sha256:}" | cut -c1-12)
  [ -n "${seen[$short]:-}" ] && continue
  seen[$short]=1
  safe=$(echo "$image" | sed 's#[/:]#_#g')
  archive="$DEST/${safe}-${short}.tar.gz"
  if [ -f "$archive" ] && gzip -t "$archive" 2>/dev/null; then
    skipped=$((skipped+1)); continue
  fi
  if docker save "$id" 2>/dev/null | gzip -1 > "$archive" && gzip -t "$archive" 2>/dev/null; then
    saved=$((saved+1))
    docker tag "$id" "$(echo "$image" | sed 's/:[^:/]*$//'):pinned-$short" 2>/dev/null || true
  else
    rm -f "$archive"; failed=$((failed+1))
  fi
done

count=$(ls -1 "$DEST"/*.tar.gz 2>/dev/null | wc -l)
running=$(docker ps -q 2>/dev/null | wc -l)
total=$(du -sh "$DEST" 2>/dev/null | cut -f1)
echo "image_archive: saved=$saved skipped=$skipped failed=$failed archives=$count running_containers=$running size=$total"
# every archive must be a readable gzip containing a manifest
bad=0
for f in "$DEST"/*.tar.gz; do
  tar -xOzf "$f" manifest.json >/dev/null 2>&1 || { echo "  CORRUPT: $f"; bad=$((bad+1)); }
done
[ "$bad" -eq 0 ] && echo "  all archives verified: manifest.json readable in each"
[ "$failed" -eq 0 ] && [ "$bad" -eq 0 ]
