/**
 * sendRegistrationInvite
 * Sends a tokenised registration invite email to an applicant via Resend API.
 * Called by the admin dashboard when manually triggering an invitation.
 * Uses asServiceRole to avoid User entity auth restriction.
 */
import { createClient } from "npm:@base44/sdk@0.8.25";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-PEA-Key",
  "Content-Type": "application/json",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  }

  try {
    const body = await req.json();
    const {
      applicant_name,
      applicant_email,
      reference_code,
      applicant_role = "Founder",
      invitation_token,
      token_expires_at,
      registration_url,
    } = body;

    if (!applicant_email || !reference_code) {
      return new Response(
        JSON.stringify({ error: "applicant_email and reference_code are required" }),
        { status: 400, headers: CORS }
      );
    }

    // Build registration URL if not provided
    const token = invitation_token || Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expiresAt = token_expires_at || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const regUrl = registration_url ||
      `https://primeendorsement.com/apply?token=${token}&ref=${reference_code}&email=${encodeURIComponent(applicant_email)}`;

    const firstName = (applicant_name || "Applicant").split(" ")[0];
    const isCoFounder = applicant_role.toLowerCase().includes("co");
    const statusUrl = `https://primeendorsement.com/api/functions/peaStatusPage?ref=${reference_code}`;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080d18;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:0 auto">
  <div style="background:#0d1526;border-bottom:2px solid #C9A84C;padding:36px 40px;text-align:center">
    <div style="display:inline-block;border:1px solid #C9A84C;padding:4px 14px;border-radius:2px;margin-bottom:12px">
      <span style="color:#C9A84C;font-size:10px;letter-spacing:4px;text-transform:uppercase">Sovereign Digital Authority</span>
    </div>
    <div style="color:#C9A84C;font-size:20px;font-weight:700;letter-spacing:4px;text-transform:uppercase">PRIME ENDORSEMENT AUTHORITY</div>
    <div style="color:#e2e8f0;font-size:11px;letter-spacing:2px;opacity:.7;margin-top:4px;text-transform:uppercase">AI-Powered Digital Registration</div>
  </div>

  <div style="padding:36px 40px;background:#0d1526">
    <div style="color:#C9A84C;font-size:18px;margin-bottom:12px">Welcome, ${firstName} 🏛️</div>
    <p style="color:#94a3b8;font-size:14px;line-height:1.8;margin-bottom:16px">
      You have been invited to apply for <strong style="color:#e2e8f0">Prime Endorsement Authority</strong> certification.
      Your personalised, secure registration link is ready below.
    </p>

    <div style="background:#080d18;border:1px solid #C9A84C;border-radius:6px;padding:14px 20px;margin:22px 0;text-align:center">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px">Your Application Reference</div>
      <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px">${reference_code}</div>
    </div>

    <div style="background:#080d18;border:1px solid #1e2d45;border-radius:6px;padding:16px 20px;margin:16px 0">
      <div style="margin-bottom:8px;color:#94a3b8;font-size:13px;line-height:1.6">📋 <strong style="color:#e2e8f0">Role:</strong> ${applicant_role}</div>
      <div style="margin-bottom:8px;color:#94a3b8;font-size:13px;line-height:1.6">📧 <strong style="color:#e2e8f0">Email:</strong> ${applicant_email}</div>
      <div style="margin-bottom:8px;color:#94a3b8;font-size:13px;line-height:1.6">💷 <strong style="color:#e2e8f0">Service Fee:</strong> £1,200.00 (inc. £200 VAT) — payable after registration</div>
      <div style="color:#94a3b8;font-size:13px;line-height:1.6">⏱️ <strong style="color:#e2e8f0">Link Expires:</strong> 72 hours from receipt</div>
    </div>

    <p style="color:#94a3b8;font-size:14px;line-height:1.8">
      Click the button below to begin your AI-powered 5-step registration. Your reference code will be pre-loaded and your email pre-verified.
    </p>

    <div style="text-align:center;margin:26px 0">
      <a href="${regUrl}" style="display:inline-block;background:#C9A84C;color:#080d18;text-decoration:none;padding:14px 40px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase">Begin Your Registration →</a>
    </div>
    <p style="text-align:center;font-size:12px;color:#64748b;margin-top:8px">Or copy: <a href="${regUrl}" style="color:#C9A84C;text-decoration:none">${regUrl.slice(0, 60)}...</a></p>

    <hr style="border:none;border-top:1px solid #1e2d45;margin:24px 0"/>

    <p style="color:#94a3b8;font-size:13px;line-height:1.8">
      <strong style="color:#e2e8f0">What happens next?</strong><br/>
      1. Complete the 5-step AI-powered registration<br/>
      2. Your application is AI-scored in real time<br/>
      3. Pay the £1,200.00 endorsement fee securely via Stripe<br/>
      4. Track your 90-day review from your personal portal
    </p>

    <hr style="border:none;border-top:1px solid #1e2d45;margin:24px 0"/>
    <div style="text-align:center;color:#64748b;font-size:11px;letter-spacing:1px">
      🔒 &nbsp; AES-256 Encrypted &nbsp;·&nbsp; TLS 1.3 &nbsp;·&nbsp; PCI DSS Compliant
    </div>
  </div>

  <div style="background:#080d18;padding:22px 40px;text-align:center;border-top:1px solid #1e2d45">
    <p style="color:#475569;font-size:12px;line-height:1.7;margin:3px 0"><strong style="color:#94a3b8">Prime Endorsement Authority</strong></p>
    <p style="color:#475569;font-size:12px;margin:3px 0">Questions? <a href="mailto:admin@primeendorsement.com" style="color:#C9A84C;text-decoration:none">admin@primeendorsement.com</a></p>
    <p style="color:#475569;font-size:12px;margin-top:8px">Track status: <a href="${statusUrl}" style="color:#C9A84C;text-decoration:none">primeendorsement.com</a></p>
    <p style="color:#475569;font-size:12px;margin-top:8px">© ${new Date().getFullYear()} Prime Endorsement Authority. All rights reserved.</p>
  </div>
</div>
</body></html>`;

    // Send via Resend API
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: CORS });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Prime Endorsement Authority <admin@primeendorsement.com>",
        to: [applicant_email],
        subject: `Your Prime Endorsement Authority Registration Link — ${reference_code}`,
        html,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
      return new Response(
        JSON.stringify({ success: false, error: "Email delivery failed", detail: emailData }),
        { status: 500, headers: CORS }
      );
    }

    console.log(`Registration invite sent to ${applicant_email} — ${reference_code}`);

    // Update the Application record with the token (use service role — no user auth needed)
    try {
      const base44 = createClient({ appId: "69e2e852c48630e3502f13b1" });
      const apps = await base44.asServiceRole.entities.Application.filter({ reference_code });
      if (apps.length > 0) {
        await base44.asServiceRole.entities.Application.update(apps[0].id, {
          invitation_token: token,
          token_expires_at: expiresAt,
          status: apps[0].status === "draft" ? "invited" : apps[0].status,
        });
        console.log(`Application ${reference_code} updated with invite token`);
      }
    } catch (dbErr: any) {
      console.warn("DB update skipped:", dbErr.message);
      // Non-fatal — email was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailData.id,
        reference_code,
        registration_url: regUrl,
        expires_at: expiresAt,
      }),
      { headers: CORS }
    );

  } catch (err: any) {
    console.error("sendRegistrationInvite error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: CORS }
    );
  }
}
