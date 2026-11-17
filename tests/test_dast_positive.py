"""DAST positive control: the pipeline must detect a vulnerability that is really there.

dast_scan had only ever been run against hosts with nothing to find, so "no matches" was
indistinguishable from a broken pipeline. This serves a known exposure (an exposed .git/config) and
requires nuclei to report it, which covers the whole path: authorisation gate, engine invocation,
JSONL parsing, severity mapping and storage.
"""
from __future__ import annotations

import json
import shutil
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from gds_api.scanner_engines import engine_path

NUCLEI = engine_path("nuclei")
TEMPLATES = Path("/root/nuclei-templates/http/exposures/configs/git-config.yaml")

# A real record produced by nuclei against the fixture below, used to pin the parsing layer.
RECORDED = {
    "template-id": "git-config",
    "info": {
        "name": "Git Configuration - Detect",
        "severity": "medium",
        "description": "Git configuration was detected via the pattern /.git/config",
        "classification": {"cwe-id": ["cwe-200"], "cvss-score": 5.3, "cve-id": None},
    },
    "matched-at": "http://127.0.0.1:8099/.git/config",
}


class _Fixture(SimpleHTTPRequestHandler):
    def log_message(self, *args):  # keep test output clean
        pass


def _serve(directory: Path):
    handler = partial(_Fixture, directory=str(directory))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def test_recorded_nuclei_output_maps_to_a_real_finding(monkeypatch):
    """Parsing must carry the engine's own severity, template and CWE, never a default.

    The engine call is stubbed with a record nuclei really produced for the fixture, so this runs
    everywhere, including CI where the binary is absent.
    """
    import asyncio
    from types import SimpleNamespace

    from gds_api import scanner_engines

    monkeypatch.setattr(scanner_engines, "engine_path", lambda name: "/usr/bin/true")

    async def fake_run(argv, timeout):
        return SimpleNamespace(returncode=0, stdout=json.dumps(RECORDED) + "\n", stderr="")

    monkeypatch.setattr(scanner_engines, "_run_async", fake_run)
    findings = asyncio.run(
        scanner_engines.nuclei_findings(
            "http://127.0.0.1:8099", templates="exposure", severity="critical,high,medium"
        )
    )
    assert len(findings) == 1
    item = findings[0]
    assert item["severity"] == "medium"
    assert item["template"] == "git-config"
    assert item["cwe"] == "cwe-200"
    assert item["target"] == "http://127.0.0.1:8099/.git/config"


@pytest.mark.skipif(NUCLEI is None, reason="nuclei is not installed on this host")
@pytest.mark.skipif(not TEMPLATES.exists(), reason="nuclei community templates are not installed")
def test_dast_detects_a_known_exposure(tmp_path):
    """The positive control: a real template against a real exposure must produce a finding."""
    import asyncio

    from gds_api.scanner_engines import nuclei_findings

    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "config").write_text(
        "[core]\n\trepositoryformatversion = 0\n\tbare = false\n"
        '[remote "origin"]\n\turl = https://github.com/example/private-repo.git\n'
    )
    server = _serve(tmp_path)
    try:
        url = f"http://127.0.0.1:{server.server_port}"
        results = asyncio.run(nuclei_findings(url, templates="exposure", severity="critical,high,medium"))
    finally:
        server.shutdown()
        server.server_close()

    assert results, "nuclei found nothing on a known exposed .git/config"
    matched = [r for r in results if r["template"] == "git-config"]
    assert matched, [r["template"] for r in results]
    assert matched[0]["severity"] == "medium"
    assert ".git/config" in matched[0]["target"]
