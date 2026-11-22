#!/usr/bin/env python3
"""Measure this host's real security configuration and record drift from an approved baseline.

Before this script, nothing on the platform had ever measured a configuration baseline: config_baselines and
configuration_drift did not exist, and the drift page called four entity names that resolved to nothing. Every setting
below is read from the host or from this platform, so a drift row always carries a real expected value and a real
actual value.

Deliberately not baselined yet, and named here rather than silently omitted: TLS certificate expiry (needs the live
certificate path, not guessed), kernel sysctl values, and package versions (already covered by the CVE scanner).

Usage:
    python3 drift_scan.py              # measure, compare with the approved baseline, write drift
    python3 drift_scan.py --approve    # capture the current state and approve it as the reference
"""
from __future__ import annotations

import argparse
import asyncio
import glob
import hashlib
import json
import os
import subprocess
import sys
import urllib.request

sys.path.insert(0, "/opt/gds-os/apps/api")

from sqlalchemy import text  # noqa: E402

from gds_api.db import async_session_factory  # noqa: E402
from gds_api.tenant_binding import bind_tenant  # noqa: E402

TENANT = os.environ.get("GDS_TENANT_ID", "2ec10dd0-e48e-4043-8c88-5998ba5e23b0")
TARGET = "api-host"
BASELINE_NAME = "api-host security configuration"

# Stated policy: what a change to this setting means. Severity is a judgement written down, not a computed score.
SEVERITY = {
    "ssh.permit_root_login": "high",
    "ssh.password_authentication": "high",
    "firewall.default_incoming": "high",
    "api.header.csp": "medium",
    "api.header.hsts": "medium",
    "api.header.x_frame_options": "low",
    "api.header.x_content_type_options": "low",
    "api.header.referrer_policy": "low",
    "listen.ports": "medium",
    "postgres.rls_forced_tables": "high",
}


def _read(path: str) -> str:
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except OSError:
        return ""


def _sshd_value(name: str) -> str:
    """First match wins, reading sshd_config and its drop-ins, as sshd itself does."""
    paths = ["/etc/ssh/sshd_config"] + sorted(glob.glob("/etc/ssh/sshd_config.d/*.conf"))
    for path in paths:
        for line in _read(path).splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(None, 1)
            if parts and parts[0].lower() == name.lower():
                return parts[1].strip() if len(parts) > 1 else "yes"
    return "unset (sshd default: yes)"


def _run(argv: list[str]) -> str:
    try:
        out = subprocess.run(argv, capture_output=True, text=True, timeout=20)
        return (out.stdout or "") + (out.stderr or "")
    except (OSError, subprocess.SubprocessError):
        return ""


def _firewall_default() -> str:
    out = _run(["ufw", "status", "verbose"])
    if "Status: active" not in out:
        return "ufw inactive"
    for line in out.splitlines():
        if line.lower().startswith("default:"):
            return line.split(":", 1)[1].strip()
    return "ufw active, default not reported"


def _api_headers() -> dict[str, str]:
    """Measured from the API's own health endpoint, so the value is what this platform actually sends."""
    wanted = {
        "Strict-Transport-Security": "api.header.hsts",
        "Content-Security-Policy": "api.header.csp",
        "X-Frame-Options": "api.header.x_frame_options",
        "X-Content-Type-Options": "api.header.x_content_type_options",
        "Referrer-Policy": "api.header.referrer_policy",
    }
    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=10) as resp:
            headers = {k.lower(): v for k, v in resp.headers.items()}
    except Exception as exc:  # noqa: BLE001 - an unreachable API is itself a measurement
        return {key: f"unmeasured: {type(exc).__name__}" for key in wanted.values()}
    return {key: ("present" if name.lower() in headers else "absent") for name, key in wanted.items()}


def _listening_ports() -> str:
    ports = set()
    for line in _run(["ss", "-ltnH"]).splitlines():
        parts = line.split()
        if len(parts) >= 4:
            ports.add(parts[3].rsplit(":", 1)[-1])
    return ",".join(sorted(ports, key=lambda p: int(p) if p.isdigit() else 0)) or "unmeasured"


async def _rls_forced(db) -> str:
    try:
        row = (await db.execute(text(
            "SELECT count(*) FROM pg_class WHERE relrowsecurity AND relforcerowsecurity AND relkind = 'r'"
        ))).scalar()
        return str(row)
    except Exception as exc:  # noqa: BLE001
        return f"unmeasured: {type(exc).__name__}"


