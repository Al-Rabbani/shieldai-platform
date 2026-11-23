"""Stripe webhook signature verification that does not depend on what `construct_event` returns.

MEASURED 23 November 2026 against live Stripe, stripe-python 15.4.0:

    stripe.Webhook.construct_event(payload, valid_header, secret)   -> AttributeError: object
    stripe.Webhook.construct_event(payload, forged_header, secret)  -> SignatureVerificationError

The route caught SignatureVerificationError as "Invalid webhook signature" and every other exception as a generic
`400 Webhook error: {e}`. So the ONLY events it could ever accept were the forged ones: every genuine Stripe delivery
was rejected with a 4xx, and Stripe does not retry a 4xx. No payment could have activated a subscription, which is the
mechanism behind "no customer ever completed signup -> provision -> scan -> report -> invoice".

Verification is done here instead: the same HMAC scheme Stripe documents, with a constant-time comparison and the
replay window enforced. It raises its own exception so the route can answer 400 for a bad signature and 500 - which
Stripe DOES retry - for a genuine server fault. Collapsing those two into one code is how a transient failure silently
loses a payment.
"""
from __future__ import annotations

import hashlib
import hmac
import time

DEFAULT_TOLERANCE_SECONDS = 300


class InvalidSignature(Exception):
    """The header does not prove this payload came from Stripe."""


def verify(
    payload: bytes,
    sig_header: str,
    secret: str,
    tolerance: int = DEFAULT_TOLERANCE_SECONDS,
    now: float | None = None,
) -> None:
    """Raise InvalidSignature unless the header proves this exact payload.

    Stripe's scheme: `Stripe-Signature: t=<unix>,v1=<hex>` where v1 = HMAC-SHA256(secret, "<t>.<raw body>").
    """
    if not secret:
        raise InvalidSignature("no webhook secret is configured, so no signature can be verified")
    if not sig_header:
        raise InvalidSignature("no Stripe-Signature header was sent")

    parts: dict[str, str] = {}
    for item in sig_header.split(","):
        if "=" in item:
            name, value = item.split("=", 1)
            # v1 may legitimately appear more than once during a secret roll; the first is the one Stripe documents.
            parts.setdefault(name.strip(), value.strip())

    timestamp, signature = parts.get("t"), parts.get("v1")
    if not timestamp or not signature:
        raise InvalidSignature("the signature header is missing its timestamp or signature")

    try:
        signed_at = int(timestamp)
    except ValueError:
        raise InvalidSignature("the signature timestamp is not an integer") from None

    current = time.time() if now is None else now
    if tolerance and abs(current - signed_at) > tolerance:
        raise InvalidSignature(
            f"the signature is outside the {tolerance}s tolerance window, which is what a replay looks like"
        )

    expected = hmac.new(
        secret.encode("utf-8"), f"{timestamp}.".encode("utf-8") + payload, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise InvalidSignature("no signature matches this payload")
