"""The console could not say which build it was showing.

/health answers version "0.1.0", the API package version, which is identical on every deploy. The Overview panel
displayed exactly that, so an operator looking at the console had no way to tell whether the fix they had just
shipped was the code in front of them. /health/version has reported the deployed commit, its timestamp, tree
cleanliness and the schema version all along; nothing on the product surface read it.

Same pass: a service that reported no latency was rendered as "0.0ms", which is a measurement that was never taken.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIENT = (ROOT / "web" / "gds_app.html").read_text(encoding="utf-8")


def test_the_overview_names_the_deployed_commit_not_the_package_version():
    assert "apiGet('/health/version')" in CLIENT
    assert "<td class=\"muted\">Build</td>" in CLIENT
    assert "String(build.sha).slice(0, 12)" in CLIENT


def test_the_package_version_is_kept_but_not_mistaken_for_the_build():
    assert "<td class=\"muted\">API package</td>" in CLIENT
    assert "escapeHtml(health?.version || '--')" in CLIENT


def test_a_dirty_tree_at_deploy_is_surfaced():
    assert "deployed from a dirty tree" in CLIENT
    assert "build.tree_clean === false" in CLIENT


def test_a_missing_latency_is_unknown_rather_than_zero():
    assert "typeof svc.latency_ms === 'number'" in CLIENT
    assert "(svc.latency_ms||0)" not in CLIENT