async def collect(db) -> dict[str, str]:
    settings = {
        "ssh.permit_root_login": _sshd_value("PermitRootLogin"),
        "ssh.password_authentication": _sshd_value("PasswordAuthentication"),
        "firewall.default_incoming": _firewall_default(),
        "listen.ports": _listening_ports(),
        "postgres.rls_forced_tables": await _rls_forced(db),
    }
    settings.update(_api_headers())
    return settings


def checksum(settings: dict[str, str]) -> str:
    return hashlib.sha256(json.dumps(settings, sort_keys=True).encode()).hexdigest()


def diff(baseline: dict[str, str], current: dict[str, str]) -> list[dict[str, str]]:
    """Every key in the baseline that no longer matches. A key that vanished is a missing control, not a blank."""
    rows = []
    for key, expected in sorted(baseline.items()):
        actual = current.get(key)
        if actual is None:
            rows.append({"setting_key": key, "drift_type": "control_missing", "expected": expected,
                         "actual": "not measurable now", "severity": SEVERITY.get(key, "medium")})
        elif str(actual) != str(expected):
            rows.append({"setting_key": key, "drift_type": "changed", "expected": expected,
                         "actual": str(actual), "severity": SEVERITY.get(key, "low")})
    return rows


async def main() -> int:
    approve = "--approve" in sys.argv
    tenant = __import__("uuid").UUID(TENANT)
    async with async_session_factory() as db:
        await bind_tenant(db, tenant)
        current = await collect(db)

        row = (await db.execute(text(
            "SELECT id, settings FROM config_baselines "
            "WHERE tenant_id = :t AND target = :target AND is_approved LIMIT 1"
        ), {"t": tenant, "target": TARGET})).mappings().first()

        if row is None or approve:
            payload = json.dumps(current, sort_keys=True)
            await db.execute(text(
                "INSERT INTO config_baselines (tenant_id, name, target, settings, settings_checksum, is_approved, approved_by, approved_at) "
                "VALUES (:t, :name, :target, CAST(:settings AS jsonb), :sum, :approved, :by, CASE WHEN :approved THEN now() END)"
            ), {"t": tenant, "name": BASELINE_NAME, "target": TARGET, "settings": payload,
                "sum": checksum(current), "approved": approve,
                "by": "ops-console@globaldigitalsecurity.io" if approve else None})
            await db.commit()
            state = "captured and approved as the reference" if approve else "captured, awaiting approval"
            print(f"baseline {state}: {len(current)} settings from this host")
            if not approve:
                print("no approved baseline existed, so no drift is claimed; re-run with --approve to set the reference")
            return 0

        baseline_id = row["id"]
        baseline = row["settings"] if isinstance(row["settings"], dict) else json.loads(row["settings"])
        drifts = diff(baseline, current)

        for d in drifts:
            await db.execute(text(
                "INSERT INTO configuration_drift (tenant_id, baseline_id, asset, setting_key, drift_type, severity, "
                "expected_value, actual_value, status, auto_correctable, risk_score, dedup_key) "
                "VALUES (:t, :b, :asset, :key, :dtype, :sev, :expected, :actual, 'detected', false, "
                "CASE :sev WHEN 'critical' THEN 90 WHEN 'high' THEN 70 WHEN 'medium' THEN 40 ELSE 15 END, :dedup) "
                "ON CONFLICT (tenant_id, dedup_key) WHERE status = 'detected' DO UPDATE SET "
                "actual_value = EXCLUDED.actual_value, expected_value = EXCLUDED.expected_value, "
                "severity = EXCLUDED.severity, drift_type = EXCLUDED.drift_type, detected_at = now()"
            ), {"t": tenant, "b": baseline_id, "asset": TARGET, "key": d["setting_key"], "dtype": d["drift_type"],
                "sev": d["severity"], "expected": d["expected"], "actual": d["actual"],
                "dedup": f"{TARGET}:{d['setting_key']}"})

        # A setting that matches the baseline again is corrected, and the row says so rather than disappearing.
        matched = [k for k in baseline if k not in {d["setting_key"] for d in drifts}]
        if matched:
            await db.execute(text(
                "UPDATE configuration_drift SET status = 'corrected', corrected_at = now() "
                "WHERE tenant_id = :t AND status = 'detected' AND setting_key = ANY(:keys)"
            ), {"t": tenant, "keys": matched})
        await db.commit()
        print(f"measured {len(current)} settings against baseline {baseline_id}: {len(drifts)} drift, "
              f"{len(matched)} matching")
        for d in drifts:
            print(f"  [{d['severity']}] {d['setting_key']}: expected {d['expected']!r}, actual {d['actual']!r}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
