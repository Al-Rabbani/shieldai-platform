/**
 * sendRegistrationInvite — v3 REBUILT 2026-05-29
 *
 * Sends a tokenized registration invitation to a prospective applicant.
 * FIXED: Uses session_token (correct builder field, was invitation_token)
 * FIXED: Uses application_type (was applicant_role)
 * ENHANCED: Rich HTML invitation email with venture pre-fill support
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

async function dbCreate(appId: string, entity: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`DB CREATE failed: ${r.status} ${await r.text()}`);
  return r.json();
}

function refCode(): string {
  const year = new Date().getFullYear();
  return `PEA-${year}-${String(Math.floor(100000 + Math.random() * 900000))}`;
}

function invitationEmail(params: {
  firstName: string;
  email: string;
  role: string;
  token: string;
  ref: string;
  invitedBy?: string;
  message?: string;
}): string {
  const { firstName, role, token, ref, invitedBy, message } = params;
  const regUrl   = `${DOMAIN}/api/functions/peaRegister?token=${encodeURIComponent(token)}&ref=${encodeURIComponent(ref)}`;
  const isCoFounder = role.toLowerCase().includes("co");
  const year     = new Date().getFullYear();
  const expires  = new Date(Date.now() + 72 * 60 * 60 * 1000).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0d1220 0%,#111827 100%);border-bottom:3px solid #C9A84C;padding:32px;text-align:center">
    <div style="font-size:40px;margin-bottom:10px">🏛️</div>
    <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:5px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#475569;font-size:11px;margin-top:6px;letter-spacing:1px">Global Digital Authority for Founder Ventures</div>
    <div style="display:inline-block;margin-top:14px;background:rgba(201,168,76,.1);border:1px solid #C9A84C;color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:6px 18px;border-radius:20px">
      ${isCoFounder ? "Co-Founder" : "Founder"} Invitation
    </div>
  </div>
  <div style="padding:32px">
    <p style="color:#C9A84C;font-size:16px;font-weight:600;margin:0 0 12px">You've Been Invited, ${firstName} 🎉</p>
    ${invitedBy ? `<p style="color:#94a3b8;font-size:13px;margin:0 0 16px">You have been personally invited by <strong style="color:#e2e8f0">${invitedBy}</strong> to join the Prime Endorsement Authority programme as a ${role}.</p>` : `<p style="color:#94a3b8;font-size:13px;margin:0 0 16px">You have been selected to apply to the Prime Endorsement Authority global endorsement programme as a <strong style="color:#e2e8f0">${role}</strong>.</p>`}
    ${message ? `<div style="background:#0a1a0a;border-left:3px solid #C9A84C;padding:14px 18px;margin-bottom:20px;border-radius:0 6px 6px 0"><div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Personal Message</div><div style="color:#94a3b8;font-size:13px;font-style:italic;line-height:1.7">"${message}"</div></div>` : ""}
    <div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:20px">
      <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">What is Prime Endorsement Authority?</div>
      <div style="color:#94a3b8;font-size:13px;line-height:1.8">
        PEA is a <strong style="color:#e2e8f0">global digital authority</strong> that certifies exceptional founder ventures through a rigorous 90-day expert panel review. An endorsement from PEA signals world-class credibility to investors, partners, and governments worldwide.
      </div>
    </div>
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:24px">
      <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Programme Details</div>
      <div style="font-size:12px;color:#94a3b8;line-height:2">
        <div>🏛️ <span style="color:#e2e8f0;font-weight:600">Authority:</span> Prime Endorsement Authority</div>
        <div>👤 <span style="color:#e2e8f0;font-weight:600">Your Role:</span> ${role}</div>
        <div>📋 <span style="color:#e2e8f0;font-weight:600">Reference:</span> <span style="color:#C9A84C;font-weight:700">${ref}</span></div>
        <div>💳 <span style="color:#e2e8f0;font-weight:600">Endorsement Fee:</span> £1,200.00 GBP (£1,000 + VAT)</div>
        <div>⏱️ <span style="color:#e2e8f0;font-weight:600">Review Period:</span> 90 Days Expert Panel</div>
        <div>⏰ <span style="color:#e2e8f0;font-weight:600">Invitation Expires:</span> <span style="color:#f59e0b">${expires}</span></div>
      </div>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${regUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:16px 44px;border-radius:8px;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;display:inline-block">Begin Your Application →</a>
    </div>
    <div style="background:#1a0a00;border:1px solid #92400e;border-radius:6px;padding:12px;text-align:center">
      <div style="color:#f59e0b;font-size:11px">⚠ This invitation link expires in <strong>72 hours</strong>. Do not share this link.</div>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:16px 32px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority · <a href="${DOMAIN}" style="color:#C9A84C;text-decoration:none">primeendorsement.com</a></p>
  </div>
</div>
</body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({})) as Record<string, any>;

    const email        = (body.email || body.applicant_email || "").trim().toLowerCase();
    const applicantName = (body.name || body.applicant_name || "Founder").trim();
    const role         = body.role || body.applicant_role || "Founder";
    const invitedBy    = body.invited_by || body.invitedBy || "";
    const message      = body.message || body.personal_message || "";

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ success: false, error: "Valid email address is required" }), { status: 400, headers: CORS });
    }

    const resendKey    = Deno.env.get("RESEND_API_KEY") || "";
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";

    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }), { status: 500, headers: CORS });
    }

    // Generate token and reference
    const token   = body.token || (Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2));
    const ref     = body.reference_code || refCode();
    const expires = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const firstName = applicantName.split(" ")[0];

    // Create stub application record in builder DB
    try {
      await dbCreate(BUILDER_APP, "Application", serviceToken, {
        reference_code:   ref,
        status:           "invited",
        payment_status:   "pending",
        application_type: role.toLowerCase().replace(/[\s-]/g, "_"),
        applicant_name:   applicantName,
        applicant_email:  email,
        session_token:    token,          // ✅ correct builder field
        current_step:     0,
        founder_application_complete: false,
        auth_status:      "not_started",
        kyc_status:       "not_started",
        founder: {
          full_name: applicantName,
          role:      role,
          linkedin:  "",
          nationality: "",
          country_of_residence: "",
          phone: "",
          date_of_birth: null,
        },
      });
      console.log(`[invite] Created stub record ${ref} for ${email}`);
    } catch (e: any) {
      console.warn("[invite] DB create failed:", e.message);
      // Continue — email can still be sent
    }

    // Send invitation email
    const r = await fetch(RESEND_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to:   [email],
        subject: `🏛️ Your Prime Endorsement Authority Invitation — ${ref}`,
        html: invitationEmail({ firstName, email, role, token, ref, invitedBy, message }),
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("[invite] Email failed:", err);
      return new Response(JSON.stringify({ success: false, error: `Email delivery failed: ${err}` }), { status: 500, headers: CORS });
    }

    console.log(`[invite] ✅ Invitation sent to ${email} | ref=${ref}`);
    return new Response(JSON.stringify({
      success:        true,
      reference_code: ref,
      email_sent_to:  email,
      token_expires:  expires,
      registration_url: `${DOMAIN}/api/functions/peaRegister?token=${encodeURIComponent(token)}&ref=${encodeURIComponent(ref)}`,
    }), { headers: CORS });

  } catch (err: any) {
    console.error("[invite] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
