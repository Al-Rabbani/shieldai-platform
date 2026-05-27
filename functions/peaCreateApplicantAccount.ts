/**
 * peaCreateApplicantAccount
 * Prime Endorsement Authority — Step 6 of the AI-Powered Digital Registration System.
 *
 * Creates a User account, links/creates the Application record, optionally
 * creates a Co-Founder draft application, then sends a branded welcome email.
 *
 * POST body fields:
 *   email, password, confirm_password, full_name, reference_code,
 *   role ("Founder" | "Co-Founder"), application_id (optional),
 *   venture_name, venture_sector, venture_stage, venture_description,
 *   nationality, phone_number, country_of_residence, linkedin_url,
 *   website_url, co_founder_email, co_founder_name
 */

import nodemailer from "npm:nodemailer@6.9.9";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

// ── Constants ─────────────────────────────────────────────────────────────────
const DOMAIN        = "https://primeendorsement.com";
const PORTAL_URLS: Record<string, string> = {
  "Founder":    `${DOMAIN}/applicant-portal`,
  "Co-Founder": `${DOMAIN}/cofounder-dashboard`,
  "Admin":      `${DOMAIN}/pea-admin`,
};
const SMTP_HOST     = "smtp.hostinger.com";
const SMTP_PORT     = 465;
const FROM_EMAIL    = "admin@primeendorsement.com";
const FROM_NAME     = "Prime Endorsement Authority";
const CORS_HEADERS  = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type":                 "application/json",
};

// ── HTML email builder ────────────────────────────────────────────────────────
function buildWelcomeEmail(
  firstName: string,
  email:     string,
  role:      string,
  refCode:   string,
  portalUrl: string,
  year:      number,
): string {
  const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(refCode)}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0A0E1A;font-family:Arial,sans-serif}
