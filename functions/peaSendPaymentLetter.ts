/**
 * peaSendPaymentLetter — v4 REBUILT 2026-05-30
 *
 * Sends the Official Payment Invitation & Invoice to an applicant.
 * Called automatically after registration completion OR manually by admin.
 *
 * Flow:
 *   1. Find applicant record by reference_code or email
 *   2. Generate a fresh Stripe checkout session (£1,200.00)
 *   3. Save stripe_session_id to both builder and agent DB
 *   4. Send the formal Payment Invitation & Application Activation Invoice email
 *   5. Mark payment_email_sent = true
 *
 * POST body: { reference_code, applicant_email, auto_triggered }
 */

const BUILDER_APP   = "69e2e852c48630e3502f13b1";
const AGENT_APP     = "6a14246111a4fa5e22999619";
const DOMAIN        = "https://primeendorsement.com";
const RESEND_API    = "https://api.resend.com/emails";
const FROM_EMAIL    = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL   = "admin@primeendorsement.com";
const AMOUNT_GBP    = 120000; // £1,200.00 in pence
const AMOUNT_LABEL  = "£1,200.00";
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

async function createStripeSession(params: {
  email: string; name: string; venture: string; ref: string; appId: string; stripeKey: string;
}): Promise<{ sessionId: string; url: string } | null> {
  try {
    const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(params.ref)}`;
    const body = new URLSearchParams({
      "mode":                         "payment",
      "payment_method_types[]":       "card",
      "customer_email":               params.email,
      "client_reference_id":          params.ref,
      "line_items[0][quantity]":      "1",
      "line_items[0][price_data][currency]":                    "gbp",
      "line_items[0][price_data][unit_amount]":                 String(AMOUNT_GBP),
      "line_items[0][price_data][product_data][name]":          "PEA Innovator Founder Endorsement Programme Fee",
      "line_items[0][price_data][product_data][description]":   `Application Ref: ${params.ref} | ${params.venture} | Programme fee inclusive of £200.00 VAT`,
      "metadata[reference_code]":     params.ref,
      "metadata[application_id]":     params.appId,
      "metadata[applicant_email]":    params.email,
      "metadata[venture]":            params.venture,
      "success_url":                  `${DOMAIN}/api/functions/peaPaymentSuccess?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(params.ref)}`,
      "cancel_url":                   statusUrl,
      "expires_at":                   String(Math.floor(Date.now() / 1000) + 86400),
    });

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${params.stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!r.ok) {
      console.error("[payment-letter] Stripe error:", r.status, await r.text());
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
      Following the successful completion of your registration with Prime Endorsement Authority, we are pleased to issue this formal <strong style="color:#e2e8f0">Payment Invitation & Application Activation Invoice</strong> for the Innovator Founder Visa Endorsement Programme.
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
              <div style="font-weight:600">Innovator Founder Endorsement Programme Fee</div>
              <div style="color:#64748b;font-size:11px;margin-top:2px">UK Innovator Founder Visa Endorsement — Expert review, compliance screening, AI assessment, panel review, and official endorsement letter (if approved)</div>
            </td>
            <td style="color:#e2e8f0;padding:12px 16px;text-align:right;font-weight:600">${FEE_NET}</td>
          </tr>
          <tr style="border-bottom:1px solid #1e293b;background:#0d1220">
            <td style="color:#94a3b8;padding:10px 16px;font-size:12px">VAT (20%)</td>
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
  <div style="padding:0 32px 20px;text-align:center">
    <div style="background:#0d1a00;border:1px solid #365314;border-radius:10px;padding:22px;margin-bottom:16px">
      <div style="color:#86efac;font-size:13px;font-weight:700;margin-bottom:6px">Secure Payment Portal — Stripe</div>
      <div style="color:#94a3b8;font-size:12px;margin-bottom:16px;line-height:1.7">Click the button below to complete your payment securely via Stripe. Upon successful payment, your application will be formally activated for expert review and you will receive a payment confirmation and receipt.</div>
      <a href="${paymentUrl}" style="display:inline-block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:16px 48px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Pay Now — ${AMOUNT_LABEL} →</a>
      <div style="color:#475569;font-size:11px">🔒 Encrypted · Secured by Stripe · Ref: ${ref}</div>
    </div>

    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:8px;padding:14px;text-align:left;margin-bottom:16px">
      <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">What Happens After Payment</div>
      <div style="display:flex;gap:10px;margin-bottom:8px"><span style="color:#22c55e;font-weight:700;flex-shrink:0">✓</span><span style="color:#94a3b8;font-size:12px">Instant payment confirmation email + receipt</span></div>
      <div style="display:flex;gap:10px;margin-bottom:8px"><span style="color:#22c55e;font-weight:700;flex-shrink:0">✓</span><span style="color:#94a3b8;font-size:12px">Application formally activated — 90-day review clock starts</span></div>
      <div style="display:flex;gap:10px;margin-bottom:8px"><span style="color:#22c55e;font-weight:700;flex-shrink:0">✓</span><span style="color:#94a3b8;font-size:12px">Weekly status updates every Monday via email</span></div>
      <div style="display:flex;gap:10px"><span style="color:#22c55e;font-weight:700;flex-shrink:0">✓</span><span style="color:#94a3b8;font-size:12px">Access to your secure applicant tracking portal</span></div>
    </div>

    <a href="${statusUrl}" style="color:#C9A84C;font-size:12px;text-decoration:none">Track Application Status →</a>
  </div>

  <!-- Legal Notice -->
  <div style="padding:0 32px 20px">
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:14px">
      <p style="color:#475569;font-size:11px;line-height:1.8;margin:0">
        <strong style="color:#64748b">Important Notice:</strong> Successful payment activates your application for formal expert review. Payment of the programme fee does not constitute automatic endorsement approval or visa approval. All applications remain subject to structured eligibility assessment, innovation evaluation, compliance verification, due diligence, and programme requirements as determined by Prime Endorsement Authority. This invoice is issued by Prime Endorsement Authority. For queries, contact <a href="mailto:admin@primeendorsement.com" style="color:#C9A84C;text-decoration:none">admin@primeendorsement.com</a>.
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:16px 32px;text-align:center">
    <p style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0">Prime Endorsement Authority</p>
    <p style="color:#475569;font-size:11px;margin:4px 0 0">© ${year} · <a href="https://primeendorsement.com" style="color:#C9A84C;text-decoration:none">primeendorsement.com</a> · Official correspondence only. Do not reply to this email.</p>
    <p style="color:#374151;font-size:10px;margin:4px 0 0">Invoice No: ${invoiceNumber} · Ref: ${ref}</p>
  </div>
</div>
</body></html>`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const resendKey    = Deno.env.get("RESEND_API_KEY")       || "";
    const stripeKey    = Deno.env.get("STRIPE_SECRET_KEY")    || "";

    if (!resendKey || !stripeKey || !serviceToken) {
      return new Response(JSON.stringify({ success: false, error: "Server configuration error — missing keys" }), { status: 500, headers: CORS });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const { reference_code, applicant_email, auto_triggered } = body;

    if (!reference_code && !applicant_email) {
      return new Response(JSON.stringify({ success: false, error: "reference_code or applicant_email required" }), { status: 400, headers: CORS });
    }

    // ── Find application ──────────────────────────────────────────────────────
    const allApps = await dbList(BUILDER_APP, "Application", serviceToken);
    let app = reference_code
      ? allApps.find((a: any) => a.reference_code === reference_code)
      : allApps.find((a: any) => a.applicant_email?.toLowerCase() === applicant_email?.toLowerCase());

    if (!app) {
      return new Response(JSON.stringify({ success: false, error: "Application not found" }), { status: 404, headers: CORS });
    }

    // ── Guard: skip if already paid ───────────────────────────────────────────
    if (app.payment_status === "paid") {
      console.log(`[payment-letter] ${app.reference_code} already paid — skipping`);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "Already paid" }), { headers: CORS });
    }

    const ref      = app.reference_code;
    const email    = app.applicant_email;
    const name     = app.applicant_name || "Applicant";
    const venture  = app.venture?.company_name || app.venture_name || "Your Venture";
    const sector   = app.venture?.sector || app.venture_sector || "";
    const stage    = app.venture?.stage || app.venture_stage || "";
    const appId    = app.id;

    // ── Generate Stripe session ───────────────────────────────────────────────
    const stripe = await createStripeSession({ email, name, venture, ref, appId, stripeKey });
    if (!stripe) {
      return new Response(JSON.stringify({ success: false, error: "Failed to create payment session" }), { status: 500, headers: CORS });
    }

    // ── Save stripe session to both DBs ──────────────────────────────────────
    await dbUpdate(BUILDER_APP, "Application", appId, serviceToken, {
      payment_reference: stripe.sessionId,
      payment_status:    "pending",
    });

    // Sync to agent DB
    const agentApps = await dbList(AGENT_APP, "Application", serviceToken);
    const agentRec  = agentApps.find((a: any) => a.reference_code === ref);
    if (agentRec) {
      await dbUpdate(AGENT_APP, "Application", agentRec.id, serviceToken, {
        stripe_session_id:  stripe.sessionId,
        payment_status:     "pending",
        payment_email_sent: true,
      });
    }

    // ── Build invoice details ─────────────────────────────────────────────────
    const now         = new Date();
    const invoiceDate = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const due         = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueDate     = due.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const invoiceNo   = `PEA-INV-${ref.replace("PEA-", "")}-${now.getFullYear()}`;
    const statusUrl   = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;

    // ── Send invoice email ────────────────────────────────────────────────────
    const emailHtml = invoiceEmail({
      name, ref, venture, sector, stage,
      paymentUrl: stripe.url, statusUrl,
      invoiceDate, dueDate, invoiceNumber: invoiceNo,
    });

    const sent = await sendEmail(
      resendKey, email,
      `💳 Payment Invitation & Invoice — ${ref} | Prime Endorsement Authority`,
      emailHtml
    );

    console.log(`[payment-letter] ✅ Invoice sent to ${email} | ref=${ref} | session=${stripe.sessionId} | sent=${sent}`);

    // Admin notification
    if (!auto_triggered) {
      await sendEmail(resendKey, ADMIN_EMAIL,
        `📨 Payment Letter Sent — ${ref} | ${name}`,
        `<html><body style="background:#0A0E1A;color:#e2e8f0;font-family:Arial;padding:32px">
          <h3 style="color:#C9A84C">Payment Letter Dispatched</h3>
          <p><strong>Ref:</strong> ${ref}</p><p><strong>Applicant:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p><p><strong>Venture:</strong> ${venture}</p>
          <p><strong>Invoice No:</strong> ${invoiceNo}</p>
          <p><strong>Amount Due:</strong> £1,200.00 GBP</p>
          <p><strong>Stripe Session:</strong> ${stripe.sessionId}</p>
          <p><a href="${stripe.url}" style="color:#C9A84C">View Payment Link →</a></p>
        </body></html>`
      );
    }

    return new Response(JSON.stringify({
      success:        true,
      reference_code: ref,
      email,
      invoice_number: invoiceNo,
      stripe_session: stripe.sessionId,
      payment_url:    stripe.url,
      email_sent:     sent,
      auto_triggered: auto_triggered || false,
    }), { headers: CORS });

  } catch (err: any) {
    console.error("[payment-letter] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
