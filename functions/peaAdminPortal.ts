/**
 * peaAdminPortal — Lean API backend for the PEA Admin Command Centre
 * Called by peaAdminUI (HTML shell) for all data operations.
 *
 * GET  ?action=dashboard   → { apps, txs, revenue }
 * POST ?action=sendinvite  → { success, reference_code, application_id }
 * POST ?action=paymentlink → { success, checkout_url, session_id }
 * POST ?action=updateapp   → { success }
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const DOMAIN = "https://primeendorsement.com";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function dashboard(b44: any) {
  const [apps, txs] = await Promise.all([
    b44.asServiceRole.entities.Application.list("-created_date", 500).catch(() => []),
    b44.asServiceRole.entities.PaymentTransaction.list("-created_date", 200).catch(() => []),
  ]);
  const revenue = (txs as any[])
    .filter((t) => t.status === "paid" || t.status === "completed")
    .reduce((s, t) => s + (parseFloat(t.total) || parseFloat(t.amount) || 0), 0);
  return { apps, txs, revenue };
}

async function sendInvite(b44: any, body: any) {
  const rk = Deno.env.get("RESEND_API_KEY");
  if (!rk) throw new Error("Resend API key not configured");
  const { applicant_name, applicant_email, applicant_role, venture_name } = body;
  if (!applicant_email) throw new Error("applicant_email required");

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const refCode = `PEA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const app = await b44.asServiceRole.entities.Application.create({
    reference_code: refCode,
    applicant_name: applicant_name || "",
    applicant_email,
    applicant_role: applicant_role || "founder",
    venture_name: venture_name || "",
    status: "draft",
    payment_status: "pending",
    invitation_token: token,
    token_expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    submitted_at: new Date().toISOString(),
  });

  const regUrl = `${DOMAIN}/apply?token=${token}&ref=${refCode}`;
  const firstName = (applicant_name || "Applicant").split(" ")[0];

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${rk}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Prime Endorsement Authority <admin@primeendorsement.com>",
      to: [applicant_email],
      subject: `Your PEA Registration Link — ${refCode}`,
      html: [
        `<div style="background:#0A0E1A;color:#e2e8f0;font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto">`,
        `<div style="color:#C9A84C;font-size:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px">PRIME ENDORSEMENT AUTHORITY</div>`,
        `<p>Dear ${firstName},</p>`,
        `<p style="margin:12px 0">You have been invited to apply for Prime Endorsement Authority certification.</p>`,
        `<p><strong>Reference:</strong> ${refCode}<br/><strong>Role:</strong> ${applicant_role || "Founder"}</p>`,
        `<div style="text-align:center;margin:30px 0">`,
        `<a href="${regUrl}" style="background:#C9A84C;color:#0A0E1A;padding:14px 40px;border-radius:6px;font-weight:700;text-decoration:none;font-size:14px;letter-spacing:2px">BEGIN REGISTRATION</a>`,
        `</div>`,
        `<p style="color:#64748b;font-size:12px">This link expires in 72 hours. Reference: ${refCode}</p>`,
        `</div>`,
      ].join(""),
    }),
  });

  return { success: true, reference_code: refCode, application_id: app.id };
}

async function paymentLink(b44: any, body: any) {
  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  if (!sk) throw new Error("Stripe not configured");
  const { application_id } = body;
  if (!application_id) throw new Error("application_id required");

  const app = await b44.asServiceRole.entities.Application.get(application_id);
  if (!app) throw new Error("Application not found");

  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${sk}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      "mode": "payment",
      "currency": "gbp",
      "line_items[0][price_data][currency]": "gbp",
      "line_items[0][price_data][product_data][name]": "Prime Endorsement Authority — Application Fee",
      "line_items[0][price_data][unit_amount]": "120000",
      "line_items[0][quantity]": "1",
      "customer_email": app.applicant_email || "",
      "metadata[application_id]": application_id,
      "metadata[reference_code]": app.reference_code || "",
      "success_url": `${DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}&ref=${app.reference_code}`,
      "cancel_url": `${DOMAIN}/apply?ref=${app.reference_code}`,
    }),
  });

  if (!r.ok) throw new Error(await r.text());
  const s = await r.json();
  return { success: true, checkout_url: s.url, session_id: s.id };
}

async function updateApp(b44: any, body: any) {
  const { application_id, updates } = body;
  if (!application_id) throw new Error("application_id required");
  await b44.asServiceRole.entities.Application.update(application_id, updates);
  return { success: true };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const action = new URL(req.url).searchParams.get("action") || "";

  if (!action) {
    return json({ status: "ok", message: "PEA Admin API — use ?action=dashboard|sendinvite|paymentlink|updateapp" });
  }

  if (req.headers.get("X-Admin-Token") !== "pea_admin") {
    return json({ error: "Unauthorised" }, 401);
  }

  const b44 = createClientFromRequest(req);

  try {
    let result: unknown;
    if (action === "dashboard") {
      result = await dashboard(b44);
    } else if (action === "sendinvite") {
      result = await sendInvite(b44, await req.json());
    } else if (action === "paymentlink") {
      result = await paymentLink(b44, await req.json());
    } else if (action === "updateapp") {
      result = await updateApp(b44, await req.json());
    } else {
      return json({ error: "Unknown action: " + action }, 400);
    }
    return json(result);
  } catch (e: any) {
    console.error("[peaAdminPortal]", e.message);
    return json({ error: e.message }, 500);
  }
}
