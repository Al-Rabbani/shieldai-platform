/**
 * peaWeeklyStatus — v3 (Resend API, no SMTP)
 * Sends weekly status update emails to ALL active applicants.
 * Triggered every Monday at 08:00.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";
const DOMAIN      = "https://primeendorsement.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

const STATUS_LABELS: Record<string, { label: string; color: string; message: string }> = {
  draft:            { label: "Draft",           color: "#94a3b8", message: "Your application draft is saved. Complete and submit to begin review." },
  submitted:        { label: "Submitted",        color: "#3b82f6", message: "Your application has been received and is awaiting payment to begin the review process." },
  pending_payment:  { label: "Payment Pending",  color: "#f59e0b", message: "Please complete your £1,200.00 endorsement fee payment to proceed to review." },
  payment_received: { label: "Payment Received", color: "#22c55e", message: "Payment confirmed. Your application has been queued for expert panel review." },
  under_review:     { label: "Under Review",     color: "#8b5cf6", message: "Your application is currently being assessed by our expert panel. This typically takes 30–45 days." },
  interview_stage:  { label: "Interview Stage",  color: "#06b6d4", message: "You have been selected for an interview. Check your email for scheduling details." },
  approved:         { label: "Approved ✓",       color: "#22c55e", message: "Congratulations! Your endorsement application has been approved." },
  rejected:         { label: "Unsuccessful",     color: "#ef4444", message: "After careful review, your application was unsuccessful at this time. You may reapply after 6 months." },
  on_hold:          { label: "On Hold",          color: "#f59e0b", message: "Your application has been placed on hold pending additional information. Check your email." },
  withdrawn:        { label: "Withdrawn",        color: "#64748b", message: "Your application has been withdrawn." },
};

function buildStatusEmail(app: Record<string, any>, statusUrl: string, year: number): string {
  const st        = STATUS_LABELS[app.status] || STATUS_LABELS["submitted"];
  const firstName = (app.applicant_name || "Applicant").split(" ")[0];
  const refCode   = app.reference_code || "N/A";
  const venture   = app.venture_name   || "Your Venture";
  const role      = app.applicant_role || "Founder";

  const statusOrder = ["draft","submitted","pending_payment","payment_received","under_review","interview_stage","approved","rejected"];
  const steps = [
    { key: "submitted",        label: "Submitted"        },
    { key: "payment_received", label: "Payment Received" },
    { key: "under_review",     label: "Under Review"     },
    { key: "approved",         label: "Decision Issued"  },
  ];
  const currentIdx = statusOrder.indexOf(app.status);
  const timelineItems = steps.map((s, i) => {
    const stepIdx = statusOrder.indexOf(s.key);
    const done    = currentIdx >= stepIdx;
    const active  = s.key === app.status;
    const dot     = done ? "#22c55e" : active ? "#C9A84C" : "#1e293b";
    const lbl     = done ? "#e2e8f0" : active ? "#C9A84C" : "#475569";
    const line    = i < steps.length - 1
      ? `<div style="position:absolute;top:10px;left:50%;right:-50%;height:2px;background:${done ? "#22c55e" : "#1e293b"};z-index:0;"></div>`
      : "";
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative;">
        ${line}
        <div style="width:20px;height:20px;border-radius:50%;background:${dot};z-index:1;border:2px solid ${dot};"></div>
        <div style="color:${lbl};font-size:10px;margin-top:6px;text-align:center;">${s.label}</div>
      </div>`;
  }).join("");

  const payBadge = app.payment_status === "paid"
    ? `<span style="background:rgba(34,197,94,.15);color:#22c55e;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;">PAID</span>`
    : `<span style="background:rgba(245,158,11,.15);color:#f59e0b;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;">PAYMENT DUE</span>`;

  const paySection = app.payment_status !== "paid"
    ? `<div style="background:#1a1000;border:1px solid #92400e;border-radius:6px;padding:16px 18px;margin:20px 0;">
        <div style="color:#f59e0b;font-size:13px;font-weight:600;margin-bottom:6px;">⚠ Action Required: Complete Payment</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 12px;">Your endorsement fee of <strong style="color:#fff">£1,200.00</strong> (£1,000 + £200 VAT) is outstanding.</p>
        <a href="${DOMAIN}/apply" style="display:inline-block;background:#f59e0b;color:#0A0E1A;text-decoration:none;padding:9px 22px;border-radius:5px;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Complete Payment</a>
      </div>` : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#111827;border-bottom:2px solid #C9A84C;padding:32px 40px;text-align:center;">
    <div style="display:inline-block;border:1px solid #C9A84C;padding:4px 14px;border-radius:2px;margin-bottom:10px;">
      <span style="color:#C9A84C;font-size:10px;letter-spacing:4px;text-transform:uppercase;">Weekly Status Update</span>
    </div>
    <div style="color:#C9A84C;font-size:20px;font-weight:700;letter-spacing:4px;text-transform:uppercase;">PRIME ENDORSEMENT AUTHORITY</div>
    <div style="color:#e2e8f0;font-size:12px;letter-spacing:2px;opacity:.7;margin-top:4px;">${role} Application — Status Report</div>
  </div>
  <div style="padding:32px 40px;background:#111827;">
    <div style="color:#C9A84C;font-size:15px;font-weight:600;margin-bottom:4px;">Weekly Update, ${firstName} 🏛️</div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin-bottom:22px;">Here is your application status update for the week.</p>
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:14px 20px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:3px;">Reference</div>
          <div style="color:#C9A84C;font-size:18px;font-weight:700;letter-spacing:2px;">${refCode}</div>
        </div>
        <div style="text-align:right;">
          <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px;">Venture</div>
          <div style="color:#e2e8f0;font-size:13px;font-weight:500;">${venture}</div>
        </div>
      </div>
    </div>
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:8px;padding:20px 22px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;">Current Status</div>
        ${payBadge}
      </div>
      <div style="display:inline-block;background:${st.color}22;border:1px solid ${st.color};color:${st.color};padding:6px 18px;border-radius:99px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">${st.label}</div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">${st.message}</p>
    </div>
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:8px;padding:20px 22px;margin-bottom:20px;">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">Application Journey</div>
      <div style="display:flex;justify-content:space-between;position:relative;">${timelineItems}</div>
    </div>
    ${paySection}
    <div style="text-align:center;margin:28px 0 20px;">
      <a href="${statusUrl}" style="display:inline-block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 44px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;">View Live Status →</a>
    </div>
    <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;"/>
    <p style="text-align:center;color:#475569;font-size:12px;line-height:1.7;">
      Questions? <a href="mailto:admin@primeendorsement.com" style="color:#C9A84C;">admin@primeendorsement.com</a>
    </p>
    <p style="text-align:center;color:#334155;font-size:11px;margin-top:10px;letter-spacing:1px;">🔒 AES-256 · TLS 1.3 · PCI DSS Compliant</p>
  </div>
  <div style="background:#0d1220;padding:18px 40px;text-align:center;border-top:1px solid #1e293b;">
    <p style="color:#475569;font-size:12px;margin:3px 0;"><strong style="color:#94a3b8">Prime Endorsement Authority</strong> — Automated Status System</p>
    <p style="color:#475569;font-size:12px;margin:3px 0;">© ${year} Prime Endorsement Authority. All rights reserved.</p>
  </div>
</div>
</body></html>`;
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<{ id: string }> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend ${res.status}: ${err}`);
  }
  return res.json();
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY") || "re_5vRFtg73_2igwJfrqbG9LxQXkwGAhzkd9";
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }), { status: 500, headers: CORS });
    }

    const base44 = createClientFromRequest(req);
    const year   = new Date().getFullYear();

    // Read all active applications
    const apps = await base44.asServiceRole.entities.Application.filter({});
    const active = (apps || []).filter((a: any) =>
      a.applicant_email &&
      a.reference_code &&
      !["withdrawn", "closed", "rejected"].includes(a.status || "")
    );

    console.log(`[peaWeeklyStatus] Sending to ${active.length} applicants`);

    let sent = 0, failed = 0;
    for (const app of active) {
      try {
        const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(app.reference_code)}`;
        const html      = buildStatusEmail(app, statusUrl, year);
        await sendEmail(
          apiKey,
          app.applicant_email,
          `📊 Weekly Update — ${app.reference_code} | Prime Endorsement Authority`,
          html,
        );
        sent++;
        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 200));
      } catch (e: any) {
        console.error(`[peaWeeklyStatus] Failed for ${app.reference_code}:`, e.message);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: active.length }),
      { headers: CORS }
    );

  } catch (err: any) {
    console.error("[peaWeeklyStatus] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
