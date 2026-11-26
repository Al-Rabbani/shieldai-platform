"""The secrets scanner must find a real secret, and must not report placeholders as one.

Both halves are guarded, because this scanner failed BOTH ways while being built on 26 Nov 2026:
  - with --redact and "REDACTED" in the fixture list, it suppressed 100% of findings and reported a clean estate;
  - with a .gitleaks.toml that did not extend the default rules, a canary holding an AWS key and a GitHub token went
    from 1 finding to 0. A scanner that reports zero because it cannot see is worse than no scanner.
"""
import asyncio
import pathlib

from gds_api.scanner_persistence import EXTRACTORS, _gitleaks_scan as extractor
from gds_api.tool_gateway import _gitleaks_scan, GITLEAKS_FIXTURE_MARKERS

REPO = pathlib.Path("/opt/gds-os")


def _scan(path, scope="tree"):
    return asyncio.run(_gitleaks_scan({"target": str(path), "scope": scope}))


def test_a_real_looking_secret_in_a_fresh_tree_is_found(tmp_path):
    """The canary. If this passes with zero findings the scanner is blind, whatever else is green."""
    (tmp_path / "config.py").write_text(
        'AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"\n'
        'github = "ghp_16C7e42F292c6912E7710c838347Ae178B4a"\n'
    )
    out = _scan(tmp_path)
    assert out["success"] is True
    assert out["findings_count"] >= 1, "a canary tree with two obvious credentials produced no finding"


def test_the_secret_value_is_never_returned(tmp_path):
    (tmp_path / "config.py").write_text('token = "ghp_16C7e42F292c6912E7710c838347Ae178B4a"\n')
    out = _scan(tmp_path)
    blob = repr(out)
    assert "16C7e42F292c6912E7710c838347Ae178B4a" not in blob, "the raw credential must never leave the scanner"


def test_repository_placeholders_are_not_findings():
    out = _scan(REPO)
    assert out["success"] is True
    for f in out["findings"]:
        lowered = f["masked"].lower()
        assert not any(m.lower() in lowered for m in GITLEAKS_FIXTURE_MARKERS)


def test_the_allowlist_extends_the_default_rules():
    cfg = (REPO / ".gitleaks.toml").read_text()
    assert "[extend]" in cfg and "useDefault = true" in cfg, \
        "a config without useDefault replaces the default rules and detects nothing"
    # The guard is against the BARE marker, not a name that happens to contain it: an allowlist entry of exactly
    # REDACTED matches gitleaks' own redaction output and would suppress every finding ever produced.
    entries = [ln.strip().strip('\'",').strip() for ln in cfg.splitlines()
               if ln.strip().startswith("'''")]
    assert entries, "the allowlist appears to be empty - this guard would pass vacuously"
    assert "REDACTED" not in [e.upper() for e in entries], \
        f"an allowlist entry of exactly REDACTED suppresses every finding: {entries}"


def test_the_fixture_list_does_not_contain_the_redaction_marker():
    assert "REDACTED" not in GITLEAKS_FIXTURE_MARKERS, \
        "with --redact every value is the literal REDACTED, so this suppresses every finding"


def test_a_finding_is_recorded_without_the_credential():
    row = extractor({"rule": "aws-access-token", "file": "/opt/gds-os/app.py", "line": 12,
                     "masked": "AKIA****MPLE", "scope": "tree"}, "/opt/gds-os")
    assert row["severity"] == "critical", "a secret in the working tree is live exposure"
    assert "app.py:12" in row["title"]
    assert row["raw"]["masked"] == "AKIA****MPLE"
    assert "AKIA****MPLE" in row["description"]


def test_a_history_only_secret_is_high_not_critical():
    row = extractor({"rule": "github-pat", "file": "/opt/gds-os/old.py", "line": 3,
                     "masked": "ghp_****", "scope": "history"}, "/opt/gds-os")
    assert row["severity"] == "high"
    assert "rotated" in row["description"]


def test_the_scanner_is_governed_and_scheduled():
    from gds_api.capabilities.catalog import CAPABILITY_REGISTRY, TOOL_TO_CAPABILITY_KEY

    assert "gitleaks_scan" in EXTRACTORS, "findings must be persisted, not just returned"
    assert TOOL_TO_CAPABILITY_KEY.get("gitleaks_scan") == "code.secrets_scan"
    cap = CAPABILITY_REGISTRY["code.secrets_scan"]
    assert cap.required_tool_ids == ("gitleaks_scan",)
    cron = (REPO / "config/cron/root.crontab").read_text()
    assert "secrets_scan.py" in cron, "a scanner that only runs when asked is not coverage"


def test_the_nightly_runner_uses_the_same_handler():
    src = (REPO / "scripts/ops/secrets_scan.py").read_text()
    assert "from gds_api.tool_gateway import _gitleaks_scan" in src, \
        "the nightly run must not shell out to a second, differently-configured gitleaks"
    assert "persist_scan_output" in src
