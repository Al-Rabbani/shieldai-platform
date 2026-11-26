"""A crashed scanner must never read as a clean codebase.

MEASURED 26 Nov 2026: semgrep's entry point in the app venv died with ImportError on
opentelemetry.util.types._ExtendedAttributes. A crashed process exits 1, and semgrep's contract says exit 1 means
"findings found", so the runner parsed the empty stdout as zero results. The register showed 15 semgrep findings, all
dated 1 August, none open - for nearly four months a broken scanner was indistinguishable from clean code.
"""
import pathlib
from types import SimpleNamespace

import pytest

from gds_api import scanner_engines as mod
from gds_api.scanner_engines import ISOLATED_ENGINES, _semgrep_severity, engine_path, semgrep_findings

REPO = pathlib.Path("/opt/gds-os")


def test_a_crash_is_an_error_not_a_clean_scan(monkeypatch):
    async def crashed(args, timeout):
        return SimpleNamespace(returncode=1, stdout="", stderr="ImportError: cannot import name '_ExtendedAttributes'")

    monkeypatch.setattr(mod, "_run_async", crashed)
    with pytest.raises(RuntimeError) as err:
        import asyncio
        asyncio.run(semgrep_findings("/opt/gds-os/apps/api/gds_api", "p/python"))
    assert "no parsable JSON" in str(err.value)


def test_exit_one_with_real_results_is_still_findings(monkeypatch):
    payload = '{"results": [{"check_id": "a.b.shell-true", "path": "/x.py", "start": {"line": 3}, "end": {"line": 3},' \
              ' "extra": {"severity": "ERROR", "message": "shell", "lines": "x"}}]}'

    async def found(args, timeout):
        return SimpleNamespace(returncode=1, stdout=payload, stderr="")

    monkeypatch.setattr(mod, "_run_async", found)
    import asyncio
    results = asyncio.run(semgrep_findings("/opt/gds-os/apps/api/gds_api", "p/python"))
    assert len(results) == 1
    assert results[0]["severity"] == "high"


def test_semgrep_resolves_to_the_isolated_install():
    path = engine_path("semgrep")
    assert path == ISOLATED_ENGINES["semgrep"], f"semgrep resolved to {path}, which the app's dependencies can break"
    assert pathlib.Path(path).is_file()


def test_a_command_injection_is_not_filed_as_low():
    assert _semgrep_severity({"severity": "ERROR"}, {}) == "high"
    assert _semgrep_severity({"severity": "WARNING"}, {}) == "medium"
    # an explicit high impact may raise the engine's rating, never lower it
    assert _semgrep_severity({"severity": "WARNING"}, {"impact": "HIGH"}) == "high"


def test_the_sweep_no_longer_runs_nikto():
    src = (REPO / "apps/api/run_estate_sweep.py").read_text()
    code = "\n".join(ln for ln in src.splitlines() if not ln.lstrip().startswith("#"))
    assert '"nikto": ("nikto_scan", True),' not in code, "nikto is still in the nightly scanner list"


def test_the_code_scan_is_scheduled_and_stamps_its_own_schedule():
    cron = (REPO / "config/cron/root.crontab").read_text()
    assert "code_scan.py" in cron
    src = (REPO / "scripts/ops/code_scan.py").read_text()
    assert "stamp_schedule" in src, "a nightly scan with no schedule row is invisible when it stops"
    assert '"code_scan"' in src


def test_the_noise_filter_keeps_interpolated_sql_and_drops_bound_parameters(tmp_path):
    import importlib.util

    spec = importlib.util.spec_from_file_location("code_scan_mod", REPO / "scripts/ops/code_scan.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    source = tmp_path / "sample.py"
    source.write_text(
        "safe = text(_SELECT), {'tenant_id': tid}\n"
        'tainted = text(f"SELECT * FROM {name}")\n'
    )
    cache: dict[str, list[str]] = {}
    safe = {"rule": "python.x.avoid-sqlalchemy-text", "target": str(source), "line": 1, "end_line": 1}
    tainted = {"rule": "python.x.avoid-sqlalchemy-text", "target": str(source), "line": 2, "end_line": 2}
    assert module._keeps(safe, cache) is False, "a bound-parameter call is not a finding"
    assert module._keeps(tainted, cache) is True, "an interpolated query must reach a human"


def test_an_unreadable_match_is_kept_rather_than_dropped():
    import importlib.util

    spec = importlib.util.spec_from_file_location("code_scan_mod2", REPO / "scripts/ops/code_scan.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    unknown = {"rule": "python.x.avoid-sqlalchemy-text", "target": "/nope/missing.py", "line": 4}
    assert module._keeps(unknown, {}) is True, "when it cannot be judged it must be kept"
