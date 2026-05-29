/**
 * peaNotifyAdmin — v5 FULL REBUILD 2026-05-29
 *
 * Notifies admin of any application event.
 * FIXED: Zero SDK imports — pure REST API only
 * FIXED: Correct nested field access (venture?.company_name, founder?.role)
 * ENHANCED: Rich HTML with AI score, status timeline, action buttons
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

const STATUS_MAP: Record<string, { label: string; color: string; emoji: string }> = {
  invited:           { label: "Invited",              color: "#3b82f6", emoji: "📨" },
  submitted:         { label: "Submitted",             color: "#3b82f6", emoji: "📋" },
  under_review:      { label: "Under Review",          color: "#8b5cf6", emoji: "🔍" },
  ai_screening:      { label: "AI Screening",          color: "#06b6d4", emoji: "🤖" },
  documents_pending: { label: "Documents Pending",     color: "#f59e0b", emoji: "📎" },
  kyc_in_progress:   { label: "KYC In Progress",       color: "#f97316", emoji: "🪪" },
  panel_review:      { label: "Panel Review",          color: "#a855f7", emoji: "👥" },
  approved:          { label: "Approved",              color: "#22c55e", emoji: "✅" },
  endorsed:          { label: "Endorsed",              color: "#C9A84C", emoji: "🏛️" },
  rejected:          { label: "Rejected",              color: "#ef4444", emoji: "❌" },
  withdrawn:         { label: "Withdrawn",             color: "#6b7280", emoji: "↩️" },
};

async function findApp(token: string, params: { id?: string; ref?: string }): Promise<any> {
  if (params.id) {
    const r = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application/${params.id}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (r.ok) return r.json();
  }
  const r = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`DB fetch failed: ${r.status}`);
  const all = await r.json();
  return all.find((a: any) => a.reference_code === params.ref) || null;
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const r = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!r.ok) console.error("[notify] Email error:", r.status, await r.text());
}

function buildAdminEmail(app: Record<string, any>, eventType: string): string {
  const ref        = app.reference_code || "N/A";
  const name       = app.applicant_name  || "Unknown";
  const email      = app.applicant_email || "";
  const status     = app.status          || "submitted";
  const payStatus  = app.payment_status  || "pending";
  const aiScore    = app.ai_score;
  const aiAnalysis = app.ai_analysis     || {};
  const venture    = app.venture?.company_name || name;
  const sector     = app.venture?.sector  || "N/A";
  const stage      = app.venture?.stage   || "N/A";
  const country    = app.founder?.country_of_residence || "N/A";
  const phone      = app.founder?.phone   || "N/A";
  const linkedin   = app.founder?.linkedin || "";
  const sMeta      = STATUS_MAP[status] || { label: status.replace(/_/g, " "), color: "#94a3b8", emoji: "📋" };
  const scoreColor = (aiScore || 0) >= 70 ? "#22c55e" : (aiScore || 0) >= 50 ? "#f59e0b" : (aiScore || 0) > 0 ? "#ef4444" : "#475569";
  const statusUrl  = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
  const year       = new Date().getFullYear();
  const recommendation = aiAnalysis.recommendation || "";
  const strengths  = aiAnalysis.key_strengths || [];
  const concerns   = aiAnalysis.key_concerns  || [];
  const aiSummary  = aiAnalysis.summary        || "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:24px 32px;text-align:center">
    <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:${sMeta.color};font-size:13px;margin-top:6px">${sMeta.emoji} Application ${eventType} — Admin Notification</div>
  </div>
  <div style="padding:28px 32px">

    <!-- Reference + AI Score header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
      <div>
        <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px">Reference</div>
        <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px">${ref}</div>
        <div style="margin-top:6px;display:inline-block;background:${sMeta.color}22;border:1px solid ${sMeta.color};color:${sMeta.color};font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 12px;border-radius:12px">${sMeta.emoji} ${sMeta.label}</div>
      </div>
      ${aiScore != null && aiScore > 0 ? `<div style="text-align:center;background:#0A0E1A;border:1px solid ${scoreColor};border-radius:8px;padding:12px 18px">
        <div style="color:#64748b;font-size:9px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">AI Score</div>
        <div style="color:${scoreColor};font-size:28px;font-weight:700">${aiScore}</div>
        <div style="color:#475569;font-size:10px">/100</div>
        ${recommendation ? `<div style="color:${scoreColor};font-size:10px;font-weight:700;margin-top:4px;text-transform:uppercase">${recommendation}</div>` : ""}
      </div>` : ""}
    </div>

    <!-- Applicant details -->
    <div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">Applicant Details</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <tr><td style="color:#64748b;padding:4px 8px;width:35%">Full Name</td><td style="color:#e2e8f0;padding:4px 8px;font-weight:600">${name}</td></tr>
        <tr><td style="color:#64748b;padding:4px 8px">Email</td><td style="color:#e2e8f0;padding:4px 8px">${email}</td></tr>
        <tr><td style="color:#64748b;padding:4px 8px">Phone</td><td style="color:#e2e8f0;padding:4px 8px">${phone}</td></tr>
        <tr><td style="color:#64748b;padding:4px 8px">Country</td><td style="color:#e2e8f0;padding:4px 8px">${country}</td></tr>
        ${linkedin ? `<tr><td style="color:#64748b;padding:4px 8px">LinkedIn</td><td style="padding:4px 8px"><a href="${linkedin}" style="color:#3b82f6">${linkedin.slice(0,50)}</a></td></tr>` : ""}
      </table>
    </div>

    <!-- Venture details -->
    <div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">Venture Details</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <tr><td style="color:#64748b;padding:4px 8px;width:35%">Company</td><td style="color:#e2e8f0;padding:4px 8px;font-weight:600">${venture}</td></tr>
        <tr><td style="color:#64748b;padding:4px 8px">Sector</td><td style="color:#e2e8f0;padding:4px 8px">${sector}</td></tr>
        <tr><td style="color:#64748b;padding:4px 8px">Stage</td><td style="color:#e2e8f0;padding:4px 8px">${stage}</td></tr>
        <tr><td style="color:#64748b;padding:4px 8px">Payment</td><td style="color:${payStatus === "paid" ? "#22c55e" : "#f59e0b"};padding:4px 8px;font-weight:700;text-transform:capitalize">${payStatus === "paid" ? "✅ Paid — £1,200.00" : "⚠ Pending"}</td></tr>
      </table>
    </div>

    ${aiSummary ? `<div style="background:#0a1a0a;border:1px solid #166534;border-radius:8px;padding:14px;margin-bottom:16px">
      <div style="color:#22c55e;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">🤖 AI Assessment Summary</div>
      <div style="color:#94a3b8;font-size:13px;line-height:1.7">${aiSummary}</div>
      ${strengths.length ? `<div style="margin-top:10px"><div style="color:#22c55e;font-size:10px;font-weight:600;margin-bottom:4px">Key Strengths:</div>${strengths.map((s: string) => `<div style="color:#4ade80;font-size:12px">✓ ${s}</div>`).join("")}</div>` : ""}
      ${concerns.length  ? `<div style="margin-top:8px"><div style="color:#f59e0b;font-size:10px;font-weight:600;margin-bottom:4px">Key Concerns:</div>${concerns.map((c: string) => `<div style="color:#fbbf24;font-size:12px">⚠ ${c}</div>`).join("")}</div>` : ""}
    </div>` : ""}

    <div style="text-align:center;margin-top:20px">
      <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-right:8px;display:inline-block">View Application →</a>
      <a href="https://app.base44.com/apps/${BUILDER_APP}/editor/preview" style="background:#3b82f6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase;display:inline-block">Admin Panel →</a>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:14px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority · Admin Notification</p>
  </div>
</div></body></html>`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({})) as Record<string, any>;
    const { application_id, reference_code, event_type = "Update" } = body;

    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const resendKey    = Deno.env.get("RESEND_API_KEY") || "";

    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }), { status: 500, headers: CORS });
    }

    // No specific app? Send summary of all active apps
    if (!application_id && !reference_code) {
      const r = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application`, {
        headers: { "Authorization": `Bearer ${serviceToken}` },
      });
      if (!r.ok) throw new Error(`DB fetch failed: ${r.status}`);
      const all = await r.json();
      const active = all.filter((a: any) => !["withdrawn", "closed", "rejected"].includes(a.status || ""));
      const paid   = active.filter((a: any) => a.payment_status === "paid").length;
      const pending = active.filter((a: any) => a.payment_status !== "paid").length;
      const year = new Date().getFullYear();

      const summaryHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:20px;text-align:center">
    <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#94a3b8;font-size:12px;margin-top:4px">📊 Platform Status Summary</div>
  </div>
  <div style="padding:24px">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
      <div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:6px;padding:14px;text-align:center">
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Total</div>
        <div style="color:#C9A84C;font-size:24px;font-weight:700">${active.length}</div>
      </div>
      <div style="background:#0A0E1A;border:1px solid #166534;border-radius:6px;padding:14px;text-align:center">
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Paid</div>
        <div style="color:#22c55e;font-size:24px;font-weight:700">${paid}</div>
      </div>
      <div style="background:#0A0E1A;border:1px solid #92400e;border-radius:6px;padding:14px;text-align:center">
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Pending</div>
        <div style="color:#f59e0b;font-size:24px;font-weight:700">${pending}</div>
      </div>
    </div>
    ${active.map((a: any) => `<div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:6px;padding:12px;margin-bottom:8px;font-size:12px">
      <div style="display:flex;justify-content:space-between">
        <span style="color:#C9A84C;font-weight:700">${a.reference_code}</span>
        <span style="color:${a.payment_status === "paid" ? "#22c55e" : "#f59e0b"}">${a.payment_status === "paid" ? "✅ Paid" : "⚠ Pending"}</span>
      </div>
      <div style="color:#94a3b8;margin-top:4px">${a.applicant_name} · ${a.venture?.company_name || "N/A"}</div>
    </div>`).join("")}
    <div style="text-align:center;margin-top:16px">
      <a href="https://app.base44.com/apps/${BUILDER_APP}/editor/preview" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase">Open Admin Panel →</a>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:12px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority</p>
  </div>
</div></body></html>`;

      await sendEmail(resendKey, ADMIN_EMAIL, `📊 PEA Platform Summary — ${active.length} Active Applications`, summaryHtml);
      return new Response(JSON.stringify({ success: true, total: active.length, paid, pending }), { headers: CORS });
    }

    // Specific application notification
    const app = await findApp(serviceToken, { id: application_id, ref: reference_code });
    if (!app) {
      return new Response(JSON.stringify({ success: false, error: "Application not found" }), { status: 404, headers: CORS });
    }

    await sendEmail(
      resendKey,
      ADMIN_EMAIL,
      `${STATUS_MAP[app.status]?.emoji || "📋"} Application ${event_type} — ${app.reference_code} | PEA Admin`,
      buildAdminEmail(app, event_type)
    );

    return new Response(JSON.stringify({
      success:        true,
      reference_code: app.reference_code,
      notified:       ADMIN_EMAIL,
    }), { headers: CORS });

  } catch (err: any) {
    console.error("[notify] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
