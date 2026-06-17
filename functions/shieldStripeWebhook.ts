// ShieldAI — Stripe Webhook Handler v1 (Stage 13)
// Handles: checkout.session.completed → activate plan
//          customer.subscription.updated → plan change
//          customer.subscription.deleted → downgrade to free
//          invoice.payment_failed → payment failure alert
//          invoice.payment_succeeded → renewal confirmation
//
// Security: Stripe signature verification ALWAYS enforced (no bypass)
// Registration: add this URL as webhook endpoint in Stripe dashboard
// URL: https://app.base44.com/api/apps/6a22a773bb173a975d8337f9/functions/shieldStripeWebhook

const SHIELD_APP_ID = "6a22a773bb173a975d8337f9";
const SVC_TOK       = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
const WEBHOOK_SEC   = Deno.env.get("SHIELD_STRIPE_WEBHOOK_SECRET") || "";
const RESEND_KEY    = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL    = "ShieldAI Security <billing@shieldai.dev>";

const H = { Authorization: `Bearer ${SVC_TOK}`, "Content-Type": "application/json" };
const BASE = `https://app.base44.com/api/apps/${SHIELD_APP_ID}`;

// ── Plan mapping from Stripe price IDs
const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get("STRIPE_PRICE_PRO")  || "__pro__"]:  "professional",
  [Deno.env.get("STRIPE_PRICE_ENT")  || "__ent__"]:  "enterprise",
  [Deno.env.get("STRIPE_PRICE_FREE") || "__free__"]: "free",
};

function planFromPriceId(priceId: string): string {
  return PRICE_TO_PLAN[priceId] || "professional";
}

// ── Stripe signature verification (HMAC-SHA256, timing-safe)
async function verifyStripe(body: string, sig: string, secret: string): Promise<boolean> {
  if (!secret) return false;
  try {
    const parts = Object.fromEntries(sig.split(",").map(p => p.split("=")));
    const ts = parts["t"];
    const v1 = parts["v1"];
    if (!ts || !v1) return false;

    const tolerance = 300;
    if (Math.abs(Date.now() / 1000 - parseInt(ts)) > tolerance) return false;

    const payload  = `${ts}.${body}`;
    const enc      = new TextEncoder();
    const key      = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac      = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const computed = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Timing-safe compare
    if (computed.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
    return diff === 0;
  } catch (_) { return false; }
}

// ── DB helpers
async function dbList(entity: string): Promise<any[]> {
  try {
    const r = await fetch(`${BASE}/entities/${entity}`, { headers: H });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : d.data || [];
  } catch (_) { return []; }
}

async function dbCreate(entity: string, data: object): Promise<any> {
  try {
    const r = await fetch(`${BASE}/entities/${entity}`, { method: "POST", headers: H, body: JSON.stringify(data) });
    return r.ok ? r.json() : null;
  } catch (_) { return null; }
}

async function dbUpdate(entity: string, id: string, data: object): Promise<void> {
  try {
    await fetch(`${BASE}/entities/${entity}/${id}`, { method: "PUT", headers: H, body: JSON.stringify(data) });
  } catch (_) {}
}

// ── Email via Resend
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (_) {}
}

