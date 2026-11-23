"""Item 45: the rail must not present the tenant's own register as external threat intelligence."""
import pathlib
import re

PANEL = pathlib.Path("/opt/gds-os/apps/web/src/components/copilot/LiveIntelligencePanel.jsx")


def code():
    text = PANEL.read_text(encoding="utf-8")
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def test_no_row_claims_external_confirmation():
    src = code()
    assert "AFFECTS GDS" not in src, "the badge asserted a feed match that was hardcoded true on every derived row"


def test_the_badge_states_what_the_row_actually_is():
    src = code()
    assert 'String(t.feed_type || "").toUpperCase() === "KEV"' in src
    assert "KEV LISTED" in src and "OWN FINDING" in src


def test_the_rail_names_its_own_source():
    src = code()
    assert "Top threats in your estate" in src
    assert "Derived from this tenant's own findings that carry a CVE" in src
    assert "No advisory, malware, ransomware or dark-web feed" in src


def test_the_stale_absence_claim_is_gone():
    src = code()
    assert "No threat-intel feed is served here" not in src, (
        "/threat-intel/feed shipped in item 31, so this refusal had become false"
    )


def test_the_empty_state_is_gated_and_claims_only_what_was_read():
    """Live, the ungated sentence rendered mid-fetch and asserted the register held nothing while it held 899 CVEs."""
    src = code()
    assert "const [loaded, setLoaded] = useState(false);" in src
    assert "setLoaded(true);" in src
    assert "{loaded && threats.length === 0 && (" in src, "an in-flight empty array must not state an absence"
    assert "This read returned none, which is not the" in src
    assert "It is empty because no such finding is" not in src
