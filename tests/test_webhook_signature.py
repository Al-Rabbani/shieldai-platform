"""Stripe webhook signature verification, and the defect that made every real payment a 400.

MEASURED against live Stripe on stripe-python 15.4.0: construct_event raises AttributeError("object") for a correctly
signed payload and SignatureVerificationError only for a forged one. The route mapped the first to a generic
400 "Webhook error: object" and the second to 400 "Invalid webhook signature" - so it accepted exactly the forged
events and refused every genuine delivery, and Stripe does not retry a 4xx. These tests pin the replacement.
"""
from __future__ import annotations

import hashlib
import hmac
import pathlib

import pytest

from gds_api.billing.webhook_signature import DEFAULT_TOLERANCE_SECONDS, InvalidSignature, verify

SECRET = "whsec_test_secret_for_unit_tests"
PAYLOAD = b'{"id":"evt_1","type":"checkout.session.completed","data":{"object":{}}}'
NOW = 1_700_000_000.0


def header(payload: bytes = PAYLOAD, secret: str = SECRET, timestamp: int = int(NOW)) -> str:
    sig = hmac.new(secret.encode(), f"{timestamp}.".encode() + payload, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={sig}"


def test_a_correctly_signed_payload_verifies():
    """The case that used to raise AttributeError and lose the payment."""
    verify(PAYLOAD, header(), SECRET, now=NOW)


def test_a_forged_signature_is_refused():
    forged = f"t={int(NOW)},v1={'0' * 64}"
    with pytest.raises(InvalidSignature) as exc:
        verify(PAYLOAD, forged, SECRET, now=NOW)
    assert "no signature matches" in str(exc.value)


def test_a_payload_tampered_with_after_signing_is_refused():
    """The signature covers the body: changing an amount must invalidate it."""
    tampered = PAYLOAD.replace(b"evt_1", b"evt_2")
    with pytest.raises(InvalidSignature):
        verify(tampered, header(), SECRET, now=NOW)


def test_a_signature_made_with_a_different_secret_is_refused():
    with pytest.raises(InvalidSignature):
        verify(PAYLOAD, header(secret="whsec_someone_elses"), SECRET, now=NOW)


def test_a_replayed_old_signature_is_refused():
    old = header(timestamp=int(NOW) - DEFAULT_TOLERANCE_SECONDS - 1)
    with pytest.raises(InvalidSignature) as exc:
        verify(PAYLOAD, old, SECRET, now=NOW)
    assert "tolerance" in str(exc.value)


def test_a_signature_just_inside_the_tolerance_is_accepted():
    verify(PAYLOAD, header(timestamp=int(NOW) - DEFAULT_TOLERANCE_SECONDS + 1), SECRET, now=NOW)


@pytest.mark.parametrize("bad_header", ["", "t=123", "v1=abc", "garbage", "t=,v1="])
def test_malformed_headers_are_refused(bad_header):
    with pytest.raises(InvalidSignature):
        verify(PAYLOAD, bad_header, SECRET, now=NOW)


def test_no_configured_secret_cannot_verify_anything():
    with pytest.raises(InvalidSignature) as exc:
        verify(PAYLOAD, header(), "", now=NOW)
    assert "no webhook secret" in str(exc.value)


def test_the_route_uses_this_verifier_and_not_construct_event():
    """A regression guard: the library call that raised AttributeError must not come back."""
    router = pathlib.Path(__file__).resolve().parent.parent / "apps/api/gds_api/billing/router.py"
    src = router.read_text()
    assert "verify_stripe_signature(payload, sig_header, STRIPE_WEBHOOK_SECRET)" in src
    assert "construct_event(" not in src  # the call, not the comment explaining why it went
    # and a server fault must not be reported as a 4xx that Stripe would never retry
    assert 'detail=f"Webhook error: {str(e)}"' not in src
