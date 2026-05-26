import nodemailer from "npm:nodemailer@6.9.9";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

function buildWelcomeEmail(firstName: string, email: string, role: string, referenceCode: string, year: number): string {
  const portalUrl = "https://primeendorsement.com/portal";
  const loginUrl = "https://primeendorsement.com/login";
  return [
    '<!DOCTYPE html><html><head><meta charset="UTF-8"/>',
    '<style>body{margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif}',
    '.wrap{max-width:600px;margin:0 auto;background:#0A0E1A}',
    '.hdr{background:#111827;border-bottom:2px solid #C9A84C;padding:40px;text-align:center}',
    '.badge{display:inline-block;border:1px solid #C9A84C;padding:4px 14px;border-radius:2px;margin-bottom:14px}',
    '.badge span{color:#C9A84C;font-size:10px;letter-spacing:4px;text-transform:uppercase}',
    '.logo{color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:4px}',
    '.sub-hdr{color:#e2e8f0;font-size:14px;letter-spacing:2px;text-transform:uppercase;opacity:.7}',
    '.body{padding:36px 40px;background:#111827}',
    '.greeting{color:#C9A84C;font-size:18px;margin-bottom:12px}',
    '.txt{color:#94a3b8;font-size:14px;line-height:1.8;margin-bottom:18px}',
    '.ref-box{background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:16px 22px;margin:24px 0;text-align:center}',
    '.ref-lbl{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:5px}',
    '.ref-val{color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px}',
    '.btn{display:block;width:fit-content;margin:24px auto;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 36px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase}',
    '.divider{border:none;border-top:1px solid #1F2937;margin:24px 0}',
    '.info-row{margin-bottom:14px}',
    '.info-txt{color:#94a3b8;font-size:13px;line-height:1.6}',
    '.footer{background:#0d1220;padding:22px 40px;text-align:center;border-top:1px solid #1F2937}',
    '.footer p{color:#475569;font-size:12px;line-height:1.7;margin:4px 0}',
    '.footer a{color:#C9A84C;text-decoration:none}',
    '</style></head><body><div class="wrap">',
    '<div class="hdr">',
    '<div class="badge"><span>Sovereign Digital Authority</span></div>',
    '<div class="logo">PRIME ENDORSEMENT</div>',
    '<div class="sub-hdr">Authority &mdash; Member Portal</div>',
    '</div>',
    '<div class="body">',
    '<div class="greeting">Welcome, ' + firstName + ' &#127963;</div>',
    '<p class="txt">Your application to <strong style="color:#e2e8f0">Prime Endorsement Authority</strong> has been successfully submitted and your secure member portal is now active.</p>',
    '<div class="ref-box">',
    '<div class="ref-lbl">Application Reference</div>',
    '<div class="ref-val">' + referenceCode + '</div>',
    '</div>',
    '<hr class="divider"/>',
    '<div class="info-row"><div class="info-txt"><strong style="color:#e2e8f0">&#128272; Portal Login</strong><br/>Email: ' + email + '<br/>Password: The password you created during registration</div></div>',
    '<div class="info-row"><div class="info-txt"><strong style="color:#e2e8f0">&#128203; Application Role</strong><br/>' + role + '</div></div>',
    '<div class="info-row"><div class="info-txt"><strong style="color:#e2e8f0">&#128179; Payment Required</strong><br/>Service fee of <strong style="color:#e2e8f0">&#163;1,200.00 (inc. &#163;200 VAT)</strong> &mdash; pay via your portal to proceed to review.</div></div>',
    '<a href="' + portalUrl + '" class="btn">Access Your Portal &rarr;</a>',
    '<p class="txt" style="text-align:center;font-size:12px">Or login at: <a href="' + loginUrl + '" style="color:#C9A84C">' + loginUrl + '</a></p>',
    '<hr class="divider"/>',
    '<p class="txt" style="font-size:13px">Review typically takes <strong style="color:#e2e8f0">5&ndash;7 business days</strong> after payment. Track your progress in real time from your portal.</p>',
    '</div>',
    '<div class="footer">',
    '<p><strong style="color:#94a3b8">Prime Endorsement Authority</strong></p>',
    '<p>Questions? <a href="mailto:admin@primeendorsement.com">admin@primeendorsement.com</a></p>',
    '<p style="margin-top:10px">&copy; ' + year + ' Prime Endorsement Authority. All rights reserved.</p>',
    '</div></div></body></html>'
  ].join('\n');
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
    const co_founder_email: string = (body.co_founder_email || "").trim();
    const co_founder_name: string = (body.co_founder_name || "").trim();
    const venture_name: string = body.venture_name || "";
    const nationality: string = body.nationality || "";
    const phone_number: string = body.phone_number || "";

    if (!email || !password || !full_name || !reference_code) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields: email, password, full_name, reference_code" }), { status: 400, headers: corsHeaders });
    }
    if (password !== confirm_password) {
      return new Response(JSON.stringify({ success: false, error: "Passwords do not match" }), { status: 400, headers: corsHeaders });
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ success: false, error: "Password must be at least 8 characters" }), { status: 400, headers: corsHeaders });
    }

    const base44 = createClientFromRequest(req);

    // 1. Create User account
    let userId: string | null = null;
    try {
      const newUser = await base44.asServiceRole.entities.User.create({
        email,
        full_name,
        role: "user",
        password,
      });
      userId = newUser.id || null;
    } catch (e: any) {
      console.error("User create error:", e.message);
      try {
        const existing = await base44.asServiceRole.entities.User.filter({ email });
        if (existing && existing.length > 0) userId = existing[0].id;
      } catch (_) { /* ignore */ }
    }

    // 2. Update Application record
    if (application_id) {
      try {
        await base44.asServiceRole.entities.Application.update(application_id, {
          portal_user_id: userId,
          status: "submitted",
          payment_status: "unpaid",
          applicant_role: role,
          applicant_name: full_name,
          applicant_email: email,
          venture_name,
          nationality,
          phone_number,
          co_founder_email,
          co_founder_name,
          day_90_start: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
        });
      } catch (e: any) {
        console.error("Application update error:", e.message);
      }
    }

    // 3. Co-founder invite
    if (co_founder_email) {
      try {
        const coRef = "PEA-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
        const coToken = crypto.randomUUID().replace(/-/g, "");
        await base44.asServiceRole.entities.Application.create({
          reference_code: coRef,
          applicant_email: co_founder_email.toLowerCase(),
          applicant_name: co_founder_name || "Co-Founder",
          applicant_role: "Co-Founder",
          status: "draft",
          payment_status: "unpaid",
          invitation_token: coToken,
          token_expires_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        });
      } catch (e: any) {
        console.error("Co-founder invite error:", e.message);
      }
    }

    // 4. Send welcome email
    let emailSent = false;
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    if (smtpPassword) {
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.hostinger.com",
          port: 465,
          secure: true,
          auth: { user: "admin@primeendorsement.com", pass: smtpPassword },
        });
        const firstName = full_name.split(" ")[0];
        const html = buildWelcomeEmail(firstName, email, role, reference_code, new Date().getFullYear());
        await transporter.sendMail({
          from: '"Prime Endorsement Authority" <admin@primeendorsement.com>',
          to: email,
          subject: "Welcome to Prime Endorsement Authority - Your Portal is Ready",
          html,
        });
        emailSent = true;
      } catch (e: any) {
        console.error("Email error:", e.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      reference_code,
      application_id,
      portal_url: "https://primeendorsement.com/portal",
      email_sent: emailSent,
    }), { headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
