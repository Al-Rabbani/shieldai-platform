import nodemailer from "npm:nodemailer@6.9.9";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

function buildWelcomeEmail(firstName: string, email: string, role: string, referenceCode: string, loginUrl: string, year: number): string {
  const portalPath = role === "Co-Founder" ? "co-founder-portal" : "founder-portal";
  const portalUrl = `https://primeendorsement.com/${portalPath}`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
body{margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif}
.wrap{max-width:600px;margin:0 auto}
.hdr{background:#111827;border-bottom:2px solid #C9A84C;padding:36px 40px;text-align:center}
.badge{display:inline-block;border:1px solid #C9A84C;padding:4px 14px;border-radius:2px;margin-bottom:12px}
.badge span{color:#C9A84C;font-size:10px;letter-spacing:4px;text-transform:uppercase}
.logo{color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:4px;text-transform:uppercase}
.sub{color:#e2e8f0;font-size:12px;letter-spacing:2px;opacity:.7;margin-top:4px}
.body{padding:36px 40px;background:#111827}
.greet{color:#C9A84C;font-size:18px;margin-bottom:12px}
.txt{color:#94a3b8;font-size:14px;line-height:1.8;margin-bottom:16px}
.ref-box{background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:14px 20px;margin:22px 0;text-align:center}
.ref-lbl{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px}
.ref-val{color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px}
.info-box{background:#0d1220;border:1px solid #1F2937;border-radius:6px;padding:16px 20px;margin:16px 0}
.info-row{margin-bottom:8px;color:#94a3b8;font-size:13px;line-height:1.6}
.info-row strong{color:#e2e8f0}
.btn{display:block;width:fit-content;margin:26px auto;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 40px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase}
.divider{border:none;border-top:1px solid #1F2937;margin:24px 0}
.footer{background:#0d1220;padding:22px 40px;text-align:center;border-top:1px solid #1F2937}
.footer p{color:#475569;font-size:12px;line-height:1.7;margin:3px 0}
.footer a{color:#C9A84C;text-decoration:none}
</style></head><body><div class="wrap">
<div class="hdr">
  <div class="badge"><span>Sovereign Digital Authority</span></div>
  <div class="logo">PRIME ENDORSEMENT AUTHORITY</div>
  <div class="sub">${role} Membership Portal — Account Activated</div>
</div>
<div class="body">
  <div class="greet">Welcome, ${firstName} 🏛️</div>
  <p class="txt">Your application to <strong style="color:#e2e8f0">Prime Endorsement Authority</strong> has been successfully submitted and your secure <strong style="color:#e2e8f0">${role} membership portal</strong> account is now active.</p>
  <div class="ref-box">
    <div class="ref-lbl">Your Application Reference</div>
    <div class="ref-val">${referenceCode}</div>
  </div>
  <div class="info-box">
    <div class="info-row"><strong>🔐 Login Email:</strong> ${email}</div>
    <div class="info-row"><strong>🔑 Password:</strong> The password you created during registration</div>
    <div class="info-row"><strong>👤 Membership Role:</strong> ${role}</div>
    <div class="info-row"><strong>💳 Next Step:</strong> Pay the endorsement fee of <strong>£1,200.00</strong> via your portal to begin review</div>
  </div>
  <a href="${loginUrl}" class="btn">Access Your Portal →</a>
  <p class="txt" style="text-align:center;font-size:12px">Direct portal: <a href="${portalUrl}" style="color:#C9A84C">${portalUrl}</a></p>
  <hr class="divider"/>
  <p class="txt" style="font-size:13px">
    <strong style="color:#e2e8f0">What happens next?</strong><br/>
    1. Log in to your ${role} Portal<br/>
    2. Pay the £1,200.00 endorsement fee (£1,000 + £200 VAT) via Stripe<br/>
    3. Track your 90-day review in real time<br/>
    4. Receive your endorsement decision
  </p>
  <hr class="divider"/>
  <p style="text-align:center;color:#64748b;font-size:11px;letter-spacing:1px">🔒 AES-256 Encrypted · TLS 1.3 · PCI DSS Compliant</p>
</div>
<div class="footer">
  <p><strong style="color:#94a3b8">Prime Endorsement Authority</strong></p>
  <p>Questions? <a href="mailto:admin@primeendorsement.com">admin@primeendorsement.com</a></p>
  <p style="margin-top:8px">© ${year} Prime Endorsement Authority. All rights reserved.</p>
</div>
</div></body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email: string = (body.email || "").toLowerCase().trim();
    const password: string = body.password || "";
    const confirm_password: string = body.confirm_password || "";
    const role: string = body.role || "Founder";
    const full_name: string = (body.full_name || "").trim();
    const reference_code: string = body.reference_code || "";
    const application_id: string = body.application_id || "";
    const co_founder_email: string = (body.co_founder_email || "").toLowerCase().trim();
    const co_founder_name: string = (body.co_founder_name || "").trim();
    const venture_name: string = body.venture_name || "";
    const venture_sector: string = body.venture_sector || "";
    const venture_stage: string = body.venture_stage || "";
    const venture_description: string = body.venture_description || "";
    const nationality: string = body.nationality || "";
    const phone_number: string = body.phone_number || "";
    const country_of_residence: string = body.country_of_residence || "";
    const linkedin_url: string = body.linkedin_url || "";
    const website_url: string = body.website_url || "";

    // ── Validation ─────────────────────────────────────────────────────────
    if (!email || !password || !full_name || !reference_code) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required fields: email, password, full_name, reference_code"
      }), { status: 400, headers: corsHeaders });
    }
    if (password !== confirm_password) {
      return new Response(JSON.stringify({ success: false, error: "Passwords do not match" }), { status: 400, headers: corsHeaders });
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ success: false, error: "Password must be at least 8 characters" }), { status: 400, headers: corsHeaders });
    }

    const base44 = createClientFromRequest(req);

    // ── 1. Create or fetch User account ────────────────────────────────────
    let userId: string | null = null;
    let userCreated = false;
    try {
      const newUser = await base44.asServiceRole.entities.User.create({
        email,
        full_name,
        role: "user",
        password,
      });
      userId = newUser?.id || null;
      userCreated = true;
      console.log("User created:", userId);
    } catch (e: any) {
      console.error("User create error:", e.message);
      // If already exists, fetch them
      try {
        const existing = await base44.asServiceRole.entities.User.filter({ email });
        if (existing?.length > 0) {
          userId = existing[0].id;
          console.log("Existing user found:", userId);
        }
      } catch (e2: any) {
        console.error("User fetch error:", e2.message);
      }
    }

    // ── 2. Find or create Application record ───────────────────────────────
    let appId = application_id;
    let existingApp: any = null;

    // Try by application_id first
    if (appId) {
      try {
        existingApp = await base44.asServiceRole.entities.Application.get(appId);
      } catch (_) { /* not found by ID */ }
    }

    // Fall back: find by reference_code
    if (!existingApp && reference_code) {
      try {
        const byRef = await base44.asServiceRole.entities.Application.filter({ reference_code });
        if (byRef?.length > 0) {
          existingApp = byRef[0];
          appId = existingApp.id;
        }
      } catch (_) { /* ignore */ }
    }

    // Fall back: find by email
    if (!existingApp && email) {
      try {
        const byEmail = await base44.asServiceRole.entities.Application.filter({ applicant_email: email });
        if (byEmail?.length > 0) {
          existingApp = byEmail[0];
          appId = existingApp.id;
        }
      } catch (_) { /* ignore */ }
    }

    const now = new Date().toISOString();

    if (existingApp && appId) {
      // Update existing application with full data + link to user account
      try {
        await base44.asServiceRole.entities.Application.update(appId, {
          portal_user_id: userId,
          status: "submitted",
          payment_status: existingApp.payment_status || "unpaid",
          applicant_role: role,
          applicant_name: full_name,
          applicant_email: email,
          venture_name: venture_name || existingApp.venture_name,
          venture_sector: venture_sector || existingApp.venture_sector,
          venture_stage: venture_stage || existingApp.venture_stage,
          venture_description: venture_description || existingApp.venture_description,
          nationality: nationality || existingApp.nationality,
          phone_number: phone_number || existingApp.phone_number,
          country_of_residence: country_of_residence || existingApp.country_of_residence,
          linkedin_url: linkedin_url || existingApp.linkedin_url,
          website_url: website_url || existingApp.website_url,
          co_founder_email: co_founder_email || existingApp.co_founder_email,
          co_founder_name: co_founder_name || existingApp.co_founder_name,
          day_90_start: existingApp.day_90_start || now,
          submitted_at: existingApp.submitted_at || now,
        });
        console.log("Application updated:", appId);
      } catch (e: any) {
        console.error("Application update error:", e.message);
      }
    } else {
      // Create new application record
      try {
        const newApp = await base44.asServiceRole.entities.Application.create({
          reference_code,
          portal_user_id: userId,
          status: "submitted",
          payment_status: "unpaid",
          applicant_role: role,
          applicant_name: full_name,
          applicant_email: email,
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
          day_90_start: now,
          submitted_at: now,
        });
        appId = newApp?.id || appId;
        console.log("Application created:", appId);
      } catch (e: any) {
        console.error("Application create error:", e.message);
      }
    }

    // ── 3. Create Co-Founder invitation if provided ─────────────────────────
    if (co_founder_email) {
      try {
        const existing = await base44.asServiceRole.entities.Application.filter({ applicant_email: co_founder_email });
        if (!existing || existing.length === 0) {
          const coRef = "PEA-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
          const coToken = crypto.randomUUID().replace(/-/g, "");
          await base44.asServiceRole.entities.Application.create({
            reference_code: coRef,
            applicant_email: co_founder_email,
            applicant_name: co_founder_name || "Co-Founder",
            applicant_role: "Co-Founder",
            venture_name,
            status: "draft",
            payment_status: "unpaid",
            invitation_token: coToken,
            token_expires_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
          });
          console.log("Co-founder application created:", coRef);
        }
      } catch (e: any) {
        console.error("Co-founder invite error:", e.message);
      }
    }

    // ── 4. Send welcome email ───────────────────────────────────────────────
    let emailSent = false;
    const smtpPassword = Deno.env.get("SMTP_PASSWORD") || Deno.env.get("HOSTINGER_SMTP_PASSWORD");
    if (smtpPassword) {
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.hostinger.com",
          port: 465,
          secure: true,
          auth: { user: "admin@primeendorsement.com", pass: smtpPassword },
          connectionTimeout: 10000,
          socketTimeout: 15000,
        });
        const firstName = full_name.split(" ")[0];
        const loginUrl = "https://primeendorsement.com/login";
        const html = buildWelcomeEmail(firstName, email, role, reference_code, loginUrl, new Date().getFullYear());
        await transporter.sendMail({
          from: '"Prime Endorsement Authority" <admin@primeendorsement.com>',
          to: email,
          subject: `Welcome to Prime Endorsement Authority — Your ${role} Portal is Ready`,
          html,
        });
        emailSent = true;
        console.log("Welcome email sent to:", email);
      } catch (e: any) {
        console.error("Email send error:", e.message);
      }
    } else {
      console.warn("SMTP_PASSWORD not set — skipping welcome email");
    }

    const portalPath = role === "Co-Founder" ? "co-founder-portal" : "founder-portal";

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      user_created: userCreated,
      reference_code,
      application_id: appId,
      portal_url: `https://primeendorsement.com/${portalPath}`,
      login_url: "https://primeendorsement.com/login",
      email_sent: emailSent,
      role,
    }), { headers: corsHeaders });

  } catch (err: any) {
    console.error("Handler error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
