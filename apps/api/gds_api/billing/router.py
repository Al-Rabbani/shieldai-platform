"""FastAPI router for billing endpoints — GBP (£)."""
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from gds_api.db import get_db
from gds_api.auth import get_current_user
from .service import (
    create_checkout_session,
    create_portal_session,
    get_subscription_status,
    cancel_subscription,
    list_invoices,
    handle_webhook_event,
)
from .models import Subscription

def _ensure_stripe():
    """Set stripe.api_key from environment."""
    import stripe
    key = os.getenv("STRIPE_SECRET_KEY", "")
    if key:
        stripe.api_key = key
    return bool(stripe.api_key)



router = APIRouter(prefix="/billing", tags=["billing"])

# stripe.api_key set per-request via _ensure_stripe()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

PLANS = [
    {
        "tier": "starter",
        "name": "Starter",
        "price_monthly": 399,
        "price_annual": 3990,
        "currency": "GBP",
        "symbol": "£",
        "description": "Perfect for small teams getting started with autonomous security",
        "features": [
            "Cloud posture scan", "Basic findings dashboard", "1 cloud account",
            "In-app notifications", "Email support", "Daily scan schedule"
        ],
        "max_cloud_accounts": 1,
        "token_quota": 50000,
    },
    {
        "tier": "professional",
        "name": "Professional",
        "price_monthly": 1199,
        "price_annual": 11990,
        "currency": "GBP",
        "symbol": "£",
        "description": "For security teams managing multiple cloud environments",
        "features": [
            "Everything in Starter", "Multi-cloud (AWS/Azure/GCP)",
            "Threat intelligence feeds", "SSH network diagnostics",
            "Email + Slack alerts", "5 cloud accounts", "Scheduled missions",
            "API access", "Priority support"
        ],
        "max_cloud_accounts": 5,
        "token_quota": 200000,
    },
    {
        "tier": "enterprise",
        "name": "Enterprise",
        "price_monthly": 3999,
        "price_annual": 39990,
        "currency": "GBP",
        "symbol": "£",
        "description": "Full autonomous security operations for large enterprises and MSSPs",
        "features": [
            "Everything in Professional", "Red team operations",
            "Purple team collaboration", "Compliance automation (SOC2/ISO27001/PCI)",
            "Enterprise SSO (SAML/OIDC)", "Dedicated support engineer",
            "Custom agent workflows", "Unlimited cloud accounts",
            "On-premise deployment option", "SLA with credits"
        ],
        "max_cloud_accounts": 999,
        "token_quota": 1000000,
    },
]


class CheckoutRequest(BaseModel):
    plan_tier: str
    tenant_id: Optional[str] = None


class CancelRequest(BaseModel):
    immediate: bool = False


@router.get("/plans")
async def get_plans():
    """List available subscription plans (GBP)."""
    return {"plans": PLANS, "currency": "GBP", "symbol": "£"}


