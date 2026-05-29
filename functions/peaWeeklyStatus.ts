/**
 * peaWeeklyStatus — v5 REBUILT 2026-05-29
 *
 * Weekly status digest emails to all active applicants.
 * FIXED: Uses venture?.company_name and founder?.role (correct nested schema)
 * FIXED: Direct REST API, no SDK dependency
 * ENHANCED: Rich HTML, payment action CTA, AI score display
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

const STATUS_LABELS: Record<string, string> = {
  submitted:         "Application Submitted",
  under_review:      "Under Expert Review",
  ai_screening:      "AI Screening",
  documents_pending: "Documents Pending",
  kyc_in_progress:   "KYC In Progress",
  panel_review:      "Panel Review",
  approved:          "Approved ✅",
  endorsed:          "Endorsed 🏛️",
  rejected:          "Rejected",
  withdrawn:         "Withdrawn",
};

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const r = await fetch(RESEND_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    return r.ok;
  } catch { return false; }
}

function buildEmail(app: Record<string, any>): string {
  const ref        = app.reference_code || "N/A";
  const name       = app.applicant_name || "Applicant";
  const firstName  = name.split(" ")[0];
  const status     = app.status || "submitted";
  const payStatus  = app.payment_status || "pending";
  const aiScore    = app.ai_score;
  const venture    = app.venture?.company_name || app.applicant_name || "Your Venture";
  const sector     = app.venture?.sector || "";
  const stage      = app.venture?.stage || "";
  const statusLabel = STATUS_LABELS[status] || status.replace(/_/g, " ");
  const statusUrl  = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
  const payPending = payStatus !== "paid" && ["submitted", "under_review"].includes(status);
  const scoreColor = aiScore >= 70 ? "#22c55e" : aiScore >= 50 ? "#f59e0b" : aiScore > 0 ? "#ef4444" : "#C9A84C";
  const year       = new Date().getFullYear();

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0d1220 0%,#111827 100%);border-bottom:3px solid #C9A84C;padding:28px 32px;text-align:center">
    <div style="font-size:32px;margin-bottom:8px">🏛️</div>
    <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#475569;font-size:11px;margin-top:4px;letter-spacing:1px">Weekly Application Status Update</div>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#C9A84C;font-size:15px;font-weight:600;margin:0 0 8px">Weekly Update, ${firstName} 👋</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 24px">
      Here is your weekly status report for <strong style="color:#e2e8f0">${venture}</strong>${sector ? ` · ${sector}` : ""}${stage ? ` · ${stage}` : ""}.
    </p>

    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Reference Code</div>
      <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:4px">${ref}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:14px">
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Application Status</div>
        <div style="color:#e2e8f0;font-size:13px;font-weight:600">${statusLabel}</div>
      </div>
      <div style="background:#0d1220;border:${payStatus === "paid" ? "1px solid #166534" : "1px solid #92400e"};border-radius:6px;padding:14px">
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Payment Status</div>
        <div style="color:${payStatus === "paid" ? "#22c55e" : "#f59e0b"};font-size:13px;font-weight:600;text-transform:capitalize">${payStatus === "paid" ? "✅ Paid" : "⚠ Pending"}</div>
      </div>
    </div>

    ${aiScore != null && aiScore > 0 ? `
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:14px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <div style="width:52px;height:52px;border-radius:50%;border:2px solid ${scoreColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <span style="color:${scoreColor};font-size:16px;font-weight:700">${aiScore}</span>
      </div>
      <div>
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">AI Endorsement Score</div>
        <div style="color:#94a3b8;font-size:12px">Your venture scored <strong style="color:${scoreColor}">${aiScore}/100</strong> on our AI assessment framework.</div>
      </div>
    </div>` : ""}

    ${payPending ? `
    <div style="background:#1a0f00;border:1px solid #92400e;border-radius:8px;padding:16px;margin-bottom:20px">
      <div style="color:#f59e0b;font-size:13px;font-weight:600;margin-bottom:6px">⚠ Action Required — Payment Pending</div>
      <div style="color:#94a3b8;font-size:12px;line-height:1.7;margin-bottom:12px">Your endorsement fee of <strong style="color:#e2e8f0">£1,200.00 GBP</strong> is outstanding. Your 90-day expert review begins immediately upon payment.</div>
      <a href="${statusUrl}" style="background:#f59e0b;color:#0A0E1A;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase">Complete Payment →</a>
    </div>` : ""}

    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:14px;margin-bottom:20px">
      <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Your 90-Day Journey</div>
      <div style="font-size:12px;color:#475569">
        <div style="margin-bottom:6px;color:${payStatus === "paid" ? "#22c55e" : "#475569"}">
          ${payStatus === "paid" ? "✅" : "⬜"} <span style="color:${payStatus === "paid" ? "#e2e8f0" : "#475569"}">Payment & Review Commencement</span>
        </div>
        <div style="margin-bottom:6px;color:#475569">⬜ Expert Panel Assessment (Day 30)</div>
        <div style="margin-bottom:6px;color:#475569">⬜ Full Review Completion (Day 60)</div>
        <div style="color:#475569">⬜ Official Endorsement Decision (Day 90)</div>
      </div>
    </div>

    <div style="text-align:center;margin-top:24px">
      <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;display:inline-block">View Full Application Status →</a>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:16px 32px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority · <a href="${DOMAIN}" style="color:#C9A84C;text-decoration:none">primeendorsement.com</a></p>
    <p style="color:#374151;font-size:10px;margin:6px 0 0">You are receiving this because you have an active application. Ref: ${ref}</p>
  </div>
</div>
</body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const resendKey    = Deno.env.get("RESEND_API_KEY") || "";
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";

    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }), { status: 500, headers: CORS });
    }

    // Fetch all applications via REST (no SDK dependency)
    const appsRes = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application`, {
      headers: { "Authorization": `Bearer ${serviceToken}` },
    });
    if (!appsRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `DB fetch failed: ${appsRes.status}` }), { status: 500, headers: CORS });
    }

    const apps = await appsRes.json();
    const active = (apps || []).filter((a: any) =>
      a.applicant_email &&
      a.reference_code &&
      !["withdrawn", "closed", "rejected"].includes(a.status || "")
    );

    console.log(`[weekly] Sending to ${active.length} active applicants`);

    let sent = 0, failed = 0;
    for (const app of active) {
      const ref       = app.reference_code || "?";
      const email     = app.applicant_email;
      const venture   = app.venture?.company_name || app.applicant_name || "Unknown";
      const aiScore   = app.ai_score || 0;
      const subject   = `📊 Weekly Update — ${ref} | ${venture} | Prime Endorsement Authority`;

      const ok = await sendEmail(resendKey, email, subject, buildEmail(app));
      if (ok) {
        sent++;
        console.log(`[weekly] ✅ Sent to ${ref} (${email}) score=${aiScore}`);
      } else {
        failed++;
        console.error(`[weekly] ❌ Failed for ${ref}`);
      }
    }

    return new Response(JSON.stringify({ success: true, sent, failed, total: active.length, timestamp: new Date().toISOString() }), { headers: CORS });

  } catch (err: any) {
    console.error("[weekly] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
