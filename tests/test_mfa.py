"""TOTP must be correct by an external standard, not merely self-consistent.

A hand-rolled TOTP that only round-trips against itself can be wrong in exactly the way that locks every user
out. These cases are the RFC 6238 Appendix B vectors: secret is the ASCII string 12345678901234567890, and the
six-digit values are the published eight-digit results truncated to our six digits.
"""
import base64

import pytest

from gds_api import mfa

RFC_SECRET = base64.b32encode(b"12345678901234567890").decode().rstrip("=")


def test_matches_rfc6238_vectors():
    assert mfa.code_at(RFC_SECRET, at=59) == "287082"
    assert mfa.code_at(RFC_SECRET, at=1111111109) == "081804"
    assert mfa.code_at(RFC_SECRET, at=1234567890) == "005924"


def test_accepts_the_current_step_and_one_neighbour_only():
    assert mfa.verify(RFC_SECRET, "287082", at=59) is True
    assert mfa.verify(RFC_SECRET, "287082", at=59 + 30) is True      # one step of drift
    assert mfa.verify(RFC_SECRET, "287082", at=59 + 120) is False    # four steps: refused


def test_rejects_wrong_malformed_and_empty_codes():
    assert mfa.verify(RFC_SECRET, "000000", at=59) is False
    assert mfa.verify(RFC_SECRET, "abcdef", at=59) is False
    assert mfa.verify(RFC_SECRET, "", at=59) is False
    assert mfa.verify("", "287082", at=59) is False


def test_secret_is_encrypted_at_rest(monkeypatch):
    monkeypatch.setenv("MFA_SECRET_KEY", "test-key-not-a-real-one")
    secret = mfa.new_secret()
    token = mfa.encrypt_secret(secret)
    assert secret not in token, "the stored value must not contain the secret in the clear"
    assert mfa.decrypt_secret(token) == secret


def test_encryption_fails_closed_without_key_material(monkeypatch):
    for var in ("MFA_SECRET_KEY", "JWT_SECRET", "SECRET_KEY", "GDS_API_KEY"):
        monkeypatch.delenv(var, raising=False)
    with pytest.raises(RuntimeError):
        mfa.encrypt_secret("anything")


def test_provisioning_uri_is_standard():
    uri = mfa.provisioning_uri("ABCDEF234567", "owner@example.com")
    assert uri.startswith("otpauth://totp/")
    assert "secret=ABCDEF234567" in uri and "digits=6" in uri and "period=30" in uri
    assert "issuer=GDSA%20Radar" in uri


def test_recovery_codes_are_unique_hashed_and_case_insensitive():
    codes, hashes = mfa.new_recovery_codes(10)
    assert len(set(codes)) == 10
    assert all(len(h) == 64 for h in hashes)
    assert mfa.hash_recovery_code(codes[0].upper()) == hashes[0]
