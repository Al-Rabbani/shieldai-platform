"""Provision one harmless, tenant-owned MinIO fixture for the forensic assessment.

Run from /opt/gds-os with apps/api/venv/bin/python and the assessment identity in
the environment. Prints only the evidence UUID. This never touches another tenant.
"""
from __future__ import annotations

import asyncio
import hashlib
import os
import uuid

from sqlalchemy import select

from gds_api.db import async_session_factory
from gds_api.evidence import create_evidence, download_evidence_content
from gds_api.models import Evidence
from gds_api.tenant_binding import bind_tenant

CONTENT = b"GDS controlled forensic assessment fixture v1\n"
SUBJECT = "gds-assessment-forensics-v1"


async def main() -> None:
    tenant_id = uuid.UUID(os.environ["GDS_ASSESSMENT_TENANT_ID"])
    user_id = uuid.UUID(os.environ["GDS_ASSESSMENT_PRINCIPAL_ID"])
    async with async_session_factory() as db:
        await bind_tenant(db, tenant_id)
        existing = (await db.execute(
            select(Evidence).where(Evidence.tenant_id == tenant_id,
                                   Evidence.subject_type == SUBJECT)
            .order_by(Evidence.created_at.desc())
        )).scalars().first()
        if existing:
            try:
                content = await download_evidence_content(existing.storage_key)
                if (content == CONTENT and existing.sha256 == hashlib.sha256(CONTENT).hexdigest()
                        and existing.size_bytes == len(CONTENT)):
                    print(existing.id)
                    return
            except Exception:
                pass  # missing object gets a new fixture; never accept it as intact
        evidence = await create_evidence(
            db, tenant_id=tenant_id, user_id=user_id, subject_type=SUBJECT,
            subject_id="controlled-v1", content=CONTENT, content_type="text/plain",
            filename="gds-forensic-fixture.txt",
        )
        await db.commit()
        print(evidence.id)


if __name__ == "__main__":
    asyncio.run(main())
