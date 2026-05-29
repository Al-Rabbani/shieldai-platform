/**
 * sendRegistrationInvite — v4 OFFICIAL LETTER TEMPLATE 2026-05-29
 *
 * Uses the officially approved PEA Invitation Letter format.
 * All placeholders auto-filled: name, ref, registration link, expiry, support email.
 * Preserves: session_token field, stub DB record creation, tokenized URL.
 */

const BUILDER_APP  = "69e2e852c48630e3502f13b1";
const DOMAIN       = "https://primeendorsement.com";
const RESEND_API   = "https://api.resend.com/emails";
const FROM_EMAIL   = "Prime Endorsement Authority <admin@primeendorsement.com>";
const SUPPORT_EMAIL = "admin@primeendorsement.com";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
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

function officialInvitationEmail(params: {
  fullName: string;
  role: string;
  regUrl: string;
  ref: string;
  expiresFormatted: string;
}): string {
  const { fullName, role, regUrl, ref, expiresFormatted } = params;
  const year = new Date().getFullYear();

  // ── Plain-text body rendered as professional HTML letter ──────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>PEA Invitation — ${ref}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:Georgia,'Times New Roman',serif;">

<div style="max-width:680px;margin:32px auto;background:#ffffff;border:1px solid #d4c49a;border-top:6px solid #C9A84C;">

  <!-- LETTERHEAD -->
  <div style="background:#0A0E1A;padding:28px 40px;text-align:center;border-bottom:3px solid #C9A84C;">
    <div style="font-size:32px;margin-bottom:8px;">🏛️</div>
    <div style="color:#C9A84C;font-size:14px;font-weight:700;letter-spacing:4px;text-transform:uppercase;">
      Prime Endorsement Authority
    </div>
    <div style="color:#94a3b8;font-size:11px;margin-top:4px;letter-spacing:1px;">
      Innovator Founder Visa Endorsement Programme
    </div>
    <div style="display:inline-block;margin-top:12px;background:rgba(201,168,76,0.12);border:1px solid #C9A84C;
                color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;
                padding:5px 18px;border-radius:20px;">
      Official Invitation
    </div>
  </div>

  <!-- LETTER BODY -->
  <div style="padding:40px 48px;color:#1a1a1a;line-height:1.85;font-size:14px;">

    <!-- Subject line -->
    <p style="margin:0 0 6px;font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;font-family:Arial,sans-serif;">
      Subject
    </p>
    <p style="margin:0 0 28px;font-weight:700;font-size:14px;color:#0A0E1A;font-family:Arial,sans-serif;
              border-bottom:1px solid #e5e0d0;padding-bottom:16px;">
      Invitation to Register – Prime Endorsement Authority (PEA) Innovator Founder Visa Endorsement Programme
    </p>

    <!-- Salutation -->
    <p style="margin:0 0 18px;">Dear <strong>${fullName}</strong>,</p>

    <!-- Opening -->
    <p style="margin:0 0 14px;">
      Greetings from the <strong>Prime Endorsement Authority (PEA)</strong>.
    </p>
    <p style="margin:0 0 14px;">
      We are pleased to formally invite you to commence your registration and onboarding process for the
      <strong>Innovator Founder Visa Endorsement Programme</strong> through the Prime Endorsement Authority
      Platform Application.
    </p>
    <p style="margin:0 0 24px;">
      The Prime Endorsement Authority (PEA) is committed to supporting visionary founders, entrepreneurs,
      innovators, investors, business builders, and high-potential startup leaders seeking endorsement under
      the Innovator Founder Visa pathway through a professionally structured, technology-enabled, and
      compliance-driven application ecosystem.
    </p>

    <!-- Section: Invitation to Register -->
    <div style="border-left:4px solid #C9A84C;padding-left:16px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-weight:700;font-size:14px;color:#0A0E1A;font-family:Arial,sans-serif;">
        Your Invitation to Register
      </p>
      <p style="margin:0 0 10px;">
        You have been invited to begin your application process by completing your registration on the
        Prime Endorsement Authority Platform.
      </p>
      <p style="margin:0 0 10px;">
        Through the platform, you will be required to create a secure applicant profile and complete your
        onboarding process by submitting relevant business, innovation, and supporting information necessary
        for preliminary eligibility assessment and endorsement processing.
      </p>
      <p style="margin:0 0 10px;"><strong>Registration Portal Access:</strong></p>
      <p style="margin:0 0 10px;text-align:center;">
        <a href="${regUrl}"
           style="color:#C9A84C;font-weight:700;word-break:break-all;font-family:Arial,sans-serif;">
          ${regUrl}
        </a>
      </p>
      <p style="margin:0;">
        Please carefully complete all required information during registration to avoid delays in the
        review and processing of your application.
      </p>
    </div>

    <!-- Section: Process Steps -->
    <p style="margin:0 0 12px;font-weight:700;font-size:14px;color:#0A0E1A;font-family:Arial,sans-serif;">
      Registration &amp; Application Process
    </p>
    <p style="margin:0 0 16px;">
      To ensure transparency, efficiency, and structured applicant progression, your onboarding journey
      shall follow the process below:
    </p>

    <!-- Steps table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-collapse:collapse;">
      ${[
        ["Step 1", "Registration &amp; Account Creation",
         "Complete your registration via the Prime Endorsement Authority Platform Application using the registration link provided."],
        ["Step 2", "Profile Completion &amp; Submission of Required Information",
         "After successful registration, you will be required to complete your applicant profile and provide all requested information, including business details, innovation proposal information, supporting documentation, and any required declarations."],
        ["Step 3", "Application Review &amp; Payment Notification",
         "Following a successful registration and preliminary review of your submitted information, an official payment link for the relevant programme processing fee shall be issued to you through the Prime Endorsement Authority Platform Application. Please note that payment instructions shall only be issued after successful registration and onboarding verification."],
        ["Step 4", "Payment Confirmation &amp; Application Activation",
         "Upon successful payment confirmation, your application will be formally activated for processing under the Prime Endorsement Authority Innovator Founder Visa Endorsement Programme."],
        ["Step 5", "Applicant Tracking &amp; Status Monitoring",
         "Following payment confirmation and activation of your application, you will receive a secure Periodic Application Tracking Link via the Prime Endorsement Authority Platform. This tracking system will enable you to monitor the progress of your application in real time, track review stages and compliance updates, receive status notifications and additional document requests where applicable, and monitor endorsement progress and next-stage requirements. Applicants are advised to regularly review their tracking portal and maintain updated contact information to avoid interruptions in communication."],
      ].map(([step, title, body]) => `
      <tr>
        <td style="padding:12px 14px;vertical-align:top;border:1px solid #e5e0d0;background:#faf9f5;
                   width:70px;text-align:center;">
          <div style="background:#C9A84C;color:#0A0E1A;font-weight:700;font-size:10px;
                      letter-spacing:1px;padding:4px 8px;border-radius:4px;font-family:Arial,sans-serif;">
            ${step}
          </div>
        </td>
        <td style="padding:12px 16px;vertical-align:top;border:1px solid #e5e0d0;">
          <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#0A0E1A;
                      font-family:Arial,sans-serif;">${title}</div>
          <div style="font-size:13px;color:#374151;">${body}</div>
        </td>
      </tr>`).join("")}
    </table>

    <!-- Section: Important Notice -->
    <div style="background:#fef9ec;border:1px solid #f59e0b;border-radius:6px;padding:18px 20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-weight:700;font-size:13px;color:#92400e;font-family:Arial,sans-serif;">
        ⚠ Important Notice to Applicants
      </p>
      <ol style="margin:0;padding-left:20px;color:#374151;font-size:13px;line-height:1.9;">
        <li style="margin-bottom:6px;">Submission of registration information does not automatically guarantee endorsement approval. All applications remain subject to structured eligibility review, due diligence, compliance screening, innovation assessment, and programme requirements.</li>
        <li style="margin-bottom:6px;">Failure to provide complete and accurate information may result in delays, requests for additional information, suspension, or discontinuation of application processing.</li>
        <li style="margin-bottom:6px;">Payment requests shall only be communicated through the official Prime Endorsement Authority Platform Application after successful registration and onboarding review.</li>
        <li>Applicants are strongly advised to maintain confidentiality of their login credentials and ensure all submissions are accurate, complete, and supported with relevant evidence.</li>
      </ol>
    </div>

    <!-- Section: Action Required -->
    <div style="border-left:4px solid #C9A84C;padding-left:16px;margin-bottom:28px;">
      <p style="margin:0 0 10px;font-weight:700;font-size:14px;color:#0A0E1A;font-family:Arial,sans-serif;">
        Action Required
      </p>
      <p style="margin:0 0 14px;">
        To begin your onboarding and endorsement journey, kindly proceed with registration using the
        secure platform access link below:
      </p>
      <p style="margin:0 0 14px;font-weight:700;">Complete Your Registration:</p>
      <div style="text-align:center;margin:16px 0 14px;">
        <a href="${regUrl}"
           style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 40px;
                  border-radius:6px;font-weight:700;font-size:13px;letter-spacing:2px;
                  text-transform:uppercase;display:inline-block;font-family:Arial,sans-serif;">
          Begin Your Application →
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#6b7280;font-family:Arial,sans-serif;text-align:center;">
        ⏰ This invitation link expires on <strong style="color:#92400e;">${expiresFormatted}</strong>. Do not share this link.
      </p>
    </div>

    <!-- Closing paragraph -->
    <p style="margin:0 0 14px;">
      We look forward to supporting your entrepreneurial and innovation journey and assisting you through
      a structured and professionally managed endorsement pathway.
    </p>
    <p style="margin:0 0 28px;">
      Should you require any clarification or onboarding assistance, kindly follow the communication and
      support channels available within the Prime Endorsement Authority Platform.
    </p>

    <!-- Sign-off -->
    <p style="margin:0 0 6px;">Yours faithfully,</p>
    <p style="margin:0 0 4px;font-weight:700;color:#0A0E1A;">Prime Endorsement Authority (PEA)</p>
    <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#374151;">Innovator Founder Visa Endorsement Programme Team</p>
    <p style="margin:0 0 28px;font-size:12px;color:#6b7280;font-style:italic;">Official Registration &amp; Applicant Processing Unit</p>

    <!-- Reference card -->
    <div style="background:#0A0E1A;border-radius:8px;padding:18px 22px;font-size:12px;
                font-family:Arial,sans-serif;line-height:2;">
      <div style="color:#94a3b8;">
        🌐 <span style="color:#e2e8f0;font-weight:600;">Platform Access:</span>
        <a href="${DOMAIN}" style="color:#C9A84C;text-decoration:none;">${DOMAIN}</a>
      </div>
      <div style="color:#94a3b8;">
        📧 <span style="color:#e2e8f0;font-weight:600;">Applicant Support:</span>
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#C9A84C;text-decoration:none;">${SUPPORT_EMAIL}</a>
      </div>
      <div style="color:#94a3b8;">
        📋 <span style="color:#e2e8f0;font-weight:600;">Reference ID:</span>
        <span style="color:#C9A84C;font-weight:700;">PEA-IFV-${ref.replace("PEA-", "")}</span>
      </div>
      <div style="color:#94a3b8;">
        👤 <span style="color:#e2e8f0;font-weight:600;">Programme Role:</span>
        <span style="color:#e2e8f0;">${role}</span>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="background:#f4f4f0;border-top:1px solid #d4c49a;padding:14px 40px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:11px;font-family:Arial,sans-serif;">
      © ${year} Prime Endorsement Authority &nbsp;·&nbsp;
      <a href="${DOMAIN}" style="color:#C9A84C;text-decoration:none;">primeendorsement.com</a>
      &nbsp;·&nbsp; Official correspondence only. Do not reply to this email.
    </p>
  </div>

</div>
</body>
</html>`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({})) as Record<string, any>;

    const email        = (body.email || body.applicant_email || "").trim().toLowerCase();
    const applicantName = (body.name  || body.applicant_name  || "Founder").trim();
    const role         = body.role    || body.applicant_role  || "Innovator Founder";
    const resendKey    = Deno.env.get("RESEND_API_KEY")       || "";
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ success: false, error: "Valid email address is required" }),
        { status: 400, headers: CORS });
    }
    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: CORS });
    }

    // Generate token + ref
    const token  = body.token          || (Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2));
    const ref    = body.reference_code || refCode();
    const expires        = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const expiresISO     = expires.toISOString();
    const expiresFormatted = expires.toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    const regUrl = `${DOMAIN}/api/functions/peaRegister?token=${encodeURIComponent(token)}&ref=${encodeURIComponent(ref)}`;

    // Create stub application record
    try {
      await dbCreate(BUILDER_APP, "Application", serviceToken, {
        reference_code:   ref,
        status:           "invited",
        payment_status:   "pending",
        application_type: role.toLowerCase().replace(/[\s-]/g, "_"),
        applicant_name:   applicantName,
        applicant_email:  email,
        session_token:    token,
        current_step:     0,
        founder_application_complete: false,
        auth_status:      "not_started",
        kyc_status:       "not_started",
        founder: {
          full_name:           applicantName,
          role:                role,
          linkedin:            "",
          nationality:         "",
          country_of_residence: "",
          phone:               "",
          date_of_birth:       null,
        },
      });
      console.log(`[invite] ✅ Stub record created: ${ref} for ${email}`);
    } catch (e: any) {
      console.warn("[invite] DB create failed (non-fatal):", e.message);
    }

    // Send official invitation letter
    const emailResp = await fetch(RESEND_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [email],
        subject: `Invitation to Register – Prime Endorsement Authority (PEA) | Ref: ${ref}`,
        html:    officialInvitationEmail({ fullName: applicantName, role, regUrl, ref, expiresFormatted }),
      }),
    });

    if (!emailResp.ok) {
      const err = await emailResp.text();
      console.error("[invite] Email delivery failed:", err);
      return new Response(JSON.stringify({ success: false, error: `Email delivery failed: ${err}` }),
        { status: 500, headers: CORS });
    }

    console.log(`[invite] ✅ Official invitation sent → ${email} | ref=${ref}`);
    return new Response(JSON.stringify({
      success:          true,
      reference_code:   ref,
      applicant_email:  email,
      applicant_name:   applicantName,
      role:             role,
      registration_url: regUrl,
      expires_at:       expiresISO,
      message:          `Official PEA invitation letter sent to ${email}`,
    }), { status: 200, headers: CORS });

  } catch (err: any) {
    console.error("[invite] Unhandled error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: CORS });
  }
}
