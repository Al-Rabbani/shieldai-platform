"""A migration that was never applied was reported as a deploy success (22 Nov 2026).

The runner globs only migrations/security_isolation. A file dropped in migrations/ was never read; the deploy printed
DEPLOY OK, schema_migrations gained nothing, and the column the API inserted into did not exist - the route answered
500 while /health stayed 200. Separately, a migration is identified by its numeric prefix, so a file reusing a number
is skipped as already applied without a word.
"""
import importlib.util
from pathlib import Path

import pytest

SPEC = Path("/opt/gds-os/scripts/ops/migrate.py")


@pytest.fixture(scope="module")
def runner():
    spec = importlib.util.spec_from_file_location("gds_migrate", SPEC)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_a_file_beside_the_runner_directory_is_reported(runner, tmp_path):
    stray = tmp_path / "migrations"
    inside = stray / "security_isolation"
    inside.mkdir(parents=True)
    (inside / "001_ok.sql").write_text("select 1;")
    (stray / "002_misfiled.sql").write_text("select 2;")
    assert runner.find_misfiled(stray, inside) == ["002_misfiled.sql"]


def test_a_clean_layout_reports_nothing(runner, tmp_path):
    stray = tmp_path / "migrations"
    inside = stray / "security_isolation"
    inside.mkdir(parents=True)
    (inside / "001_ok.sql").write_text("select 1;")
    assert runner.find_misfiled(stray, inside) == []


def test_a_missing_directory_is_not_an_error(runner, tmp_path):
    assert runner.find_misfiled(tmp_path / "nope", tmp_path / "nope2") == []


def test_two_files_sharing_a_version_are_a_clash(runner, tmp_path):
    a = tmp_path / "054_escalation_rule_fields.sql"
    b = tmp_path / "054_remediation_scanner_findings.sql"
    for f in (a, b):
        f.write_text("select 1;")
    clashes = runner.duplicate_versions([a, b])
    assert list(clashes) == ["054"]
    assert sorted(clashes["054"]) == ["054_escalation_rule_fields.sql", "054_remediation_scanner_findings.sql"]


def test_distinct_versions_do_not_clash(runner, tmp_path):
    files = []
    for name in ("054_a.sql", "055_b.sql"):
        f = tmp_path / name
        f.write_text("select 1;")
        files.append(f)
    assert runner.duplicate_versions(files) == {}


def test_the_real_repository_is_clean(runner):
    """The live layout must satisfy both guards, otherwise the next deploy silently skips a migration."""
    assert runner.find_misfiled(runner.STRAY_DIR, runner.MIGRATION_DIR) == []
    assert runner.duplicate_versions(sorted(runner.MIGRATION_DIR.glob("*.sql"))) == {}
