/**
 * publicRegistrationForm — v2 (re-deployed, Resend API)
 * Handles the public /apply form submission:
 * 1. Generates a PEA-YYYY-###### reference code
 * 2. Creates an Application record
 * 3. Sends a Stripe checkout link to the applicant
 * 4. Notifies admin
 * 5. Returns { success, reference_code, checkout_url }
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const DOMAIN        = "https://primeendorsement.com";
const RESEND_API    = "https://api.resend.com/emails";
const FROM_EMAIL    = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL   = "admin@primeendorsement.com";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type":                 "application/json",
};

function generateRefCode(): string {
  const year   = new Date().getFullYear();
  const digits = String(Math.floor(100000 + Math.random() * 900000));
  return `PEA-${year}-${digits}`;
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("Resend error:", res.status, t);
  }
}

async function createStripeCheckout(
  stripeKey: string,
  application_id: string,
  reference_code: string,
  applicant_email: string,
  applicant_name: string,
): Promise<string> {
  const params = new URLSearchParams({
    "mode":                          "payment",
    "currency":                      "gbp",
    "line_items[0][price_data][currency]":                        "gbp",
    "line_items[0][price_data][product_data][name]":              "Prime Endorsement Authority — Endorsement Service Fee",
    "line_items[0][price_data][product_data][description]":       "£1,000.00 service fee + £200.00 VAT = £1,200.00 total. UK Innovator Founder Visa endorsement assessment.",
    "line_items[0][price_data][unit_amount]":                     "120000",
    "line_items[0][quantity]":                                    "1",
    "customer_email":                applicant_email,
    "metadata[application_id]":      application_id,
    "metadata[reference_code]":      reference_code,
    "metadata[applicant_name]":      applicant_name,
    "success_url":                   `${DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(reference_code)}`,
    "cancel_url":                    `${DOMAIN}/apply?ref=${encodeURIComponent(reference_code)}&cancelled=true`,
    "expires_at":                    String(Math.floor(Date.now() / 1000) + 86400), // 24h
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization":  `Bearer ${stripeKey}`,
      "Content-Type":   "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe checkout error: ${err}`);
  }

  const data = await res.json();
  return data.url;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), { status: 405, headers: CORS });
  }

  try {
    const body = await req.json();

    const applicant_name      = (body.applicant_name      || body.full_name     || "").trim();
    const applicant_email     = (body.applicant_email     || body.email         || "").toLowerCase().trim();
    const applicant_role      = (body.applicant_role      || body.role          || "Founder").trim();
    const venture_name        = (body.venture_name        || "").trim();
    const venture_sector      = (body.venture_sector      || "").trim();
    const venture_stage       = (body.venture_stage       || "").trim();
    const venture_description = (body.venture_description || "").trim();
    const nationality         = (body.nationality         || "").trim();
    const phone_number        = (body.phone_number        || "").trim();
    const country_of_residence= (body.country_of_residence|| "").trim();
    const linkedin_url        = (body.linkedin_url        || "").trim();
    const website_url         = (body.website_url         || "").trim();
    const co_founder_name     = (body.co_founder_name     || "").trim();
    const co_founder_email    = (body.co_founder_email    || "").toLowerCase().trim();

    if (!applicant_email || !applicant_name) {
      return new Response(JSON.stringify({ success: false, error: "Name and email are required" }), { status: 400, headers: CORS });
    }

    const base44         = createClientFromRequest(req);
    const stripeKey      = Deno.env.get("STRIPE_SECRET_KEY");
    const resendKey      = Deno.env.get("RESEND_API_KEY");

    // Duplicate check
    try {
      const existing = await base44.asServiceRole.entities.Application.filter({ applicant_email });
      if (existing?.length > 0) {
        const latest = existing[existing.length - 1];
        return new Response(
          JSON.stringify({
            success: false,
            duplicate: true,
            error: `An application already exists for this email. Reference: ${latest.reference_code}`,
            reference_code: latest.reference_code,
          }),
          { status: 409, headers: CORS }
        );
      }
    } catch (_) {}

    const reference_code = generateRefCode();
    const now            = new Date().toISOString();

    // Create application
    const app = await base44.asServiceRole.entities.Application.create({
      reference_code,
      applicant_name,
      applicant_email,
      applicant_role,
      venture_name,
      venture_sector,
      venture_stage,
      venture_description,
      nationality,
      phone_number,
      country_of_residence,
      linkedin_url,
      website_url,
      co_founder_name,
      co_founder_email,
      status:         "submitted",
      payment_status: "unpaid",
      submitted_at:   now,
    });

    // Stripe checkout
    let checkout_url = `${DOMAIN}/apply?ref=${encodeURIComponent(reference_code)}&step=payment`;
    if (stripeKey) {
      try {
        checkout_url = await createStripeCheckout(stripeKey, app.id, reference_code, applicant_email, applicant_name);
      } catch (e: any) {
        console.error("[publicRegistrationForm] Stripe error:", e.message);
      }
    }

    // Emails
    if (resendKey) {
      const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(reference_code)}`;

      // Applicant confirmation
      try {
        await sendEmail(
          resendKey,
          applicant_email,
          `🏛️ Application Received — ${reference_code} | Prime Endorsement Authority`,
          `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#111827;border-bottom:3px solid #C9A84C;padding:32px 40px;text-align:center;">
    <div style="color:#C9A84C;font-size:20px;font-weight:700;letter-spacing:4px;text-transform:uppercase;">PRIME ENDORSEMENT AUTHORITY</div>
    <div style="color:#e2e8f0;font-size:12px;letter-spacing:2px;opacity:.7;margin-top:6px;">Application Received — Complete Your Payment</div>
  </div>
  <div style="padding:32px 40px;background:#111827;">
    <div style="color:#C9A84C;font-size:16px;font-weight:600;margin-bottom:12px;">Application Received, ${applicant_name.split(" ")[0]} 🏛️</div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;">Your application has been received. To begin your 90-day expert review, please complete the £1,200.00 endorsement fee payment.</p>
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:14px 20px;margin:20px 0;text-align:center;">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">Your Reference Code</div>
      <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px;">${reference_code}</div>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${checkout_url}" style="display:inline-block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 44px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;">Complete Payment — £1,200.00 →</a>
    </div>
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${statusUrl}" style="display:inline-block;background:transparent;border:1px solid #C9A84C;color:#C9A84C;text-decoration:none;padding:12px 36px;border-radius:6px;font-weight:600;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Track Your Application</a>
    </div>
    <p style="text-align:center;color:#475569;font-size:12px;">Questions? <a href="mailto:${ADMIN_EMAIL}" style="color:#C9A84C;">${ADMIN_EMAIL}</a></p>
  </div>
  <div style="background:#0d1220;padding:18px 40px;text-align:center;border-top:1px solid #1e293b;">
    <p style="color:#475569;font-size:12px;">© ${new Date().getFullYear()} Prime Endorsement Authority. All rights reserved.</p>
  </div>
</div></body></html>`
        );
      } catch (e: any) { console.error("[publicRegistrationForm] Applicant email failed:", e.message); }

      // Admin notification
      try {
        await sendEmail(
          resendKey,
          ADMIN_EMAIL,
          `🏛️ New Application: ${applicant_name} — ${reference_code}`,
          `<p style="font-family:Arial,sans-serif;">
            <strong>New Application Submitted</strong><br/>
            Name: ${applicant_name}<br/>Email: ${applicant_email}<br/>
            Role: ${applicant_role}<br/>Venture: ${venture_name}<br/>
            Reference: <strong>${reference_code}</strong><br/>
            <a href="${DOMAIN}/pea-admin">Open Admin Panel</a>
          </p>`
        );
      } catch (e: any) { console.warn("[publicRegistrationForm] Admin email failed:", e.message); }
    }

    return new Response(
      JSON.stringify({ success: true, reference_code, checkout_url, application_id: app.id }),
      { headers: CORS }
    );

  } catch (err: any) {
    console.error("[publicRegistrationForm] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
