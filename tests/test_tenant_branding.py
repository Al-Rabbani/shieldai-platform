"""Branding must never present a platform default as the customer's own choice (P5 / B27)."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from gds_api.tenant_branding import DEFAULT_PRIMARY, DEFAULT_SECONDARY, BrandingUpdate, _to_out


def row(**overrides):
    base = {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Acme Security",
        "slug": "acme",
        "display_name": None,
        "primary_color": None,
        "secondary_color": None,
        "logo_url": None,
        "support_email": None,
    }
    base.update(overrides)
    return base


def test_unset_branding_falls_back_and_says_so():
    out = _to_out(row())
    assert out.display_name == "Acme Security", "display name falls back to the tenant name"
    assert out.primary_color == DEFAULT_PRIMARY
    assert out.secondary_color == DEFAULT_SECONDARY
    assert set(out.defaults_applied) == {"display_name", "primary_color", "secondary_color"}


def test_configured_branding_reports_no_defaults():
    out = _to_out(row(display_name="Acme SOC", primary_color="#123456", secondary_color="#654321"))
    assert out.display_name == "Acme SOC"
    assert out.primary_color == "#123456"
    assert out.defaults_applied == []


def test_partial_branding_names_only_what_was_defaulted():
    out = _to_out(row(primary_color="#123456"))
    assert out.primary_color == "#123456"
    assert set(out.defaults_applied) == {"display_name", "secondary_color"}


@pytest.mark.parametrize("bad", ["red", "#12345", "#GGGGGG", "123456"])
def test_invalid_colour_is_rejected(bad):
    with pytest.raises(ValidationError):
        BrandingUpdate(primary_color=bad)


def test_valid_colour_is_accepted():
    assert BrandingUpdate(primary_color="#0B1220").primary_color == "#0B1220"
