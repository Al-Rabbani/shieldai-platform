"""A panel must not describe an automation that does not exist.

Measured 23 Nov 2026: AutoRemediationPolicy has no store, every toggle defaulted to on, and nothing picks up a strategy per
asset type - the engine only generates and executes a plan when asked.
"""
import re
from pathlib import Path

PANEL = Path(__file__).resolve().parents[1] / "apps" / "web" / "src" / "components" / "fixes" / "AutoRemediationToggles.jsx"


def _rendered() -> str:
    return re.sub(r"/\*.*?\*/", "", PANEL.read_text(encoding="utf-8"), flags=re.S)


def test_no_toggle_writes_to_a_missing_store():
    text = _rendered()
    assert "AutoRemediationPolicy" not in text
    assert "entities." not in text, "nothing here may call an entity that has no store"


def test_the_auto_patch_claim_is_gone():
    text = _rendered()
    assert "auto-patch" not in text
    assert "Low-risk findings pick up their matching library strategy" not in text


def test_the_panel_states_what_remediation_really_is():
    text = _rendered()
    assert "Not automated" in text
    assert "plan a person asks for" in text
    assert "no per-asset-type policy" in text.lower() or "No per-asset-type policy" in text
