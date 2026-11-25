"""The absent-wording queue, closed by measurement rather than by editing prose.

MEASURED 25 Nov 2026: of the 35 modules on the queue, 23 only NAME an unserved store (a picker, or a read whose
result is never presented as a count), 6 already state the absence in their own prose, 5 make their claim about a
SERVED store (cloud_assets 145 rows, incidents 2, repositories 1, KPI at /executive/kpis), and 1 derives its graph
from findings without reading the absent store. FOUR still carried a real defect and are fixed here:

  ExecutiveDashboardPage  "No executive insights generated" and "No board reports generated" were empty states over
                          ExecutiveInsight and BoardReport, neither of which has a table.
  IncidentTimelineView    returned "No timeline events recorded yet." for every incident, because IncidentTimeline
                          has no store - so a reader was told the investigation history was empty, not absent.
  CodeSecurityDashboard   an empty LicenseRisk list collapsed to nothing at all (licenseRisks.length > 0 && ...),
                          and silence about licence risk reads as no licence risk.
  AttackVectorSimulator   fetched AuthorizationPolicy into state on every load and never read it.

The distinction this file protects: naming an unserved store is not a defect, but rendering its emptiness as a
value is. That is why the queue is an inventory with a measured reason per entry, not a list of edits to make.
"""
from __future__ import annotations

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
WEB = ROOT / "apps/web/src"
QUEUE = ROOT / "apps/web/.absent-wording-queue.json"

# (module, entity, the phrase that must be gone)
FIXED = [
    ("pages/dashboards/ExecutiveDashboardPage.jsx", "ExecutiveInsight", "No executive insights generated"),
    ("pages/dashboards/ExecutiveDashboardPage.jsx", "BoardReport", "No board reports generated"),
    ("components/incidents/IncidentTimelineView.jsx", "IncidentTimeline", "No timeline events recorded yet."),
]


def strip_comments(src: str) -> str:
    """A test must not fail on the prose that NAMES the claim it removed."""
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"^\s*//.*$", "", src, flags=re.M)


def test_fixed_modules_read_the_shipped_reason():
    for rel, entity, phrase in FIXED:
        src = strip_comments((WEB / rel).read_text())
        assert f'absentStoreReason("{entity}")' in src, f"{rel} does not read the shipped reason for {entity}"
        assert phrase not in src, f"{rel} still asserts '{phrase}' over a store that has no table"


def test_license_risk_collapse_is_marked():
    src = strip_comments((WEB / "pages/code/CodeSecurityDashboardPage.jsx").read_text())
    assert 'absentStoreReason("LicenseRisk")' in src, "an empty LicenseRisk list is not explained"
    assert "licenseRisks.length === 0" in src, "an empty LicenseRisk list still collapses to silence"


def test_dead_unserved_read_removed():
    src = strip_comments((WEB / "pages/AttackVectorSimulatorPage.jsx").read_text())
    assert "AuthorizationPolicy" not in src, "the simulator still fetches AuthorizationPolicy and never reads it"


def test_every_queued_module_carries_its_reason():
    q = json.loads(QUEUE.read_text())
    reasons = q.get("reasons") or {}
    missing = [m for m in q["modules"] if not reasons.get(m)]
    assert not missing, f"queued with no measured reason: {missing[:5]}"


def test_no_queue_reason_claims_an_outstanding_defect():
    """The queue is closed: every entry must be settled, not a to-do."""
    q = json.loads(QUEUE.read_text())
    reasons = q.get("reasons") or {}
    outstanding = [m for m, r in reasons.items()
                   if r.startswith("TODO") or "still claims" in r or "needs conversion" in r]
    assert not outstanding, f"queue still holds unclosed work: {outstanding[:5]}"
