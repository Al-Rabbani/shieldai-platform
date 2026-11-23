"""Modules must not assert an absence over a store that does not exist.

Each case here was measured on the live platform: the module read an entity the API does not serve, got [] from the
adapter, and printed "No X yet" - which reads as "we looked and there are none". Two of them also WROTE into that
absent store and swallowed the failure, so an operator saw a logged milestone or a sent message that was discarded.
"""
from __future__ import annotations

import pathlib

import pytest

WEB = pathlib.Path(__file__).resolve().parents[1] / "apps/web/src"

CASES = [
    ("components/incidents/IncidentCommsPanel.jsx", "IncidentComment", "No updates yet"),
    ("components/incidents/IncidentTimelineModal.jsx", "IncidentTimeline", "No phases logged yet"),
    ("pages/compliance/ComplianceAuditLogPage.jsx", "ComplianceEvidenceAudit", "No evidence activity"),
    ("pages/blueteam/ZeroTrustPage.jsx", "ZeroTrustPolicy", "No zero trust policies configured"),
    ("components/identity/IdentityThreatsTable.jsx", "IdentityThreat", "No identity threats detected"),
    ("pages/redteam/PentestResultsPage.jsx", "AttackSimulation", "No simulation has been run yet"),
]


@pytest.mark.parametrize("rel,entity,false_phrase", CASES)
def test_the_false_empty_state_is_gone_and_the_reason_is_rendered(rel, entity, false_phrase):
    src = (WEB / rel).read_text()
    assert false_phrase not in src, f"{rel} still claims an absence it never measured"
    assert 'from "@/components/platform/AbsentStore"' in src, f"{rel} does not import the notice"
    assert f'entity="{entity}"' in src, f"{rel} does not name the absent store"


def test_the_war_room_no_longer_pretends_to_send():
    """IncidentComment.create() resolved against nothing and .catch(() => {}) hid it: the box cleared, nothing stored."""
    src = (WEB / "components/incidents/IncidentCommsPanel.jsx").read_text()
    assert "IncidentComment.create" not in src
    assert "Posting is disabled" in src
    # "Live" was a claim about a subscription the platform does not run
    assert "Live War Room Chat" not in src


def test_a_milestone_cannot_be_logged_into_a_store_that_does_not_exist():
    src = (WEB / "components/incidents/IncidentTimelineModal.jsx").read_text()
    assert "Log Milestone (not stored)" in src
    assert "IncidentTimeline has no store on this platform" in src
    # the button that opened the form must not be clickable any more
    assert 'onClick={() => setShowForm(true)}' not in src


def test_an_absent_attack_path_store_is_not_reported_as_a_clean_result():
    src = (WEB / "pages/redteam/PentestResultsPage.jsx").read_text()
    assert "No attack path has been found yet" not in src
    assert "It is an absence, not a clean result" in src


def test_the_notice_renders_nothing_for_a_store_that_is_served():
    """A served name must not get an absence notice: that would be the same error in the other direction."""
    comp = (WEB / "components/platform/AbsentStore.jsx").read_text()
    assert "if (!reason) return null" in comp
    mapping = (WEB / "api/absentStores.js").read_text()
    for served_looking in ("SecurityFinding", "CloudAsset", "Incident:"):
        assert served_looking not in mapping
