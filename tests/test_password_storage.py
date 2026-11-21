"""Password storage: the column must hold hashes, and the check must say so without inventing a convention.

The bug this guards: the password-uniqueness control failed on a single inactive test account whose
password_hash held "disabled-<uuid>" - a sentinel written by hand during onboarding work, not by any platform
mechanism. The tempting fix was to teach the collector that a non-hash on an inactive account is fine. That would
mean any unrecognised value passes as long as the account is switched off, which is precisely how a plaintext
password survives a security check.

What was done instead: the sentinel was replaced with a bcrypt hash of a discarded random secret, so the column
holds a hash for every account including disabled ones, and the classifier stays strict. These tests pin both
halves: the classification rules, and the live invariant that no account holds anything but a recognised hash.
"""
from __future__ import annotations

import importlib.util
import os
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "ops" / "assess_compliance.py"
spec = importlib.util.spec_from_file_location("assess_compliance_passwords", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


@pytest.mark.parametrize(
    "digest,expected",
    [
        ("$2b$12$" + "a" * 53, "bcrypt"),
        ("$2a$10$" + "b" * 53, "bcrypt"),
        ("$2y$12$" + "c" * 53, "bcrypt"),
        ("$argon2id$v=19$m=65536,t=3,p=4$abc$def", "argon2"),
        ("$scrypt$ln=16,r=8,p=1$abc$def", "scrypt"),
        ("$pbkdf2-sha256$29000$abc$def", "pbkdf2"),
    ],
)
def test_recognised_one_way_functions_are_named(digest, expected):
    assert mod.classify_password_hash(digest) == expected


@pytest.mark.parametrize(
    "digest",
    [
        "disabled-ed5a30d2096a47f3814c6520fdf0b5c6",  # the sentinel that was actually in the database
        "disabled-",
        "hunter2",  # plaintext
        "5f4dcc3b5aa765d61d8327deb882cf99",  # md5
        "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8",  # sha1
        "sha256$abcdef",
        "   ",
    ],
)
def test_anything_that_is_not_a_hash_is_rejected(digest):
    """An inactive account is not a licence for an unrecognised value."""
    assert mod.classify_password_hash(digest) == "unknown"


def test_an_empty_value_is_named_rather_than_treated_as_unknown():
    assert mod.classify_password_hash("") == "empty"


def test_the_collector_fails_on_an_unhashed_account():
    """The failure path must exist: a non-hash must fail the control, not be filtered out of the observation."""
    source = SCRIPT.read_text()
    body = source.split("def chk_password_hashing", 1)[1].split("\ndef ", 1)[0]
    assert "unhashed" in body, "the collector no longer counts accounts with no hash"
    assert "unsupported or plaintext hashing" in body, "the collector no longer fails on an unrecognised value"
    assert "is_active" not in body, (
        "the collector now conditions on account state, which would let a plaintext password pass on a disabled "
        "account"
    )


# ------------------------------------------------------------------ live invariant
pytestmark_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"), reason="no DATABASE_URL in this environment"
)


def _rows(query: str):
    import asyncio

    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    # DATABASE_URL is the psycopg2 form the app itself uses; the asyncio engine needs the asyncpg driver named
    # explicitly, the same way the isolation test builds it.
    dsn = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+asyncpg://", 1)

    tenant = os.environ.get("GDS_TENANT_ID")

    async def run():
        engine = create_async_engine(dsn, pool_pre_ping=True)
        try:
            async with engine.connect() as conn:
                # users is a FORCE RLS table: an unbound session reads zero rows and looks like "no accounts",
                # which is the silent-empty-result trap this platform has hit before. Bind the owner tenant first.
                if tenant:
                    await conn.execute(
                        text("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": tenant}
                    )
                return (await conn.execute(text(query))).all()
        finally:
            await engine.dispose()

    return asyncio.run(run())


@pytestmark_db
def test_every_account_holds_a_recognised_hash():
    rows = _rows("SELECT coalesce(password_hash, '') AS digest, count(*) FROM users GROUP BY 1")
    assert rows, "no accounts found, so this invariant was never exercised"
    bad = [(d[:12], n) for d, n in rows if mod.classify_password_hash(d) not in {"bcrypt", "argon2", "scrypt", "pbkdf2"}]
    assert not bad, f"accounts hold a value that is not a password hash: {bad}"


@pytestmark_db
def test_no_two_accounts_share_a_password():
    rows = _rows(
        "SELECT count(*) AS n FROM (SELECT password_hash FROM users WHERE password_hash IS NOT NULL "
        "GROUP BY 1 HAVING count(*) > 1) dupes"
    )
    assert rows[0][0] == 0, "two accounts share a password hash, so their passwords are identical"
