/**
 * peaSendPaymentLetter — v7 FINAL 2026-06-01
 *
 * OPTIMIZATIONS:
 *  - Module-level env vars (read once, reused on every warm invocation)
 *  - Filtered query instead of full-table scan (O(1) vs O(n))
 *  - AbortController 10s timeout on all external calls
 *  - Parallel applicant + admin emails (Promise.allSettled)
 *  - Stripe session reuse (idempotency)
 *  - Zero console.log — errors only
 */

const BUILDER_APP  = "69e2e852c48630e3502f13b1";
const AGENT_APP    = "6a14246111a4fa5e22999619";
const DOMAIN       = "https://primeendorsement.com";
const RESEND_API   = "https://api.resend.com/emails";
const FROM_EMAIL   = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL  = "admin@primeendorsement.com";
const AMOUNT_LABEL = "£1,200.00";
const FEE_NET_P    = 100000;
const FEE_VAT_P    =  20000;
const FEE_NET      = "£1,000.00";
const FEE_VAT      = "£200.00";

// ── Module-level env (read once per cold start, reused on warm invocations) ───
const _tok    = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
const _resend = Deno.env.get("RESEND_API_KEY")       || "";
const _stripe = Deno.env.get("STRIPE_SECRET_KEY")    || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

// ── Fetch with timeout ────────────────────────────────────────────────────────
async function fetchT(url: string, opts: RequestInit = {}, ms = 10000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(t);
    return r;
  } catch (e) { clearTimeout(t); throw e; }
}

// ── DB helpers (filtered — no full-table scans) ───────────────────────────────
async function dbFindByRef(appId: string, entity: string, ref: string): Promise<any | null> {
  try {
    const r = await fetchT(
      `https://app.base44.com/api/apps/${appId}/entities/${entity}?reference_code=${encodeURIComponent(ref)}`,
      { headers: { Authorization: `Bearer ${_tok}` } }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return (Array.isArray(d) ? d : d.data || [])[0] || null;
  } catch { return null; }
}

async function dbUpdate(appId: string, entity: string, id: string, data: object): Promise<void> {
  await fetchT(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${_tok}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {});
}

// ── Email ─────────────────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const r = await fetchT(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${_resend}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], bcc: ["admin@primeendorsement.com"], subject, html }),
    });
    return r.ok;
  } catch { return false; }
}

// ── Stripe Session ────────────────────────────────────────────────────────────
async function createStripeSession(params: {
  email: string; name: string; venture: string; ref: string; appId: string;
}): Promise<{ sessionId: string; url: string } | null> {
  const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(params.ref)}`;
  const expiry7d  = String(Math.floor(Date.now() / 1000) + 604800);
  const expiry24h = String(Math.floor(Date.now() / 1000) + 86400);

  const buildBody = (expiresAt: string) => new URLSearchParams({
    "mode": "payment",
    "payment_method_types[]": "card",
    "customer_email": params.email,
    "client_reference_id": params.ref,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "gbp",
    "line_items[0][price_data][unit_amount]": String(FEE_NET_P),
    "line_items[0][price_data][product_data][name]": "Prime Endorsement Authority — Endorsement Assessment Fee",
    "line_items[0][price_data][product_data][description]": `UK Innovator Founder Visa Endorsement · Ref: ${params.ref} · ${params.venture}`,
    "line_items[1][quantity]": "1",
    "line_items[1][price_data][currency]": "gbp",
    "line_items[1][price_data][unit_amount]": String(FEE_VAT_P),
    "line_items[1][price_data][product_data][name]": "VAT (20%)",
    "line_items[1][price_data][product_data][description]": "Value Added Tax on Endorsement Assessment Service",
    "metadata[reference_code]": params.ref,
    "metadata[application_id]": params.appId,
    "metadata[applicant_email]": params.email,
    "metadata[venture]": params.venture,
    "metadata[applicant_name]": params.name,
    "payment_intent_data[description]": `PEA Endorsement Fee — ${params.ref} — ${params.venture}`,
    "payment_intent_data[metadata][reference_code]": params.ref,
    "payment_intent_data[metadata][applicant_email]": params.email,
    "success_url": `${DOMAIN}/api/functions/peaPaymentSuccess?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(params.ref)}`,
    "cancel_url": statusUrl,
    "expires_at": expiresAt,
  });

  try {
    const stripeHdrs = {
      "Authorization": `Bearer ${_stripe}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };
    let r = await fetchT("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST", headers: stripeHdrs, body: buildBody(expiry7d),
    }, 12000);

    if (!r.ok) {
      const errTxt = await r.text();
      if (errTxt.includes("expires_at")) {
        r = await fetchT("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST", headers: stripeHdrs, body: buildBody(expiry24h),
        }, 12000);
        if (!r.ok) return null;
      } else return null;
    }
    const s = await r.json();
    return { sessionId: s.id, url: s.url };
  } catch (e: any) { console.error("[payment-letter] Stripe:", e.message); return null; }
}

