#!/usr/bin/env python3
"""Record what actually happened at the last boot, so "services come back unaided" is a measurement.

The platform claimed boot supervision for months without ever rebooting: supervisor was configured with
autostart=true and that was taken as proof. On 21 Nov 2026 the host was rebooted for a kernel update and the claim
was tested for real. This script captures the result so it can be re-tested after any reboot instead of becoming a
story about one night in November.

What it measures, and why each part is here:
  * boot time from /proc/stat btime, which is the kernel's own record and cannot be edited by hand;
  * each supervised service's process start, so the offset from boot proves supervisor started it, not a human;
  * each container's start, so a container that needed a manual docker start is visible;
  * the kernel release, because a reboot is also when a pending kernel update lands.

A service that started more than GRACE_SECONDS after boot did not start at boot. That is the whole assertion.
"""
import json
import os
import re
import subprocess
from datetime import datetime, timezone

OUT = "/var/lib/gds-boot-proof.json"
SERVICES = ("gds-os", "gds-worker", "gds-kernel")
CONTAINERS = ("neo4j", "qdrant", "temporal", "minio", "nats")
GRACE_SECONDS = 180


def run(*args: str) -> str:
    return subprocess.run(args, capture_output=True, text=True).stdout.strip()


def boot_time() -> datetime:
    with open("/proc/stat") as handle:
        for line in handle:
            if line.startswith("btime "):
                return datetime.fromtimestamp(int(line.split()[1]), timezone.utc)
    raise RuntimeError("no btime in /proc/stat")


def process_start(pid: str) -> datetime | None:
    """Process start from /proc/<pid>/stat field 22, in clock ticks since boot, added to boot time.

    Field 22 rather than ps lstart because lstart is a human string with a one-second resolution and no timezone.
    """
    try:
        with open(f"/proc/{pid}/stat") as handle:
            fields = handle.read().rsplit(") ", 1)[1].split()
        start_ticks = int(fields[19])
        hertz = os.sysconf("SC_CLK_TCK")
        return datetime.fromtimestamp(
            int(open("/proc/stat").read().split("btime ")[1].split()[0]) + start_ticks / hertz, timezone.utc
        )
    except Exception:
        return None


def supervisor_pid(service: str) -> str | None:
    pid = run("supervisorctl", "pid", service)
    return pid if pid.isdigit() else None


def container_started_at(name: str) -> datetime | None:
    raw = run("docker", "inspect", "-f", "{{.State.StartedAt}}", name)
    if not raw or raw == "<no value>":
        return None
    try:
        # Docker prints nanosecond precision and fromisoformat accepts at most microseconds, so trim the tail
        # rather than losing the whole value.
        trimmed = re.sub(r"(\.\d{6})\d+", r"\1", raw.replace("Z", "+00:00"))
        return datetime.fromisoformat(trimmed)
    except ValueError:
        return None


def main() -> int:
    booted = boot_time()
    proof = {
        "recorded_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "booted_at": booted.isoformat().replace("+00:00", "Z"),
        "kernel": run("uname", "-r"),
        "grace_seconds": GRACE_SECONDS,
        "services": {},
        "containers": {},
    }

    for service in SERVICES:
        pid = supervisor_pid(service)
        state = run("supervisorctl", "status", service).split()
        started = process_start(pid) if pid else None
        proof["services"][service] = {
            "state": state[1] if len(state) > 1 else "UNKNOWN",
            "pid": int(pid) if pid else None,
            "started_at": started.isoformat().replace("+00:00", "Z") if started else None,
            "seconds_after_boot": round((started - booted).total_seconds(), 1) if started else None,
        }

    for container in CONTAINERS:
        started = container_started_at(container)
        proof["containers"][container] = {
            "started_at": started.isoformat().replace("+00:00", "Z") if started else None,
            "seconds_after_boot": round((started - booted).total_seconds(), 1) if started else None,
        }

    proof["supervised_without_intervention"] = all(
        entry["seconds_after_boot"] is not None and 0 <= entry["seconds_after_boot"] <= GRACE_SECONDS
        for entry in proof["services"].values()
    )
    proof["containers_restored_without_intervention"] = all(
        entry["seconds_after_boot"] is not None and 0 <= entry["seconds_after_boot"] <= GRACE_SECONDS
        for entry in proof["containers"].values()
    )

    with open(OUT, "w") as handle:
        json.dump(proof, handle, indent=2)
        handle.write("\n")

    print(json.dumps(proof, indent=2))
    return 0 if proof["supervised_without_intervention"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
