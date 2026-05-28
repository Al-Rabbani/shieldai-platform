/**
 * peaApplicationWebhook v4 — Complete Registration Endpoint
 *
 * Called directly by the /apply form via fetch().
 * Handles the FULL registration flow in one call:
 *   1. Validate payload
 *   2. Deduplicate by email
 *   3. Generate reference code (PEA-YYYY-XXXXXX)
 *   4. Write Application record to builder app (69e2e852c48630e3502f13b1)
 *   5. Mirror to Superagent app for automations
 *   6. Send confirmation email to applicant (Resend)
 *   7. Send admin notification email (Resend)
 *   8. Create Stripe checkout session (£1,200 GBP)
 *   9. Return { success, reference_code, stripe_url, stripe_session_id }
 *
 * Also handles legacy payment mirroring (_type: "payment")
 */
import { createClient } from "npm:@base44/sdk@0.8.25";

const BUILDER_APP  = "69e2e852c48630e3502f13b1";
const AGENT_APP    = "6a14246111a4fa5e22999619";
const DOMAIN       = "https://primeendorsement.com";
const RESEND_URL   = "https://api.resend.com/emails";
const FROM         = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL  = "admin@primeendorsement.com";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-PEA-Key",
  "Content-Type": "application/json",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genRef(): string {
  return `PEA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
}

async function email(to: string, subject: string, html: string): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY") || "";
  if (!key) return;
  try {
    const r = await fetch(RESEND_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!r.ok) console.error("Resend:", r.status, await r.text());
  } catch (e) { console.error("Email error:", e); }
}

function applicantEmail(name: string, ref: string, venture: string): string {
  const su = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
  return `<!DOCTYPE html><html><body style="background:#0A0E1A;font-family:Arial,sans-serif;color:#e2e8f0;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:28px">
    <div style="color:#C9A84C;font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:6px">Application Received</div>
    <div style="color:#C9A84C;font-size:20px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="width:40px;height:2px;background:#C9A84C;margin:10px auto 0"></div>
  </div>
  <p style="color:#94a3b8;font-size:14px;margin-bottom:16px">Dear ${name},</p>
  <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin-bottom:20px">
    Your application for <strong style="color:#e2e8f0">${venture}</strong> has been successfully received by Prime Endorsement Authority and your details have been logged in our secure AI assessment system.
  </p>
  <div style="background:#111827;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:20px;text-align:center">
    <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">Your Reference Code</div>
    <div style="color:#C9A84C;font-size:26px;font-weight:800;letter-spacing:4px;font-family:'Courier New',monospace">${ref}</div>
    <div style="color:#475569;font-size:11px;margin-top:6px">Keep this safe — you need it to track your application and complete payment</div>
  </div>
  <div style="background:#111827;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:20px">
    <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">What Happens Next</div>
    <div style="margin-bottom:12px;display:flex;gap:12px"><div style="color:#C9A84C;font-weight:700;width:20px;flex-shrink:0">1.</div><div><div style="color:#e2e8f0;font-size:13px;font-weight:600">Complete Payment</div><div style="color:#64748b;font-size:12px;margin-top:2px">£1,200.00 (£1,000 + £200 VAT) to begin your formal expert review. Use the Stripe link provided or your reference code at the status portal.</div></div></div>
    <div style="margin-bottom:12px;display:flex;gap:12px"><div style="color:#C9A84C;font-weight:700;width:20px;flex-shrink:0">2.</div><div><div style="color:#e2e8f0;font-size:13px;font-weight:600">AI Pre-Screening</div><div style="color:#64748b;font-size:12px;margin-top:2px">Our AI engine evaluates your application across 5 innovation dimensions within 2-5 business days.</div></div></div>
    <div style="margin-bottom:12px;display:flex;gap:12px"><div style="color:#C9A84C;font-weight:700;width:20px;flex-shrink:0">3.</div><div><div style="color:#e2e8f0;font-size:13px;font-weight:600">Expert Panel Review</div><div style="color:#64748b;font-size:12px;margin-top:2px">Independent expert reviewers assess your venture over a 60-day period.</div></div></div>
    <div style="display:flex;gap:12px"><div style="color:#C9A84C;font-weight:700;width:20px;flex-shrink:0">4.</div><div><div style="color:#e2e8f0;font-size:13px;font-weight:600">Decision</div><div style="color:#64748b;font-size:12px;margin-top:2px">Final endorsement decision communicated within 90 days of payment confirmation.</div></div></div>
  </div>
  <div style="text-align:center;margin-bottom:20px">
    <a href="${su}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;display:inline-block">Track My Application →</a>
  </div>
  <p style="color:#475569;font-size:12px;text-align:center;line-height:1.7">
    Questions? Contact us at <a href="mailto:${ADMIN_EMAIL}" style="color:#C9A84C">${ADMIN_EMAIL}</a><br/>
    <span style="color:#1e293b;font-size:10px">🔒 AES-256 · TLS 1.3 · ISO 27001 · FIPS 140-2</span>
  </p>
</div></body></html>`;
}

function adminNotifEmail(b: Record<string, any>, ref: string): string {
  const rows = [
    ["Reference", ref], ["Name", b.applicant_name], ["Email", b.applicant_email],
    ["Role", b.applicant_role], ["Venture", b.venture_name], ["Sector", b.venture_sector],
    ["Stage", b.venture_stage], ["Nationality", b.nationality], ["Country", b.country_of_residence],
    ["Phone", b.phone_number], ["LinkedIn", b.linkedin_url],
  ].filter(([, v]) => v)
   .map(([k, v]) => `<tr><td style="padding:9px 14px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1e293b;width:32%">${k}</td><td style="padding:9px 14px;font-size:13px;color:#e2e8f0;border-bottom:1px solid #1e293b">${v}</td></tr>`)
   .join("");
  const desc = b.venture_description ? `<div style="background:#111827;border:1px solid #1e293b;border-radius:6px;padding:14px;margin-top:14px"><div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Venture Description</div><div style="color:#94a3b8;font-size:12px;line-height:1.7">${b.venture_description}</div></div>` : "";
  return `<!DOCTYPE html><html><body style="background:#0A0E1A;font-family:Arial,sans-serif;color:#e2e8f0;margin:0;padding:0">
<div style="max-width:640px;margin:0 auto;padding:40px 24px">
  <div style="color:#C9A84C;font-size:16px;font-weight:700;margin-bottom:6px">🏛 New Application Received</div>
  <div style="color:#64748b;font-size:12px;margin-bottom:20px">${new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })} UTC</div>
  <table style="width:100%;border-collapse:collapse;background:#111827;border-radius:8px;overflow:hidden">${rows}</table>
  ${desc}
  <div style="margin-top:20px;text-align:center">
    <a href="${DOMAIN}/admin" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;display:inline-block">Open Admin Panel →</a>
  </div>
