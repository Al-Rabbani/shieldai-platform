"""The route answered 500 over HTTP while the engine worked in-process.

FastAPI raised ResponseValidationError from api_generate_plan: the response model declared id: str and finding_id: str,
but a plan carries a UUID id and, for a scanner-register finding, finding_id is null. No test exercised the response
model, so only calling the route found it. These tests pin the model against what a plan really carries.
"""
import json
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

from gds_api.remediation import RemediationPlanOut


def plan(**over):
    base = dict(
        id=uuid.uuid4(), finding_id=None, security_finding_id=879, remediation_type="dependency_upgrade",
        fix_description="Patch zlib for CVE-2026-22184.", fix_steps={"cve": "CVE-2026-22184", "steps": ["a"]},
        verification_type="manual", status="planned", risk_level="medium", requires_approval=True,
        approved_by=None, executed_by=None, executed_at=None, verified_at=None,
        execution_result={}, verification_result={},
    )
    base.update(over)
    return SimpleNamespace(**base)


def test_a_scanner_plan_with_no_governed_finding_validates():
    out = RemediationPlanOut.model_validate(plan())
    assert out.finding_id is None
    assert out.security_finding_id == 879


def test_the_id_serialises_to_a_string_not_a_uuid_object():
    payload = json.loads(RemediationPlanOut.model_validate(plan()).model_dump_json())
    assert isinstance(payload["id"], str)
    uuid.UUID(payload["id"])


def test_a_governed_plan_still_validates():
    governed = uuid.uuid4()
    out = RemediationPlanOut.model_validate(plan(finding_id=governed, security_finding_id=None))
    assert out.finding_id == governed


def test_real_timestamps_are_accepted():
    when = datetime.now(UTC)
    out = RemediationPlanOut.model_validate(plan(executed_at=when, verified_at=when))
    assert out.executed_at == when


def test_the_model_no_longer_demands_a_string_id():
    """The exact defect: id: str rejected the UUID FastAPI was handed."""
    import typing
    hints = typing.get_type_hints(RemediationPlanOut)
    assert hints["id"] is uuid.UUID
    assert "None" in str(hints["finding_id"])
