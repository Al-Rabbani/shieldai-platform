"""TOTP second factor, implemented against RFC 6238 rather than a library we would have to install.

The compliance assessment reported mfa_enforced as FAIL because there was no second factor anywhere: no columns
on users, no enrolment route, nothing to enrol into. This module is the mechanism.

Two storage decisions worth stating. The shared secret is encrypted with Fernet, not stored as bare base32: a
read of the users table should not hand an attacker the ability to mint valid codes. Recovery codes are stored
as sha256 hashes, which is sufficient because they are high-entropy random values, so a leaked table cannot be
replayed.

The key is derived from existing secret material rather than requiring a new deployment step. If no secret is
configured at all, encryption raises instead of silently storing plaintext.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import struct
import time
from urllib.parse import quote

from cryptography.fernet import Fernet, InvalidToken

STEP_SECONDS = 30
DIGITS = 6
DEFAULT_WINDOW = 1
ISSUER = "GDS OS"


def _fernet() -> Fernet:
    raw = (os.environ.get("MFA_SECRET_KEY") or os.environ.get("JWT_SECRET")
           or os.environ.get("SECRET_KEY") or os.environ.get("GDS_API_KEY"))
    if not raw:
        raise RuntimeError("no secret material available to encrypt MFA secrets; set MFA_SECRET_KEY")
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(raw.encode()).digest()))


def new_secret() -> str:
    """A fresh 160-bit base32 shared secret, unpadded as the otpauth URI expects."""
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def encrypt_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("stored MFA secret could not be decrypted with the current key") from exc


def _code(secret: str, counter: int) -> str:
    padded = secret.upper() + "=" * ((8 - len(secret) % 8) % 8)
    key = base64.b32decode(padded)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(binary % (10 ** DIGITS)).zfill(DIGITS)


def code_at(secret: str, at: float | None = None) -> str:
    return _code(secret, int((at if at is not None else time.time()) // STEP_SECONDS))


def verify(secret: str, code: str, at: float | None = None, window: int = DEFAULT_WINDOW) -> bool:
    """Accept the current step and its immediate neighbours, and nothing wider.

    A window of 1 tolerates clock drift of one interval. It is deliberately not configurable upward from a
    request parameter, because a caller choosing the window chooses how many guesses are valid.
    """
    if not secret or not code:
        return False
    candidate = str(code).strip().replace(" ", "")
    if not candidate.isdigit():
        return False
    counter = int((at if at is not None else time.time()) // STEP_SECONDS)
    for drift in range(-window, window + 1):
        if hmac.compare_digest(_code(secret, counter + drift), candidate):
            return True
    return False


def provisioning_uri(secret: str, email: str, issuer: str = ISSUER) -> str:
    label = quote(f"{issuer}:{email}")
    return (f"otpauth://totp/{label}?secret={secret}&issuer={quote(issuer)}"
            f"&algorithm=SHA1&digits={DIGITS}&period={STEP_SECONDS}")


def hash_recovery_code(code: str) -> str:
    return hashlib.sha256(code.strip().lower().encode()).hexdigest()


def new_recovery_codes(count: int = 10) -> tuple[list[str], list[str]]:
    codes = [f"{secrets.token_hex(2)}-{secrets.token_hex(2)}-{secrets.token_hex(2)}" for _ in range(count)]
    return codes, [hash_recovery_code(c) for c in codes]
