"""Item 8: the remediation engine must accept the register the UI shows.

Measured 22 Nov 2026: findings (uuid, governed) 317 rows; security_findings (integer, scanner) 1002 rows, and every
finding the UI displays comes from the scanner register. generate_remediation_plan coerced its input with
uuid.UUID(...), so posting a real id (879) answered 404 "badly formed hexadecimal UUID string" and
remediation_plans never held a row.
"""
import inspect
import re
import uuid

import pytest

from gds_api import remediation


def test_an_integer_id_is_read_as_the_scanner_register():
    scanner, governed = remediation.parse_finding_reference("879")
    assert scanner == 879
    assert governed is None


def test_a_uuid_is_read_as_the_governed_register():
    value = str(uuid.uuid4())
    scanner, governed = remediation.parse_finding_reference(value)
    assert scanner is None
    assert str(governed) == value


def test_whitespace_and_none_are_handled_without_guessing():
    assert remediation.parse_finding_reference("  42 ") == (42, None)
    with pytest.raises(ValueError):
        remediation.parse_finding_reference(None)
    with pytest.raises(ValueError):
        remediation.parse_finding_reference("")


def test_a_value_that_is_neither_shape_is_refused_rather_than_coerced():
    for bad in ("not-an-id", "12.5", "-7", "879abc"):
        with pytest.raises(ValueError):
            remediation.parse_finding_reference(bad)


def test_the_generator_takes_both_registers():
    params = inspect.signature(remediation.generate_remediation_plan).parameters
    assert "security_finding_id" in params
    assert "finding_id" in params
    assert params["finding_id"].default is None
    assert params["security_finding_id"].default is None


def test_no_governed_status_transition_is_left_unguarded():
    """A scanner row has no governed lifecycle. Every assignment of a FindingStatus value must sit under a
    `governed` guard, otherwise a scanner finding is written a vocabulary its own pages do not use."""
    src = inspect.getsource(remediation)
    lines = src.splitlines()
    offenders = []
    for i, line in enumerate(lines):
        if "FindingStatus." in line and "validate_finding_transition" not in line and "=" in line:
            window = "\n".join(lines[max(0, i - 3):i + 1])
            if "if governed:" not in window:
                offenders.append(line.strip())
    assert not offenders, f"unguarded governed transitions: {offenders}"


def test_the_plan_records_which_register_it_points_at():
    src = inspect.getsource(remediation.generate_remediation_plan)
    assert re.search(r"security_finding_id=security_finding_id", src)
    assert re.search(r"finding_id=finding_id", src)
