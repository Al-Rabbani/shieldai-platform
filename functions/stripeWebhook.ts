/**
 * stripeWebhook — v3 SECURITY HARDENED 2026-06-04
 *
 * CRITICAL FIX: Mandatory Stripe signature verification — NO bypass.
 * Previous v2 had: if (_webhookSec && sigHeader) — allowed unsigned requests through
 * if STRIPE_WEBHOOK_SECRET was missing from env. This was exploited.
 *
 * v3 changes:
 *  - Signature check is ALWAYS enforced — missing secret = hard reject
 *  - Missing or invalid signature = 401 immediately, no fulfillment
 *  - Timestamp tolerance check (300s) to prevent replay attacks
 *  - GET probe endpoint removed (returns 405)
 *  - All other logic unchanged
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const AGENT_APP   = "6a14246111a4fa5e22999619";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";

const _tok        = Deno.env.get("BASE44_SERVICE_TOKEN")  || "";
const _resend     = Deno.env.get("RESEND_API_KEY")        || "";
const _webhookSec = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const JSON_H: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store" };

// ── Fetch with timeout ────────────────────────────────────────────────────────
async function fetchT(url: string, opts: RequestInit = {}, ms = 10000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { const r = await fetch(url, { ...opts, signal: ctrl.signal }); clearTimeout(t); return r; }
  catch (e) { clearTimeout(t); throw e; }
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function dbGetById(appId: string, entity: string, id: string): Promise<any | null> {
  try {
    const r = await fetchT(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
      headers: { Authorization: `Bearer ${_tok}` },
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function dbFilter(appId: string, entity: string, field: string, value: string): Promise<any[]> {
  try {
    const r = await fetchT(
      `https://app.base44.com/api/apps/${appId}/entities/${entity}?${field}=${encodeURIComponent(value)}`,
      { headers: { Authorization: `Bearer ${_tok}` } }
    );
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : d.data || [];
  } catch { return []; }
}

async function dbUpdate(appId: string, entity: string, id: string, data: object): Promise<void> {
  await fetchT(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${_tok}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, 8000).catch(() => {});
}

async function dbCreate(appId: string, entity: string, data: object): Promise<void> {
  await fetchT(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${_tok}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, 8000).catch(() => {});
}

// ── Email ─────────────────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await fetchT(RESEND_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${_resend}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], bcc: ["admin@primeendorsement.com"], subject, html }),
  }, 10000).catch(() => {});
}

function applicantConfirmEmail(firstName: string, ref: string, statusUrl: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:580px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1a0d;border-bottom:3px solid #22c55e;padding:28px;text-align:center">
    <div style="font-size:40px">&#x2705;</div>
    <div style="color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:4px;margin-top:8px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#22c55e;font-size:12px;margin-top:6px">Payment Confirmed. Your 90-Day Review Has Commenced.</div>
  </div>
  <div style="padding:28px">
    <p style="color:#C9A84C;font-size:15px;font-weight:600;margin-bottom:8px">Dear ${firstName},</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin-bottom:16px">Your endorsement fee of <strong style="color:#e2e8f0">&#x00A3;1,200.00</strong> has been received and confirmed. Your application is now under active expert review. Your 90-day endorsement assessment period has officially commenced.</p>
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:14px;text-align:center;margin:18px 0">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase">Your Reference</div>
      <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px;margin-top:4px">${ref}</div>
    </div>
    <div style="background:#0a1a0a;border:1px solid #166534;border-radius:8px;padding:14px;margin-bottom:16px">
      <div style="color:#22c55e;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">90-Day Review Timeline</div>
      <div style="font-size:12px;color:#4ade80;line-height:2.2">
        <div>Day 0: Payment confirmed. Review commenced.</div>
        <div style="color:#94a3b8">Day 30: First expert panel update.</div>
        <div style="color:#94a3b8">Day 60: Full assessment review.</div>
        <div style="color:#94a3b8">Day 90: Official endorsement decision.</div>
      </div>
    </div>
    <div style="text-align:center;margin:20px 0">
      <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 36px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">Track Your Application</a>
    </div>
    <p style="text-align:center;color:#475569;font-size:11px">Questions? <a href="mailto:${ADMIN_EMAIL}" style="color:#C9A84C">${ADMIN_EMAIL}</a></p>
  </div>
  <div style="background:#0d1220;padding:14px;text-align:center;border-top:1px solid #1e293b">
    <p style="color:#475569;font-size:11px">&#x00A9; ${year} Prime Endorsement Authority. All rights reserved.</p>
  </div>
</div></body></html>`;
}

function adminPaymentEmail(ref: string, name: string, email: string, sessionId: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:16px;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#111827;border-radius:8px;padding:20px">
  <div style="color:#C9A84C;font-size:14px;font-weight:700;margin-bottom:16px">Payment Received: ${ref}</div>
  <table style="width:100%;font-size:13px;border-collapse:collapse">
    <tr><td style="color:#64748b;padding:6px 0;width:120px">Reference:</td><td style="color:#C9A84C;font-weight:700">${ref}</td></tr>
    <tr><td style="color:#64748b;padding:6px 0">Applicant:</td><td style="color:#e2e8f0">${name}</td></tr>
    <tr><td style="color:#64748b;padding:6px 0">Email:</td><td style="color:#e2e8f0">${email}</td></tr>
    <tr><td style="color:#64748b;padding:6px 0">Amount:</td><td style="color:#22c55e;font-weight:700">&#x00A3;1,200.00 GBP Confirmed</td></tr>
    <tr><td style="color:#64748b;padding:6px 0">Status:</td><td style="color:#22c55e">Under Review</td></tr>
    <tr><td style="color:#64748b;padding:6px 0;font-size:10px">Session:</td><td style="color:#475569;font-size:10px">${sessionId}</td></tr>
  </table>
  <div style="margin-top:16px;text-align:center">
    <a href="https://primeendorsement.com/admin" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase">Open Admin Dashboard</a>
  </div>
</div></body></html>`;
}

// ── Stripe Signature Verification (mandatory — no bypass) ─────────────────────
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  try {
    const parts  = sigHeader.split(",");
    const tsPart = parts.find(p => p.startsWith("t="));
    const v1Part = parts.find(p => p.startsWith("v1="));
    if (!tsPart || !v1Part) return false;

    // Replay attack guard: reject if timestamp is older than 5 minutes
    const ts = parseInt(tsPart.slice(2), 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > 300) return false;

    const signed = tsPart.slice(2) + "." + payload;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig      = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return computed === v1Part.slice(3);
  } catch { return false; }
}

// ── Payment Fulfillment ───────────────────────────────────────────────────────
async function fulfillPayment(session: Record<string, any>): Promise<void> {
  const sessionId = session.id || "";
  const meta      = session.metadata || {};
  const refCode   = meta.reference_code || "";
  const appId     = meta.application_id || "";
  const custEmail = session.customer_details?.email || session.customer_email || "";
  const now       = new Date().toISOString();

  // Find builder record: ID first, then ref, then session
  let builderApp: Record<string, any> | null = null;
  if (appId) builderApp = await dbGetById(BUILDER_APP, "Application", appId);
  if (!builderApp && refCode) {
    const rows = await dbFilter(BUILDER_APP, "Application", "reference_code", refCode);
    builderApp = rows[0] || null;
  }
  if (!builderApp && sessionId) {
    const rows = await dbFilter(BUILDER_APP, "Application", "payment_reference", sessionId);
    builderApp = rows[0] || null;
  }

  const finalRef  = refCode || builderApp?.reference_code || "";
  const finalName = builderApp?.applicant_name || (builderApp?.founder as any)?.full_name || "Applicant";
  const appEmail  = builderApp?.applicant_email || (builderApp?.founder as any)?.email || custEmail;

  // Idempotency: already paid — skip
  if (builderApp?.payment_status === "paid") return;

  const paymentIntent = session.payment_intent || "";
  const amountTotal   = session.amount_total || 120000;
  const currency      = (session.currency || "gbp").toUpperCase();

  // DB updates
  const builderUpdates = {
    payment_status:    "paid",
    status:            "under_review",
    stripe_session_id: sessionId,
    stripe_payment_intent: paymentIntent,
    payment_amount:    amountTotal / 100,
    payment_date:      now,
    day_90_start:      now,
  };

  const promises: Promise<any>[] = [];

  if (builderApp?.id) {
    promises.push(dbUpdate(BUILDER_APP, "Application", builderApp.id, builderUpdates));
  }

  // Agent DB sync
  const agentPromise = (async () => {
    if (!finalRef) return;
    const agentRows = await dbFilter(AGENT_APP, "Application", "reference_code", finalRef);
    const agentApp  = agentRows[0] || null;
    if (agentApp?.id) {
      await dbUpdate(AGENT_APP, "Application", agentApp.id, builderUpdates);
    }
  })();
  promises.push(agentPromise);

  // Payment transaction record
  const txPromise = dbCreate(BUILDER_APP, "PaymentTransaction", {
    application_id:        builderApp?.id || "",
    reference_code:        finalRef,
    stripe_session_id:     sessionId,
    stripe_payment_intent: paymentIntent,
    amount:                amountTotal / 100,
    vat:                   200,
    total:                 amountTotal / 100,
    currency,
    status:                "paid",
    applicant_email:       appEmail,
    applicant_name:        finalName,
    paid_at:               now,
  });
  promises.push(txPromise);

  // Emails (parallel, non-blocking)
  const statusUrl  = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(finalRef)}`;
  const firstName  = finalName.split(" ")[0] || finalName;

  promises.push(Promise.allSettled([
    sendEmail(appEmail, `Payment Confirmed. Your Review Has Commenced. Ref: ${finalRef}`, applicantConfirmEmail(firstName, finalRef, statusUrl)),
    sendEmail(ADMIN_EMAIL, `Payment Received: ${finalRef} | GBP 1,200.00 | ${finalName}`, adminPaymentEmail(finalRef, finalName, appEmail, sessionId)),
  ]));

  await Promise.allSettled(promises);
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  // Only POST is accepted — no probe endpoint
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_H });
  }

  const payload   = await req.text();
  const sigHeader = req.headers.get("stripe-signature") || "";

  // MANDATORY signature check — no secret = hard reject
  if (!_webhookSec) {
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), { status: 500, headers: JSON_H });
  }
  if (!sigHeader) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), { status: 401, headers: JSON_H });
  }
  const valid = await verifyStripeSignature(payload, sigHeader, _webhookSec);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: JSON_H });
  }

  let event: Record<string, any>;
  try { event = JSON.parse(payload); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: JSON_H }); }

  if (event.type === "checkout.session.completed") {
    fulfillPayment(event.data?.object || {}).catch(() => {});
  }

  return new Response(JSON.stringify({ received: true }), { headers: JSON_H });
}
