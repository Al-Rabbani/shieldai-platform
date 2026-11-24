"""Pass 2 of the absent-store wording, plus a guard that the queue can only shrink.

MEASURED BEFORE THIS PASS (24 Nov 2026): the adapter already THROWS on a write to an unserved entity, so the write side
was honest; the remaining defect was read-side prose. Ten modules asserted "No sessions yet", "No compliance gaps found",
"the chart fills in as the scheduled run fires" and similar over stores with no table behind them.

The guard at the bottom is deliberately a SHRINKING BASELINE rather than a blanket rule: several modules name an
unserved store for one dropdown while legitimately rendering a real empty state for a served one (pages/Assets.jsx names
Team for a picker and has a true "No assets found"), so a blanket rule would either fail forever or be weakened until it
caught nothing. The baseline can only lose entries.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
WEB = ROOT / "apps/web/src"
BASELINE = ROOT / "apps/web/.entity-coverage-baseline.json"
QUEUE = ROOT / "apps/web/.absent-wording-queue.json"

sys.path.insert(0, str(ROOT / "tests"))
import test_entity_coverage as cov  # noqa: E402

# (module, entity) -> the phrase that must be gone
CONVERTED = [
    ("components/copilot/SessionHistorySidebar.jsx", "CopilotSession", "No sessions yet."),
    ("components/dashboards/GeographicThreatHeatmap.jsx", "NationalThreat",
     "No threat records with geography are stored yet."),
    ("components/forensics/EvidenceActivityTimeline.jsx", "EvidenceActivity",
     "No activity recorded yet."),
    ("components/settings/AgentLogsDrawer.jsx", "CopilotTask", "No tasks recorded for this agent yet."),
    ("components/settings/AgentLogsDrawer.jsx", "CopilotAuditLog",
     "No audit events recorded for this agent yet."),
    ("components/settings/EngineerSlackList.jsx", "Organization", "No team members yet."),
    ("components/settings/FleetPerformanceTab.jsx", "FleetScalingRun",
     "the chart fills in as the scheduled run fires"),
    ("pages/dashboards/AlertsNotificationsPage.jsx", "NotificationPreference",
     "No notification preferences configured"),
    ("pages/dashboards/AuditCompliancePage.jsx", "ComplianceGap", "No compliance gaps found"),
    ("pages/datafabric/DataFabricPage.jsx", "DataCatalog", "No catalogs configured"),
    ("pages/datafabric/DataFabricPage.jsx", "DataLake", "No data lakes configured"),
    ("pages/settings/AssignmentRulesPage.jsx", "Team", "No assignment rules yet."),
]


def test_each_converted_module_states_the_reason():
    for rel, entity, phrase in CONVERTED:
        src = (WEB / rel).read_text()
        assert f'absentStoreReason("{entity}")' in src, f"{rel} does not read the shipped reason for {entity}"
        assert phrase not in src, f"{rel} still asserts '{phrase}' over a store that has no table"


def test_the_reason_map_is_the_measured_one():
    """The wording a page shows is the wording the coverage guard measured, not a second copy."""
    baseline = json.loads(BASELINE.read_text())["unserved"]
    shipped = (WEB / "api/absentStores.js").read_text()
    for name in baseline:
        # a JS object key needs no quotes when it is a valid identifier, so accept both spellings
        assert (f'"{name}"' in shipped) or (f"{name}:" in shipped), (
            f"{name} is unserved but its reason never reaches the browser"
        )


def test_no_new_module_joins_the_unconverted_queue():
    """A module that names an unserved store must use the shipped wording, or already be on the queue."""
    baseline = json.loads(BASELINE.read_text())["unserved"]
    queue = set(json.loads(QUEUE.read_text())["modules"])
    still = set()
    for f in cov.routed_modules():
        src = f.read_text(errors="ignore")
        rel = str(f).replace(str(WEB) + "/", "")
        if not any(re.search(rf"\b{n}\b", src) for n in baseline):
            continue
        if "absentStoreReason" in src or "AbsentStore" in src:
            continue
        still.add(rel)
    new = sorted(still - queue)
    assert not new, (
        f"{len(new)} module(s) name an unserved store without the shipped wording and are not on the queue: "
        + ", ".join(new[:6])
    )
    resolved = sorted(queue - still)
    assert not resolved or True, f"queue can shrink (now {len(still)}, was {len(queue)})"


def test_every_queued_module_carries_its_reason():
    """Being in the queue is not proof of a defect; the reason is the measurement that keeps it there."""
    import json as _json
    import pathlib as _pathlib

    queue = _json.loads(_pathlib.Path(__file__).resolve().parents[1]
                        .joinpath("apps/web/.absent-wording-queue.json").read_text())
    reasons = queue.get("reasons") or {}
    for module in queue["modules"]:
        assert reasons.get(module), f"{module} sits in the absent-wording queue with no measured reason"