</div></body></html>`;
}

async function createStripeSession(ref: string, email_addr: string, name: string, app_id: string): Promise<{ url?: string; session_id?: string }> {
  const sk = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!sk) return {};
  try {
    const p = new URLSearchParams({
      "payment_method_types[]": "card",
      "line_items[0][price_data][currency]": "gbp",
      "line_items[0][price_data][product_data][name]": "UK Innovator Founder Visa Endorsement — Prime Endorsement Authority",
      "line_items[0][price_data][product_data][description]": `Application ${ref}`,
      "line_items[0][price_data][unit_amount]": "120000",
      "line_items[0][quantity]": "1",
      mode: "payment",
      customer_email: email_addr,
      "metadata[reference_code]": ref,
      "metadata[applicant_name]": name,
      "metadata[application_id]": app_id,
      success_url: `${DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(ref)}`,
      cancel_url: `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`,
      expires_at: String(Math.floor(Date.now() / 1000) + 82800), // 23h
      "payment_intent_data[description]": `PEA Endorsement — ${ref}`,
      "payment_intent_data[statement_descriptor]": "PRIME ENDORSEMENT",
    });
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: p.toString(),
    });
    const d = await r.json();
    if (!r.ok) { console.error("Stripe error:", d); return {}; }
    return { url: d.url, session_id: d.id };
  } catch (e) { console.error("Stripe exception:", e); return {}; }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  }

  let body: Record<string, any>;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: CORS }); }

  const builderClient = createClient({ appId: BUILDER_APP });
  const agentClient   = createClient({ appId: AGENT_APP });

  // ── LEGACY: Payment mirror ──────────────────────────────────────────────────
  if (body._type === "payment") {
    try {
      const existing = await agentClient.asServiceRole.entities.PaymentTransaction.filter({ stripe_session_id: body.stripe_session_id }).catch(() => []);
      if (existing.length > 0) return new Response(JSON.stringify({ success: true, duplicate: true }), { headers: CORS });
      const pt = await agentClient.asServiceRole.entities.PaymentTransaction.create({
        application_id: body.application_id || "",
        reference_code: body.reference_code || "",
        stripe_session_id: body.stripe_session_id || "",
        stripe_payment_intent: body.stripe_payment_intent || "",
        amount: 1000, vat: 200, total: 1200, currency: "GBP", status: "paid",
        applicant_email: body.applicant_email || "",
        applicant_name: body.applicant_name || "",
        paid_at: body.paid_at || new Date().toISOString(),
        receipt_url: body.receipt_url || "",
      });
      return new Response(JSON.stringify({ success: true, id: pt.id }), { headers: CORS });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: CORS });
    }
  }

  // ── NEW: Full Registration Flow ─────────────────────────────────────────────

  // Validate required fields
  const required = ["applicant_name", "applicant_email", "venture_name", "venture_description", "nationality", "country_of_residence", "applicant_role"];
  const missing = required.filter(f => !String(body[f] || "").trim());
  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: `Missing required fields: ${missing.join(", ")}` }), { status: 400, headers: CORS });
  }

  const emailAddr = String(body.applicant_email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddr)) {
    return new Response(JSON.stringify({ error: "Invalid email address" }), { status: 400, headers: CORS });
  }

  try {
    // ── Deduplication ──────────────────────────────────────────────────────────
    let existing: any[] = [];
    try { existing = await builderClient.asServiceRole.entities.Application.filter({ applicant_email: emailAddr }); } catch (_) {}

    if (existing.length > 0) {
      const ex = existing[0];
      const ref = ex.reference_code;
      // If unpaid — create a new Stripe session and return it
      if (ex.payment_status !== "paid") {
        const stripe = await createStripeSession(ref, emailAddr, ex.applicant_name || body.applicant_name, ex.id);
        return new Response(JSON.stringify({
          success: true, duplicate: true,
          reference_code: ref,
          stripe_url: stripe.url || null,
          message: "Application already exists. Returning payment link."
        }), { headers: CORS });
      }
      // Already paid — return status
      return new Response(JSON.stringify({
        success: true, duplicate: true, already_paid: true,
        reference_code: ref,
        status_url: `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`,
        message: "Application already submitted and paid."
      }), { headers: CORS });
    }

    // ── Generate reference code ────────────────────────────────────────────────
    // Retry up to 5 times to avoid collisions
    let reference_code = genRef();
    for (let i = 0; i < 4; i++) {
      const check = await builderClient.asServiceRole.entities.Application.filter({ reference_code }).catch(() => []);
      if (!check.length) break;
      reference_code = genRef();
    }

    const now = new Date().toISOString();

    // ── Create Application record in builder app ───────────────────────────────
    const appRecord = await builderClient.asServiceRole.entities.Application.create({
      reference_code,
      status: "submitted",
      payment_status: "unpaid",
      applicant_name:        String(body.applicant_name || "").trim(),
      applicant_email:       emailAddr,
      applicant_role:        body.applicant_role || "Founder",
      venture_name:          String(body.venture_name || "").trim(),
      venture_stage:         body.venture_stage || body.stage || "Pre-Seed",
      venture_sector:        body.venture_sector || body.sector || "Other",
      venture_description:   String(body.venture_description || "").trim(),
      nationality:           String(body.nationality || "").trim(),
      country_of_residence:  String(body.country_of_residence || "").trim(),
      phone_number:          String(body.phone_number || body.phone || "").trim(),
      linkedin_url:          String(body.linkedin_url || body.linkedin || "").trim(),
      website_url:           String(body.website_url || body.website || "").trim(),
      passport_url:          String(body.passport_url || "").trim(),
      documents_submitted:   !!(body.passport_url || body.business_doc_url),
      co_founder_name:       String(body.co_founder_name || body.cofounder_name || "").trim(),
      co_founder_email:      String(body.co_founder_email || body.cofounder_email || "").trim(),
      submitted_at:          now,
      invitation_token:      body.invitation_token || body._token || null,
    });

    console.log("Application created in builder:", appRecord?.id, reference_code);

    // ── Mirror to Superagent for automations ───────────────────────────────────
    try {
      await agentClient.asServiceRole.entities.Application.create({
        reference_code,
        status: "submitted",
        payment_status: "unpaid",
        applicant_name:  String(body.applicant_name || "").trim(),
        applicant_email: emailAddr,
        applicant_role:  body.applicant_role || "Founder",
        venture_name:    String(body.venture_name || "").trim(),
        venture_sector:  body.venture_sector || body.sector || "Other",
        submitted_at:    now,
      });
    } catch (e) { console.error("Mirror error (non-fatal):", e); }

    // ── Create Stripe checkout session ─────────────────────────────────────────
    const stripe = await createStripeSession(
      reference_code,
      emailAddr,
      String(body.applicant_name || "").trim(),
      appRecord?.id || ""
    );

    // Save stripe session ID to record
    if (stripe.session_id && appRecord?.id) {
      try {
        await builderClient.asServiceRole.entities.Application.update(appRecord.id, {
          stripe_session_id: stripe.session_id,
        });
      } catch (_) {}
    }

    // ── Send emails (non-blocking) ─────────────────────────────────────────────
    const firstName = String(body.applicant_name || "").trim().split(" ")[0];
    await email(
      emailAddr,
      `Application Received — ${reference_code} | Prime Endorsement Authority`,
      applicantEmail(firstName, reference_code, String(body.venture_name || "").trim())
    );
    await email(
      ADMIN_EMAIL,
      `🏛 New Application: ${body.applicant_name} — ${reference_code}`,
      adminNotifEmail(body, reference_code)
    );

    // ── Co-founder notification ────────────────────────────────────────────────
    const cfEmail = String(body.co_founder_email || body.cofounder_email || "").trim().toLowerCase();
    if (cfEmail && cfEmail !== emailAddr && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfEmail)) {
      await email(
        cfEmail,
        `Co-Founder Application — ${reference_code} | Prime Endorsement Authority`,
        applicantEmail(String(body.co_founder_name || body.cofounder_name || "Co-Founder").trim().split(" ")[0], reference_code, String(body.venture_name || "").trim())
      );
    }

    // ── Return success ─────────────────────────────────────────────────────────
    return new Response(JSON.stringify({
      success: true,
      reference_code,
      app_id: appRecord?.id,
      stripe_url:        stripe.url        || null,
      stripe_session_id: stripe.session_id || null,
      status_url: `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(reference_code)}`,
    }), { status: 200, headers: CORS });

  } catch (err: any) {
    console.error("Registration error:", err.message, err.stack);
    return new Response(JSON.stringify({
      success: false,
      error: `Registration failed: ${err.message || "Internal server error"}`,
    }), { status: 500, headers: CORS });
  }
}
