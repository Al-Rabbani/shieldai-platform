"""The evidence vault's verify action: a hash comparison, exposed rather than reimplemented.

Measured 22 Nov 2026 before writing anything: gds_api.platform_data.evidence_integrity already does the whole job -
tenant scoped SQL, a check that the storage key sits inside this tenant's prefix, a bounded MinIO read, a SHA-256
recomputation and an hmac.compare_digest - and it is what the agent tool verify_evidence_integrity runs. Running it
against the live table returned {"verdict": "intact", "intact": true, "stored_sha256": "c129e352..."} for a cloud_finding
row, and EVIDENCE_NOT_FOUND for another tenant's forensic fixture, which is the RLS working.

The page's button says "signature". No signing key exists on this platform, so nothing here can prove WHO wrote the bytes;
it proves the bytes still match the hash recorded when they were stored. The route says that in its own basis line rather
than letting the old word imply a signature.
"""
from __future__ import annotations

import asyncio
import uuid

import pytest
from fastapi import HTTPException

from gds_api import evidence as evidence_module
from gds_api import platform_data

EVIDENCE_ID = uuid.UUID("68358ebf-c173-4980-b456-4b4becdf0a54")


def _row(**over):
    row = {
        "id": str(EVIDENCE_ID), "subject_type": "cloud_finding", "subject_id": "f-1",
        "size_bytes": 485, "created_at": "2026-11-20T10:00:00+00:00",
    }
    row.update(over)
    return row


async def _call(monkeypatch, result):
    async def fake(_eid):
        return result
    monkeypatch.setattr(platform_data, "evidence_integrity", fake)
    return await evidence_module.verify_evidence_integrity_route(EVIDENCE_ID, current_user=object())


def test_an_intact_object_reports_intact_with_both_hashes(monkeypatch):
    out = asyncio.run(_call(monkeypatch, {
        "success": True, "intact": True, "verdict": "intact",
        "stored_sha256": "a" * 64, "measured_sha256": "a" * 64, "measured_size_bytes": 485,
        "checked_content": "MinIO object bytes, freshly downloaded", "evidence": _row(),
    }))
    assert out.intact is True and out.verdict == "intact"
    assert out.stored_sha256 == out.measured_sha256
    assert out.measured_size_bytes == 485
    assert "not a signature" in out.basis


def test_a_changed_object_reports_modified_and_keeps_both_hashes_apart(monkeypatch):
    out = asyncio.run(_call(monkeypatch, {
        "success": True, "intact": False, "verdict": "modified",
        "stored_sha256": "a" * 64, "measured_sha256": "b" * 64, "measured_size_bytes": 490,
        "checked_content": "MinIO object bytes, freshly downloaded", "evidence": _row(),
    }))
    assert out.intact is False and out.verdict == "modified"
    assert out.stored_sha256 != out.measured_sha256
    assert out.stored_size_bytes == 485 and out.measured_size_bytes == 490


def test_an_unreadable_object_is_never_a_success(monkeypatch):
    """A missing object is not evidence of integrity. Answering 200 here would claim a check that never ran."""
    with pytest.raises(HTTPException) as caught:
        asyncio.run(_call(monkeypatch, {
            "success": False, "code": "EVIDENCE_SOURCE_UNAVAILABLE",
            "error": "evidence object could not be read: S3Error",
        }))
    assert caught.value.status_code == 409
    assert "EVIDENCE_SOURCE_UNAVAILABLE" in caught.value.detail


def test_another_tenants_evidence_is_a_404(monkeypatch):
    with pytest.raises(HTTPException) as caught:
        asyncio.run(_call(monkeypatch, {"success": False, "code": "EVIDENCE_NOT_FOUND", "error": "no record"}))
    assert caught.value.status_code == 404


def test_the_route_delegates_to_the_engine_the_agent_tool_uses():
    """No second implementation: the route calls platform_data.evidence_integrity."""
    source = (evidence_module.__file__)
    with open(source, encoding="utf-8") as handle:
        text = handle.read()
    assert "platform_data.evidence_integrity(" in text
    assert "hashlib" not in text.split("async def verify_evidence_integrity_route")[1].split("@router")[0], \
        "the route must not recompute its own hash"
