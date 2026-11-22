#!/usr/bin/env python3
"""Record what this platform's own AI layer is configured to run, and what it has actually invoked.

Measured 22 Nov 2026: no table recorded a model name, a token count or an invocation, even though five /reasoning routes
call OpenAI. This collector reads the deployed source for the model constants that are really configured, and derives one
invocation row per mission the reasoning loop created.

Stated basis, not assumed: missions whose mission_type is null are the ones the reasoning bridge creates. Missions with a
mission_type (port_scan, cloud_security_assessment) are the deterministic scanners and are NOT counted as AI invocations.

Usage: python3 ai_posture.py
"""
from __future__ import annotations

import asyncio
import hashlib
import os
import re
import sys
import uuid
from pathlib import Path

sys.path.insert(0, "/opt/gds-os/apps/api")

from sqlalchemy import text  # noqa: E402

from gds_api.db import async_session_factory  # noqa: E402
from gds_api.tenant_binding import bind_tenant  # noqa: E402

TENANT = os.environ.get("GDS_TENANT_ID", "2ec10dd0-e48e-4043-8c88-5998ba5e23b0")
REASONING = Path("/opt/gds-os/apps/api/gds_api/reasoning")
MODEL_PATTERN = re.compile(r'(?:model\s*:\s*str\s*=\s*|MODEL\s*=\s*)"([a-zA-Z0-9._-]+)"')


def configured_models() -> list[dict[str, str]]:
    """Every model constant in the deployed reasoning code, with the file that declares it."""
    found: dict[tuple[str, str], dict[str, str]] = {}
    for path in sorted(REASONING.glob("*.py")):
        for model in MODEL_PATTERN.findall(path.read_text()):
            found[(model, path.name)] = {"name": model, "configured_in": f"reasoning/{path.name}"}
    return list(found.values())


def provider_for(model: str) -> str:
    if model.startswith("gpt") or model.startswith("o1") or model.startswith("o3"):
        return "openai"
    if model.startswith("claude"):
        return "anthropic"
    return "unknown"


async def main() -> int:
    tenant = uuid.UUID(TENANT)
    key_present = bool(os.environ.get("OPENAI_API_KEY", "").strip())
    models = configured_models()
    if not models:
        print("no model constant found in the reasoning code, nothing recorded")
        return 1

    written_models = 0
    written_invocations = 0
    async with async_session_factory() as db:
        await bind_tenant(db, tenant)
        for m in models:
            await db.execute(text(
                "INSERT INTO ai_models (tenant_id, name, provider, model_family, deployment_type, configured_in, "
                "is_active, approved, risk_class, last_seen) "
                "VALUES (:t, :name, :provider, :family, 'external_api', :where, :active, false, 'unclassified', now()) "
                "ON CONFLICT (tenant_id, name, configured_in) DO UPDATE SET "
                "is_active = EXCLUDED.is_active, last_seen = now()"
            ), {"t": tenant, "name": m["name"], "provider": provider_for(m["name"]),
                "family": m["name"].split("-")[0], "where": m["configured_in"], "active": key_present})
            written_models += 1

        rows = (await db.execute(text(
            "SELECT id, objective, status, risk_class, created_at, completed_at FROM missions "
            "WHERE tenant_id = :t AND (mission_type IS NULL OR mission_type = 'reasoning')"
        ), {"t": tenant})).mappings().all()
        model_name = models[0]["name"]
        for r in rows:
            duration = None
            if r["completed_at"] and r["created_at"]:
                duration = max(0, int((r["completed_at"] - r["created_at"]).total_seconds()))
            await db.execute(text(
                "INSERT INTO ai_invocations (tenant_id, mission_id, model, invocation_type, status, risk_class, "
                "objective_hash, duration_seconds, started_at, completed_at) "
                "VALUES (:t, :mid, :model, 'reasoning_mission', :status, :risk, :hash, :dur, :started, :completed) "
                "ON CONFLICT (tenant_id, mission_id) DO UPDATE SET status = EXCLUDED.status, "
                "completed_at = EXCLUDED.completed_at, duration_seconds = EXCLUDED.duration_seconds"
            ), {"t": tenant, "mid": r["id"], "model": model_name, "status": r["status"] or "unknown",
                "risk": r["risk_class"], "hash": hashlib.sha256((r["objective"] or "").encode()).hexdigest(),
                "dur": duration, "started": r["created_at"], "completed": r["completed_at"]})
            written_invocations += 1
        await db.commit()

    print(f"models: {written_models} configured (OPENAI_API_KEY {'present' if key_present else 'MISSING'}), "
          f"invocations: {written_invocations} reasoning missions recorded")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
