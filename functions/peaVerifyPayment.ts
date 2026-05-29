/**
 * peaVerifyPayment — FIXED v2
 *
 * BUG-01 FIX: Called by /payment-success page after Stripe redirect
 * BUG-04 FIX: Uses createClient({ appId: BUILDER_APP }) NOT createClientFromRequest
 * BUG-02 FIX: Writes to correct builder schema fields:
 *   - payment_reference (NOT stripe_session_id)
 *   - payment_status: "paid"
 *   - status: "under_review"
 *   - day_90_start
 * BUG-05 FIX: Handles both "pending" and "unpaid" payment_status values
 */
import { createClient } from "npm:@base44/sdk@0.8.25";

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const AGENT_APP   = "6a14246111a4fa5e22999619";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type":                 "application/json",
};

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) console.error("[peaVerifyPayment] Resend error:", res.status, await res.text());
}

function buildPaymentConfirmEmail(app: Record<string, any>, sessionId: string, year: number): string {
  const refCode   = app.reference_code || "N/A";
  const firstName = (app.applicant_name || "Applicant").split(" ")[0];
  const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(refCode)}`;
  const paidAt    = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#111827;border-bottom:3px solid #22c55e;padding:32px 40px;text-align:center;">
    <div style="color:#22c55e;font-size:48px;margin-bottom:10px;">✅</div>
    <div style="color:#C9A84C;font-size:20px;font-weight:700;letter-spacing:4px;text-transform:uppercase;">PRIME ENDORSEMENT AUTHORITY</div>
    <div style="color:#22c55e;font-size:14px;letter-spacing:2px;margin-top:8px;">Payment Confirmed — Your 90-Day Review Has Begun</div>
  </div>
  <div style="padding:32px 40px;background:#111827;">
    <div style="color:#C9A84C;font-size:16px;font-weight:600;margin-bottom:12px;">Payment Received, ${firstName} 🏛️</div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin-bottom:22px;">
      Your endorsement fee of <strong style="color:#e2e8f0;">£1,200.00</strong> has been successfully processed.
      Your 90-day expert review period has officially begun.
    </p>
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:14px 20px;margin-bottom:20px;text-align:center;">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">Application Reference</div>
      <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px;">${refCode}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;background:#0d1220;border:1px solid #1e293b;border-radius:6px;margin-bottom:20px;">
      <tr><td style="padding:10px 14px;color:#94a3b8;font-size:13px;border-bottom:1px solid #1e293b;width:45%;">Service Fee</td><td style="padding:10px 14px;color:#e2e8f0;font-size:13px;border-bottom:1px solid #1e293b;">£1,000.00</td></tr>
      <tr><td style="padding:10px 14px;color:#94a3b8;font-size:13px;border-bottom:1px solid #1e293b;">VAT (20%)</td><td style="padding:10px 14px;color:#e2e8f0;font-size:13px;border-bottom:1px solid #1e293b;">£200.00</td></tr>
      <tr><td style="padding:10px 14px;color:#C9A84C;font-size:14px;font-weight:700;">Total Paid</td><td style="padding:10px 14px;color:#C9A84C;font-size:14px;font-weight:700;">£1,200.00 GBP</td></tr>
      <tr><td style="padding:10px 14px;color:#94a3b8;font-size:12px;border-top:1px solid #1e293b;">Stripe Session</td><td style="padding:10px 14px;color:#475569;font-size:11px;font-family:monospace;border-top:1px solid #1e293b;">${sessionId}</td></tr>
      <tr><td style="padding:10px 14px;color:#94a3b8;font-size:12px;border-top:1px solid #1e293b;">Payment Date</td><td style="padding:10px 14px;color:#e2e8f0;font-size:12px;border-top:1px solid #1e293b;">${paidAt}</td></tr>
    </table>
    <div style="background:#0a1a0a;border:1px solid #166534;border-radius:6px;padding:16px 18px;margin-bottom:20px;">
      <div style="color:#22c55e;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Your 90-Day Review Timeline</div>
      <div style="color:#94a3b8;font-size:13px;line-height:1.8;">
        📅 <strong style="color:#e2e8f0">Day 0:</strong> Payment Confirmed — Review Begins<br/>
        📋 <strong style="color:#e2e8f0">Day 30:</strong> First Expert Panel Update<br/>
        🔍 <strong style="color:#e2e8f0">Day 60:</strong> Full Assessment Complete<br/>
        🏛️ <strong style="color:#e2e8f0">Day 90:</strong> Official Endorsement Decision Issued
      </div>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${statusUrl}" style="display:inline-block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 44px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;">Track Your Application →</a>
    </div>
    <p style="text-align:center;color:#475569;font-size:12px;">Questions? <a href="mailto:${ADMIN_EMAIL}" style="color:#C9A84C;">${ADMIN_EMAIL}</a></p>
    <p style="text-align:center;color:#334155;font-size:11px;margin-top:8px;letter-spacing:1px;">🔒 AES-256 · TLS 1.3 · PCI DSS Level 1</p>
  </div>
  <div style="background:#0d1220;padding:18px 40px;text-align:center;border-top:1px solid #1e293b;">
    <p style="color:#475569;font-size:12px;"><strong style="color:#94a3b8">Prime Endorsement Authority</strong></p>
    <p style="color:#475569;font-size:12px;">© ${year} Prime Endorsement Authority. All rights reserved.</p>
  </div>
</div>
</body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    // Read session_id + ref from query params or POST body
    const url      = new URL(req.url);
    let session_id = url.searchParams.get("session_id") || "";
    let ref_code   = url.searchParams.get("ref") || "";

    if (req.method === "POST") {
      try {
        const body = await req.json();
        session_id = session_id || body.session_id || "";
        ref_code   = ref_code   || body.ref_code   || "";
      } catch (_) {}
    }

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "session_id is required" }),
        { status: 400, headers: CORS }
      );
    }

    // ── Verify session with Stripe ──────────────────────────────────────────
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Stripe not configured" }),
        { status: 500, headers: CORS }
      );
    }

    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session_id}`,
      { headers: { "Authorization": `Bearer ${stripeKey}` } }
    );

    if (!stripeRes.ok) {
      const err = await stripeRes.text();
      return new Response(
        JSON.stringify({ success: false, error: `Stripe error: ${err}` }),
        { status: 400, headers: CORS }
      );
    }

    const session = await stripeRes.json();

    if (session.payment_status !== "paid") {
      // Payment not yet completed — return a clear pending state, not an error
      // This is a valid state: user initiated checkout but hasn't paid yet
      const pending_status = session.payment_status || "unpaid";
      console.log(`[verify] Session ${session_id} payment_status=${pending_status} — awaiting payment`);
      return new Response(
        JSON.stringify({
          success:        true,
          verified:       false,
          payment_status: pending_status,
          status:         "awaiting_payment",
          message:        "Payment not yet completed. Please complete your Stripe payment.",
          checkout_url:   session.url || null,
        }),
        { status: 200, headers: CORS }
      );
    }

    // Extract metadata from Stripe session
    const metadata       = session.metadata || {};
    const reference_code = ref_code || metadata.reference_code || "";
    const application_id = metadata.application_id || "";

    // BUG-04 FIX: Use explicit app IDs — NOT createClientFromRequest
    const serviceToken  = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const builderClient = createClient({ appId: BUILDER_APP, serviceToken });
    const agentClient   = createClient({ appId: AGENT_APP,   serviceToken });
    const now           = new Date().toISOString();
    const apiKey        = Deno.env.get("RESEND_API_KEY");
    const year          = new Date().getFullYear();

    // ── Find Application in builder app ────────────────────────────────────
    let app: Record<string, any> | null = null;

    // Try by application_id first (fastest)
    if (application_id) {
      try {
        app = await builderClient.asServiceRole.entities.Application.get(application_id);
      } catch (_) {}
    }
    // Fallback: search by reference_code
    if (!app && reference_code) {
      try {
        const byRef = await builderClient.asServiceRole.entities.Application.filter({ reference_code });
        if (byRef?.length > 0) app = byRef[0];
      } catch (_) {}
    }
    // Last resort: search by payment_reference (Stripe session ID)
    if (!app) {
      try {
        const bySid = await builderClient.asServiceRole.entities.Application.filter({ payment_reference: session_id });
        if (bySid?.length > 0) app = bySid[0];
      } catch (_) {}
    }

    // ── Update Application in builder DB ───────────────────────────────────
    // BUG-02 FIX: Use correct builder schema field names
    // BUG-03 FIX: Use payment_reference (the actual field in builder schema)
    // BUG-05 FIX: Always set to "paid" regardless of current value
    if (app) {
      try {
        await builderClient.asServiceRole.entities.Application.update(app.id, {
          payment_status:    "paid",           // builder schema field ✅
          status:            "under_review",   // builder schema field ✅
          payment_reference: session_id,       // BUG-03 FIX: correct field name ✅
          day_90_start:      app.day_90_start || now,
          submitted_at:      app.submitted_at || now,
        });
        console.log(`[peaVerifyPayment] Builder app updated: ${app.reference_code} → paid/under_review`);
        // Update local copy for email use
        app.status         = "under_review";
        app.payment_status = "paid";
        app.day_90_start   = app.day_90_start || now;
      } catch (e: any) {
        console.warn("[peaVerifyPayment] Builder update failed:", e.message);
      }

      // Mirror update to Superagent entity space too
      try {
        const agentApps = await agentClient.asServiceRole.entities.Application.filter({
          reference_code: app.reference_code
        });
        if (agentApps?.length > 0) {
          await agentClient.asServiceRole.entities.Application.update(agentApps[0].id, {
            payment_status:    "paid",
            status:            "under_review",
            stripe_session_id: session_id,
            payment_date:      now,
            day_90_start:      app.day_90_start,
          });
        }
      } catch (_) {} // Non-critical mirror — don't fail the whole request
    } else {
      console.warn(`[peaVerifyPayment] No application found for session=${session_id} ref=${reference_code}`);
    }

    // ── Upsert PaymentTransaction (agent app) ──────────────────────────────
    try {
      const existing = await agentClient.asServiceRole.entities.PaymentTransaction.filter({
        stripe_session_id: session_id
      });
      if (!existing?.length) {
        await agentClient.asServiceRole.entities.PaymentTransaction.create({
          application_id:        app?.id || application_id,
          reference_code:        reference_code || app?.reference_code || "",
          stripe_session_id:     session_id,
          stripe_payment_intent: session.payment_intent || "",
          amount:                1000,
          vat:                   200,
          total:                 1200,
          currency:              "GBP",
          status:                "paid",
          applicant_email:       app?.applicant_email || session.customer_details?.email || "",
          applicant_name:        app?.applicant_name  || "",
          paid_at:               now,
        });
        console.log("[peaVerifyPayment] PaymentTransaction created");
      }
    } catch (e: any) {
      console.warn("[peaVerifyPayment] PaymentTransaction upsert failed:", e.message);
    }

    // ── Send confirmation emails ────────────────────────────────────────────
    if (apiKey) {
      const appEmail = app?.applicant_email || session.customer_details?.email || "";
      const refLabel = reference_code || app?.reference_code || "N/A";

      if (appEmail) {
        try {
          await sendEmail(
            apiKey,
            appEmail,
            `✅ Payment Confirmed — ${refLabel} | Prime Endorsement Authority`,
            buildPaymentConfirmEmail(app || { reference_code: refLabel, applicant_name: "Applicant" }, session_id, year)
          );
        } catch (e: any) {
          console.error("[peaVerifyPayment] Applicant email failed:", e.message);
        }
      }

      try {
        await sendEmail(
          apiKey,
          ADMIN_EMAIL,
          `💳 Payment Received — ${refLabel} | £1,200.00`,
          `<div style="font-family:sans-serif;padding:20px">
            <h2 style="color:#C9A84C">Payment Received</h2>
            <p><strong>Amount:</strong> £1,200.00 GBP</p>
            <p><strong>Applicant:</strong> ${app?.applicant_name || "Unknown"}</p>
            <p><strong>Email:</strong> ${appEmail}</p>
            <p><strong>Reference:</strong> ${refLabel}</p>
            <p><strong>Stripe Session:</strong> <code>${session_id}</code></p>
            <p><strong>Status:</strong> Application moved to Under Review ✅</p>
          </div>`
        );
      } catch (e: any) {
        console.warn("[peaVerifyPayment] Admin email failed:", e.message);
      }
    }

    return new Response(
      JSON.stringify({
        success:        true,
        verified:       true,
        reference_code: reference_code || app?.reference_code,
        applicant_name: app?.applicant_name,
        amount:         "£1,200.00",
        status:         "under_review",
        day_90_start:   app?.day_90_start || now,
        status_url:     `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(reference_code || app?.reference_code || "")}`,
      }),
      { headers: CORS }
    );

  } catch (err: any) {
    console.error("[peaVerifyPayment] Fatal:", err.message, err.stack);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: CORS }
    );
  }
}
