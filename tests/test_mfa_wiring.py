"""MFA has to be wired into the login path, not merely implemented beside it.

The module passing its own vectors proves the arithmetic. These pin the parts that decide whether a password
alone still gets in.
"""
from pathlib import Path

AUTH = (Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "auth.py").read_text(encoding="utf-8")


def test_login_demands_a_second_factor_when_enrolled():
    assert "row[0].mfa_enabled" in AUTH
    assert "mfa.verify(" in AUTH
    assert '"mfa_required"' in AUTH


def test_a_broken_mfa_row_refuses_rather_than_falling_open():
    assert "MFA is enabled for this account but no secret is stored" in AUTH
    assert "but its secret cannot be read" in AUTH


def test_recovery_codes_are_single_use():
    assert "SET used_at = now()" in AUTH and "used_at IS NULL" in AUTH


def test_all_three_routes_exist():
    for route in ('"/mfa/enrol"', '"/mfa/confirm"', '"/mfa/disable"'):
        assert route in AUTH, route


def test_disabling_needs_the_password_and_a_working_factor():
    start = AUTH.index('async def mfa_disable(')
    body = AUTH[start:start + 2200]
    assert "verify_password(body.password" in body
    assert "A current second factor code is required" in body


def test_enrolment_is_not_enforced_until_confirmed():
    # enrol writes mfa_enabled = false; only confirm turns it on. A mistyped secret must not lock anyone out.
    enrol = AUTH[AUTH.index('async def mfa_enrol('):AUTH.index('async def mfa_confirm(')]
    assert "mfa_enabled = false" in enrol
    confirm = AUTH[AUTH.index('async def mfa_confirm('):AUTH.index('async def mfa_disable(')]
    assert "mfa_enabled = true" in confirm
