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
from .plans import PLANS

def _ensure_stripe():
    """Set stripe.api_key from environment."""
    import stripe
    key = os.getenv("STRIPE_SECRET_KEY", "")
    if key:
        stripe.api_key = key
    return bool(stripe.api_key)



router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/quota")
async def get_quota(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """What this tenant's plan allows, what it has used this month, and the remaining headroom."""
    from gds_api import quota
    return await quota.snapshot(db, user.tenant_id)

# stripe.api_key set per-request via _ensure_stripe()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

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


async def _bind(db, tenant_id):
    """Re-assert the tenant on the CURRENT transaction.

    set_config(..., true) is transaction-local, so any commit or rollback anywhere in the call chain
    silently drops it - including a commit inside handle_webhook_event. After that, the next write is
    filtered away by the RLS policy and reports success while changing nothing, which is how the
    processed flag ended up false on a row whose processing had in fact succeeded. Every write below
    therefore re-binds immediately before it runs.
    """
    from sqlalchemy import text

    if tenant_id:
        await db.execute(text("SELECT set_config('gds.tenant_id', :t, true)"), {"t": str(tenant_id)})


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
    await _bind(db, tenant_id)

    # Recorded through a narrow SECURITY DEFINER helper, not a direct INSERT. INSERT ... RETURNING
    # applies the SELECT policy to the returned row, and an event with no resolvable tenant is
    # deliberately invisible under that policy - so a direct INSERT ... RETURNING was rejected with an
    # RLS violation for exactly the events an MSSP most needs (deleted customers, unknown buyers).
    # Stripe saw 500 and retried; billing_events stayed empty.
    recorded = await db.execute(text(
        "SELECT record_id, duplicate FROM billing_event_record("
        ":eid, :et, :lm, CAST(:tid AS uuid), CAST(:uid AS uuid), :sv, CAST(:pl AS jsonb))"),
        {"eid": event_id, "et": event.get("type", "unknown"), "lm": event.get("livemode"),
         "tid": str(tenant_id) if tenant_id else None,
         "uid": str(user_id) if user_id else None,
         "sv": signature_verified, "pl": json.dumps(event)})
    row = recorded.first()
    await db.commit()

    if row is None:
        raise HTTPException(status_code=500, detail="billing event could not be recorded")
    record_id, duplicate = str(row[0]), bool(row[1])

    if duplicate:
        return {"received": True, "duplicate": True, "event_id": event_id}

    try:
        await _bind(db, tenant_id)          # the insert commit above dropped the bind
        result = await handle_webhook_event(db=db, event=event, tenant_id=tenant_id, user_id=user_id)
        await _bind(db, tenant_id)          # handle_webhook_event commits; the bind is gone
        await _sync_tenant_from_event(db, tenant_id, event)
        await _bind(db, tenant_id)
        await db.execute(text(
            "SELECT billing_event_mark(CAST(:i AS uuid), true, CAST(:r AS jsonb), NULL)"),
            {"r": json.dumps(result, default=str), "i": record_id})
        await db.commit()
        return {"received": True, "event_id": event_id, "result": result}
    except Exception as e:
        await db.rollback()
        await _bind(db, tenant_id)
        await db.execute(text(
            "SELECT billing_event_mark(CAST(:i AS uuid), false, NULL, :e)"),
            {"e": f"{type(e).__name__}: {e}"[:500], "i": record_id})
        await db.commit()
        raise HTTPException(status_code=500,
                            detail=f"Webhook processing error: {type(e).__name__}: {str(e)}")
