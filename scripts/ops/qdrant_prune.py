"""Delete Qdrant vectors that no knowledge document points at.

Why this exists: knowledge documents are deleted by path (purge_mission_memory, manual SQL),
and none of those paths deletes the vector. The collection therefore grows monotonically: on
17 Nov it held 40 points for 18 documents. Nothing reads the orphans, so the only symptom is
unbounded growth and search results that can surface text of documents that no longer exist.

Safety: this is tenant-scoped. It only ever considers points whose payload tenant_id matches
the tenant being pruned, and only deletes points that no row in knowledge_documents points at
through qdrant_point_id. Vectors belonging to another tenant are never read for deletion and
never touched.

Usage:  python qdrant_prune.py                (dry run, prints what would go)
        python qdrant_prune.py --apply        (deletes)
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

import httpx
from sqlalchemy import text

QD = os.environ.get("QDRANT_URL", "http://127.0.0.1:6333")
COLLECTION = "gds_knowledge"


def referenced_point_ids(docs: list[str | None]) -> set[str]:
    """Pure helper, unit tested: the point ids that at least one document still points at."""
    return {str(d) for d in docs if d}


async def scroll_tenant_points(tenant: str) -> list[str]:
    ids: list[str] = []
    offset = None
    async with httpx.AsyncClient(timeout=30) as c:
        while True:
            body = {
                "limit": 512,
                "with_payload": False,
                "filter": {"must": [{"key": "tenant_id", "match": {"value": tenant}}]},
            }
            if offset is not None:
                body["offset"] = offset
            r = await c.post(f"{QD}/collections/{COLLECTION}/points/scroll", json=body)
            r.raise_for_status()
            result = r.json()["result"]
            ids.extend(str(p["id"]) for p in result.get("points", []))
            offset = result.get("next_page_offset")
            if not offset:
                return ids


async def delete_points(ids: list[str]) -> None:
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{QD}/collections/{COLLECTION}/points/delete", json={"points": ids})
        r.raise_for_status()


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tenant-id", default=os.environ.get("GDS_TENANT_ID"))
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    if not args.tenant_id:
        print("no tenant id (pass --tenant-id or set GDS_TENANT_ID)", file=sys.stderr)
        return 2

    from gds_api.db import async_session_factory
    from gds_api.tenant_binding import bind_tenant

    async with async_session_factory() as s:
        await bind_tenant(s, args.tenant_id)
        rows = (await s.execute(
            text("SELECT qdrant_point_id FROM knowledge_documents WHERE tenant_id = :t"),
            {"t": args.tenant_id},
        )).scalars().all()

    keep = referenced_point_ids(list(rows))
    points = await scroll_tenant_points(args.tenant_id)
    orphans = [p for p in points if p not in keep]
    print(f"tenant={args.tenant_id} documents_with_vector={len(keep)} "
          f"points={len(points)} orphans={len(orphans)}")
    if not orphans:
        return 0
    if not args.apply:
        print("dry run: pass --apply to delete", orphans[:5], "..." if len(orphans) > 5 else "")
        return 0
    await delete_points(orphans)
    remaining = await scroll_tenant_points(args.tenant_id)
    print(f"deleted={len(orphans)} points_now={len(remaining)}")
    return 0 if len(remaining) == len(keep) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
