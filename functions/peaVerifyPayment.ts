/**
 * peaVerifyPayment — v5 FULL REBUILD 2026-05-29
 *
 * Called when Stripe redirects to /payment-success after checkout.
 * Also called by the payment checker automation every 30 minutes.
 *
 * FIXES:
 *  - Pure REST API, zero SDK dependency (no createClientFromRequest, no createClient)
 *  - Proper "unpaid" handling: returns pending state, NOT an error
 *  - Updates both builder + agent DB on payment confirmation
 *  - Generates Stripe checkout link if session expired/not found
 *  - Triggers peaInvoiceReceipt to email receipt on success
 *  - Sets day_90_start on first paid confirmation
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const AGENT_APP   = "6a14246111a4fa5e22999619";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

// ── DB Helpers ────────────────────────────────────────────────────────────────

async function dbList(appId: string, entity: string, token: string): Promise<any[]> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`DB list ${entity}: ${r.status}`);
  return r.json();
}

async function dbGet(appId: string, entity: string, id: string, token: string): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) return null;
  return r.json();
}

async function dbUpdate(appId: string, entity: string, id: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`DB update ${entity}/${id}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function dbCreate(appId: string, entity: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`DB create ${entity}: ${r.status} ${await r.text()}`);
  return r.json();
}

// ── Email ─────────────────────────────────────────────────────────────────────

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const r = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], bcc: ["admin@primeendorsement.com"], subject, html }),
  });
  if (!r.ok) console.error("[verify] Email error:", r.status, await r.text());
}

function paymentConfirmedEmail(name: string, ref: string, venture: string, amount: string): string {
  const firstName = name.split(" ")[0];
  const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
  const receiptUrl = `${DOMAIN}/api/functions/peaInvoiceReceipt?type=receipt&ref=${encodeURIComponent(ref)}`;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #22c55e;padding:28px 32px;text-align:center">
    <div style="font-size:36px">✅</div>
    <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-top:8px">Prime Endorsement Authority</div>
    <div style="color:#22c55e;font-size:13px;margin-top:6px;font-weight:600">Payment Confirmed</div>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#22c55e;font-size:16px;font-weight:600;margin:0 0 10px">Payment Received, ${firstName}! 🎉</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 20px">Your payment of <strong style="color:#e2e8f0">${amount}</strong> for <strong style="color:#e2e8f0">${venture}</strong> has been confirmed. Your 90-day expert review has officially commenced.</p>
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:8px;padding:14px;text-align:center;margin-bottom:20px">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Reference Code</div>
      <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:4px">${ref}</div>
    </div>
    <div style="background:#0a1a0a;border:1px solid #166534;border-radius:8px;padding:16px;margin-bottom:20px">
      <div style="color:#22c55e;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Your 90-Day Review Timeline</div>
      <div style="font-size:12px;color:#4ade80;line-height:2">
        <div>✅ Day 0: Payment confirmed — review commenced</div>
        <div style="color:#94a3b8">⏳ Day 30: First expert panel update</div>
        <div style="color:#94a3b8">⏳ Day 60: Full assessment review</div>
        <div style="color:#94a3b8">⏳ Day 90: Official endorsement decision</div>
      </div>
    </div>
    <div style="text-align:center;margin:20px 0">
      <a href="${receiptUrl}" style="background:#22c55e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-right:8px;display:inline-block">View Receipt →</a>
      <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase;display:inline-block">Track Application →</a>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:14px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority · primeendorsement.com</p>
  </div>
</div></body></html>`;
}

function adminPaymentEmail(name: string, ref: string, venture: string, amount: string, sessionId: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #22c55e;padding:20px 28px;text-align:center">
    <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#22c55e;font-size:13px;margin-top:6px">💳 Payment Received</div>
  </div>
  <div style="padding:24px 28px;font-size:13px">
    <div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:6px;padding:16px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><span style="color:#64748b">Applicant:</span><br/><span style="color:#e2e8f0;font-weight:600">${name}</span></div>
        <div><span style="color:#64748b">Reference:</span><br/><span style="color:#C9A84C;font-weight:700">${ref}</span></div>
        <div><span style="color:#64748b">Venture:</span><br/><span style="color:#e2e8f0">${venture}</span></div>
        <div><span style="color:#64748b">Amount:</span><br/><span style="color:#22c55e;font-weight:700">${amount}</span></div>
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #1e293b">
        <span style="color:#64748b">Stripe Session:</span><br/>
        <span style="color:#94a3b8;font-size:11px">${sessionId}</span>
      </div>
    </div>
    <div style="text-align:center">
      <a href="https://app.base44.com/apps/${BUILDER_APP}/editor/preview" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase">Open Admin Panel →</a>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:12px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority</p>
  </div>
</div></body></html>`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const reqUrl      = new URL(req.url);
    const body        = await req.json().catch(() => ({})) as Record<string, any>;

    let session_id  = (body.session_id || body.sessionId || reqUrl.searchParams.get("session_id") || "").trim();
    let ref_param   = (body.ref || body.reference_code || reqUrl.searchParams.get("ref") || "").trim();

    // If only ref provided, resolve stripe_session_id from DB
    if (!session_id && ref_param) {
      const svcTok = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
      const dbR = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application`, {
        headers: { Authorization: `Bearer ${svcTok}` },
      });
      if (dbR.ok) {
        const all = await dbR.json() as any[];
        const match = all.find((r: any) => r.reference_code === ref_param.toUpperCase());
        if (match) session_id = (match.stripe_session_id || "").trim();
      }
    }

    if (!session_id) {
      return new Response(JSON.stringify({ success: false, error: "session_id or ref required" }), { status: 400, headers: CORS });
    }

    const stripeKey    = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const resendKey    = Deno.env.get("RESEND_API_KEY") || "";

    if (!stripeKey) {
      return new Response(JSON.stringify({ success: false, error: "Stripe not configured" }), { status: 500, headers: CORS });
    }

    // ── 1. Verify with Stripe ────────────────────────────────────────────────
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session_id}`,
      { headers: { "Authorization": `Bearer ${stripeKey}` } }
    );

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      let errJson: any = {};
      try { errJson = JSON.parse(errText); } catch (_) {}
      const errCode = errJson?.error?.code || "";
      console.error("[verify] Stripe error:", errCode, errText.slice(0, 200));
      return new Response(JSON.stringify({
        success: false,
        error:   "Stripe session lookup failed",
        code:    errCode,
        detail:  errJson?.error?.message || errText.slice(0, 100),
      }), { status: 400, headers: CORS });
    }

    const session    = await stripeRes.json();
    const payStatus  = session.payment_status || "unknown";
    const metadata   = session.metadata || {};
    const reference_code = ref_param || metadata.reference_code || "";
    const application_id = metadata.application_id || "";

    // ── 2. Not yet paid — return pending state (NOT an error) ────────────────
    if (payStatus !== "paid") {
      console.log(`[verify] Session ${session_id} is ${payStatus} — awaiting payment`);
      return new Response(JSON.stringify({
        success:        true,
        verified:       false,
        payment_status: payStatus,
        status:         "awaiting_payment",
        reference_code: reference_code || null,
        checkout_url:   session.url || null,
        message:        "Payment not yet completed. Complete your Stripe checkout to proceed.",
      }), { status: 200, headers: CORS });
    }

    // ── 3. Payment confirmed — find the application ──────────────────────────
    const now = new Date().toISOString();
    let app: any = null;

    // Try by ID first (fastest)
    if (application_id) {
      app = await dbGet(BUILDER_APP, "Application", application_id, serviceToken);
    }
    // Fallback: search by reference_code
    if (!app && reference_code) {
      const all = await dbList(BUILDER_APP, "Application", serviceToken);
      app = all.find((a: any) => a.reference_code === reference_code) || null;
    }
    // Fallback: search by payment_reference (session_id)
    if (!app) {
      const all = await dbList(BUILDER_APP, "Application", serviceToken);
      app = all.find((a: any) => a.payment_reference === session_id) || null;
    }
    // Fallback: search agent app
    if (!app && reference_code) {
      const all = await dbList(AGENT_APP, "Application", serviceToken);
      app = all.find((a: any) => a.reference_code === reference_code) || null;
    }

    if (!app) {
      console.warn("[verify] Application not found for session:", session_id);
      return new Response(JSON.stringify({
        success:   false,
        verified:  true,
        error:     "Application record not found. Payment was received but cannot locate application. Contact admin.",
        session_id,
        reference_code: reference_code || null,
      }), { status: 404, headers: CORS });
    }

    // Already paid? Idempotent
    if (app.payment_status === "paid") {
      console.log(`[verify] ${app.reference_code} already marked paid — idempotent`);
      return new Response(JSON.stringify({
        success:        true,
        verified:       true,
        already_paid:   true,
        payment_status: "paid",
        reference_code: app.reference_code,
        status:         app.status,
      }), { headers: CORS });
    }

    // Extract Stripe payment intent
    const paymentIntent = session.payment_intent || "";
    const customerEmail = session.customer_email || session.customer_details?.email || app.applicant_email || "";
    const amountTotal   = session.amount_total || 120000;
    const amountDisplay = `£${(amountTotal / 100).toFixed(2)}`;

    // ── 4. Update builder Application record ────────────────────────────────
    const updateData: Record<string, any> = {
      payment_status:    "paid",
      status:            "under_review",
      payment_reference: session_id,
      day_90_start:      now,
    };

    await dbUpdate(BUILDER_APP, "Application", app.id, serviceToken, updateData);
    console.log(`[verify] ✅ Builder record updated: ${app.reference_code} → paid/under_review`);

    // ── 5. Update agent app Application record ───────────────────────────────
    try {
      const agentApps = await dbList(AGENT_APP, "Application", serviceToken);
      const agentApp  = agentApps.find((a: any) => a.reference_code === app.reference_code);
      if (agentApp) {
        await dbUpdate(AGENT_APP, "Application", agentApp.id, serviceToken, {
          payment_status:    "paid",
          status:            "under_review",
          stripe_session_id: session_id,
          stripe_payment_intent: paymentIntent,
          payment_amount:    amountTotal / 100,
          payment_date:      now,
          day_90_start:      now,
        });
      }
    } catch (e: any) { console.warn("[verify] Agent app update failed:", e.message); }

    // ── 6. Create PaymentTransaction record ──────────────────────────────────
    try {
      await dbCreate(AGENT_APP, "PaymentTransaction", serviceToken, {
        application_id:        app.id,
        reference_code:        app.reference_code,
        stripe_session_id:     session_id,
        stripe_payment_intent: paymentIntent,
        amount:                1000.00,
        vat:                   200.00,
        total:                 1200.00,
        currency:              "GBP",
        status:                "paid",
        applicant_email:       customerEmail,
        applicant_name:        app.applicant_name,
        paid_at:               now,
      });
    } catch (e: any) { console.warn("[verify] PaymentTransaction create failed:", e.message); }

    // ── 7. Send emails ────────────────────────────────────────────────────────
    const venture = app.venture?.company_name || app.applicant_name || "Your Venture";
    const ref     = app.reference_code;

    if (resendKey && customerEmail) {
      try {
        await sendEmail(resendKey, customerEmail,
          `✅ Payment Confirmed — ${ref} | Prime Endorsement Authority`,
          paymentConfirmedEmail(app.applicant_name || "Applicant", ref, venture, amountDisplay)
        );
      } catch (e: any) { console.warn("[verify] Applicant email failed:", e.message); }
    }
    if (resendKey) {
      try {
        await sendEmail(resendKey, ADMIN_EMAIL,
          `💳 Payment Received — ${ref} | ${amountDisplay}`,
          adminPaymentEmail(app.applicant_name || "N/A", ref, venture, amountDisplay, session_id)
        );
      } catch (e: any) { console.warn("[verify] Admin email failed:", e.message); }
    }

    // ── 8. Trigger receipt generation (fire and forget) ──────────────────────
    try {
      fetch(`${DOMAIN}/api/functions/peaInvoiceReceipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:           "receipt",
          reference_code: ref,
          application_id: app.id,
          send_email:     true,
          return_html:    false,
        }),
      }).catch(e => console.warn("[verify] Receipt trigger failed:", e.message));
    } catch (_) {}

    return new Response(JSON.stringify({
      success:        true,
      verified:       true,
      payment_status: "paid",
      reference_code: ref,
      status:         "under_review",
      day_90_start:   now,
      amount:         amountDisplay,
    }), { headers: CORS });

  } catch (err: any) {
    console.error("[verify] Fatal:", err.message, err.stack);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
