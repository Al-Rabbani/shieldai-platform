"""Cloud attack paths: what this platform can and cannot show.

Measured 23 Nov 2026: AttackPathsPage, CommandCenter and PentestResultsPage all read CloudAttackPath, which the adapter
refuses because no attack-path store exists. cloud_asset_relationships holds 0 rows against 145 assets, so there is no
graph to derive a path from either, and nothing on this platform models lateral movement.

The route therefore answers with the measured state rather than an empty list that a page could render as "0 paths found,
you are clean": items is empty, and assets/edges/not_served say why. Nothing is derived, because a path built from zero
edges would be invented.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/cloud/attack-paths", tags=["cloud"])

_COUNTS = """
SELECT (SELECT count(*) FROM cloud_assets WHERE tenant_id = :tenant_id) AS assets,
       (SELECT count(*) FROM cloud_asset_relationships WHERE tenant_id = :tenant_id) AS edges
"""

NOT_SERVED = {
    "CloudAttackPath": "No attack-path store exists on this platform.",
    "attack_graph": "No graph engine runs here, and the asset relationship table holds no edges to traverse.",
}


@router.get("")
async def attack_paths(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("cloud:findings:read")),
) -> dict:
    counts = (await db.execute(text(_COUNTS), {"tenant_id": str(current_user.tenant_id)})).first()._mapping
    assets, edges = counts["assets"], counts["edges"]
    return {
        "items": [],
        "count": 0,
        "assets": assets,
        "edges": edges,
        "tenant_scoped": True,
        "not_served": NOT_SERVED,
        "basis": (
            f"No attack path is recorded or can be computed: there is no path store, and the relationship graph holds "
            f"{edges} edge(s) across {assets} asset(s). Zero paths here means nothing was measured, not that the estate "
            f"is clean."
        ),
    }