// ── Invoice Email ─────────────────────────────────────────────────────────────
function invoiceEmail(p: {
  name: string; ref: string; venture: string; sector: string; stage: string;
  paymentUrl: string; statusUrl: string; invoiceDate: string; dueDate: string; invoiceNumber: string;
}): string {
  const firstName = p.name.split(" ")[0];
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:0 auto;background:#111827;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0d1220 0%,#111827 100%);border-bottom:3px solid #C9A84C;padding:28px 32px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
        <div style="color:#e2e8f0;font-size:18px;font-weight:700;margin-top:6px">Payment Invitation & Invoice</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px">Official Application Activation Notice</div>
      </div>
      <div style="text-align:right">
        <div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin-bottom:3px">Invoice No.</div>
        <div style="color:#C9A84C;font-size:14px;font-weight:700">${p.invoiceNumber}</div>
        <div style="color:#64748b;font-size:11px;margin-top:4px">Issued: ${p.invoiceDate}</div>
        <div style="color:#f59e0b;font-size:11px">Due: ${p.dueDate}</div>
      </div>
    </div>
  </div>
  <div style="padding:24px 32px 0">
    <p style="color:#e2e8f0;font-size:14px;font-weight:600;margin:0 0 6px">Dear ${firstName},</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 16px">Following the successful completion of your registration with Prime Endorsement Authority, we are pleased to issue this formal <strong style="color:#e2e8f0">Payment Invitation &amp; Application Activation Invoice</strong> for the Innovator Founder Visa Endorsement Programme.</p>
  </div>
  <div style="padding:0 32px 16px">
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1e293b">Application Details</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="color:#64748b;padding:4px 0;width:140px">Reference:</td><td style="color:#C9A84C;font-weight:700;letter-spacing:2px">${p.ref}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0">Applicant:</td><td style="color:#e2e8f0">${p.name}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0">Venture:</td><td style="color:#e2e8f0">${p.venture}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0">Sector:</td><td style="color:#e2e8f0">${p.sector}${p.stage ? " · " + p.stage : ""}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0">Programme:</td><td style="color:#e2e8f0">UK Innovator Founder Visa Endorsement</td></tr>
      </table>
    </div>
    <div style="border:1px solid #1e293b;border-radius:8px;overflow:hidden;margin-bottom:16px">
      <div style="background:#0A0E1A;padding:12px 16px"><div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Invoice Breakdown</div></div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="border-bottom:1px solid #1e293b"><td style="color:#e2e8f0;padding:12px 16px"><div style="font-weight:600">Prime Endorsement Authority — Endorsement Assessment Fee</div><div style="color:#64748b;font-size:11px;margin-top:2px">UK Innovator Founder Visa Endorsement · Ref: ${p.ref}</div></td><td style="color:#e2e8f0;padding:12px 16px;text-align:right;font-weight:600">${FEE_NET}</td></tr>
        <tr style="border-bottom:1px solid #1e293b;background:#0d1220"><td style="color:#94a3b8;padding:10px 16px;font-size:12px"><div style="font-weight:600">VAT (20%)</div></td><td style="color:#94a3b8;padding:10px 16px;text-align:right;font-size:12px">${FEE_VAT}</td></tr>
        <tr style="background:#0A0E1A"><td style="color:#C9A84C;padding:14px 16px;font-weight:700;font-size:15px">TOTAL DUE</td><td style="color:#C9A84C;padding:14px 16px;text-align:right;font-weight:700;font-size:18px">${AMOUNT_LABEL}</td></tr>
      </table>
    </div>
    <div style="background:#0d1a00;border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:20px;text-align:center;margin-bottom:16px">
      <div style="color:#86efac;font-size:13px;font-weight:700;margin-bottom:6px">🔒 Secure Payment Portal — Stripe</div>
      <div style="color:#64748b;font-size:11px;margin-bottom:16px">Click below to complete your payment securely. Payment activates your application for formal expert review.</div>
      <a href="${p.paymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#a07830);color:#0A0E1A;text-decoration:none;padding:16px 48px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Pay Now — ${AMOUNT_LABEL} →</a>
      <div style="color:#475569;font-size:10px;margin-top:8px">Payment link valid for 7 days · Ref: ${p.ref}</div>
    </div>
    <div style="text-align:center;margin-bottom:16px">
      <a href="${p.statusUrl}" style="color:#C9A84C;font-size:12px;text-decoration:none">Track Application Status →</a>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:16px 32px;text-align:center">
    <p style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:2px;margin:0 0 4px">PRIME ENDORSEMENT AUTHORITY</p>
    <p style="color:#475569;font-size:11px;margin:0">© ${year} · <a href="https://primeendorsement.com" style="color:#C9A84C;text-decoration:none">primeendorsement.com</a> · admin@primeendorsement.com</p>
  </div>
</div></body></html>`;
}

function adminPaymentEmail(name: string, ref: string, venture: string, sessionId: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:580px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:20px 28px;text-align:center">
    <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#f59e0b;font-size:13px;margin-top:6px">💳 Payment Invoice Dispatched</div>
  </div>
  <div style="padding:24px 28px;font-size:13px">
    <div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:6px;padding:16px;margin-bottom:16px">
      <table style="width:100%;font-size:13px"><tr><td style="color:#64748b;padding:4px 0;width:130px">Applicant:</td><td style="color:#e2e8f0;font-weight:600">${name}</td></tr>
      <tr><td style="color:#64748b;padding:4px 0">Reference:</td><td style="color:#C9A84C;font-weight:700;letter-spacing:2px">${ref}</td></tr>
      <tr><td style="color:#64748b;padding:4px 0">Venture:</td><td style="color:#e2e8f0">${venture}</td></tr>
      <tr><td style="color:#64748b;padding:4px 0">Amount Due:</td><td style="color:#f59e0b;font-weight:700">${AMOUNT_LABEL}</td></tr>
      <tr><td style="color:#64748b;padding:4px 0">Session:</td><td style="color:#475569;font-size:11px">${sessionId.slice(0,40)}…</td></tr></table>
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

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({})) as Record<string, any>;
    const ref  = (body.reference_code || body.ref || "").trim().toUpperCase();

    if (!ref) return new Response(JSON.stringify({ success: false, error: "reference_code required" }), { status: 400, headers: CORS });
    if (!_tok || !_resend || !_stripe) return new Response(JSON.stringify({ success: false, error: "Server configuration error" }), { status: 500, headers: CORS });

    // ── Targeted single-record fetch (no full table scan) ────────────────────
    const appRec = await dbFindByRef(BUILDER_APP, "Application", ref);
    if (!appRec) return new Response(JSON.stringify({ success: false, error: `Application ${ref} not found` }), { status: 404, headers: CORS });

    // ── Idempotency: reuse existing valid Stripe session ─────────────────────
    const existingSessionId = appRec.stripe_session_id || "";
    let checkoutUrl = "";
    let sessionId   = existingSessionId;

    if (existingSessionId && appRec.payment_status !== "paid") {
      try {
        const check = await fetchT(`https://api.stripe.com/v1/checkout/sessions/${existingSessionId}`, {
          headers: { Authorization: `Bearer ${_stripe}` },
        }, 8000);
        if (check.ok) {
          const s = await check.json();
          if (s.status === "open") { checkoutUrl = s.url; }
        }
      } catch { /* session check failed, create new */ }
    }

    if (!checkoutUrl) {
      const sess = await createStripeSession({
        email: appRec.applicant_email,
        name:  appRec.applicant_name,
        venture: appRec.venture_name || appRec.venture?.company_name || appRec.applicant_name,
        ref,
        appId: appRec.id,
      });
      if (!sess) return new Response(JSON.stringify({ success: false, error: "Failed to create Stripe checkout session" }), { status: 500, headers: CORS });
      checkoutUrl = sess.url;
      sessionId   = sess.sessionId;
    }

    // ── DB: save session to both builder + agent in parallel ─────────────────
    const agentRecP = dbFindByRef(AGENT_APP, "Application", ref);
    const builderUpP = dbUpdate(BUILDER_APP, "Application", appRec.id, {
      stripe_session_id: sessionId,
      payment_status:    appRec.payment_status === "paid" ? "paid" : "pending",
      payment_email_sent: true,
    });
    const [agentResult] = await Promise.allSettled([agentRecP, builderUpP]);
    const agentRec = agentResult.status === "fulfilled" ? agentResult.value : null;
    if (agentRec) {
      dbUpdate(AGENT_APP, "Application", agentRec.id, {
        stripe_session_id: sessionId,
        payment_email_sent: true,
      }).catch(() => {});
    }

    // ── Guard: don't re-send if already sent ─────────────────────────────────
    if (appRec.payment_email_sent === true && !body.force) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "payment_email_already_sent", checkout_url: checkoutUrl, session_id: sessionId }), { headers: CORS });
    }

    // ── Build email params ────────────────────────────────────────────────────
    const now         = new Date();
    const dueDate     = new Date(now.getTime() + 7 * 86400000);
    const fmt         = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const invoiceNum  = `INV-${ref}-${now.getFullYear()}`;
    const venture     = appRec.venture_name || appRec.venture?.company_name || "N/A";
    const sector      = appRec.venture_sector || appRec.venture?.sector || "N/A";
    const stage       = appRec.venture_stage  || appRec.venture?.stage  || "";
    const statusUrl   = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;

    const invHtml  = invoiceEmail({ name: appRec.applicant_name, ref, venture, sector, stage, paymentUrl: checkoutUrl, statusUrl, invoiceDate: fmt(now), dueDate: fmt(dueDate), invoiceNumber: invoiceNum });
    const adminHtml = adminPaymentEmail(appRec.applicant_name, ref, venture, sessionId);

    // ── Send both emails in parallel ─────────────────────────────────────────
    const [invSent, adminSent] = await Promise.allSettled([
      sendEmail(appRec.applicant_email, `💳 Payment Invitation — ${ref} | Prime Endorsement Authority`, invHtml),
      sendEmail(ADMIN_EMAIL, `💳 Invoice Dispatched — ${ref} | ${appRec.applicant_name} | ${AMOUNT_LABEL}`, adminHtml),
    ]);

    return new Response(JSON.stringify({
      success:        true,
      reference_code: ref,
      session_id:     sessionId,
      checkout_url:   checkoutUrl,
      invoice_email:  invSent.status === "fulfilled" && invSent.value,
      admin_email:    adminSent.status === "fulfilled" && adminSent.value,
    }), { headers: CORS });

  } catch (err: any) {
    console.error("[payment-letter] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
