/**
 * peaCreateApplicantAccount — v3 (Resend API, no SMTP, fixed confirm_password)
 * Prime Endorsement Authority — Step 6 of the Digital Registration System.
 *
 * Creates a User account, links the Application record, optionally creates a
 * Co-Founder draft, then sends a branded welcome email via Resend.
 *
 * POST body: email, password, full_name, reference_code, role,
 *            application_id (optional), venture_name, venture_sector,
 *            venture_stage, venture_description, nationality, phone_number,
 *            country_of_residence, linkedin_url, website_url,
 *            co_founder_email, co_founder_name
 *
 * NOTE: confirm_password is optional — the frontend may or may not send it.
 *       When sent, it is validated; when absent, password-only flow is used.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const DOMAIN     = "https://primeendorsement.com";
const RESEND_API = "https://api.resend.com/emails";
const FROM_EMAIL = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_TO   = "admin@primeendorsement.com";

const PORTAL_URLS: Record<string, string> = {
  "Founder":    `${DOMAIN}/applicant-portal`,
  "Co-Founder": `${DOMAIN}/cofounder-dashboard`,
  "Admin":      `${DOMAIN}/pea-admin`,
};

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type":                 "application/json",
};

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend ${res.status}: ${err}`);
  }
}

function buildWelcomeEmail(
  firstName: string,
  email: string,
  role: string,
  refCode: string,
  portalUrl: string,
  year: number,
): string {
  const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(refCode)}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#111827;border-bottom:3px solid #C9A84C;padding:36px 40px;text-align:center;">
    <div style="display:inline-block;border:1px solid #C9A84C;padding:4px 16px;border-radius:2px;margin-bottom:12px;">
      <span style="color:#C9A84C;font-size:10px;letter-spacing:4px;text-transform:uppercase;">Sovereign Digital Authority</span>
    </div>
    <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:4px;text-transform:uppercase;">PRIME ENDORSEMENT AUTHORITY</div>
    <div style="color:#e2e8f0;font-size:12px;letter-spacing:2px;opacity:.7;margin-top:6px;">${role} Membership Portal — Account Activated</div>
  </div>
  <div style="padding:36px 40px;background:#111827;">
    <div style="color:#C9A84C;font-size:19px;font-weight:600;margin-bottom:14px;">Welcome, ${firstName} 🏛️</div>
    <p style="color:#94a3b8;font-size:14px;line-height:1.8;margin-bottom:16px;">
      Your application to <strong style="color:#e2e8f0">Prime Endorsement Authority</strong> has been successfully submitted
      and your secure <strong style="color:#e2e8f0">${role} Membership Portal</strong> account is now active.
    </p>
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:16px 20px;margin:22px 0;text-align:center;">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;">Your Application Reference</div>
      <div style="color:#C9A84C;font-size:24px;font-weight:700;letter-spacing:3px;">${refCode}</div>
    </div>
    <div style="background:#0d1220;border:1px solid #1F2937;border-radius:6px;padding:18px 22px;margin:18px 0;">
      <div style="color:#94a3b8;font-size:13px;line-height:1.8;">🔐 <strong style="color:#e2e8f0">Login Email:</strong> ${email}</div>
      <div style="color:#94a3b8;font-size:13px;line-height:1.8;">🔑 <strong style="color:#e2e8f0">Password:</strong> The password you set during registration</div>
      <div style="color:#94a3b8;font-size:13px;line-height:1.8;">👤 <strong style="color:#e2e8f0">Membership Role:</strong> ${role}</div>
      <div style="color:#94a3b8;font-size:13px;line-height:1.8;">💳 <strong style="color:#e2e8f0">Next Step:</strong> Pay the £1,200.00 endorsement fee via your portal to begin review</div>
    </div>
    <div style="text-align:center;margin:28px 0 12px;">
      <a href="${portalUrl}" style="display:inline-block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 44px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;">Access ${role} Portal →</a>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${statusUrl}" style="display:inline-block;background:transparent;border:1px solid #C9A84C;color:#C9A84C;text-decoration:none;padding:12px 36px;border-radius:6px;font-weight:600;font-size:13px;letter-spacing:1px;text-transform:uppercase;">View Application Status</a>
    </div>
    <hr style="border:none;border-top:1px solid #1F2937;margin:26px 0;"/>
    <div style="color:#e2e8f0;font-size:14px;font-weight:600;margin-bottom:12px;">Your Journey — 4 Steps:</div>
    <div style="color:#94a3b8;font-size:13px;line-height:1.8;padding-left:4px;"><strong style="color:#C9A84C">1.</strong> Log in to your ${role} Portal</div>
    <div style="color:#94a3b8;font-size:13px;line-height:1.8;padding-left:4px;"><strong style="color:#C9A84C">2.</strong> Pay the £1,200.00 endorsement fee (£1,000 + £200 VAT) via Stripe</div>
    <div style="color:#94a3b8;font-size:13px;line-height:1.8;padding-left:4px;"><strong style="color:#C9A84C">3.</strong> Track your 90-day expert review in real time</div>
    <div style="color:#94a3b8;font-size:13px;line-height:1.8;padding-left:4px;"><strong style="color:#C9A84C">4.</strong> Receive your official endorsement decision</div>
    <hr style="border:none;border-top:1px solid #1F2937;margin:26px 0;"/>
    <p style="text-align:center;color:#334155;font-size:11px;letter-spacing:1px;">🔒 AES-256 Encrypted · TLS 1.3 · PCI DSS Compliant</p>
  </div>
  <div style="background:#0d1220;padding:24px 40px;text-align:center;border-top:1px solid #1F2937;">
    <p style="color:#475569;font-size:12px;line-height:1.7;"><strong style="color:#94a3b8">Prime Endorsement Authority</strong></p>
    <p style="color:#475569;font-size:12px;">Questions? <a href="mailto:${ADMIN_TO}" style="color:#C9A84C;">${ADMIN_TO}</a></p>
    <p style="color:#475569;font-size:12px;margin-top:8px;">© ${year} Prime Endorsement Authority. All rights reserved.</p>
  </div>
</div>
</body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), { status: 405, headers: CORS });
  }

  try {
    const body = await req.json();

    const email             = (body.email             || "").toLowerCase().trim();
    const password          = (body.password          || "");
    const confirm_password  = (body.confirm_password  || ""); // optional — validated only if provided
    const full_name         = (body.full_name         || "").trim();
    const reference_code    = (body.reference_code    || "").trim();
    const role              = (body.role              || "Founder").trim();
    const application_id    = (body.application_id    || "").trim();
    const co_founder_email  = (body.co_founder_email  || "").toLowerCase().trim();
    const co_founder_name   = (body.co_founder_name   || "").trim();
    const venture_name      = (body.venture_name      || "").trim();
    const venture_sector    = (body.venture_sector    || "").trim();
    const venture_stage     = (body.venture_stage     || "").trim();
    const venture_description = (body.venture_description || "").trim();
    const nationality       = (body.nationality       || "").trim();
    const phone_number      = (body.phone_number      || "").trim();
    const country_of_residence = (body.country_of_residence || "").trim();
    const linkedin_url      = (body.linkedin_url      || "").trim();
    const website_url       = (body.website_url       || "").trim();

    // Validation
    if (!email) return new Response(JSON.stringify({ success: false, error: "Email is required" }), { status: 400, headers: CORS });
    if (!password) return new Response(JSON.stringify({ success: false, error: "Password is required" }), { status: 400, headers: CORS });
    if (!full_name) return new Response(JSON.stringify({ success: false, error: "Full name is required" }), { status: 400, headers: CORS });
    if (!reference_code) return new Response(JSON.stringify({ success: false, error: "Reference code is required" }), { status: 400, headers: CORS });
    if (password.length < 8) return new Response(JSON.stringify({ success: false, error: "Password must be at least 8 characters" }), { status: 400, headers: CORS });
    // Only validate confirm_password if it was actually sent
    if (confirm_password && password !== confirm_password) {
      return new Response(JSON.stringify({ success: false, error: "Passwords do not match" }), { status: 400, headers: CORS });
    }

    const base44 = createClientFromRequest(req);
    const now    = new Date().toISOString();
    const year   = new Date().getFullYear();

    // ── STEP 1: Create or find User account ──────────────────────────────────
    let userId: string | null = null;

    try {
      const newUser = await base44.asServiceRole.entities.User.create({
        email,
        full_name,
        role: "user",
        password,
      });
      userId = newUser?.id ?? null;
      console.log("[PEA] User created:", userId);
    } catch (createErr: any) {
      console.warn("[PEA] User create failed (may already exist):", createErr.message);
      try {
        const found = await base44.asServiceRole.entities.User.filter({ email });
        if (found?.length > 0) {
          userId = found[0].id;
          console.log("[PEA] Existing user found:", userId);
        }
      } catch (_) {}
    }

    // ── STEP 2: Link Application ──────────────────────────────────────────────
    let appRecord: Record<string, any> | null = null;

    if (application_id) {
      try { appRecord = await base44.asServiceRole.entities.Application.get(application_id); } catch (_) {}
    }
    if (!appRecord && reference_code) {
      try {
        const byRef = await base44.asServiceRole.entities.Application.filter({ reference_code });
        if (byRef?.length > 0) appRecord = byRef[0];
      } catch (_) {}
    }

    if (appRecord) {
      try {
        await base44.asServiceRole.entities.Application.update(appRecord.id, {
          portal_user_id: userId,
          applicant_name: appRecord.applicant_name || full_name,
          applicant_email: appRecord.applicant_email || email,
          applicant_role: appRecord.applicant_role || role,
        });
      } catch (e: any) { console.warn("[PEA] App link failed:", e.message); }
    } else {
      // Create stub application if none found
      try {
        appRecord = await base44.asServiceRole.entities.Application.create({
          reference_code,
          applicant_name: full_name,
          applicant_email: email,
          applicant_role: role,
          portal_user_id: userId,
          venture_name, venture_sector, venture_stage, venture_description,
          nationality, phone_number, country_of_residence, linkedin_url, website_url,
          status: "submitted",
          payment_status: "unpaid",
          submitted_at: now,
        });
      } catch (e: any) { console.warn("[PEA] App create failed:", e.message); }
    }

    // ── STEP 3: Create Co-Founder stub ────────────────────────────────────────
    if (co_founder_email && co_founder_name) {
      try {
        const cfRef = `${reference_code}-CF`;
        const existing = await base44.asServiceRole.entities.Application.filter({ reference_code: cfRef });
        if (!existing?.length) {
          await base44.asServiceRole.entities.Application.create({
            reference_code: cfRef,
            applicant_name: co_founder_name,
            applicant_email: co_founder_email,
            applicant_role: "Co-Founder",
            venture_name,
            status: "draft",
            payment_status: "unpaid",
            submitted_at: now,
          });
        }
      } catch (e: any) { console.warn("[PEA] Co-founder stub failed:", e.message); }
    }

    // ── STEP 4: Send emails via Resend ────────────────────────────────────────
    const apiKey   = Deno.env.get("RESEND_API_KEY");
    const portalUrl = PORTAL_URLS[role] || PORTAL_URLS["Founder"];
    const firstName = full_name.split(" ")[0];

    if (apiKey) {
      const welcomeHtml = buildWelcomeEmail(firstName, email, role, reference_code, portalUrl, year);
      try {
        await sendEmail(apiKey, email, `🏛️ Welcome to Prime Endorsement Authority — ${reference_code}`, welcomeHtml);
        console.log("[PEA] Welcome email sent to:", email);
      } catch (e: any) { console.error("[PEA] Welcome email failed:", e.message); }

      // Admin notification
      try {
        await sendEmail(
          apiKey,
          ADMIN_TO,
          `🏛️ New ${role} Account Created — ${reference_code}`,
          `<p>New account created for <strong>${full_name}</strong> (${email}) — Ref: <strong>${reference_code}</strong></p>`,
        );
      } catch (e: any) { console.warn("[PEA] Admin notification failed:", e.message); }
    } else {
      console.warn("[PEA] RESEND_API_KEY not set — emails skipped");
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        reference_code,
        portal_url: portalUrl,
        message: "Account created successfully. Check your email for login details.",
      }),
      { headers: CORS },
    );

  } catch (err: any) {
    console.error("[peaCreateApplicantAccount] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
