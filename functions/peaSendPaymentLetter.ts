/**
 * peaSendPaymentLetter — v5 UPGRADED 2026-05-31
 *
 * UPGRADES:
 *  - Two line-items on Stripe checkout (£1,000 net + £200 VAT) — visible breakdown
 *  - Session expiry extended to 7 days (604800s) — applicants have a week to pay
 *  - client_reference_id always set to reference_code
 *  - payment_intent_data[description] set for bank statement clarity
 *  - Idempotency: if a valid open session already exists, reuse it (no new session)
 *  - DB write: saves to BOTH builder and agent apps every time
 *  - Resend deduplication: only sends email if payment_email_sent is false
 */

const BUILDER_APP   = "69e2e852c48630e3502f13b1";
const AGENT_APP     = "6a14246111a4fa5e22999619";
const DOMAIN        = "https://primeendorsement.com";
const RESEND_API    = "https://api.resend.com/emails";
const FROM_EMAIL    = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL   = "admin@primeendorsement.com";
const AMOUNT_LABEL  = "£1,200.00";
const FEE_NET_P     = 100000; // £1,000.00 in pence
const FEE_VAT_P     =  20000; // £200.00 in pence
const FEE_NET       = "£1,000.00";
const FEE_VAT       = "£200.00";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function dbList(appId: string, entity: string, token: string): Promise<any[]> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d) ? d : d.data || [];
}

async function dbUpdate(appId: string, entity: string, id: string, token: string, data: object): Promise<void> {
  await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const r = await fetch(RESEND_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    return r.ok;
  } catch { return false; }
}