.wrap{max-width:600px;margin:0 auto}
.hdr{background:#111827;border-bottom:3px solid #C9A84C;padding:36px 40px;text-align:center}
.badge{display:inline-block;border:1px solid #C9A84C;padding:4px 16px;border-radius:2px;margin-bottom:12px}
.badge-txt{color:#C9A84C;font-size:10px;letter-spacing:4px;text-transform:uppercase}
.logo{color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:4px;text-transform:uppercase}
.sub{color:#e2e8f0;font-size:12px;letter-spacing:2px;opacity:.7;margin-top:6px}
.body{padding:36px 40px;background:#111827}
.greet{color:#C9A84C;font-size:19px;font-weight:600;margin-bottom:14px}
.txt{color:#94a3b8;font-size:14px;line-height:1.8;margin-bottom:16px}
.ref-box{background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:16px 20px;margin:22px 0;text-align:center}
.ref-lbl{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px}
.ref-val{color:#C9A84C;font-size:24px;font-weight:700;letter-spacing:3px}
.info-box{background:#0d1220;border:1px solid #1F2937;border-radius:6px;padding:18px 22px;margin:18px 0}
.info-row{color:#94a3b8;font-size:13px;line-height:1.8}
.info-row strong{color:#e2e8f0}
.btn-primary{display:block;width:fit-content;margin:28px auto;background:#C9A84C;color:#0A0E1A;
  text-decoration:none;padding:14px 44px;border-radius:6px;font-weight:700;font-size:14px;
  letter-spacing:2px;text-transform:uppercase}
.btn-secondary{display:block;width:fit-content;margin:12px auto;background:transparent;
  border:1px solid #C9A84C;color:#C9A84C;text-decoration:none;padding:12px 36px;
  border-radius:6px;font-weight:600;font-size:13px;letter-spacing:1px;text-transform:uppercase}
.divider{border:none;border-top:1px solid #1F2937;margin:26px 0}
.steps-title{color:#e2e8f0;font-size:14px;font-weight:600;margin-bottom:12px}
.step{color:#94a3b8;font-size:13px;line-height:1.8;padding-left:4px}
.step strong{color:#C9A84C}
.footer{background:#0d1220;padding:24px 40px;text-align:center;border-top:1px solid #1F2937}
.footer p{color:#475569;font-size:12px;line-height:1.7}
.footer a{color:#C9A84C;text-decoration:none}
.security{text-align:center;color:#334155;font-size:11px;letter-spacing:1px;margin-top:10px}
</style></head><body>
<div class="wrap">
  <!-- Header -->
  <div class="hdr">
    <div class="badge"><span class="badge-txt">Sovereign Digital Authority</span></div>
    <div class="logo">PRIME ENDORSEMENT AUTHORITY</div>
    <div class="sub">${role} Membership Portal — Account Activated</div>
  </div>

  <!-- Body -->
  <div class="body">
    <div class="greet">Welcome, ${firstName} 🏛️</div>
    <p class="txt">
      Your application to <strong style="color:#e2e8f0">Prime Endorsement Authority</strong> has been successfully submitted
      and your secure <strong style="color:#e2e8f0">${role} Membership Portal</strong> account is now active.
    </p>

    <div class="ref-box">
      <div class="ref-lbl">Your Application Reference</div>
      <div class="ref-val">${refCode}</div>
    </div>

    <div class="info-box">
      <div class="info-row">🔐 <strong>Login Email:</strong> ${email}</div>
      <div class="info-row">🔑 <strong>Password:</strong> The password you set during registration</div>
      <div class="info-row">👤 <strong>Membership Role:</strong> ${role}</div>
      <div class="info-row">💳 <strong>Next Step:</strong> Pay the £1,200.00 endorsement fee via your portal to begin review</div>
    </div>

    <a href="${portalUrl}" class="btn-primary">Access ${role} Portal →</a>
    <a href="${statusUrl}" class="btn-secondary">View Application Status</a>

    <hr class="divider"/>

    <div class="steps-title">Your Journey — 4 Steps:</div>
    <div class="step"><strong>1.</strong> Log in to your ${role} Portal</div>
    <div class="step"><strong>2.</strong> Pay the £1,200.00 endorsement fee (£1,000 + £200 VAT) via Stripe</div>
    <div class="step"><strong>3.</strong> Track your 90-day expert review in real time</div>
    <div class="step"><strong>4.</strong> Receive your official endorsement decision</div>

    <hr class="divider"/>
    <p class="security">🔒 AES-256 Encrypted · TLS 1.3 · PCI DSS Compliant</p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p><strong style="color:#94a3b8">Prime Endorsement Authority</strong></p>
    <p>Questions? <a href="mailto:${FROM_EMAIL}">${FROM_EMAIL}</a></p>
    <p style="margin-top:8px">© ${year} Prime Endorsement Authority. All rights reserved.</p>
  </div>
</div>
</body></html>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: CORS_HEADERS },
    );
  }

  try {
    // ── Parse & validate body ───────────────────────────────────────────────
    const body = await req.json();
    const email            = (body.email            || "").toLowerCase().trim();
    const password         = (body.password         || "");
    const confirm_password = (body.confirm_password || "");
    const full_name        = (body.full_name        || "").trim();
    const reference_code   = (body.reference_code   || "").trim();
    const role             = (body.role             || "Founder").trim();
    const application_id   = (body.application_id   || "").trim();
    const co_founder_email = (body.co_founder_email || "").toLowerCase().trim();
    const co_founder_name  = (body.co_founder_name  || "").trim();

    // Venture fields
    const venture_name        = (body.venture_name        || "").trim();
    const venture_sector      = (body.venture_sector      || "").trim();
    const venture_stage       = (body.venture_stage       || "").trim();
    const venture_description = (body.venture_description || "").trim();
    const nationality         = (body.nationality         || "").trim();
    const phone_number        = (body.phone_number        || "").trim();
    const country_of_residence= (body.country_of_residence|| "").trim();
    const linkedin_url        = (body.linkedin_url        || "").trim();
    const website_url         = (body.website_url         || "").trim();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: CORS_HEADERS },
      );
    }
    if (!password || !full_name || !reference_code) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: password, full_name, reference_code" }),
        { status: 400, headers: CORS_HEADERS },
      );
    }
    if (password !== confirm_password) {
      return new Response(
        JSON.stringify({ success: false, error: "Passwords do not match" }),
        { status: 400, headers: CORS_HEADERS },
      );
    }
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: "Password must be at least 8 characters" }),
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const base44 = createClientFromRequest(req);
    const now    = new Date().toISOString();
    const year   = new Date().getFullYear();

    // ── STEP 1: Create (or find) the User account ───────────────────────────
    let userId:      string | null = null;
    let userCreated                = false;

    try {
      const newUser = await base44.asServiceRole.entities.User.create({
        email,
        full_name,
        role: "user",
        password,
      });
      userId      = newUser?.id ?? null;
      userCreated = true;
      console.log("[PEA] User created:", userId);
    } catch (createErr: any) {
      console.warn("[PEA] User create failed (may already exist):", createErr.message);
      // Try to find existing user
      try {
        const found = await base44.asServiceRole.entities.User.filter({ email });
        if (Array.isArray(found) && found.length > 0) {
          userId = found[0].id;
          console.log("[PEA] Existing user found:", userId);
        }
      } catch (findErr: any) {
        console.error("[PEA] User find error:", findErr.message);
      }
    }

    // ── STEP 2: Find or create the Application record ───────────────────────
    let resolvedAppId = application_id || "";
    let existingApp: Record<string, any> | null = null;

    // Try by application_id first
    if (resolvedAppId) {
      try {
        existingApp = await base44.asServiceRole.entities.Application.get(resolvedAppId);
      } catch (_) {}
    }

    // Try by reference_code
    if (!existingApp && reference_code) {
      try {
        const byRef = await base44.asServiceRole.entities.Application.filter({ reference_code });
        if (Array.isArray(byRef) && byRef.length > 0) {
          existingApp   = byRef[0];
          resolvedAppId = existingApp.id;
        }
      } catch (_) {}
    }

    // Try by email
    if (!existingApp && email) {
      try {
        const byEmail = await base44.asServiceRole.entities.Application.filter({ applicant_email: email });
        if (Array.isArray(byEmail) && byEmail.length > 0) {
          existingApp   = byEmail[0];
          resolvedAppId = existingApp.id;
        }
      } catch (_) {}
    }

    if (existingApp && resolvedAppId) {
      // Update existing application
      try {
        await base44.asServiceRole.entities.Application.update(resolvedAppId, {
          portal_user_id:     userId,
          status:             "submitted",
          payment_status:     existingApp.payment_status || "unpaid",
          applicant_role:     role,
          applicant_name:     full_name,
          applicant_email:    email,
          venture_name:       venture_name        || existingApp.venture_name,
          venture_sector:     venture_sector      || existingApp.venture_sector,
          venture_stage:      venture_stage       || existingApp.venture_stage,
          venture_description:venture_description || existingApp.venture_description,
          nationality:        nationality         || existingApp.nationality,
          phone_number:       phone_number        || existingApp.phone_number,
          country_of_residence: country_of_residence || existingApp.country_of_residence,
          linkedin_url:       linkedin_url        || existingApp.linkedin_url,
          website_url:        website_url         || existingApp.website_url,
          co_founder_email:   co_founder_email    || existingApp.co_founder_email,
          co_founder_name:    co_founder_name     || existingApp.co_founder_name,
          day_90_start:       existingApp.day_90_start || now,
          submitted_at:       existingApp.submitted_at  || now,
        });
        console.log("[PEA] Application updated:", resolvedAppId);
      } catch (updErr: any) {
        console.error("[PEA] Application update error:", updErr.message);
      }
    } else {
      // Create new application record
      try {
        const newApp = await base44.asServiceRole.entities.Application.create({
          reference_code,
          portal_user_id:      userId,
          status:              "submitted",
          payment_status:      "unpaid",
          applicant_role:      role,
          applicant_name:      full_name,
          applicant_email:     email,
          venture_name,
          venture_sector,
          venture_stage,
          venture_description,
          nationality,
          phone_number,
          country_of_residence,
          linkedin_url,
          website_url,
          co_founder_email,
          co_founder_name,
          day_90_start:        now,
          submitted_at:        now,
        });
        resolvedAppId = newApp?.id || resolvedAppId;
        console.log("[PEA] Application created:", resolvedAppId);
      } catch (crtErr: any) {
        console.error("[PEA] Application create error:", crtErr.message);
      }
    }

    // ── STEP 3: Create Co-Founder draft (if co_founder_email provided) ──────
    if (co_founder_email) {
      try {
        const coFound = await base44.asServiceRole.entities.Application.filter({
          applicant_email: co_founder_email,
        });
        if (!Array.isArray(coFound) || coFound.length === 0) {
          const coRef   = `PEA-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
          const coToken = crypto.randomUUID().replace(/-/g, "");
          await base44.asServiceRole.entities.Application.create({
            reference_code:   coRef,
            applicant_email:  co_founder_email,
            applicant_name:   co_founder_name || "Co-Founder",
            applicant_role:   "Co-Founder",
            venture_name,
            status:           "draft",
            payment_status:   "unpaid",
            invitation_token: coToken,
            token_expires_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
          });
          console.log("[PEA] Co-Founder draft created:", coRef);
        }
      } catch (coErr: any) {
        console.error("[PEA] Co-Founder invite error:", coErr.message);
      }
    }

    // ── STEP 4: Send welcome email ──────────────────────────────────────────
    let emailSent = false;
    const smtpPass = Deno.env.get("SMTP_PASSWORD") || Deno.env.get("HOSTINGER_SMTP_PASSWORD");

    if (smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host:              SMTP_HOST,
          port:              SMTP_PORT,
          secure:            true,
          auth:              { user: FROM_EMAIL, pass: smtpPass },
          connectionTimeout: 12000,
          socketTimeout:     18000,
        });
        const firstName = full_name.split(" ")[0] || full_name;
        const portalUrl = PORTAL_URLS[role] || PORTAL_URLS["Founder"];
        const html      = buildWelcomeEmail(firstName, email, role, reference_code, portalUrl, year);

        await transporter.sendMail({
          from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
          to:      email,
          subject: `Welcome to Prime Endorsement Authority — Your ${role} Portal is Ready | ${reference_code}`,
          html,
        });
        emailSent = true;
        console.log("[PEA] Welcome email sent to:", email);
      } catch (mailErr: any) {
        console.error("[PEA] Welcome email error:", mailErr.message);
        // Non-fatal — continue
      }
    } else {
      console.warn("[PEA] SMTP_PASSWORD not set — welcome email skipped");
    }

    // ── STEP 5: Notify admin (fire-and-forget) ──────────────────────────────
    try {
      const adminCallUrl = `${DOMAIN}/api/functions/peaNotifyAdmin`;
      fetch(adminCallUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_code, application_id: resolvedAppId }),
      }).catch(() => {});
    } catch (_) {}

    // ── Return success ──────────────────────────────────────────────────────
    const portalUrl = PORTAL_URLS[role] || PORTAL_URLS["Founder"];
    return new Response(
      JSON.stringify({
        success:        true,
        user_id:        userId,
        user_created:   userCreated,
        reference_code,
        application_id: resolvedAppId,
        portal_url:     portalUrl,
        login_url:      portalUrl,
        email_sent:     emailSent,
        role,
      }),
      { headers: CORS_HEADERS },
    );
  } catch (err: any) {
    console.error("[PEA] Fatal handler error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
