"""Verification flags must come from records, and must be able to change.

The bug these tests guard: the flags were hardcoded False, so they were false statements that could never
update - useless as reassurance and useless as an alarm.
"""
import json
from datetime import datetime, timedelta, timezone

from gds_api.bridge.verification import restore_evidence

NOW = datetime(2026, 11, 19, 20, 0, tzinfo=timezone.utc)


def test_a_fresh_drill_record_verifies_recovery(tmp_path):
    marker = tmp_path / "drill.json"
    marker.write_text(json.dumps({"drilled_at": "2026-11-19T18:22:00Z", "sha256_match": True}))
    out = restore_evidence(str(marker), str(tmp_path / "none.log"), now=NOW)
    assert out["verified"] is True
    assert out["age_days"] == 0
    assert out["reason"] is None


def test_an_old_drill_does_not_verify_recovery(tmp_path):
    marker = tmp_path / "drill.json"
    old = (NOW - timedelta(days=41)).isoformat().replace("+00:00", "Z")
    marker.write_text(json.dumps({"drilled_at": old}))
    out = restore_evidence(str(marker), str(tmp_path / "none.log"), now=NOW)
    assert out["verified"] is False
    assert "41 days ago" in out["reason"]


def test_the_log_is_used_when_no_marker_exists(tmp_path):
    log = tmp_path / "drill.log"
    log.write_text("[2026-11-19T20:22:04Z] PASS gds_os_20261119T182015Z.dump restored with matching row counts\n")
    out = restore_evidence(str(tmp_path / "none.json"), str(log), now=NOW)
    assert out["verified"] is True
    assert out["last_drill"].startswith("2026-11-19T20:22:04")


def test_no_record_is_reported_as_no_record(tmp_path):
    out = restore_evidence(str(tmp_path / "none.json"), str(tmp_path / "none.log"), now=NOW)
    assert out["verified"] is False
    assert out["reason"] == "no restore drill record found"


def test_a_corrupt_marker_falls_back_rather_than_crashing(tmp_path):
    marker = tmp_path / "drill.json"
    marker.write_text("{not json")
    log = tmp_path / "drill.log"
    log.write_text("[2026-11-18T04:45:00Z] PASS gds_os_x.dump restored with matching row counts\n")
    out = restore_evidence(str(marker), str(log), now=NOW)
    assert out["verified"] is True
