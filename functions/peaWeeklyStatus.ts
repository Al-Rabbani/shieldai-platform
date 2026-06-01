/**
 * peaWeeklyStatus — v6 HARDENED 2026-05-30
 *
 * Sends weekly digest emails to all active applicants.
 * STRICT GUARDS:
 *   - Only runs on Monday (day-of-week check)
 *   - Checks last_weekly_sent field on each Application record
 *   - Skips any applicant whose last_weekly_sent was within the last 6 days
 *   - Max 4 sends per applicant per calendar month
 *   - Never sends more than once per week per applicant
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
  const ref         = app.reference_code || "N/A";
  const name        = app.applicant_name || "Applicant";
  const firstName   = name.split(" ")[0];
  const status      = app.status || "submitted";
  const payStatus   = app.payment_status || "pending";
  const aiScore     = app.ai_score;
  const venture     = app.venture_name || app.applicant_name || "Your Venture";
  const sector      = app.venture_sector || "";
  const stage       = app.venture_stage || "";
  const statusLabel = STATUS_LABELS[status] || status.replace(/_/g, " ");
  const statusUrl   = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
  const payPending  = payStatus !== "paid";
  const scoreColor  = aiScore >= 70 ? "#22c55e" : aiScore >= 50 ? "#f59e0b" : aiScore > 0 ? "#ef4444" : "#C9A84C";
  const year        = new Date().getFullYear();

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:20px 32px;text-align:center"><img src="https://media.base44.com/images/public/6a14246111a4fa5e22999619/5c4547244_PrimeLogo.png" alt="Prime Endorsement Authority" style="height:64px;width:auto;display:inline-block;margin-bottom:8px"/><div style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-top:4px">Prime Endorsement Authority</div><div style="color:#475569;font-size:11px;margin-top:4px;letter-spacing:1px">Weekly Application Status Update</div></div>
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
        <div style="color:${payStatus === "paid" ? "#22c55e" : "#f59e0b"};font-size:13px;font-weight:600">${payStatus === "paid" ? "✅ Paid" : "⚠ Pending"}</div>
      </div>
    </div>

    ${aiScore != null && aiScore > 0 ? `
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:14px;margin-bottom:20px">
      <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">AI Endorsement Score</div>
      <div style="color:#94a3b8;font-size:12px">Scored <strong style="color:${scoreColor}">${aiScore}/100</strong> on assessment framework.</div>
    </div>` : ""}

    ${payPending ? `
    <div style="background:#1a0f00;border:1px solid #92400e;border-radius:8px;padding:16px;margin-bottom:20px">
      <div style="color:#f59e0b;font-size:13px;font-weight:600;margin-bottom:6px">⚠ Action Required — Payment Pending</div>
      <div style="color:#94a3b8;font-size:12px;line-height:1.7;margin-bottom:12px">Your endorsement fee of <strong style="color:#e2e8f0">£1,200.00 GBP</strong> is outstanding.</div>
      <a href="${statusUrl}" style="background:#f59e0b;color:#0A0E1A;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase">View Payment Portal →</a>
    </div>` : ""}

    <div style="text-align:center;margin-top:24px">
      <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;display:inline-block">View Full Application Status →</a>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:16px 32px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority · <a href="${DOMAIN}" style="color:#C9A84C;text-decoration:none">primeendorsement.com</a></p>
    <p style="color:#374151;font-size:10px;margin:6px 0 0">Weekly digest — sent once per week. Ref: ${ref}</p>
  </div>
</div>
</body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const resendKey    = Deno.env.get("RESEND_API_KEY") || "";
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";

    if (!resendKey || !serviceToken) {
      return new Response(JSON.stringify({ success: false, error: "Missing RESEND_API_KEY or BASE44_SERVICE_TOKEN" }), { status: 500, headers: CORS });
    }

    const now     = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    // ── GUARD 1: Only run on Mondays (UTC) ──────────────────────────────────
    // Allow override via ?force=true for admin testing
    const url    = new URL(req.url);
    const forced = url.searchParams.get("force") === "true";
    if (!forced && dayOfWeek !== 1) {
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: `Weekly emails only sent on Mondays. Today is day ${dayOfWeek}. Use ?force=true to override.`,
      }), { headers: CORS });
    }

    // ── Fetch all active applications ────────────────────────────────────────
    const appsRes = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application`, {
      headers: { "Authorization": `Bearer ${serviceToken}` },
    });
    if (!appsRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `DB fetch failed: ${appsRes.status}` }), { status: 500, headers: CORS });
    }

    const apps   = await appsRes.json();
    const active = (Array.isArray(apps) ? apps : apps.data || []).filter((a: any) =>
      a.applicant_email &&
      a.reference_code &&
      !["withdrawn", "closed", "rejected", "draft"].includes(a.status || "")
    );

    let sent = 0, skipped = 0, failed = 0;
    const results: any[] = [];

    for (const app of active) {
      const ref   = app.reference_code || "?";
      const email = app.applicant_email;
      const id    = app.id;

      // ── GUARD 2: Check last_weekly_sent — skip if within 6 days ────────────
      const lastSent = app.last_weekly_sent ? new Date(app.last_weekly_sent) : null;
      const daysSinceLast = lastSent ? (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24) : 999;
      if (daysSinceLast < 6) {
        console.log(`[weekly] ⏭ Skip ${ref} — last sent ${daysSinceLast.toFixed(1)} days ago`);
        skipped++;
        results.push({ ref, action: "skipped", reason: `last_sent ${daysSinceLast.toFixed(1)}d ago` });
        continue;
      }

      // ── GUARD 3: Max 4 sends per month ─────────────────────────────────────
      const monthCount = app.weekly_sends_this_month || 0;
      const sentMonth  = app.weekly_sends_month || "";
      const effectiveCount = sentMonth === currentMonth ? monthCount : 0;
      if (effectiveCount >= 4) {
        console.log(`[weekly] ⏭ Skip ${ref} — already sent ${effectiveCount}x this month`);
        skipped++;
        results.push({ ref, action: "skipped", reason: `monthly cap reached (${effectiveCount}/4)` });
        continue;
      }

      // ── Send the email ──────────────────────────────────────────────────────
      const venture = app.venture_name || app.applicant_name || "Your Venture";
      const subject = `📊 Weekly Update — ${ref} | ${venture} | Prime Endorsement Authority`;
      const ok      = await sendEmail(resendKey, email, subject, buildEmail(app));

      if (ok) {
        sent++;
        console.log(`[weekly] ✅ Sent to ${ref} (${email})`);
        results.push({ ref, action: "sent" });

        // ── Update last_weekly_sent + monthly counter ───────────────────────
        await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application/${id}`, {
          method: "PUT",
          headers: { "Authorization": `Bearer ${serviceToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            last_weekly_sent:        now.toISOString(),
            weekly_sends_this_month: effectiveCount + 1,
            weekly_sends_month:      currentMonth,
          }),
        });
      } else {
        failed++;
        console.error(`[weekly] ❌ Failed for ${ref}`);
        results.push({ ref, action: "failed" });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sent,
      skipped,
      failed,
      total: active.length,
      forced,
      timestamp: now.toISOString(),
      results,
    }), { headers: CORS });

  } catch (err: any) {
    console.error("[weekly] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
