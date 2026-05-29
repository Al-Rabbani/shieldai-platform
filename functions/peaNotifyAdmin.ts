/**
 * peaNotifyAdmin — v4 REBUILT 2026-05-29
 *
 * Called by automations to notify admin of status changes.
 * FIXED: Uses direct REST API (no createClientFromRequest — breaks in automation context)
 * FIXED: Zero hardcoded keys
 * ENHANCED: Rich HTML email with AI score display
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

const STATUS_META: Record<string, { label: string; color: string; emoji: string }> = {
  submitted:         { label: "Submitted",          color: "#3b82f6", emoji: "📋" },
  under_review:      { label: "Under Review",       color: "#8b5cf6", emoji: "🔍" },
  ai_screening:      { label: "AI Screening",       color: "#06b6d4", emoji: "🤖" },
  documents_pending: { label: "Documents Pending",  color: "#f59e0b", emoji: "📎" },
  kyc_in_progress:   { label: "KYC In Progress",    color: "#f97316", emoji: "🪪" },
  panel_review:      { label: "Panel Review",       color: "#a855f7", emoji: "👥" },
  approved:          { label: "Approved",           color: "#22c55e", emoji: "✅" },
  endorsed:          { label: "Endorsed",           color: "#C9A84C", emoji: "🏛️" },
  rejected:          { label: "Rejected",           color: "#ef4444", emoji: "❌" },
  withdrawn:         { label: "Withdrawn",          color: "#6b7280", emoji: "↩️" },
  paid:              { label: "Paid",               color: "#22c55e", emoji: "💳" },
};

async function getApplication(id: string, token: string): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application/${id}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) return null;
  return r.json();
}

async function findByRef(ref: string, token: string): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const all = await r.json();
  return all.find((a: any) => a.reference_code === ref) || null;
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const r = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!r.ok) console.error("[notify] Email error:", r.status, await r.text());
}

function adminEmail(app: Record<string, any>, eventType: string): string {
  const ref       = app.reference_code || "N/A";
  const name      = app.applicant_name || "Unknown";
  const email     = app.applicant_email || "";
  const status    = app.status || "unknown";
  const payStatus = app.payment_status || "pending";
  const aiScore   = app.ai_score;
  const aiSummary = app.ai_analysis?.summary || "";
  const venture   = app.venture?.company_name || "N/A";
  const sector    = app.venture?.sector || "N/A";
  const stage     = app.venture?.stage || "N/A";
  const sMeta     = STATUS_META[status] || { label: status, color: "#94a3b8", emoji: "📋" };
  const scoreColor = aiScore >= 70 ? "#22c55e" : aiScore >= 50 ? "#f59e0b" : aiScore > 0 ? "#ef4444" : "#475569";
  const year = new Date().getFullYear();
  const statusUrl  = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:24px;text-align:center">
    <div style="color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:${sMeta.color};font-size:13px;margin-top:6px">${sMeta.emoji} Application Update — ${eventType}</div>
  </div>
  <div style="padding:28px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase">Reference</div>
        <div style="color:#C9A84C;font-size:20px;font-weight:700;letter-spacing:2px">${ref}</div>
      </div>
      ${aiScore != null && aiScore > 0 ? `<div style="text-align:right">
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase">AI Score</div>
        <div style="color:${scoreColor};font-size:28px;font-weight:700">${aiScore}/100</div>
      </div>` : ""}
    </div>
    <div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:16px">
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <tr><td style="color:#64748b;padding:5px 8px">Applicant</td><td style="color:#e2e8f0;padding:5px 8px">${name}</td></tr>
        <tr><td style="color:#64748b;padding:5px 8px">Email</td><td style="color:#e2e8f0;padding:5px 8px">${email}</td></tr>
        <tr><td style="color:#64748b;padding:5px 8px">Venture</td><td style="color:#e2e8f0;padding:5px 8px">${venture}</td></tr>
        <tr><td style="color:#64748b;padding:5px 8px">Sector</td><td style="color:#e2e8f0;padding:5px 8px">${sector}</td></tr>
        <tr><td style="color:#64748b;padding:5px 8px">Stage</td><td style="color:#e2e8f0;padding:5px 8px">${stage}</td></tr>
        <tr><td style="color:#64748b;padding:5px 8px">Status</td><td style="color:${sMeta.color};padding:5px 8px;font-weight:600">${sMeta.emoji} ${sMeta.label}</td></tr>
        <tr><td style="color:#64748b;padding:5px 8px">Payment</td><td style="color:${payStatus === "paid" ? "#22c55e" : "#f59e0b"};padding:5px 8px;font-weight:600;text-transform:capitalize">${payStatus}</td></tr>
      </table>
    </div>
    ${aiSummary ? `<div style="background:#0a1a0a;border:1px solid #166534;border-radius:8px;padding:14px;margin-bottom:16px">
      <div style="color:#22c55e;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">AI Analysis</div>
      <div style="color:#94a3b8;font-size:13px;line-height:1.7">${aiSummary}</div>
    </div>` : ""}
    <div style="text-align:center;margin:20px 0">
      <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">View Application →</a>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:14px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority</p>
  </div>
</div></body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const { application_id, reference_code, event_type = "update" } = body;

    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const resendKey    = Deno.env.get("RESEND_API_KEY") || "";

    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }), { status: 500, headers: CORS });
    }

    // Fetch the application
    let app: any = null;
    if (application_id) {
      app = await getApplication(application_id, serviceToken);
    }
    if (!app && reference_code) {
      app = await findByRef(reference_code, serviceToken);
    }

    if (!app) {
      return new Response(JSON.stringify({ success: false, error: "Application not found" }), { status: 404, headers: CORS });
    }

    await sendEmail(
      resendKey,
      ADMIN_EMAIL,
      `${STATUS_META[app.status]?.emoji || "📋"} Application Update — ${app.reference_code} | PEA`,
      adminEmail(app, event_type)
    );

    return new Response(JSON.stringify({ success: true, notified: ADMIN_EMAIL, ref: app.reference_code }), { headers: CORS });

  } catch (err: any) {
    console.error("[notify] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
