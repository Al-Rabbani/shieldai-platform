"""Item 39: the Co-Pilot answer card must not claim what it did not do.

Three claims had nothing behind them: a typed "GDS Agent OS v2.0" in the footer of every answer, "Saved!" from a write
to an entity this platform does not serve (inside .catch(() => {})), and "Shared!" when the share sheet did not exist,
was never opened, or was dismissed.
"""
import pathlib
import re

WEB = pathlib.Path("/opt/gds-os/apps/web/src")
CARD = WEB / "components" / "copilot" / "ChatMessage.jsx"
PAGE = WEB / "pages" / "gds" / "GDSCoPilotPage.jsx"


def code(path: pathlib.Path) -> str:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(?m)^\s*//.*$", "", text)
    text = re.sub(r"\{/\*.*?\*/\}", "", text, flags=re.S)
    return text


def test_the_footer_prints_the_deployed_release_not_a_typed_version():
    text = code(CARD)
    assert "v2.0" not in text, "the answer footer still prints a typed version"
    assert "message.release" in text and "release unknown" in text
    page = code(PAGE)
    assert "release: version?.sha" in page, "the page must hand the card the release it read from /health/version"


def test_no_component_in_the_copilot_prints_a_hardcoded_version_number():
    offenders = []
    for path in (WEB / "components" / "copilot").glob("*.jsx"):
        if re.search(r"(?<![\w.])v\d+\.\d+", code(path)):
            offenders.append(path.name)
    assert not offenders, f"typed version numbers still render in {offenders}"


def test_the_save_button_no_longer_claims_a_write_that_cannot_happen():
    text = code(CARD)
    assert "CopilotReport" not in text, "the card still writes to an entity this platform does not serve"
    assert "Saved!" not in text, "the card still reports a save"
    assert "setSaved" not in text


def test_the_download_button_really_writes_a_file():
    text = code(CARD)
    assert "createObjectURL" in text and "link.download" in text, "the download must produce a real file"
    assert "Downloaded" in text
    assert "no report store" in CARD.read_text(encoding="utf-8").lower() or "no report store" in text.lower(), (
        "the button must state why it downloads rather than saves")


def test_share_reports_what_actually_happened():
    text = code(CARD)
    assert "await navigator.share" in text, "share must be awaited before anything is claimed"
    assert "AbortError" in text, "a dismissed share sheet must not be reported as shared"
    assert "Could not share" in text
    assert 'shareState === "shared"' in text and 'shareState === "copied"' in text


def test_the_dead_footer_with_the_typed_version_is_gone():
    assert not (WEB / "components" / "layout" / "PageFooter.jsx").exists(), (
        "the unimported layout/PageFooter carried a typed v2.0")
    shared = code(WEB / "components" / "shared" / "PageFooter.jsx")
    assert "v2.0" not in shared


def test_the_card_still_renders_the_engine_summary_and_tool_calls():
    """The rewrite must not have dropped the real payload the route returns."""
    text = code(CARD)
    assert "ReactMarkdown" in text and "message.content" in text
    assert "agent_steps" in text and "AgentStepCard" in text
    assert "total_duration_ms" in text
