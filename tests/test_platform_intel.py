"""Item 14: the header strip's payload, pinned against the two defects that made it answer 500 and blank.

Measured while proving the route: the compliance verdicts live in compliance_assessments (compliance_controls has no
verdict_source column, so the first build answered 500), and score_from_counts names the score overall_score while the
shell reads risk.score (so the strip would have shown a grade with no number). Both are pinned here without a database.
"""
from __future__ import annotations

import asyncio

from gds_api.platform_intel_api import platform_intel


class _Result:
    def __init__(self, row):
        self._row = row

    def mappings(self):
        return self

    def one(self):
        return self._row

    def scalar(self):
        return None


class _FakeDB:
    """Answers by inspecting the SQL, so the test does not depend on statement order or on _bind's own query."""

    def __init__(self):
        self.seen: list[str] = []

    async def execute(self, statement, params=None):
        sql = str(statement)
        self.seen.append(sql)
        if "mean_age_days" in sql:
            return _Result({
                "critical": 0, "high": 330, "medium": 513, "low": 2, "info": 4,
                "kev_open": 0, "high_epss": 0, "stale": 28, "new_7d": 849,
                "resolved_7d": 91, "mean_age_days": 6.6, "accepted_risk": 14,
                "accepted_critical": 14, "internet_exposed": 0, "open_total": 849,
            })
        if "AS cloud_open" in sql:
            return _Result({
                "open_total": 849, "open_critical": 0, "exploited_in_wild": 0,
                "cloud_open": 0, "cloud_critical": 0,
            })
        if "compliance_assessments" in sql:
            return _Result({"passing": 103, "failing": 23})
        return _Result({})


class _User:
    tenant_id = "2ec10dd0-e48e-4043-8c88-5998ba5e23b0"
    email = "test@example.invalid"


def test_payload_carries_a_number_the_shell_can_read():
    out = asyncio.run(platform_intel(current_user=_User(), db=_FakeDB()))
    # The shell renders risk.score; score_from_counts calls it overall_score.
    assert isinstance(out["risk"]["score"], float), out["risk"]
    assert out["risk"]["grade"] in {"A", "B", "C", "D", "F"}, out["risk"]
    assert "trend" in out["risk"]


def test_compliance_reads_the_table_that_holds_verdicts():
    db = _FakeDB()
    out = asyncio.run(platform_intel(current_user=_User(), db=db))
    joined = "\n".join(db.seen)
    assert "compliance_assessments" in joined, "verdicts live in compliance_assessments"
    assert "verdict_source" in joined
    # 103 passing over 126 assessed is the platform's stated basis, not percent-of-framework.
    assert out["defensive"]["compliance_avg"] == 81.7, out["defensive"]


def test_counts_split_cloud_from_vulnerability_and_state_the_basis():
    out = asyncio.run(platform_intel(current_user=_User(), db=_FakeDB()))
    d = out["defensive"]
    assert d["vuln_total"] == 849 and d["cloud_open"] == 0
    assert d["vuln_total"] + d["cloud_open"] == 849, "the two must partition the open estate"
    assert out["basis"]["cloud_open"], "a zero must arrive with its reason"
