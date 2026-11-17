"""Regressions for the evaluation -> finding -> evidence path.

Measured before these changes, on the real account 696616821372:
  * evaluations reported 3 failures (CloudTrail, Config recorder, GuardDuty absent) with
    findings_created = 0, because nothing called _handle_fail at all;
  * once that was wired, the whole evaluation aborted with EVALUATION_FAILED because the
    MinIO client authenticated with a non-existent access key, so a storage fault suppressed
    three real security findings entirely.
These tests pin the two properties that must not regress: a non-verdict never touches a
finding, and an evidence upload failure cannot stop a finding from being recorded.
"""
import asyncio
import uuid
from datetime import UTC, datetime

import pytest

from gds_api.cloud.posture import findings as findings_module
from gds_api.cloud.posture.findings import apply_evaluation_result
from gds_api.models import CloudPolicyEvaluation, CloudPostureEvaluationRun


class _FakeDB:
    """The smallest session surface _create_finding actually uses."""

    def __init__(self):
        self.added = []
        self.flushed = 0

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        self.flushed += 1

    async def execute(self, *args, **kwargs):  # used only by the context lookup
        class _R:
            def scalars(self):
                return self

            def first(self):
                return None

        return _R()

    async def get(self, *args, **kwargs):
        return None


def _run():
    run = CloudPostureEvaluationRun()
    run.id = uuid.uuid4()
    run.warnings = []
    run.findings_created = 0
    return run


def _record(policy_id, result, asset_id=None):
    record = CloudPolicyEvaluation()
    record.policy_id = policy_id
    record.policy_version = 1
    record.result = result
    record.explanation = "test explanation"
    record.facts = {}
    record.asset_id = asset_id
    record.evaluation_time = datetime.now(UTC)
    record.severity = "high"
    return record


def test_non_verdicts_never_touch_a_finding(monkeypatch):
    """INDETERMINATE / NOT_APPLICABLE carry no verdict, so they must not open or resolve findings."""
    called = []

    async def _boom(*args, **kwargs):  # pragma: no cover - must never run
        called.append(kwargs)
        raise AssertionError("a non-verdict must not reach the finding lifecycle")

    monkeypatch.setattr(findings_module, "_handle_fail", _boom)
    monkeypatch.setattr(findings_module, "_handle_pass", _boom)

    from gds_api.cloud.posture.registry import get_policy

    policy = get_policy("CSPM.AWS.LOGGING.CLOUDTRAIL_ENABLED")
    run = _run()
    for verdict in ("indeterminate", "not_applicable", "unsupported", "skipped"):
        record = _record(policy.policy_id, verdict)
        asyncio.run(
            apply_evaluation_result(
                _FakeDB(),
                tenant_id=uuid.uuid4(),
                environment_id=uuid.uuid4(),
                provider="aws",
                record=record,
                policy=policy,
                run=run,
                user_id=uuid.uuid4(),
            )
        )
    assert called == []
    assert run.findings_created == 0


def test_evidence_upload_failure_cannot_suppress_a_finding(monkeypatch):
    """A storage fault must leave a real finding behind, with the gap recorded on the run."""

    async def _storage_down(*args, **kwargs):
        raise RuntimeError("InvalidAccessKeyId: The Access Key Id you provided does not exist")

    async def _audit_noop(*args, **kwargs):
        return None

    monkeypatch.setattr(findings_module, "create_evidence", _storage_down)
    monkeypatch.setattr(findings_module, "record_audit_event", _audit_noop)

    from gds_api.cloud.posture.registry import get_policy

    policy = get_policy("CSPM.AWS.LOGGING.CLOUDTRAIL_ENABLED")
    run = _run()
    record = _record(policy.policy_id, "fail")
    db = _FakeDB()

    asyncio.run(
        apply_evaluation_result(
            db,
            tenant_id=uuid.uuid4(),
            environment_id=uuid.uuid4(),
            provider="aws",
            record=record,
            policy=policy,
            run=run,
            user_id=uuid.uuid4(),
        )
    )

    # The finding was still created and counted.
    assert run.findings_created == 1
    from gds_api.models import CloudFindingContext, Finding

    finding_rows = [o for o in db.added if isinstance(o, Finding)]
    context_rows = [o for o in db.added if isinstance(o, CloudFindingContext)]
    assert len(finding_rows) == 1, "the finding must survive a storage failure"
    assert len(context_rows) == 1
    assert context_rows[0].evidence_id is None, "no evidence id may be invented"
    # And the gap is visible rather than silent.
    assert run.warnings and "evidence upload failed" in run.warnings[0]
