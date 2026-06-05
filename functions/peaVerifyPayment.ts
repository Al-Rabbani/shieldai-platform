/**
 * peaVerifyPayment — v6 PATCHED 2026-06-05
 *
 * FIXES:
 *  - Removed hard fail on missing BASE44_SERVICE_TOKEN — now fails gracefully
 *  - Added STRIPE_LIVE_SECRET_KEY as fallback for STRIPE_SECRET_KEY
 *  - OneLink payment support: if no session_id, lookup via Stripe charges by email/ref
 *  - day_90_start now correctly set on payment confirmation
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const AGENT_APP   = "6a14246111a4fa5e22999619";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

async function dbList(appId: string, entity: string, token: string): Promise<any[]> {
  if (!token) return [];
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d) ? d : d.data || [];
}

async function dbGet(appId: string, entity: string, id: string, token: string): Promise<any> {
  if (!token) return null;
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  return r.ok ? r.json() : null;
}

async function dbUpdate(appId: string, entity: string, id: string, token: string, data: object): Promise<any> {
  if (!token) return null;
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.ok ? r.json() : null;
}

async function dbCreate(appId: string, entity: string, token: string, data: object): Promise<any> {
  if (!token) return null;
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.ok ? r.json() : null;
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  if (!apiKey) return;
  await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], bcc: [ADMIN_EMAIL], subject, html }),
  });
}

function confirmEmail(firstName: string, ref: string): string {
  const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
  const receiptUrl = `${DOMAIN}/api/functions/peaInvoiceReceipt?ref=${encodeURIComponent(ref)}`;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1a0d;border-bottom:3px solid #22c55e;padding:28px;text-align:center">
    <div style="font-size:40px">&#x2705;</div>
    <div style="color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:4px;margin-top:8px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#22c55e;font-size:12px;margin-top:6px">Payment Confirmed — 90-Day Review Commenced</div>
  </div>
  <div style="padding:28px">
    <p style="color:#C9A84C;font-size:15px;font-weight:600;margin-bottom:8px">Dear ${firstName},</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.7">Your endorsement fee of <strong style="color:#e2e8f0">&#x00A3;1,200.00</strong> has been received. Your 90-day expert review has officially commenced.</p>
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:14px;text-align:center;margin:18px 0">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase">Reference Code</div>
      <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px;margin-top:4px">${ref}</div>
    </div>
    <div style="text-align:center;margin:20px 0">
      <a href="${receiptUrl}" style="background:#22c55e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-right:8px;display:inline-block">View Receipt</a>
      <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase;display:inline-block">Track Application</a>
    </div>
  </div>
  <div style="background:#0d1220;padding:14px;text-align:center;border-top:1px solid #1e293b">
    <p style="color:#475569;font-size:11px">&#x00A9; ${year} Prime Endorsement Authority &middot; primeendorsement.com</p>
  </div>
</div></body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const url  = new URL(req.url);
    const body = await req.json().catch(() => ({})) as Record<string, any>;

    const ref        = (body.ref || body.reference_code || url.searchParams.get("ref") || "").trim().toUpperCase();
    const session_id = (body.session_id || body.sessionId || url.searchParams.get("session_id") || "").trim();

    if (!ref && !session_id) {
      return new Response(JSON.stringify({ success: false, error: "ref or session_id required" }), { status: 400, headers: CORS });
    }

    const stripeKey    = Deno.env.get("STRIPE_SECRET_KEY") || Deno.env.get("STRIPE_LIVE_SECRET_KEY") || "";
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const resendKey    = Deno.env.get("RESEND_API_KEY") || "";

    if (!stripeKey) {
      return new Response(JSON.stringify({ success: false, error: "Stripe not configured" }), { status: 500, headers: CORS });
    }

    // ── Find application record ────────────────────────────────────────────────
    let app: Record<string, any> | null = null;

    if (serviceToken) {
      const all = await dbList(BUILDER_APP, "Application", serviceToken);
      if (ref) app = all.find((r: any) => r.reference_code === ref) || null;
      if (!app && session_id) app = all.find((r: any) => r.stripe_session_id === session_id) || null;
    }

    if (!app) {
      // Can't access DB — return based on Stripe charge lookup
      if (ref) {
        // Look up by charge description (contains ref)
        const chargeRes = await fetch(`https://api.stripe.com/v1/charges?limit=50`, {
          headers: { "Authorization": `Bearer ${stripeKey}` },
        });
        if (chargeRes.ok) {
          const chargeData = await chargeRes.json();
          const charges = chargeData.data || [];
          const match = charges.find((c: any) =>
            (c.description || "").includes(ref) && c.status === "succeeded"
          );
          if (match) {
            return new Response(JSON.stringify({
              success: true,
              verified: true,
              payment_status: "paid",
              reference_code: ref,
              note: "Payment confirmed via Stripe — DB sync pending (service token not configured in Builder secrets)",
            }), { headers: CORS });
          }
        }
      }
      return new Response(JSON.stringify({
        success: false,
        error: "Cannot access application database — BASE44_SERVICE_TOKEN missing from Builder secrets panel",
      }), { status: 503, headers: CORS });
    }

    // ── Already paid — idempotent ─────────────────────────────────────────────
    if (app.payment_status === "paid") {
      return new Response(JSON.stringify({
        success: true,
        verified: true,
        already_paid: true,
        payment_status: "paid",
        reference_code: app.reference_code,
        status: app.status,
      }), { headers: CORS });
    }

    // ── Check Stripe for payment via session or charge lookup ─────────────────
    let paid = false;
    let paymentIntent = "";
    let customerEmail = app.applicant_email || "";
    let stripeSessionId = session_id || app.stripe_session_id || "";
    let receiptUrl = "";

    if (stripeSessionId) {
      const sessRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${stripeSessionId}`, {
        headers: { "Authorization": `Bearer ${stripeKey}` },
      });
      if (sessRes.ok) {
        const sess = await sessRes.json();
        if (sess.payment_status === "paid") {
          paid = true;
          paymentIntent = sess.payment_intent || "";
          customerEmail = sess.customer_details?.email || sess.customer_email || customerEmail;
        }
      }
    }

    // Fallback: look up via Stripe charges by ref in description
    if (!paid) {
      const chargeRes = await fetch(`https://api.stripe.com/v1/charges?limit=50`, {
        headers: { "Authorization": `Bearer ${stripeKey}` },
      });
      if (chargeRes.ok) {
        const cd = await chargeRes.json();
        const match = (cd.data || []).find((c: any) =>
          (c.description || "").includes(app!.reference_code) && c.status === "succeeded"
        );
        if (match) {
          paid = true;
          paymentIntent = match.payment_intent || match.id || "";
          customerEmail = match.billing_details?.email || customerEmail;
          receiptUrl = match.receipt_url || "";
        }
      }
    }

    if (!paid) {
      return new Response(JSON.stringify({
        success: true,
        verified: false,
        payment_status: "pending",
        reference_code: app.reference_code,
        message: "Payment not yet received.",
      }), { headers: CORS });
    }

    // ── Payment confirmed — update DB ─────────────────────────────────────────
    const now = new Date().toISOString();
    const day90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    await dbUpdate(BUILDER_APP, "Application", app.id, serviceToken, {
      payment_status: "paid",
      status: "under_review",
      stripe_payment_intent: paymentIntent,
      payment_date: now,
      day_90_start: day90,
      payment_email_sent: true,
    });

    // Update agent DB too
    if (serviceToken) {
      const agentApps = await dbList(AGENT_APP, "Application", serviceToken);
      const agentApp = agentApps.find((a: any) => a.reference_code === app!.reference_code);
      if (agentApp) {
        await dbUpdate(AGENT_APP, "Application", agentApp.id, serviceToken, {
          payment_status: "paid",
          status: "under_review",
          stripe_payment_intent: paymentIntent,
          payment_date: now,
          day_90_start: day90,
        });
      }
      // Create PaymentTransaction
      await dbCreate(AGENT_APP, "PaymentTransaction", serviceToken, {
        application_id: app.id,
        reference_code: app.reference_code,
        stripe_payment_intent: paymentIntent,
        amount: 1000,
        vat: 200,
        total: 1200,
        currency: "GBP",
        status: "paid",
        applicant_email: customerEmail,
        applicant_name: app.applicant_name || "",
        paid_at: now,
        receipt_url: receiptUrl,
      });
    }

    // Send confirmation email
    const firstName = (app.applicant_name || "Applicant").split(" ")[0];
    await sendEmail(resendKey, customerEmail,
      `Payment Confirmed — Your 90-Day Review Has Commenced | Ref: ${app.reference_code}`,
      confirmEmail(firstName, app.reference_code)
    );

    return new Response(JSON.stringify({
      success: true,
      verified: true,
      payment_status: "paid",
      reference_code: app.reference_code,
      status: "under_review",
      message: "Payment confirmed and application updated.",
    }), { headers: CORS });

  } catch (e: any) {
    console.error("[peaVerifyPayment] Error:", e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: CORS });
  }
}