// ── Activate or update plan in OrgSettings
async function setPlan(customerId: string, subscriptionId: string, plan: string, expiresAt: string | null, customerEmail?: string): Promise<void> {
  const settings = await dbList("OrgSettings");

  const planData = {
    plan,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_expires_at: expiresAt,
    sla_critical_hours: plan === "free" ? 24 : 4,
    sla_high_hours: plan === "free" ? 72 : 24,
    auto_triage_enabled: true,
    auto_fix_enabled: plan !== "free",
    ci_gate_enabled: plan === "enterprise",
  };

  if (settings.length > 0) {
    await dbUpdate("OrgSettings", settings[0].id, planData);
  } else {
    await dbCreate("OrgSettings", { ...planData, org_name: "ShieldAI Customer" });
  }

  // Create in-app notification
  await dbCreate("Notification", {
    type: "system",
    title: `✅ Plan activated: ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
    message: plan === "free"
      ? "Your subscription has ended. You're now on the Free plan."
      : `Your ShieldAI ${plan} subscription is active. All features unlocked.`,
    severity: plan === "free" ? "medium" : "info",
    is_read: false,
    is_dismissed: false,
    channel: "in_app",
  });

  // Audit log
  await dbCreate("AuditLog", {
    actor_type: "system",
    actor_email: customerEmail || "stripe@shieldai.dev",
    action: "PLAN_CHANGED",
    resource_type: "OrgSettings",
    resource_id: customerId,
    resource_name: "Stripe Billing",
    details: `plan=${plan} customer=${customerId} subscription=${subscriptionId}`,
    severity: "info",
    outcome: "success",
  });
}

// ── Email templates
function activationEmail(plan: string, customerEmail: string): string {
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  return `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0A0E1A;color:#e5e7eb;padding:40px;">
<div style="max-width:560px;margin:0 auto;background:#111827;border-radius:12px;padding:40px;border:1px solid #1f2937;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#C9A84C;font-size:28px;margin:0;">🛡️ ShieldAI</h1>
    <p style="color:#6b7280;margin:8px 0 0;">Unified Security Platform</p>
  </div>
  <h2 style="color:#fff;font-size:22px;">Welcome to ShieldAI ${planName}!</h2>
  <p style="color:#9ca3af;line-height:1.6;">Your subscription is now active. Here's what you can do right now:</p>
  <ul style="color:#9ca3af;line-height:2;">
    <li>🔍 <strong style="color:#fff;">Scan your first repository</strong> — connect GitHub and run a SAST + SCA scan</li>
    <li>☁️ <strong style="color:#fff;">Connect a cloud account</strong> — scan AWS, Azure, or GCP for misconfigurations</li>
    <li>🧠 <strong style="color:#fff;">Run AutoTriage</strong> — get real EPSS scores + CISA KEV matches on all findings</li>
    <li>🎫 <strong style="color:#fff;">Connect Jira or Linear</strong> — auto-create tickets for critical findings</li>
  </ul>
  <div style="text-align:center;margin-top:32px;">
    <a href="https://app.base44.com/apps/6a22a773bb173a975d8337f9" style="background:#C9A84C;color:#0A0E1A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Open ShieldAI Dashboard →</a>
  </div>
  <p style="color:#4b5563;font-size:13px;margin-top:32px;text-align:center;">
    Questions? Reply to this email or contact support@shieldai.dev<br>
    Manage your subscription: <a href="https://app.base44.com/apps/6a22a773bb173a975d8337f9/settings/billing" style="color:#C9A84C;">billing settings</a>
  </p>
</div>
</body></html>`;
}

function paymentFailedEmail(customerEmail: string, amount: string): string {
  return `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0A0E1A;color:#e5e7eb;padding:40px;">
<div style="max-width:560px;margin:0 auto;background:#111827;border-radius:12px;padding:40px;border:1px solid #ef4444;">
  <h1 style="color:#C9A84C;">🛡️ ShieldAI</h1>
  <h2 style="color:#ef4444;">⚠️ Payment Failed</h2>
  <p style="color:#9ca3af;">We were unable to process your payment of <strong style="color:#fff;">${amount}</strong>.</p>
  <p style="color:#9ca3af;">Your ShieldAI subscription will be paused if payment is not received within 7 days.</p>
  <div style="text-align:center;margin-top:32px;">
    <a href="https://app.base44.com/apps/6a22a773bb173a975d8337f9/settings/billing" style="background:#ef4444;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Update Payment Method →</a>
  </div>
</div>
</body></html>`;
}

// ── Main handler
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get("stripe-signature") || "";

  // ALWAYS verify signature — no bypass
  if (!WEBHOOK_SEC) {
    console.error("[ShieldStripe] SHIELD_STRIPE_WEBHOOK_SECRET not set — rejecting all webhooks");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), { status: 503 });
  }

  const valid = await verifyStripe(rawBody, sigHeader, WEBHOOK_SEC);
  if (!valid) {
    console.error("[ShieldStripe] Invalid Stripe signature — rejected");
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); }
  catch (_) { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }

  const obj = event.data?.object || {};
  console.log(`[ShieldStripe] Event: ${event.type} | id=${event.id}`);

  // ── checkout.session.completed — new subscription started
  if (event.type === "checkout.session.completed") {
    const customerId    = obj.customer;
    const subscriptionId = obj.subscription;
    const customerEmail  = obj.customer_details?.email || obj.customer_email || "";
    const plan           = planFromPriceId(obj.metadata?.plan || "") || "professional";

    await setPlan(customerId, subscriptionId, plan, null, customerEmail);

    if (customerEmail) {
      await sendEmail(customerEmail, `🛡️ Welcome to ShieldAI ${plan.charAt(0).toUpperCase() + plan.slice(1)}!`, activationEmail(plan, customerEmail));
    }

    console.log(`[ShieldStripe] checkout.session.completed → plan=${plan} customer=${customerId}`);
  }

  // ── customer.subscription.updated — plan change or renewal
  if (event.type === "customer.subscription.updated") {
    const customerId      = obj.customer;
    const subscriptionId  = obj.id;
    const priceId         = obj.items?.data?.[0]?.price?.id || "";
    const plan            = planFromPriceId(priceId);
    const currentPeriodEnd = obj.current_period_end
      ? new Date(obj.current_period_end * 1000).toISOString()
      : null;
    const status = obj.status; // active | past_due | canceled | trialing

    if (status === "active" || status === "trialing") {
      await setPlan(customerId, subscriptionId, plan, currentPeriodEnd);
    } else if (status === "past_due") {
      await dbCreate("Notification", {
        type: "billing",
        title: "⚠️ Payment Past Due",
        message: "Your ShieldAI subscription payment is past due. Update your payment method to avoid interruption.",
        severity: "high",
        action_url: "/settings/billing",
        is_read: false,
        is_dismissed: false,
        channel: "in_app",
      });
    }

    console.log(`[ShieldStripe] subscription.updated → plan=${plan} status=${status}`);
  }

  // ── customer.subscription.deleted — subscription cancelled/expired
  if (event.type === "customer.subscription.deleted") {
    const customerId = obj.customer;
    const subscriptionId = obj.id;

    await setPlan(customerId, subscriptionId, "free", null);

    await dbCreate("Notification", {
      type: "billing",
      title: "📋 Subscription Ended — Free Plan",
      message: "Your ShieldAI subscription has ended. You're now on the Free plan with limited scanning capacity.",
      severity: "medium",
      action_url: "/settings/billing",
      is_read: false,
      is_dismissed: false,
      channel: "in_app",
    });

    console.log(`[ShieldStripe] subscription.deleted → downgraded to free`);
  }

  // ── invoice.payment_succeeded — successful renewal
  if (event.type === "invoice.payment_succeeded") {
    const customerId = obj.customer;
    const amount = `$${((obj.amount_paid || 0) / 100).toFixed(2)}`;
    const customerEmail = obj.customer_email || "";

    await dbCreate("AuditLog", {
      actor_type: "system",
      action: "PAYMENT_SUCCEEDED",
      resource_type: "OrgSettings",
      resource_id: customerId,
      resource_name: "Stripe Billing",
      details: `amount=${amount} invoice=${obj.id}`,
      severity: "info",
      outcome: "success",
    });

    console.log(`[ShieldStripe] payment_succeeded → ${amount} customer=${customerId}`);
  }

  // ── invoice.payment_failed — payment failed
  if (event.type === "invoice.payment_failed") {
    const customerId    = obj.customer;
    const amount        = `$${((obj.amount_due || 0) / 100).toFixed(2)}`;
    const customerEmail = obj.customer_email || "";
    const attemptCount  = obj.attempt_count || 1;

    await dbCreate("Notification", {
      type: "billing",
      title: `❌ Payment Failed — Attempt ${attemptCount}`,
      message: `Payment of ${amount} failed. Update your payment method in billing settings.`,
      severity: "critical",
      action_url: "/settings/billing",
      is_read: false,
      is_dismissed: false,
      channel: "in_app",
    });

    if (customerEmail) {
      await sendEmail(customerEmail, "⚠️ ShieldAI — Payment Failed", paymentFailedEmail(customerEmail, amount));
    }

    console.log(`[ShieldStripe] payment_failed → ${amount} attempt=${attemptCount}`);
  }

  return new Response(JSON.stringify({ received: true, event: event.type }), {
    headers: { "Content-Type": "application/json" },
  });
});