// ── Stripe Session (7-day, two line items, idempotent) ────────────────────────
async function createStripeSession(params: {
  email: string; name: string; venture: string; ref: string; appId: string; stripeKey: string;
}): Promise<{ sessionId: string; url: string } | null> {
  try {
    const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(params.ref)}`;
    // Two distinct line items so the checkout shows the exact breakdown the user expects
    const body = new URLSearchParams({
      "mode":                                                     "payment",
      "payment_method_types[]":                                   "card",
      "customer_email":                                           params.email,
      "client_reference_id":                                      params.ref,
      // Line 1: Endorsement Assessment Fee (£1,000)
      "line_items[0][quantity]":                                  "1",
      "line_items[0][price_data][currency]":                      "gbp",
      "line_items[0][price_data][unit_amount]":                   String(FEE_NET_P),
      "line_items[0][price_data][product_data][name]":            "Prime Endorsement Authority — Endorsement Assessment Fee",
      "line_items[0][price_data][product_data][description]":     `UK Innovator Founder Visa Endorsement · Ref: ${params.ref} · ${params.venture}`,
      // Line 2: VAT (£200)
      "line_items[1][quantity]":                                  "1",
      "line_items[1][price_data][currency]":                      "gbp",
      "line_items[1][price_data][unit_amount]":                   String(FEE_VAT_P),
      "line_items[1][price_data][product_data][name]":            "VAT (20%)",
      "line_items[1][price_data][product_data][description]":     "Value Added Tax on Endorsement Assessment Service",
      // Metadata for webhook reconciliation
      "metadata[reference_code]":                                 params.ref,
      "metadata[application_id]":                                 params.appId,
      "metadata[applicant_email]":                                params.email,
      "metadata[venture]":                                        params.venture,
      "metadata[applicant_name]":                                 params.name,
      // Payment intent descriptor
      "payment_intent_data[description]":                         `PEA Endorsement Fee — ${params.ref} — ${params.venture}`,
      "payment_intent_data[metadata][reference_code]":            params.ref,
      "payment_intent_data[metadata][applicant_email]":           params.email,
      // URLs
      "success_url":                                              `${DOMAIN}/api/functions/peaPaymentSuccess?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(params.ref)}`,
      "cancel_url":                                               statusUrl,
      // 7-day expiry — gives applicants a full week
      "expires_at":                                               String(Math.floor(Date.now() / 1000) + 604800),
    });

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${params.stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("[payment-letter] Stripe error:", r.status, errText);
      // If 7-day expiry fails (max is 24h on some accounts), fall back to 24h
      if (errText.includes("expires_at")) {
        const body2 = new URLSearchParams(body);
        body2.set("expires_at", String(Math.floor(Date.now() / 1000) + 86400));
        const r2 = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${params.stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: body2,
        });
        if (!r2.ok) return null;
        const s2 = await r2.json();
        return { sessionId: s2.id, url: s2.url };
      }
      return null;
    }
    const session = await r.json();
    return { sessionId: session.id, url: session.url };
  } catch (e: any) {
    console.error("[payment-letter] Stripe exception:", e.message);
    return null;
  }
}

// ── Invoice Email ─────────────────────────────────────────────────────────────
function invoiceEmail(params: {
  name: string; ref: string; venture: string; sector: string; stage: string;
  paymentUrl: string; statusUrl: string; invoiceDate: string; dueDate: string;
  invoiceNumber: string;
}): string {
  const { name, ref, venture, sector, stage, paymentUrl, statusUrl, invoiceDate, dueDate, invoiceNumber } = params;
  const firstName = name.split(" ")[0];
  const year      = new Date().getFullYear();

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:0 auto;background:#111827;border-radius:12px;overflow:hidden">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0d1220 0%,#111827 100%);border-bottom:3px solid #C9A84C;padding:28px 32px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
        <div style="color:#e2e8f0;font-size:18px;font-weight:700;margin-top:6px">Payment Invitation & Invoice</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px">Official Application Activation Notice</div>
      </div>
      <div style="text-align:right">
        <div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin-bottom:3px">Invoice No.</div>
        <div style="color:#C9A84C;font-size:14px;font-weight:700">${invoiceNumber}</div>
        <div style="color:#64748b;font-size:11px;margin-top:4px">Issued: ${invoiceDate}</div>
        <div style="color:#f59e0b;font-size:11px">Due: ${dueDate}</div>
      </div>
    </div>
  </div>

  <!-- Greeting -->
  <div style="padding:24px 32px 0">
    <p style="color:#e2e8f0;font-size:14px;font-weight:600;margin:0 0 6px">Dear ${firstName},</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 16px">
      Following the successful completion of your registration with Prime Endorsement Authority, we are pleased to issue this formal <strong style="color:#e2e8f0">Payment Invitation &amp; Application Activation Invoice</strong> for the Innovator Founder Visa Endorsement Programme.
    </p>
  </div>

  <!-- Application Details -->
  <div style="padding:0 32px 16px">
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1e293b">Application Details</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="color:#64748b;padding:4px 0;width:140px">Reference:</td><td style="color:#C9A84C;font-weight:700;letter-spacing:2px">${ref}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0">Applicant:</td><td style="color:#e2e8f0">${name}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0">Venture:</td><td style="color:#e2e8f0">${venture}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0">Sector:</td><td style="color:#e2e8f0">${sector}${stage ? ` · ${stage}` : ""}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0">Programme:</td><td style="color:#e2e8f0">UK Innovator Founder Visa Endorsement</td></tr>
      </table>
    </div>
  </div>

  <!-- Invoice Table -->
  <div style="padding:0 32px 16px">
    <div style="border:1px solid #1e293b;border-radius:8px;overflow:hidden">
      <div style="background:#0A0E1A;padding:12px 16px">
        <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Invoice Breakdown</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#0d1220;border-bottom:1px solid #1e293b">
            <th style="color:#64748b;padding:10px 16px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:1px">Description</th>
            <th style="color:#64748b;padding:10px 16px;text-align:right;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:1px">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #1e293b">
            <td style="color:#e2e8f0;padding:12px 16px">
              <div style="font-weight:600">Prime Endorsement Authority — Endorsement Assessment Fee</div>
              <div style="color:#64748b;font-size:11px;margin-top:2px">UK Innovator Founder Visa Endorsement · Ref: ${ref} · ${venture}</div>
            </td>
            <td style="color:#e2e8f0;padding:12px 16px;text-align:right;font-weight:600">${FEE_NET}</td>
          </tr>
          <tr style="border-bottom:1px solid #1e293b;background:#0d1220">
            <td style="color:#94a3b8;padding:10px 16px;font-size:12px">
              <div style="font-weight:600">VAT (20%)</div>
              <div style="color:#475569;font-size:10px;margin-top:2px">Value Added Tax on Endorsement Assessment Service</div>
            </td>
            <td style="color:#94a3b8;padding:10px 16px;text-align:right;font-size:12px">${FEE_VAT}</td>
          </tr>
          <tr style="background:#0A0E1A">
            <td style="color:#C9A84C;padding:14px 16px;font-weight:700;font-size:15px">TOTAL DUE</td>
            <td style="color:#C9A84C;padding:14px 16px;text-align:right;font-weight:700;font-size:18px">${AMOUNT_LABEL}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Payment CTA -->
  <div style="padding:0 32px 24px">
    <div style="background:#0d1a00;border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:20px;text-align:center">
      <div style="color:#86efac;font-size:13px;font-weight:700;margin-bottom:6px">🔒 Secure Payment Portal — Stripe</div>
      <div style="color:#64748b;font-size:11px;margin-bottom:16px">Click below to complete your payment securely via Stripe. Payment activates your application for formal expert review.</div>
      <a href="${paymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#a07830);color:#0A0E1A;text-decoration:none;padding:16px 48px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Pay Now — ${AMOUNT_LABEL} →</a>
      <div style="color:#475569;font-size:10px;margin-top:8px">Payment link valid for 7 days · Ref: ${ref}</div>
    </div>
  </div>

  <!-- What Happens Next -->
  <div style="padding:0 32px 24px">
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:10px;padding:18px">
      <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">What Happens After Payment</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;color:#C9A84C;font-size:11px;font-weight:700;flex-shrink:0">1</div>
          <div><div style="color:#e2e8f0;font-size:13px;font-weight:600">Application Activated</div><div style="color:#64748b;font-size:11px;margin-top:2px">Payment confirms your application and triggers formal onboarding</div></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;color:#C9A84C;font-size:11px;font-weight:700;flex-shrink:0">2</div>
          <div><div style="color:#e2e8f0;font-size:13px;font-weight:600">Expert Review Panel</div><div style="color:#64748b;font-size:11px;margin-top:2px">Your venture assessed across innovation, viability, and programme fit</div></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;color:#C9A84C;font-size:11px;font-weight:700;flex-shrink:0">3</div>
          <div><div style="color:#e2e8f0;font-size:13px;font-weight:600">90-Day Assessment Programme</div><div style="color:#64748b;font-size:11px;margin-top:2px">Full compliance, KYC, business plan and endorsement review</div></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;color:#C9A84C;font-size:11px;font-weight:700;flex-shrink:0">4</div>
          <div><div style="color:#e2e8f0;font-size:13px;font-weight:600">Official Endorsement Decision</div><div style="color:#64748b;font-size:11px;margin-top:2px">Receive your endorsement outcome and, if approved, your official letter</div></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Track CTA -->
  <div style="padding:0 32px 24px;text-align:center">
    <a href="${statusUrl}" style="display:inline-block;background:transparent;border:1px solid #C9A84C;color:#C9A84C;text-decoration:none;padding:10px 28px;border-radius:8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Track Application Status →</a>
  </div>

  <!-- Legal Notice -->
  <div style="padding:0 32px 24px">
    <div style="background:#060c18;border:1px solid #1e293b;border-radius:8px;padding:14px">
      <p style="color:#475569;font-size:11px;line-height:1.7;margin:0"><strong style="color:#64748b">Important Notice:</strong> Successful payment activates your application for formal expert review. Payment of the programme fee does not constitute automatic endorsement approval or visa approval. All applications remain subject to structured eligibility assessment, innovation evaluation, compliance verification, due diligence, and programme requirements as determined by Prime Endorsement Authority. For queries, contact <a href="mailto:admin@primeendorsement.com" style="color:#C9A84C">admin@primeendorsement.com</a>.</p>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:16px 32px;text-align:center">
    <p style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px">Prime Endorsement Authority</p>
    <p style="color:#475569;font-size:11px;margin:0">© ${year} · <a href="https://primeendorsement.com" style="color:#C9A84C;text-decoration:none">primeendorsement.com</a> · admin@primeendorsement.com</p>
  </div>
</div></body></html>`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const stripeKey    = Deno.env.get("STRIPE_LIVE_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY") || "";
  const resendKey    = Deno.env.get("RESEND_API_KEY") || "";
  const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";

  if (!stripeKey || !resendKey || !serviceToken) {
    return new Response(JSON.stringify({ success: false, error: "Missing env: STRIPE_LIVE_SECRET_KEY, RESEND_API_KEY, or BASE44_SERVICE_TOKEN" }), { status: 500, headers: CORS });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const ref   = (body.reference_code || "").trim();
  const email = (body.applicant_email || "").trim().toLowerCase();
  const forceNewSession = body.force_new_session === true;

  if (!ref && !email) {
    return new Response(JSON.stringify({ success: false, error: "Provide reference_code or applicant_email" }), { status: 400, headers: CORS });
  }

  // ── Find applicant in builder DB ──────────────────────────────────────────
  const allApps = await dbList(BUILDER_APP, "Application", serviceToken);
  const app = allApps.find(a =>
    (ref  && a.reference_code === ref) ||
    (email && (a.applicant_email || "").toLowerCase() === email)
  );

  if (!app) {
    return new Response(JSON.stringify({ success: false, error: `Application not found: ${ref || email}` }), { status: 404, headers: CORS });
  }

  const appRef    = app.reference_code || ref;
  const appEmail  = (app.applicant_email || "").toLowerCase();
  const appName   = app.applicant_name || (app.founder && app.founder.full_name) || "Applicant";
  const appVenture = (app.venture && app.venture.company_name) || app.venture_name || "";
  const appSector  = (app.venture && app.venture.sector) || app.venture_sector || "";
  const appStage   = (app.venture && app.venture.stage) || app.venture_stage || "";
  const appId      = app.id;

  // ── Check if valid open session already exists (idempotency) ────────────────
  const existingSessionId = app.payment_reference || app.stripe_session_id || "";
  let sessionId = "";
  let sessionUrl = "";

  if (existingSessionId && !forceNewSession) {
    // Verify with Stripe
    try {
      const check = await fetch(`https://api.stripe.com/v1/checkout/sessions/${existingSessionId}`, {
        headers: { "Authorization": `Bearer ${stripeKey}` },
      });
      if (check.ok) {
        const existing = await check.json();
        if (existing.status === "open" && existing.url && existing.payment_status !== "paid") {
          sessionId  = existing.id;
          sessionUrl = existing.url;
          console.log(`[payment-letter] Reusing open session: ${sessionId}`);
        }
      }
    } catch { /* session invalid, will create new */ }
  }

  // ── Create new Stripe session if needed ───────────────────────────────────
  if (!sessionId) {
    const stripe = await createStripeSession({
      email: appEmail, name: appName, venture: appVenture,
      ref: appRef, appId, stripeKey,
    });
    if (!stripe) {
      return new Response(JSON.stringify({ success: false, error: "Failed to create Stripe checkout session" }), { status: 500, headers: CORS });
    }
    sessionId  = stripe.sessionId;
    sessionUrl = stripe.url;
    console.log(`[payment-letter] New session created: ${sessionId}`);
  }

  // ── Update builder DB with session ───────────────────────────────────────
  await dbUpdate(BUILDER_APP, "Application", appId, serviceToken, {
    payment_reference: sessionId,
    payment_status: app.payment_status === "paid" ? "paid" : "pending",
    payment_email_sent: true,
  });

  // ── Update agent DB ───────────────────────────────────────────────────────
  const agentApps = await dbList(AGENT_APP, "Application", serviceToken);
  const agentApp  = agentApps.find(a => a.reference_code === appRef);
  if (agentApp) {
    await dbUpdate(AGENT_APP, "Application", agentApp.id, serviceToken, {
      stripe_session_id: sessionId,
      payment_status: agentApp.payment_status === "paid" ? "paid" : "pending",
      payment_email_sent: true,
    });
  }

  // ── Build invoice ─────────────────────────────────────────────────────────
  const now         = new Date();
  const invoiceDate = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const due         = new Date(now.getTime() + 7 * 86400000);
  const dueDate     = due.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const invoiceNum  = `INV-${appRef.replace("PEA-", "")}-${now.getFullYear()}`;
  const statusUrl   = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(appRef)}`;

  // ── Skip email if already sent (unless force) ─────────────────────────────
  if (app.payment_email_sent && !forceNewSession) {
    console.log(`[payment-letter] Email already sent for ${appRef}, skipping re-send`);
    return new Response(JSON.stringify({
      success: true,
      reference_code: appRef,
      stripe_url: sessionUrl,
      session_id: sessionId,
      email_sent: false,
      note: "Payment link refreshed. Email already previously sent — pass force_new_session:true to re-send.",
    }), { headers: CORS });
  }

  const html = invoiceEmail({
    name: appName, ref: appRef, venture: appVenture, sector: appSector, stage: appStage,
    paymentUrl: sessionUrl, statusUrl, invoiceDate, dueDate, invoiceNumber: invoiceNum,
  });

  const emailSent = await sendEmail(
    resendKey, appEmail,
    `💳 Payment Invitation & Invoice — ${appRef} | Prime Endorsement Authority`,
    html,
  );

  // ── Admin notification ────────────────────────────────────────────────────
  await sendEmail(resendKey, ADMIN_EMAIL,
    `📨 Payment Letter Sent — ${appRef} | ${appName}`,
    `<div style="font-family:Arial;padding:20px;background:#0d1220;color:#e2e8f0;border-radius:8px">
      <h3 style="color:#C9A84C">Payment Letter Dispatched</h3>
      <p><strong>Ref:</strong> ${appRef}</p>
      <p><strong>Applicant:</strong> ${appName}</p>
      <p><strong>Venture:</strong> ${appVenture}</p>
      <p><strong>Email:</strong> ${appEmail}</p>
      <p><strong>Amount:</strong> £1,200.00 (£1,000.00 + £200.00 VAT)</p>
      <p><strong>Session:</strong> <code>${sessionId}</code></p>
      <p><strong>Expires:</strong> 7 days from now</p>
      <p><a href="${sessionUrl}" style="color:#C9A84C">View Payment Link →</a></p>
    </div>`
  );

  return new Response(JSON.stringify({
    success: true,
    reference_code: appRef,
    stripe_url: sessionUrl,
    session_id: sessionId,
    email_sent: emailSent,
    invoice_number: invoiceNum,
    expires_in: "7 days",
  }), { headers: CORS });
}
