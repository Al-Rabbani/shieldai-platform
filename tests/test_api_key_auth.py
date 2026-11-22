"""API key authentication: the parsing half, pinned down without a database.

The database half of step 12 is proved live (issue, authenticate, revoke, refuse) because this repo's
test suite has no transactional DB fixture and inventing one to prove a lookup would test the fixture
more than the code. What is cheap and worth pinning is the decision of whether a request carries a key
at all, because that decision is where a permissive bug would hide: treat too much as a key and a
malformed header becomes an authentication attempt; treat too little and a valid credential is ignored.

These tests are pure. No DB, no HTTP, no skip-if-env.
"""
from __future__ import annotations

import hashlib

import pytest

from gds_api.security import _extract_api_key, _hash_api_key


@pytest.mark.parametrize(
    "header,expected",
    [
        ("Bearer gds_abc123", "gds_abc123"),
        ("bearer gds_abc123", "gds_abc123"),
        ("BEARER gds_abc123", "gds_abc123"),
        ("  Bearer   gds_abc123  ", "gds_abc123"),
    ],
)
def test_a_bearer_key_is_extracted(header, expected):
    assert _extract_api_key(header) == expected


@pytest.mark.parametrize(
    "header",
    [
        None,
        "",
        "   ",
        "Bearer",
        "Bearer ",
        "Basic gds_abc123",
        "Bearer notakey",
        "Bearer abc123",
        "gds_abc123",
        "Bearer gds_a b",
        "Token gds_abc123",
    ],
)
def test_anything_else_is_not_treated_as_a_key(header):
    """A malformed header must fall through to a plain 401, not to an authentication attempt."""
    assert _extract_api_key(header) is None


def test_hash_matches_sha256_and_is_stable():
    raw = "gds_examplekey"
    assert _hash_api_key(raw) == hashlib.sha256(raw.encode()).hexdigest()
    assert _hash_api_key(raw) == _hash_api_key(raw)


def test_hash_separates_different_keys():
    assert _hash_api_key("gds_one") != _hash_api_key("gds_two")
    # A one-character difference must not collide.
    assert _hash_api_key("gds_aaa") != _hash_api_key("gds_aab")


def test_hash_is_not_the_key():
    """The stored value must not contain the credential, or a database read would recover it."""
    raw = "gds_supersecretvalue"
    assert raw not in _hash_api_key(raw)
    assert len(_hash_api_key(raw)) == 64
