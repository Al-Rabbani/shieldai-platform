/**
 * peaSendPaymentLetter — v1 2026-05-29
 *
 * Sends the official PEA Payment Invitation & Application Activation Notice
 * to an applicant using the approved standard payment letter template.
 *
 * Usage (POST):
 *   { "ref": "PEA-2026-XXXXXX" }              ← looks up applicant + checkout URL from DB
 *   { "email": "...", "name": "...", "ref": "...", "payment_url": "https://..." }  ← manual override
 *
 * Called automatically by peaApplicationWebhook + peaRegister after checkout creation.
 * Can also be triggered manually from admin to resend a payment letter.
 */

const BUILDER_APP   = "69e2e852c48630e3502f13b1";
const DOMAIN        = "https://primeendorsement.com";
const RESEND_API    = "https://api.resend.com/emails";
const FROM_EMAIL    = "Prime Endorsement Authority <admin@primeendorsement.com>";
const SUPPORT_EMAIL = "admin@primeendorsement.com";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

// ── Official Payment Letter HTML ───────────────────────────────────────────────
function officialPaymentLetter(params: {
  fullName:   string;
  ref:        string;
  paymentUrl: string;
  role:       string;
}): string {
  const { fullName, ref, paymentUrl, role } = params;
  const year   = new Date().getFullYear();
  const ifvRef = `PEA-IFV-${ref.replace("PEA-", "")}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>PEA Payment Invitation — ${ref}</title>
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
      Official Payment Invitation &amp; Application Activation Notice
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
      Payment Invitation – Prime Endorsement Authority (PEA) Innovator Founder Visa Endorsement Programme
    </p>

    <!-- Salutation -->
    <p style="margin:0 0 18px;">Dear <strong>${fullName}</strong>,</p>

    <!-- Opening -->
    <p style="margin:0 0 14px;">
      Greetings from the <strong>Prime Endorsement Authority (PEA)</strong>.
    </p>
    <p style="margin:0 0 24px;">
      Following the successful completion of your registration and onboarding process on the Prime Endorsement
      Authority Platform Application, we are pleased to inform you that your profile has progressed to the
      <strong>Application Payment Stage</strong> for the
      <strong>Innovator Founder Visa Endorsement Programme</strong>.
    </p>
    <p style="margin:0 0 28px;">
      This communication serves as your official invitation to proceed with payment in order to activate
      and progress your application for formal review and endorsement processing.
    </p>

    <!-- Section: Payment Invitation -->
    <div style="border-left:4px solid #C9A84C;padding-left:16px;margin-bottom:28px;">
      <p style="margin:0 0 10px;font-weight:700;font-size:14px;color:#0A0E1A;font-family:Arial,sans-serif;">
        Application Payment Invitation
      </p>
      <p style="margin:0 0 10px;">
        Your registration and preliminary onboarding information have been successfully received and reviewed
        for progression to the next stage.
      </p>
      <p style="margin:0 0 10px;">
        To continue your application journey, you are required to complete payment through the secure
        Prime Endorsement Authority Platform Application.
      </p>
      <p style="margin:0 0 10px;font-weight:700;">Secure Payment Portal Access:</p>
      <p style="margin:0 0 10px;text-align:center;">
        <a href="${paymentUrl}"
           style="color:#C9A84C;font-weight:700;word-break:break-all;font-family:Arial,sans-serif;">
          ${paymentUrl}
        </a>
      </p>
      <p style="margin:0;">
        Kindly ensure that payment is completed through the official platform using the secure payment
        link provided.
      </p>
    </div>

    <!-- Section: Important Payment Information -->
    <p style="margin:0 0 12px;font-weight:700;font-size:14px;color:#0A0E1A;font-family:Arial,sans-serif;">
      Important Payment Information
    </p>
    <p style="margin:0 0 16px;">Please carefully review the following guidance before proceeding:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 14px;vertical-align:top;border:1px solid #e5e0d0;background:#faf9f5;width:26px;text-align:center;">
          <div style="background:#C9A84C;color:#0A0E1A;font-weight:700;font-size:11px;width:22px;height:22px;line-height:22px;border-radius:50%;text-align:center;font-family:Arial,sans-serif;">1</div>
        </td>
        <td style="padding:12px 16px;vertical-align:top;border:1px solid #e5e0d0;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#0A0E1A;font-family:Arial,sans-serif;">Application Activation Requirement</div>
          <div style="font-size:13px;color:#374151;">Your Innovator Founder Visa Endorsement application shall only be formally activated for structured assessment and processing upon successful payment confirmation.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px;vertical-align:top;border:1px solid #e5e0d0;background:#faf9f5;text-align:center;">
          <div style="background:#C9A84C;color:#0A0E1A;font-weight:700;font-size:11px;width:22px;height:22px;line-height:22px;border-radius:50%;text-align:center;font-family:Arial,sans-serif;">2</div>
        </td>
        <td style="padding:12px 16px;vertical-align:top;border:1px solid #e5e0d0;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#0A0E1A;font-family:Arial,sans-serif;">Payment Confirmation</div>
          <div style="font-size:13px;color:#374151;">Once payment has been successfully completed and verified, your application status shall automatically be updated within the Prime Endorsement Authority Platform Application.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px;vertical-align:top;border:1px solid #e5e0d0;background:#faf9f5;text-align:center;">
          <div style="background:#C9A84C;color:#0A0E1A;font-weight:700;font-size:11px;width:22px;height:22px;line-height:22px;border-radius:50%;text-align:center;font-family:Arial,sans-serif;">3</div>
        </td>
        <td style="padding:12px 16px;vertical-align:top;border:1px solid #e5e0d0;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#0A0E1A;font-family:Arial,sans-serif;">Official Receipt &amp; Confirmation</div>
          <div style="font-size:13px;color:#374151;">An automated payment acknowledgement and confirmation notification may be issued through the platform after successful transaction verification.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px;vertical-align:top;border:1px solid #e5e0d0;background:#faf9f5;text-align:center;">
          <div style="background:#C9A84C;color:#0A0E1A;font-weight:700;font-size:11px;width:22px;height:22px;line-height:22px;border-radius:50%;text-align:center;font-family:Arial,sans-serif;">4</div>
        </td>
        <td style="padding:12px 16px;vertical-align:top;border:1px solid #e5e0d0;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#0A0E1A;font-family:Arial,sans-serif;">Platform Security Notice</div>
          <div style="font-size:13px;color:#374151;">Applicants are strongly advised to make payments only through the official Prime Endorsement Authority Platform Application and not through unauthorised third-party channels.</div>
        </td>
      </tr>
    </table>

    <!-- Section: After Payment -->
    <p style="margin:0 0 12px;font-weight:700;font-size:14px;color:#0A0E1A;font-family:Arial,sans-serif;">
      What Happens After Successful Payment?
    </p>
    <p style="margin:0 0 16px;">
      Following successful payment confirmation, the following process shall commence:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 14px;vertical-align:top;border:1px solid #e5e0d0;background:#faf9f5;width:70px;text-align:center;">
          <div style="background:#C9A84C;color:#0A0E1A;font-weight:700;font-size:10px;letter-spacing:1px;padding:4px 8px;border-radius:4px;font-family:Arial,sans-serif;">Step 1</div>
        </td>
        <td style="padding:12px 16px;vertical-align:top;border:1px solid #e5e0d0;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#0A0E1A;font-family:Arial,sans-serif;">Application Activation</div>
          <div style="font-size:13px;color:#374151;">Your application file will be formally activated for structured endorsement review, compliance assessment, business and innovation evaluation, and programme processing.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px;vertical-align:top;border:1px solid #e5e0d0;background:#faf9f5;text-align:center;">
          <div style="background:#C9A84C;color:#0A0E1A;font-weight:700;font-size:10px;letter-spacing:1px;padding:4px 8px;border-radius:4px;font-family:Arial,sans-serif;">Step 2</div>
        </td>
        <td style="padding:12px 16px;vertical-align:top;border:1px solid #e5e0d0;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#0A0E1A;font-family:Arial,sans-serif;">Issuance of Periodic Applicant Tracking Link</div>
          <div style="font-size:13px;color:#374151;">You will receive a secure Periodic Application Tracking Link via the Prime Endorsement Authority Platform Application. This tracking system will allow you to monitor the real-time progress of your application, view application milestones and review stages, receive status updates and official notifications, track document requests, compliance reviews, and assessment outcomes, and stay informed regarding endorsement progression and next procedural steps. Applicants are encouraged to regularly review their tracking dashboard for updates and notifications.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px;vertical-align:top;border:1px solid #e5e0d0;background:#faf9f5;text-align:center;">
          <div style="background:#C9A84C;color:#0A0E1A;font-weight:700;font-size:10px;letter-spacing:1px;padding:4px 8px;border-radius:4px;font-family:Arial,sans-serif;">Step 3</div>
        </td>
        <td style="padding:12px 16px;vertical-align:top;border:1px solid #e5e0d0;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#0A0E1A;font-family:Arial,sans-serif;">Ongoing Assessment &amp; Communication</div>
          <div style="font-size:13px;color:#374151;">Where applicable, additional supporting information or documentation may be requested during the evaluation process. Such requests shall be communicated through the platform notification system and applicant tracking portal.</div>
        </td>
      </tr>
    </table>

    <!-- Section: Important Notice -->
    <div style="background:#fef9ec;border:1px solid #f59e0b;border-radius:6px;padding:18px 20px;margin-bottom:28px;">
      <p style="margin:0 0 12px;font-weight:700;font-size:13px;color:#92400e;font-family:Arial,sans-serif;">
        ⚠ Important Notice to Applicants
      </p>
      <ol style="margin:0;padding-left:20px;color:#374151;font-size:13px;line-height:1.9;">
        <li style="margin-bottom:6px;">Successful payment does not constitute an automatic endorsement approval or visa approval. All applications remain subject to formal eligibility review, innovation assessment, compliance verification, due diligence procedures, and programme requirements.</li>
        <li style="margin-bottom:6px;">Delays in payment may delay activation and progression of your application.</li>
        <li style="margin-bottom:6px;">Applicants are responsible for ensuring that all information submitted remains complete, accurate, and updated throughout the processing cycle.</li>
        <li>All official correspondence, tracking updates, and process notifications shall be communicated through the Prime Endorsement Authority Platform Application.</li>
      </ol>
    </div>

    <!-- Section: Action Required -->
    <div style="border-left:4px solid #C9A84C;padding-left:16px;margin-bottom:28px;">
      <p style="margin:0 0 10px;font-weight:700;font-size:14px;color:#0A0E1A;font-family:Arial,sans-serif;">
        Action Required
      </p>
      <p style="margin:0 0 14px;">
        Kindly proceed with payment using the secure platform payment link below to activate your application:
      </p>
      <p style="margin:0 0 14px;font-weight:700;">Proceed to Secure Payment:</p>
      <div style="text-align:center;margin:16px 0 14px;">
        <a href="${paymentUrl}"
           style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 40px;
                  border-radius:6px;font-weight:700;font-size:13px;letter-spacing:2px;
                  text-transform:uppercase;display:inline-block;font-family:Arial,sans-serif;">
          Proceed to Secure Payment →
        </a>
      </div>
    </div>

    <!-- Closing -->
    <p style="margin:0 0 14px;">
      We appreciate your commitment to advancing your entrepreneurial and innovation journey through the
      Prime Endorsement Authority Innovator Founder Visa Endorsement Programme and look forward to
      supporting you throughout the application process.
    </p>
    <p style="margin:0 0 28px;">
      Should you require support or clarification, kindly use the applicant communication and support
      channels available within the Prime Endorsement Authority Platform Application.
    </p>

    <!-- Sign-off -->
    <p style="margin:0 0 6px;">Yours faithfully,</p>
    <p style="margin:0 0 4px;font-weight:700;color:#0A0E1A;">Prime Endorsement Authority (PEA)</p>
    <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#374151;">Innovator Founder Visa Endorsement Programme Team</p>
    <p style="margin:0 0 28px;font-size:12px;color:#6b7280;font-style:italic;">Official Applicant Processing &amp; Endorsement Unit</p>

    <!-- Reference card -->
    <div style="background:#0A0E1A;border-radius:8px;padding:18px 22px;font-size:12px;font-family:Arial,sans-serif;line-height:2.1;">
      <div style="color:#94a3b8;">🌐 <span style="color:#e2e8f0;font-weight:600;">Platform Access:</span> <a href="${DOMAIN}" style="color:#C9A84C;text-decoration:none;">${DOMAIN}</a></div>
      <div style="color:#94a3b8;">📧 <span style="color:#e2e8f0;font-weight:600;">Applicant Support:</span> <a href="mailto:${SUPPORT_EMAIL}" style="color:#C9A84C;text-decoration:none;">${SUPPORT_EMAIL}</a></div>
      <div style="color:#94a3b8;">📋 <span style="color:#e2e8f0;font-weight:600;">Applicant Reference No.:</span> <span style="color:#C9A84C;font-weight:700;">${ifvRef}</span></div>
      <div style="color:#94a3b8;">👤 <span style="color:#e2e8f0;font-weight:600;">Programme Role:</span> <span style="color:#e2e8f0;">${role}</span></div>
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

// ── Helpers ───────────────────────────────────────────────────────────────────
async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const r = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error(`Email failed: ${r.status} ${await r.text()}`);
}

async function getApp(serviceToken: string, ref?: string, email?: string, id?: string): Promise<any> {
  if (id) {
    const r = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application/${id}`, {
      headers: { "Authorization": `Bearer ${serviceToken}` },
    });
    if (r.ok) return r.json();
  }
  const r = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application`, {
    headers: { "Authorization": `Bearer ${serviceToken}` },
  });
  if (!r.ok) throw new Error(`DB fetch failed: ${r.status}`);
  const all = await r.json();
  if (ref)   return all.find((a: any) => a.reference_code === ref)   || null;
  if (email) return all.find((a: any) => a.applicant_email?.toLowerCase() === email.toLowerCase()) || null;
  return null;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body         = await req.json().catch(() => ({})) as Record<string, any>;
    const resendKey    = Deno.env.get("RESEND_API_KEY")       || "";
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";

    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: CORS });
    }

    // ── Resolve applicant ────────────────────────────────────────────────────
    let fullName   = (body.name   || body.applicant_name  || "").trim();
    let email      = (body.email  || body.applicant_email || "").trim().toLowerCase();
    let ref        = (body.ref    || body.reference_code  || "").trim();
    let paymentUrl = (body.payment_url || body.checkout_url || "").trim();
    let role       = (body.role   || body.applicant_role  || "Innovator Founder").trim();

    // If ref given but missing other fields, look up from DB
    if (ref && (!fullName || !email || !paymentUrl)) {
      const app = await getApp(serviceToken, ref, undefined, body.application_id);
      if (!app) {
        return new Response(JSON.stringify({ success: false, error: `No application found for ref: ${ref}` }),
          { status: 404, headers: CORS });
      }
      fullName   = fullName   || app.applicant_name   || "Applicant";
      email      = email      || app.applicant_email  || "";
      ref        = ref        || app.reference_code   || "";
      paymentUrl = paymentUrl || app.payment_reference || "";
      role       = role       || (app.venture?.role || app.applicant_role || app.application_type || "Innovator Founder");
    }

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ success: false, error: "Applicant email is required" }),
        { status: 400, headers: CORS });
    }
    if (!ref) {
      return new Response(JSON.stringify({ success: false, error: "Reference code is required" }),
        { status: 400, headers: CORS });
    }
    if (!paymentUrl) {
      return new Response(JSON.stringify({ success: false, error: "Payment URL is required — applicant has no Stripe session on file" }),
        { status: 400, headers: CORS });
    }

    // ── Send official payment letter ─────────────────────────────────────────
    const subject = `Payment Invitation – Prime Endorsement Authority (PEA) | Ref: ${ref}`;
    await sendEmail(
      resendKey, email, subject,
      officialPaymentLetter({ fullName, ref, paymentUrl, role })
    );

    console.log(`[payment-letter] ✅ Sent to ${email} | ref=${ref}`);
    return new Response(JSON.stringify({
      success:         true,
      reference_code:  ref,
      applicant_email: email,
      applicant_name:  fullName,
      role,
      payment_url:     paymentUrl,
      message:         `Official PEA payment letter sent to ${email}`,
    }), { status: 200, headers: CORS });

  } catch (err: any) {
    console.error("[payment-letter] Error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: CORS });
  }
}
