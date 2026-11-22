"""The admin key payload must carry scopes and a derivable is_active.

Two failure modes this pins:
  1. asyncpg returns jsonb as text in this codebase (no jsonb codec is registered), so a model that only
     accepted list[str] would raise on every real read. The validator must accept both shapes.
  2. Three separate queries read api_keys. If one is edited and the others are not, the model and the query
     drift apart and only that endpoint breaks. The source check below refuses that drift.
"""
import json
import pathlib

import pytest
from pydantic import ValidationError

from gds_api.admin_identity import ApiKeyOut

SOURCE = pathlib.Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api" / "admin_identity.py"

BASE = {
    "id": "2b0d4c22-2c1c-4f2e-9d0f-0d3a1c6b7e11",
    "name": "ci pipeline",
    "key_prefix": "gds_abcd1234",
}


def test_scopes_arrive_as_a_json_string_because_asyncpg_returns_text():
    key = ApiKeyOut(**BASE, scopes='["findings:read", "cloud:read"]')
    assert key.scopes == ["findings:read", "cloud:read"]


def test_scopes_arrive_as_a_list_unchanged():
    key = ApiKeyOut(**BASE, scopes=["users:manage"])
    assert key.scopes == ["users:manage"]


def test_null_scopes_become_an_empty_list_not_none():
    assert ApiKeyOut(**BASE, scopes=None).scopes == []


def test_a_key_with_no_expiry_column_is_never_given_one():
    key = ApiKeyOut(**BASE)
    assert not hasattr(key, "expires_at"), "api_keys has no expiry column, so none may be invented"


def test_is_active_follows_revocation():
    assert ApiKeyOut(**BASE, is_active=True).is_active is True
    assert ApiKeyOut(**BASE, is_active=False, revoked_at="2026-11-22T04:00:00Z").is_active is False


def test_the_three_api_key_queries_select_the_same_columns():
    source = SOURCE.read_text(encoding="utf-8")
    assert "SELECT id, name, key_prefix, created_at" not in source, (
        "an api_keys query still selects the old column list"
    )
    assert source.count("coalesce(scopes, '[]'::jsonb) AS scopes") == 3
    assert source.count("(revoked_at IS NULL) AS is_active") == 3


def test_a_missing_name_is_a_validation_error_not_a_silent_blank():
    with pytest.raises(ValidationError):
        ApiKeyOut(id=BASE["id"], key_prefix=BASE["key_prefix"])
