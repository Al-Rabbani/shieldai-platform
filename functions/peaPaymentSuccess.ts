/**
 * peaPaymentSuccess — Server-side payment success handler
 *
 * BUG-01/06 WORKAROUND: The /payment-success SPA page never calls peaVerifyPayment.
 * This function IS the success_url for Stripe checkout — it:
 *   1. Reads session_id + ref from query params (Stripe sends these)
 *   2. Calls Stripe to verify payment
 *   3. Updates the Application DB record (payment_status=paid, status=under_review)
 *   4. Sends confirmation emails
 *   5. Returns a beautiful HTML confirmation page (no SPA needed)
 *
 * The peaApplicationWebhook success_url is updated to point here instead of /payment-success
 */
import { createClient } from "npm:@base44/sdk@0.8.25";

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const AGENT_APP   = "6a14246111a4fa5e22999619";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" };

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) console.error("[peaPaymentSuccess] Resend error:", res.status, await res.text());
}

function successPage(ref: string, name: string, statusUrl: string): string {
  const firstName = (name || "Applicant").split(" ")[0];
  const paidAt    = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Confirmed — Prime Endorsement Authority</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0A0E1A;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:#111827;border:1px solid #1e293b;border-radius:12px;max-width:560px;width:100%;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,.5)}
    .header{background:#0d1a0d;border-bottom:3px solid #22c55e;padding:36px 40px;text-align:center}
    .checkmark{font-size:56px;display:block;margin-bottom:12px}
    .brand{color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:6px}
    .subtitle{color:#22c55e;font-size:13px;letter-spacing:1px}
    .body{padding:32px 40px}
    .greeting{color:#C9A84C;font-size:16px;font-weight:600;margin-bottom:8px}
    .intro{color:#94a3b8;font-size:13px;line-height:1.7;margin-bottom:24px}
    .ref-box{background:#0A0E1A;border:1px solid #C9A84C;border-radius:8px;padding:16px 20px;text-align:center;margin-bottom:20px}
    .ref-label{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px}
    .ref-code{color:#C9A84C;font-size:24px;font-weight:700;letter-spacing:3px}
    .info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #1e293b;font-size:13px}
    .info-row:last-child{border:none}
    .info-label{color:#64748b}
    .info-val{color:#e2e8f0;font-weight:500}
    .timeline{background:#0a1a0a;border:1px solid #166534;border-radius:8px;padding:16px 20px;margin:20px 0}
    .tl-title{color:#22c55e;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px}
    .tl-item{color:#94a3b8;font-size:13px;line-height:2}
    .tl-item strong{color:#e2e8f0}
    .btn{display:block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;text-align:center;margin:24px 0 16px}
    .email-note{text-align:center;color:#475569;font-size:12px;margin-bottom:4px}
    .security{text-align:center;color:#334155;font-size:11px;letter-spacing:1px;margin-top:8px}
    .footer{background:#0d1220;border-top:1px solid #1e293b;padding:16px 40px;text-align:center;color:#475569;font-size:11px}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="checkmark">✅</span>
      <div class="brand">Prime Endorsement Authority</div>
      <div class="subtitle">Payment Confirmed — Your 90-Day Review Has Begun</div>
    </div>
    <div class="body">
      <div class="greeting">Payment Received, ${firstName} 🏛️</div>
      <p class="intro">Your endorsement fee of <strong style="color:#e2e8f0">£1,200.00</strong> has been successfully processed. Your 90-day expert review period has officially begun.</p>
      <div class="ref-box">
        <div class="ref-label">Application Reference</div>
        <div class="ref-code">${ref}</div>
      </div>
      <div>
        <div class="info-row"><span class="info-label">Service Fee</span><span class="info-val">£1,000.00</span></div>
        <div class="info-row"><span class="info-label">VAT (20%)</span><span class="info-val">£200.00</span></div>
        <div class="info-row"><span class="info-label" style="color:#C9A84C;font-weight:700">Total Paid</span><span class="info-val" style="color:#C9A84C;font-weight:700">£1,200.00 GBP</span></div>
        <div class="info-row"><span class="info-label">Payment Date</span><span class="info-val">${paidAt}</span></div>
      </div>
      <div class="timeline">
        <div class="tl-title">Your 90-Day Review Timeline</div>
        <div class="tl-item">📅 <strong>Day 0:</strong> Payment Confirmed — Review Begins</div>
        <div class="tl-item">📋 <strong>Day 30:</strong> First Expert Panel Update</div>
        <div class="tl-item">🔍 <strong>Day 60:</strong> Full Assessment Complete</div>
        <div class="tl-item">🏛️ <strong>Day 90:</strong> Official Endorsement Decision Issued</div>
      </div>
      <a href="${statusUrl}" class="btn">Track Your Application →</a>
      <p class="email-note">A confirmation email has been sent to your registered address.</p>
      <p class="email-note">Questions? <a href="mailto:${ADMIN_EMAIL}" style="color:#C9A84C">${ADMIN_EMAIL}</a></p>
      <p class="security">🔒 AES-256 · TLS 1.3 · PCI DSS Level 1</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} Prime Endorsement Authority. All rights reserved.</div>
  </div>
</body>
</html>`;
}

function pendingPage(ref: string, reason: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Verification — Prime Endorsement Authority</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0A0E1A;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:#111827;border:1px solid #92400e;border-radius:12px;max-width:520px;width:100%;overflow:hidden}
    .header{background:#1a0f00;border-bottom:3px solid #f59e0b;padding:32px 40px;text-align:center}
    .icon{font-size:48px;display:block;margin-bottom:10px}
    .brand{color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:6px}
    .subtitle{color:#f59e0b;font-size:13px}
    .body{padding:28px 36px;color:#94a3b8;font-size:13px;line-height:1.7}
    .ref{background:#0A0E1A;border:1px solid #334155;border-radius:6px;padding:12px;text-align:center;margin:16px 0;color:#C9A84C;font-size:18px;font-weight:700;letter-spacing:2px}
    .contact{margin-top:16px;color:#64748b;font-size:12px}
    .footer{background:#0d1220;border-top:1px solid #1e293b;padding:14px 36px;text-align:center;color:#475569;font-size:11px}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="icon">⚠️</span>
      <div class="brand">Prime Endorsement Authority</div>
      <div class="subtitle">Payment Verification Pending</div>
    </div>
    <div class="body">
      <p>If you have completed your payment, please allow a few minutes for verification to complete and check your email for a confirmation.</p>
      ${ref ? `<div class="ref">${ref}</div>` : ""}
      <p style="margin-top:12px">You can track your application status using the link below. If this issue persists, please contact us.</p>
      ${ref ? `<div style="margin-top:20px;text-align:center"><a href="${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">Track Application →</a></div>` : ""}
      <p class="contact">Issues? Email <a href="mailto:${ADMIN_EMAIL}" style="color:#C9A84C">${ADMIN_EMAIL}</a><br/>Reason: ${reason}</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} Prime Endorsement Authority. All rights reserved.</div>
  </div>
</body>
</html>`;
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url        = new URL(req.url);
    const session_id = url.searchParams.get("session_id") || "";
    const ref_param  = url.searchParams.get("ref") || "";

    if (!session_id) {
      return new Response(pendingPage(ref_param, "No session ID provided"), { headers: HTML_HEADERS });
    }

    // ── 1. Verify with Stripe ──────────────────────────────────────────────
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(pendingPage(ref_param, "Payment system temporarily unavailable"), { headers: HTML_HEADERS });
    }

    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, {
      headers: { "Authorization": `Bearer ${stripeKey}` },
    });

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      console.error("[peaPaymentSuccess] Stripe lookup failed:", errText);
      return new Response(pendingPage(ref_param, "Payment could not be verified — please contact support"), { headers: HTML_HEADERS });
    }

    const session = await stripeRes.json();

    if (session.payment_status !== "paid") {
      return new Response(
        pendingPage(ref_param, `Payment status: ${session.payment_status}`),
        { headers: HTML_HEADERS }
      );
    }

    // ── 2. Payment confirmed — update DB ──────────────────────────────────
    const metadata       = session.metadata || {};
    const reference_code = ref_param || metadata.reference_code || "";
    const application_id = metadata.application_id || "";

    const serviceToken  = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const builderClient = createClient({ appId: BUILDER_APP, serviceToken });
    const agentClient   = createClient({ appId: AGENT_APP,   serviceToken });
    const now           = new Date().toISOString();

    // Find the Application record
    let app: Record<string, any> | null = null;
    if (application_id) {
      try { app = await builderClient.asServiceRole.entities.Application.get(application_id); } catch (_) {}
    }
    if (!app && reference_code) {
      try {
        const byRef = await builderClient.asServiceRole.entities.Application.filter({ reference_code });
        if (byRef?.length > 0) app = byRef[0];
      } catch (_) {}
    }
    if (!app) {
      try {
        const bySid = await builderClient.asServiceRole.entities.Application.filter({ payment_reference: session_id });
        if (bySid?.length > 0) app = bySid[0];
      } catch (_) {}
    }

    const finalRef  = reference_code || app?.reference_code || "N/A";
    const finalName = app?.applicant_name || "Applicant";

    // Update builder DB — BUG-02/03/05 FIX: correct field names
    if (app) {
      try {
        await builderClient.asServiceRole.entities.Application.update(app.id, {
          payment_status:    "paid",
          status:            "under_review",
          payment_reference: session_id,
          day_90_start:      app.day_90_start || now,
          submitted_at:      app.submitted_at || now,
        });
        console.log(`[peaPaymentSuccess] Builder updated: ${finalRef} → paid/under_review`);
      } catch (e: any) { console.warn("[peaPaymentSuccess] Builder update failed:", e.message); }

      // Mirror to agent app
      try {
        const agentApps = await agentClient.asServiceRole.entities.Application.filter({ reference_code: finalRef });
        if (agentApps?.length > 0) {
          await agentClient.asServiceRole.entities.Application.update(agentApps[0].id, {
            payment_status:    "paid",
            status:            "under_review",
            stripe_session_id: session_id,
            payment_date:      now,
            day_90_start:      app.day_90_start || now,
          });
        }
      } catch (_) {}
    }

    // Upsert PaymentTransaction
    try {
      const existing = await agentClient.asServiceRole.entities.PaymentTransaction.filter({ stripe_session_id: session_id });
      if (!existing?.length) {
        await agentClient.asServiceRole.entities.PaymentTransaction.create({
          application_id:        app?.id || application_id,
          reference_code:        finalRef,
          stripe_session_id:     session_id,
          stripe_payment_intent: session.payment_intent || "",
          amount: 1000, vat: 200, total: 1200, currency: "GBP", status: "paid",
          applicant_email: app?.applicant_email || session.customer_details?.email || "",
          applicant_name:  finalName,
          paid_at:         now,
        });
      }
    } catch (e: any) { console.warn("[peaPaymentSuccess] PaymentTransaction failed:", e.message); }


    // ── 2b. Trigger AI Receipt Generation ────────────────────────────────────
    try {
      const receiptUrl = `${DOMAIN}/api/functions/peaInvoiceReceipt`;
      fetch(receiptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:           "receipt",
          reference_code: finalRef,
          application_id: app?.id || application_id,
          send_email:     true,
          return_html:    false,
        }),
      }).catch(e => console.warn("[peaPaymentSuccess] Receipt generation failed:", e.message));
      console.log(`[peaPaymentSuccess] Receipt generation triggered for ${finalRef}`);
    } catch (_) {}

    // ── 3. Send emails ─────────────────────────────────────────────────────
    const apiKey   = Deno.env.get("RESEND_API_KEY");
    const appEmail = app?.applicant_email || session.customer_details?.email || "";
    const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(finalRef)}`;

    if (apiKey) {
      if (appEmail) {
        try {
          await sendEmail(apiKey, appEmail,
            `✅ Payment Confirmed — ${finalRef} | Prime Endorsement Authority`,
            `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="background:#0A0E1A;font-family:Arial,sans-serif;margin:0;padding:20px">
<div style="max-width:580px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1a0d;border-bottom:3px solid #22c55e;padding:28px;text-align:center">
    <div style="font-size:40px">✅</div>
    <div style="color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:4px;margin-top:8px">PRIME ENDORSEMENT AUTHORITY</div>
    <div style="color:#22c55e;font-size:12px;margin-top:6px">Payment Confirmed — Your 90-Day Review Has Begun</div>
  </div>
  <div style="padding:28px">
    <p style="color:#C9A84C;font-size:15px;font-weight:600;margin-bottom:8px">Payment Received, ${finalName.split(" ")[0]} 🏛️</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.7">Your endorsement fee of <strong style="color:#e2e8f0">£1,200.00</strong> has been processed. Your 90-day review has begun.</p>
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:14px;text-align:center;margin:18px 0">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase">Reference</div>
      <div style="color:#C9A84C;font-size:20px;font-weight:700;letter-spacing:3px;margin-top:4px">${finalRef}</div>
    </div>
    <div style="text-align:center;margin:20px 0">
      <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 36px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">Track Your Application →</a>
    </div>
    <p style="text-align:center;color:#475569;font-size:11px">Questions? <a href="mailto:${ADMIN_EMAIL}" style="color:#C9A84C">${ADMIN_EMAIL}</a></p>
  </div>
  <div style="background:#0d1220;padding:14px;text-align:center;border-top:1px solid #1e293b">
    <p style="color:#475569;font-size:11px">© ${new Date().getFullYear()} Prime Endorsement Authority</p>
  </div>
</div></body></html>`);
        } catch (e: any) { console.warn("[peaPaymentSuccess] Applicant email failed:", e.message); }
      }

      try {
        await sendEmail(apiKey, ADMIN_EMAIL, `💳 Payment Received — ${finalRef} | £1,200.00`,
          `<div style="font-family:sans-serif;padding:20px;max-width:500px">
          <h2 style="color:#C9A84C">💳 Payment Received</h2>
          <p><strong>Amount:</strong> £1,200.00 GBP</p>
          <p><strong>Applicant:</strong> ${finalName}</p>
          <p><strong>Email:</strong> ${appEmail}</p>
          <p><strong>Reference:</strong> ${finalRef}</p>
          <p><strong>Stripe Session:</strong> <code style="font-size:11px">${session_id}</code></p>
          <p><strong>Status:</strong> ✅ Under Review</p></div>`);
      } catch (e: any) { console.warn("[peaPaymentSuccess] Admin email failed:", e.message); }
    }

    // ── 4. Render success page ────────────────────────────────────────────
    return new Response(successPage(finalRef, finalName, statusUrl), { headers: HTML_HEADERS });

  } catch (err: any) {
    console.error("[peaPaymentSuccess] Fatal:", err.message);
    const url       = new URL(req.url);
    const ref_param = url.searchParams.get("ref") || "";
    return new Response(pendingPage(ref_param, "An unexpected error occurred — please contact support"), { headers: HTML_HEADERS });
  }
}
