/**
 * peaNotifyAdmin
 * Called after a registration is submitted.
 * Sends full application details to admin@primeendorsement.com
 */
import nodemailer from "npm:nodemailer@6.9.9";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

function buildAdminEmail(app: Record<string, any>, year: number): string {
  const statusUrl = `https://primeendorsement.com/status?ref=${encodeURIComponent(app.reference_code || "")}`;
  const adminUrl  = `https://primeendorsement.com/pea-admin`;
  const rows = [
    ["Reference Code",        app.reference_code        || "—"],
    ["Applicant Name",        app.applicant_name        || "—"],
    ["Email",                 app.applicant_email       || "—"],
    ["Phone",                 app.phone_number          || "—"],
    ["Role",                  app.applicant_role        || "Founder"],
    ["Nationality",           app.nationality           || "—"],
    ["Country of Residence",  app.country_of_residence  || "—"],
    ["LinkedIn",              app.linkedin_url          || "—"],
    ["Website",               app.website_url           || "—"],
    ["Venture Name",          app.venture_name          || "—"],
    ["Venture Sector",        app.venture_sector        || "—"],
    ["Venture Stage",         app.venture_stage         || "—"],
    ["Co-Founder Name",       app.co_founder_name       || "—"],
    ["Co-Founder Email",      app.co_founder_email      || "—"],
    ["Payment Status",        app.payment_status        || "unpaid"],
    ["AI Score",              app.ai_score              ? `${app.ai_score}/100` : "—"],
    ["Submitted At",          app.submitted_at          ? new Date(app.submitted_at).toLocaleString("en-GB") : "—"],
  ];

  const tableRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:9px 14px;color:#94a3b8;font-size:13px;border-bottom:1px solid #1e293b;width:40%;font-weight:500;">${label}</td>
      <td style="padding:9px 14px;color:#e2e8f0;font-size:13px;border-bottom:1px solid #1e293b;">${value}</td>
    </tr>`).join("");

  const venture = app.venture_description
    ? `<div style="background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:16px 18px;margin:20px 0;">
        <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">Venture Description</div>
        <div style="color:#cbd5e1;font-size:13px;line-height:1.8;">${app.venture_description}</div>
      </div>` : "";

  const aiSummary = app.ai_summary
    ? `<div style="background:#0a1a0a;border:1px solid #166534;border-radius:6px;padding:16px 18px;margin:20px 0;">
        <div style="color:#22c55e;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">AI Analysis Summary</div>
        <div style="color:#cbd5e1;font-size:13px;line-height:1.8;">${app.ai_summary}</div>
      </div>` : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif;">
<div style="max-width:660px;margin:0 auto;">
  <!-- Header -->
  <div style="background:#111827;border-bottom:2px solid #C9A84C;padding:32px 40px;text-align:center;">
    <div style="display:inline-block;border:1px solid #C9A84C;padding:4px 14px;border-radius:2px;margin-bottom:10px;">
      <span style="color:#C9A84C;font-size:10px;letter-spacing:4px;text-transform:uppercase;">New Application Received</span>
    </div>
    <div style="color:#C9A84C;font-size:20px;font-weight:700;letter-spacing:4px;text-transform:uppercase;">PRIME ENDORSEMENT AUTHORITY</div>
    <div style="color:#e2e8f0;font-size:12px;letter-spacing:2px;opacity:.7;margin-top:4px;">Secure Registration — Admin Notification</div>
  </div>

  <!-- Body -->
  <div style="padding:32px 40px;background:#111827;">
    <div style="color:#C9A84C;font-size:15px;font-weight:600;margin-bottom:4px;">New Application Submitted 🏛️</div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin-bottom:22px;">
      A new applicant has completed the AI-Powered Digital Registration System. Full details are below.
    </p>

    <!-- Reference box -->
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:14px 20px;margin-bottom:22px;text-align:center;">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">Application Reference</div>
      <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px;">${app.reference_code || "N/A"}</div>
    </div>

    <!-- Data table -->
    <table style="width:100%;border-collapse:collapse;background:#0d1220;border:1px solid #1e293b;border-radius:6px;overflow:hidden;">
      ${tableRows}
    </table>

    ${venture}
    ${aiSummary}

    <!-- Action buttons -->
    <div style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap;">
      <a href="${adminUrl}" style="display:inline-block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Open Admin Panel</a>
      <a href="${statusUrl}" style="display:inline-block;background:transparent;border:1px solid #C9A84C;color:#C9A84C;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;">View Status Page</a>
    </div>

    <hr style="border:none;border-top:1px solid #1e293b;margin:28px 0;"/>
    <p style="text-align:center;color:#475569;font-size:11px;letter-spacing:1px;">🔒 AES-256 Encrypted · TLS 1.3 · PCI DSS Compliant</p>
  </div>

  <!-- Footer -->
  <div style="background:#0d1220;padding:20px 40px;text-align:center;border-top:1px solid #1e293b;">
    <p style="color:#475569;font-size:12px;margin:3px 0;"><strong style="color:#94a3b8">Prime Endorsement Authority</strong> — Admin System</p>
    <p style="color:#475569;font-size:12px;margin:3px 0;">© ${year} Prime Endorsement Authority. All rights reserved.</p>
  </div>
</div>
</body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const reference_code: string = body.reference_code || "";
    const application_id: string = body.application_id || "";

    const base44 = createClientFromRequest(req);

    // Fetch application data
    let app: Record<string, any> = body; // fallback: use posted body
    if (application_id) {
      try {
        const fetched = await base44.asServiceRole.entities.Application.get(application_id);
        if (fetched) app = fetched;
      } catch (_) {}
    }
    if (!app.reference_code && reference_code) {
      try {
        const byRef = await base44.asServiceRole.entities.Application.filter({ reference_code });
        if (byRef?.length > 0) app = byRef[0];
      } catch (_) {}
    }

    // Send admin notification email
    const smtpPass = Deno.env.get("SMTP_PASSWORD") || Deno.env.get("HOSTINGER_SMTP_PASSWORD");
    if (!smtpPass) {
      return new Response(JSON.stringify({ success: false, error: "SMTP not configured" }), { status: 500, headers: cors });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: { user: "admin@primeendorsement.com", pass: smtpPass },
      connectionTimeout: 12000,
      socketTimeout: 18000,
    });

    const html = buildAdminEmail(app, new Date().getFullYear());
    await transporter.sendMail({
      from: '"PEA Registration System" <admin@primeendorsement.com>',
      to: "admin@primeendorsement.com",
      subject: `🏛️ New Application: ${app.applicant_name || "Unknown"} — ${app.reference_code || "N/A"}`,
      html,
    });

    console.log("Admin notified for:", app.reference_code);
    return new Response(JSON.stringify({ success: true, reference_code: app.reference_code }), { headers: cors });

  } catch (err: any) {
    console.error("peaNotifyAdmin error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: cors });
  }
}