@router.post("/checkout")
async def checkout(
    req: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Create a Stripe Checkout Session."""
    if req.plan_tier not in ["starter", "professional", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan tier")

    _ensure_stripe()
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Stripe not configured. Contact admin.")

    try:
        result = await create_checkout_session(
            db=db,
            user_id=str(user.user_id if hasattr(user, "user_id") else user.id),
            email=getattr(user, "email", ""),
            plan_tier=req.plan_tier,
            tenant_id=str(getattr(user, "tenant_id", getattr(user, "tenant", req.tenant_id))),
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Checkout error: {type(e).__name__}: {str(e)}")


@router.post("/portal")
async def portal(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Create a Stripe Customer Portal session."""
    _ensure_stripe()
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Stripe not configured. Contact admin.")
    try:
        result = await create_portal_session(db=db, user_id=str(user.user_id if hasattr(user, "user_id") else user.id))
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Checkout error: {type(e).__name__}: {str(e)}")


@router.get("/subscription")
async def subscription_status(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get current subscription status."""
    return await get_subscription_status(db=db, user_id=str(user.user_id if hasattr(user, "user_id") else user.id))


@router.post("/cancel")
async def cancel(
    req: CancelRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Cancel subscription."""
    _ensure_stripe()
    try:
        return await cancel_subscription(db=db, user_id=str(user.user_id if hasattr(user, "user_id") else user.id), immediate=req.immediate)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Cancel error: {type(e).__name__}: {str(e)}")


@router.get("/invoices")
async def invoices(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """List payment history."""
    return {"invoices": await list_invoices(db=db, user_id=str(user.user_id if hasattr(user, "user_id") else user.id))}


async def _resolve_event_tenant(db, event):
    """Work out which tenant a Stripe event belongs to, before any tenant is bound.

    A webhook carries no session, so every RLS-forced lookup returns nothing here. The resolution
    therefore goes through the SECURITY DEFINER helpers in migration 022, which answer only this one
    question. Returns (tenant_id_or_None, user_id_or_None). None is a real answer, not a failure: the
    event is still stored so an unattributable event leaves evidence instead of vanishing.
    """
    from sqlalchemy import text

    data = (event.get("data") or {}).get("object") or {}
    meta = data.get("metadata") or {}
    user_id = meta.get("user_id")

    if meta.get("tenant_id"):
        return meta["tenant_id"], user_id
    if user_id:
        got = (await db.execute(text("SELECT billing_tenant_for_user(:u)"), {"u": user_id})).scalar()
        if got:
            return str(got), user_id
    customer = data.get("customer")
    if customer:
        got = (await db.execute(text("SELECT billing_tenant_for_customer(:c)"), {"c": customer})).scalar()
        if got:
            return str(got), user_id
    sub = data.get("subscription")
    if sub and isinstance(sub, str):
        got = (await db.execute(text("SELECT billing_tenant_for_subscription(:s)"), {"s": sub})).scalar()
        if got:
            return str(got), user_id
    return None, user_id


async def _sync_tenant_from_event(db, tenant_id, event):
    """Reflect the subscription state on the tenant row.

    Billing rows are keyed by user, but the product bills a tenant. Without this, "plan active" was
    only observable per user and the tenant - the thing that owns the data and the isolation - had no
    idea what it was paying for. Only fields the event actually carries are written; nothing is
    inferred from a missing field.
    """
    from sqlalchemy import text

    if not tenant_id:
        return
    data = (event.get("data") or {}).get("object") or {}
    meta = data.get("metadata") or {}
    etype = event.get("type")

    plan = meta.get("plan_tier")
    status = {
        "checkout.session.completed": "active",
        "customer.subscription.updated": data.get("status"),
        "customer.subscription.deleted": "canceled",
        "invoice.payment_succeeded": "active",
        "invoice.payment_failed": "past_due",
    }.get(etype)
    customer = data.get("customer") if isinstance(data.get("customer"), str) else None

    if not any([plan, status, customer]):
        return
    await db.execute(text(
        "UPDATE tenants SET plan_tier = COALESCE(:plan, plan_tier), "
        "subscription_status = COALESCE(:status, subscription_status), "
        "stripe_customer_id = COALESCE(:cust, stripe_customer_id) WHERE id = :tid"),
        {"plan": plan, "status": status, "cust": customer, "tid": str(tenant_id)})


@router.post("/webhook")
async def webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Stripe webhook endpoint.

    The event is persisted BEFORE it is processed, keyed on Stripe's own event id, so Stripe's
    at-least-once delivery cannot double-apply a payment and a handler that throws still leaves the
    raw event on record. Processing runs afterwards and records its result or its error against the
    same row, so "we received it and failed" is distinguishable from "we never received it".
    """
    import json
    from sqlalchemy import text

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    signature_verified = False

    if STRIPE_WEBHOOK_SECRET:
        try:
            stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
            signature_verified = True
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")
    # else: no secret configured means the endpoint accepts unsigned events. That is recorded as
    # signature_verified=false rather than being silently treated as verified.

    event = json.loads(payload)
    event_id = event.get("id")
    if not event_id:
        raise HTTPException(status_code=400, detail="Event has no id")

    tenant_id, user_id = await _resolve_event_tenant(db, event)
    if tenant_id:
        await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"), {"t": str(tenant_id)})

    inserted = await db.execute(text(
        "INSERT INTO billing_events (stripe_event_id, event_type, livemode, tenant_id, user_id, "
        "signature_verified, payload) VALUES (:eid, :et, :lm, :tid, :uid, :sv, CAST(:pl AS jsonb)) "
        "ON CONFLICT (stripe_event_id) DO NOTHING RETURNING id"),
        {"eid": event_id, "et": event.get("type", "unknown"), "lm": event.get("livemode"),
         "tid": tenant_id, "uid": user_id, "sv": signature_verified, "pl": json.dumps(event)})
    row = inserted.first()
    await db.commit()

    if not row:
        return {"received": True, "duplicate": True, "event_id": event_id}

    record_id = str(row[0])
    # The commit returned the pooled connection, so the tenant bind is gone; re-assert it before
    # touching the row again or the update is filtered away by the very policy that protects it.
    if tenant_id:
        await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"), {"t": str(tenant_id)})

    try:
        result = await handle_webhook_event(db=db, event=event)
        await _sync_tenant_from_event(db, tenant_id, event)
        await db.execute(text(
            "UPDATE billing_events SET processed = true, processing_result = CAST(:r AS jsonb) WHERE id = :i"),
            {"r": json.dumps(result, default=str), "i": record_id})
        await db.commit()
        return {"received": True, "event_id": event_id, "result": result}
    except Exception as e:
        await db.rollback()
        if tenant_id:
            await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"), {"t": str(tenant_id)})
        await db.execute(text("UPDATE billing_events SET error = :e WHERE id = :i"),
                         {"e": f"{type(e).__name__}: {e}"[:500], "i": record_id})
        await db.commit()
        raise HTTPException(status_code=500,
                            detail=f"Webhook processing error: {type(e).__name__}: {str(e)}")
