/**
 * peaInvoiceReceipt — NEW 2026-05-29
 *
 * AI-Powered Invoice & Receipt Generator for Prime Endorsement Authority.
 *
 * POST /peaInvoiceReceipt
 *   { type: "invoice" | "receipt", reference_code?, application_id?, stripe_session_id? }
 *
 * - Generates a beautiful HTML invoice or receipt
 * - Uses AI (GPT-4o-mini) to personalise the executive summary / endorsement note
 * - Emails it to the applicant
 * - Returns the HTML directly (also embeddable as printable page)
 * - Updates Application record with receipt/invoice metadata
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const AGENT_APP   = "6a14246111a4fa5e22999619";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function dbGet(appId: string, entity: string, token: string): Promise<any[]> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`DB GET failed: ${r.status}`);
  return r.json();
}

async function findApp(appId: string, token: string, params: { id?: string; ref?: string; sessionId?: string }): Promise<any> {
  if (params.id) {
    const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/Application/${params.id}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (r.ok) return r.json();
  }
  const all = await dbGet(appId, "Application", token);
  if (params.ref)       return all.find((a: any) => a.reference_code === params.ref) || null;
  if (params.sessionId) return all.find((a: any) => a.payment_reference === params.sessionId) || null;
  return null;
}

async function dbUpdate(appId: string, entity: string, id: string, token: string, data: object): Promise<void> {
  await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function aiPersonalise(app: Record<string, any>, type: "invoice" | "receipt", openaiKey: string): Promise<string> {
  const venture = app.venture?.company_name || "your venture";
  const sector  = app.venture?.sector || "technology";
  const stage   = app.venture?.stage || "early stage";
  const score   = app.ai_score;

  const prompt = type === "invoice"
    ? `Write a 2-sentence professional invoice description for Prime Endorsement Authority.
       Applicant: ${app.applicant_name}, Venture: ${venture} (${sector}, ${stage} stage).
       Mention the 90-day expert review and global digital authority endorsement.
       Tone: formal, authoritative, prestigious. Max 60 words.`
    : `Write a 2-sentence official receipt acknowledgment for Prime Endorsement Authority.
       Applicant: ${app.applicant_name}, Venture: ${venture}${score ? `, AI Endorsement Score: ${score}/100` : ""}.
       Confirm payment received and 90-day review has commenced. 
       Tone: formal, warm, prestigious. Max 60 words.`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 100,
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const d = await r.json();
    return d.choices[0].message.content.trim();
  } catch (e: any) {
    console.warn("[invoice] AI personalisation failed:", e.message);
    return type === "invoice"
      ? `This invoice covers the Prime Endorsement Authority endorsement fee for ${venture}. Your application will undergo a comprehensive 90-day expert review by our global panel.`
      : `Payment received for the Prime Endorsement Authority endorsement programme. Your 90-day expert assessment has officially commenced.`;
  }
}

function generateInvoiceNumber(ref: string): string {
  const year = new Date().getFullYear();
  const num  = ref.split("-").pop() || "000000";
  return `INV-${year}-${num}`;
}

function generateReceiptNumber(ref: string): string {
  const year = new Date().getFullYear();
  const num  = ref.split("-").pop() || "000000";
  return `REC-${year}-${num}`;
}

function formatDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function invoiceHtml(app: Record<string, any>, aiNote: string, invoiceNum: string): string {
  const ref       = app.reference_code || "N/A";
  const name      = app.applicant_name || "N/A";
  const email     = app.applicant_email || "";
  const venture   = app.venture?.company_name || "N/A";
  const sector    = app.venture?.sector || "N/A";
  const stage     = app.venture?.stage || "N/A";
  const country   = app.founder?.country_of_residence || "N/A";
  const issued    = formatDate();
  const due       = formatDate();
  const year      = new Date().getFullYear();
  const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Invoice ${invoiceNum} — Prime Endorsement Authority</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;padding:40px 20px;color:#1e293b}
    .page{max-width:720px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
    .header{background:#0A0E1A;padding:40px 48px;position:relative;overflow:hidden}
    .header::before{content:"";position:absolute;top:0;right:0;width:200px;height:100%;background:linear-gradient(135deg,transparent 0%,rgba(201,168,76,.08) 100%)}
    .brand{color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:5px;text-transform:uppercase;margin-bottom:4px}
    .brand-sub{color:#475569;font-size:11px;letter-spacing:1px}
    .invoice-title{color:#fff;font-size:28px;font-weight:300;margin-top:24px;letter-spacing:2px}
    .invoice-num{color:#C9A84C;font-size:14px;font-weight:700;letter-spacing:3px;margin-top:4px}
    .header-right{position:absolute;top:40px;right:48px;text-align:right}
    .status-badge{background:rgba(201,168,76,.15);border:1px solid #C9A84C;color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:6px 16px;border-radius:20px}
    .body{padding:48px}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:40px}
    .meta-section h3{color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:8px}
    .meta-row{display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px}
    .meta-label{color:#94a3b8}
    .meta-value{color:#1e293b;font-weight:500}
    .items-table{width:100%;border-collapse:collapse;margin:32px 0}
    .items-table th{background:#f8fafc;color:#64748b;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:12px 16px;text-align:left;border-bottom:2px solid #e2e8f0}
    .items-table td{padding:14px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151}
    .items-table td:last-child{text-align:right;font-weight:600}
    .totals{margin-left:auto;max-width:280px;margin-top:8px}
    .total-row{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;border-bottom:1px solid #f1f5f9}
    .total-row.grand{border-bottom:2px solid #C9A84C;border-top:2px solid #C9A84C;margin-top:8px;padding:12px 0}
    .total-row.grand span:last-child{color:#C9A84C;font-size:18px;font-weight:700}
    .ai-note{background:#fffbeb;border-left:4px solid #C9A84C;padding:16px 20px;margin:32px 0;border-radius:0 6px 6px 0}
    .ai-note-label{color:#92400e;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
    .ai-note-text{color:#78350f;font-size:13px;line-height:1.7}
    .footer-bar{background:#0A0E1A;padding:24px 48px;display:flex;justify-content:space-between;align-items:center}
    .footer-brand{color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase}
    .footer-copy{color:#475569;font-size:11px}
    .print-btn{background:#C9A84C;color:#0A0E1A;border:none;padding:8px 24px;border-radius:4px;font-weight:700;font-size:12px;cursor:pointer;letter-spacing:1px;text-transform:uppercase}
    @media print{.print-btn{display:none}body{padding:0;background:#fff}.page{box-shadow:none;border-radius:0}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">Prime Endorsement Authority</div>
    <div class="brand-sub">Global Digital Authority for Founder Ventures</div>
    <div class="invoice-title">INVOICE</div>
    <div class="invoice-num">${invoiceNum}</div>
    <div class="header-right">
      <div class="status-badge">Awaiting Payment</div>
      <div style="color:#475569;font-size:11px;margin-top:12px">Issue Date: ${issued}</div>
      <div style="color:#475569;font-size:11px;margin-top:4px">Due: ${due}</div>
    </div>
  </div>
  <div class="body">
    <div class="meta-grid">
      <div class="meta-section">
        <h3>Billed To</h3>
        <div class="meta-row"><span class="meta-label">Name</span><span class="meta-value">${name}</span></div>
        <div class="meta-row"><span class="meta-label">Email</span><span class="meta-value">${email}</span></div>
        <div class="meta-row"><span class="meta-label">Country</span><span class="meta-value">${country}</span></div>
        <div class="meta-row"><span class="meta-label">Venture</span><span class="meta-value">${venture}</span></div>
        <div class="meta-row"><span class="meta-label">Sector</span><span class="meta-value">${sector}</span></div>
        <div class="meta-row"><span class="meta-label">Stage</span><span class="meta-value">${stage}</span></div>
      </div>
      <div class="meta-section">
        <h3>From</h3>
        <div class="meta-row"><span class="meta-label">Authority</span><span class="meta-value">Prime Endorsement Authority</span></div>
        <div class="meta-row"><span class="meta-label">Website</span><span class="meta-value">primeendorsement.com</span></div>
        <div class="meta-row"><span class="meta-label">Email</span><span class="meta-value">${ADMIN_EMAIL}</span></div>
        <div class="meta-row"><span class="meta-label">Reference</span><span class="meta-value" style="color:#C9A84C;font-weight:700">${ref}</span></div>
      </div>
    </div>
    <table class="items-table">
      <thead><tr>
        <th style="width:60%">Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr></thead>
      <tbody>
        <tr>
          <td>
            <strong>Prime Endorsement Authority — Expert Endorsement Programme</strong><br/>
            <span style="color:#6b7280;font-size:11px;margin-top:2px;display:block">90-Day Expert Panel Review · Global Digital Authority Certification · Ref: ${ref}</span>
          </td>
          <td>1</td>
          <td>£1,000.00</td>
          <td>£1,000.00</td>
        </tr>
        <tr>
          <td><span style="color:#6b7280">VAT (20%)</span></td>
          <td></td>
          <td></td>
          <td>£200.00</td>
        </tr>
      </tbody>
    </table>
    <div class="totals">
      <div class="total-row"><span style="color:#6b7280">Subtotal</span><span>£1,000.00</span></div>
      <div class="total-row"><span style="color:#6b7280">VAT (20%)</span><span>£200.00</span></div>
      <div class="total-row grand"><span style="font-weight:700">Total Due</span><span>£1,200.00 GBP</span></div>
    </div>
    <div class="ai-note">
      <div class="ai-note-label">🤖 AI Assessment Note</div>
      <div class="ai-note-text">${aiNote}</div>
    </div>
    <div style="text-align:center;margin-top:32px">
      <button class="print-btn" onclick="window.print()">🖨 Print Invoice</button>
      <div style="margin-top:12px">
        <a href="${statusUrl}" style="color:#C9A84C;font-size:12px;text-decoration:none">Track Application Status →</a>
      </div>
    </div>
  </div>
  <div class="footer-bar">
    <div class="footer-brand">Prime Endorsement Authority</div>
    <div class="footer-copy">© ${year} · All rights reserved · primeendorsement.com</div>
  </div>
</div>
</body></html>`;
}

function receiptHtml(app: Record<string, any>, aiNote: string, receiptNum: string, paymentDate: string, stripeSessionId: string): string {
  const ref       = app.reference_code || "N/A";
  const name      = app.applicant_name || "N/A";
  const email     = app.applicant_email || "";
  const venture   = app.venture?.company_name || "N/A";
  const sector    = app.venture?.sector || "N/A";
  const stage     = app.venture?.stage || "N/A";
  const country   = app.founder?.country_of_residence || "N/A";
  const aiScore   = app.ai_score;
  const day90     = app.day_90_start ? formatDate(app.day_90_start) : formatDate();
  const year      = new Date().getFullYear();
  const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
  const scoreColor = aiScore >= 70 ? "#22c55e" : aiScore >= 50 ? "#f59e0b" : aiScore > 0 ? "#ef4444" : "#C9A84C";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Receipt ${receiptNum} — Prime Endorsement Authority</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;padding:40px 20px}
    .page{max-width:720px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
    .header{background:#0A0E1A;padding:40px 48px;position:relative;overflow:hidden}
    .header::before{content:"";position:absolute;top:0;right:0;width:200px;height:100%;background:linear-gradient(135deg,transparent 0%,rgba(34,197,94,.08) 100%)}
    .brand{color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:5px;text-transform:uppercase;margin-bottom:4px}
    .brand-sub{color:#475569;font-size:11px;letter-spacing:1px}
    .receipt-title{color:#fff;font-size:28px;font-weight:300;margin-top:24px;letter-spacing:2px}
    .receipt-num{color:#22c55e;font-size:14px;font-weight:700;letter-spacing:3px;margin-top:4px}
    .header-right{position:absolute;top:40px;right:48px;text-align:right}
    .paid-badge{background:rgba(34,197,94,.15);border:1px solid #22c55e;color:#22c55e;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:6px 16px;border-radius:20px}
    .body{padding:48px}
    .paid-banner{background:#f0fdf4;border:2px solid #22c55e;border-radius:8px;padding:20px 24px;text-align:center;margin-bottom:32px}
    .paid-icon{font-size:36px}
    .paid-text{color:#166534;font-size:15px;font-weight:700;margin-top:6px}
    .paid-sub{color:#4ade80;font-size:12px;margin-top:4px}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px}
    .meta-section h3{color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:8px}
    .meta-row{display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px}
    .meta-label{color:#94a3b8}
    .meta-value{color:#1e293b;font-weight:500}
    .payment-box{background:#0A0E1A;border-radius:8px;padding:24px;margin:24px 0;color:#fff}
    .payment-title{color:#22c55e;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px}
    .payment-row{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;border-bottom:1px solid #1e293b}
    .payment-row:last-child{border:none}
    .payment-row.total span:last-child{color:#22c55e;font-size:18px;font-weight:700}
    .score-box{background:${aiScore > 0 ? "#0a1a0a" : "#0d1220"};border:1px solid ${aiScore > 0 ? "#166534" : "#1e293b"};border-radius:8px;padding:20px 24px;margin:20px 0;display:flex;align-items:center;gap:20px}
    .score-circle{width:72px;height:72px;border-radius:50%;background:transparent;border:3px solid ${scoreColor};display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .score-num{color:${scoreColor};font-size:20px;font-weight:700}
    .score-info-title{color:#e2e8f0;font-size:14px;font-weight:600;margin-bottom:4px}
    .score-info-sub{color:#64748b;font-size:12px}
    .timeline{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px 24px;margin:20px 0}
    .tl-title{color:#92400e;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px}
    .tl-item{display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:13px}
    .tl-dot{width:8px;height:8px;border-radius:50%;background:#C9A84C;flex-shrink:0}
    .tl-label{color:#92400e;font-weight:600;min-width:60px}
    .tl-desc{color:#78350f}
    .ai-note{background:#fffbeb;border-left:4px solid #22c55e;padding:16px 20px;margin:24px 0;border-radius:0 6px 6px 0}
    .ai-note-label{color:#166534;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
    .ai-note-text{color:#14532d;font-size:13px;line-height:1.7}
    .footer-bar{background:#0A0E1A;padding:24px 48px;display:flex;justify-content:space-between;align-items:center}
    .footer-brand{color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase}
    .footer-copy{color:#475569;font-size:11px}
    .print-btn{background:#22c55e;color:#fff;border:none;padding:8px 24px;border-radius:4px;font-weight:700;font-size:12px;cursor:pointer;letter-spacing:1px;text-transform:uppercase}
    @media print{.print-btn{display:none}body{padding:0;background:#fff}.page{box-shadow:none;border-radius:0}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">Prime Endorsement Authority</div>
    <div class="brand-sub">Global Digital Authority for Founder Ventures</div>
    <div class="receipt-title">OFFICIAL RECEIPT</div>
    <div class="receipt-num">${receiptNum}</div>
    <div class="header-right">
      <div class="paid-badge">✓ Payment Confirmed</div>
      <div style="color:#475569;font-size:11px;margin-top:12px">Issued: ${paymentDate}</div>
      <div style="color:#475569;font-size:11px;margin-top:4px">Ref: ${ref}</div>
    </div>
  </div>
  <div class="body">
    <div class="paid-banner">
      <div class="paid-icon">✅</div>
      <div class="paid-text">Payment of £1,200.00 GBP Received</div>
      <div class="paid-sub">Your 90-day expert review has officially commenced</div>
    </div>
    <div class="meta-grid">
      <div class="meta-section">
        <h3>Received From</h3>
        <div class="meta-row"><span class="meta-label">Name</span><span class="meta-value">${name}</span></div>
        <div class="meta-row"><span class="meta-label">Email</span><span class="meta-value">${email}</span></div>
        <div class="meta-row"><span class="meta-label">Country</span><span class="meta-value">${country}</span></div>
        <div class="meta-row"><span class="meta-label">Venture</span><span class="meta-value">${venture}</span></div>
        <div class="meta-row"><span class="meta-label">Sector/Stage</span><span class="meta-value">${sector} · ${stage}</span></div>
      </div>
      <div class="meta-section">
        <h3>Payment Details</h3>
        <div class="meta-row"><span class="meta-label">Receipt No.</span><span class="meta-value" style="color:#22c55e;font-weight:700">${receiptNum}</span></div>
        <div class="meta-row"><span class="meta-label">Date Paid</span><span class="meta-value">${paymentDate}</span></div>
        <div class="meta-row"><span class="meta-label">Method</span><span class="meta-value">Card (Stripe)</span></div>
        <div class="meta-row"><span class="meta-label">Reference</span><span class="meta-value" style="color:#C9A84C">${ref}</span></div>
        ${stripeSessionId ? `<div class="meta-row"><span class="meta-label">Session</span><span class="meta-value" style="font-size:10px">${stripeSessionId.substring(0,24)}…</span></div>` : ""}
      </div>
    </div>
    <div class="payment-box">
      <div class="payment-title">💳 Payment Breakdown</div>
      <div class="payment-row"><span>Expert Endorsement Programme</span><span>£1,000.00</span></div>
      <div class="payment-row"><span style="color:#94a3b8">VAT (20%)</span><span>£200.00</span></div>
      <div class="payment-row total"><span style="font-weight:700;font-size:14px">Total Paid</span><span>£1,200.00 GBP</span></div>
    </div>
    ${aiScore != null && aiScore > 0 ? `<div class="score-box">
      <div class="score-circle"><div class="score-num">${aiScore}</div></div>
      <div>
        <div class="score-info-title">AI Endorsement Score</div>
        <div class="score-info-sub">Your venture scored ${aiScore}/100 on our AI assessment framework covering founder credibility, innovation, market opportunity, traction, and global potential.</div>
      </div>
    </div>` : ""}
    <div class="timeline">
      <div class="tl-title">📅 Your 90-Day Review Timeline</div>
      <div class="tl-item"><div class="tl-dot"></div><span class="tl-label">Day 0</span><span class="tl-desc">Payment confirmed — expert review commenced (${day90})</span></div>
      <div class="tl-item"><div class="tl-dot" style="background:#94a3b8"></div><span class="tl-label">Day 30</span><span class="tl-desc">First expert panel update delivered</span></div>
      <div class="tl-item"><div class="tl-dot" style="background:#94a3b8"></div><span class="tl-label">Day 60</span><span class="tl-desc">Full assessment review completed</span></div>
      <div class="tl-item"><div class="tl-dot" style="background:#C9A84C"></div><span class="tl-label">Day 90</span><span class="tl-desc">Official endorsement decision issued</span></div>
    </div>
    <div class="ai-note">
      <div class="ai-note-label">🤖 AI Authority Note</div>
      <div class="ai-note-text">${aiNote}</div>
    </div>
    <div style="text-align:center;margin-top:32px">
      <button class="print-btn" onclick="window.print()">🖨 Print Receipt</button>
      <div style="margin-top:12px">
        <a href="${statusUrl}" style="color:#C9A84C;font-size:12px;text-decoration:none">Track Your Application →</a>
      </div>
    </div>
  </div>
  <div class="footer-bar">
    <div class="footer-brand">Prime Endorsement Authority</div>
    <div class="footer-copy">© ${year} · Official Receipt · primeendorsement.com</div>
  </div>
</div>
</body></html>`;
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const r = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], bcc: ["admin@primeendorsement.com"], subject, html }),
  });
  if (!r.ok) console.error("[invoice] Email error:", r.status, await r.text());
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...CORS, "Content-Type": "application/json" } });

  const url    = new URL(req.url);
  const qType  = url.searchParams.get("type") || "receipt";
  const qRef   = url.searchParams.get("ref")  || "";
  const qEmail = url.searchParams.get("email") || "";

  try {
    let body: Record<string, any> = {};
    if (req.method === "POST") {
      body = await req.json().catch(() => ({}));
    }

    const docType         = (body.type || qType) as "invoice" | "receipt";
    const reference_code  = body.reference_code  || qRef;
    const application_id  = body.application_id  || "";
    const stripe_session  = body.stripe_session_id || "";
    const sendEmailFlag   = body.send_email !== false; // default true
    const returnHtml      = body.return_html !== false; // default true

    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const resendKey    = Deno.env.get("RESEND_API_KEY") || "";
    const openaiKey    = Deno.env.get("OPENAI_API_KEY") || "";

    // Find application
    const app = await findApp(BUILDER_APP, serviceToken, {
      id:        application_id,
      ref:       reference_code,
      sessionId: stripe_session,
    });

    if (!app) {
      return new Response(JSON.stringify({ success: false, error: "Application not found" }), {
        status: 404,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // For invoice: applicant doesn't need to be paid
    // For receipt: should be paid
    if (docType === "receipt" && app.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, error: "Receipt can only be generated for paid applications" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // AI personalisation
    const aiNote = await aiPersonalise(app, docType, openaiKey);

    // Generate document
    const ref         = app.reference_code || "N/A";
    const paymentDate = formatDate(app.submitted_at);
    const sessionId   = app.payment_reference || stripe_session || "";

    let html: string;
    let docNumber: string;
    let subject: string;

    if (docType === "invoice") {
      docNumber = generateInvoiceNumber(ref);
      html      = invoiceHtml(app, aiNote, docNumber);
      subject   = `🧾 Invoice ${docNumber} — Prime Endorsement Authority`;
    } else {
      docNumber = generateReceiptNumber(ref);
      html      = receiptHtml(app, aiNote, docNumber, paymentDate, sessionId);
      subject   = `✅ Official Receipt ${docNumber} — Prime Endorsement Authority`;
    }

    // Update DB record
    try {
      if (docType === "receipt") {
        await dbUpdate(BUILDER_APP, "Application", app.id, serviceToken, {
          certificate_generated_at: new Date().toISOString(),
        });
      }
    } catch (_) {}

    // Email to applicant
    const recipientEmail = app.applicant_email || (body.email || qEmail);
    if (sendEmailFlag && resendKey && recipientEmail) {
      try {
        await sendEmail(resendKey, recipientEmail, subject, html);
        // Also email a copy to admin
        await sendEmail(resendKey, ADMIN_EMAIL,
          `📄 ${docType === "invoice" ? "Invoice" : "Receipt"} Generated — ${ref}`,
          `<div style="font-family:sans-serif;padding:20px;background:#0A0E1A;color:#e2e8f0">
            <h3 style="color:#C9A84C">📄 ${docType === "invoice" ? "Invoice" : "Receipt"} Generated</h3>
            <p><strong>Document:</strong> ${docNumber}</p>
            <p><strong>Applicant:</strong> ${app.applicant_name}</p>
            <p><strong>Email:</strong> ${recipientEmail}</p>
            <p><strong>Reference:</strong> ${ref}</p>
            <p><strong>Amount:</strong> £1,200.00 GBP</p>
            <p style="margin-top:12px;color:#94a3b8;font-size:12px">Document emailed to applicant successfully.</p>
          </div>`
        );
      } catch (e: any) {
        console.warn("[invoice] Email failed:", e.message);
      }
    }

    // Return HTML page directly (printable)
    if (returnHtml) {
      return new Response(html, {
        headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(JSON.stringify({
      success:    true,
      type:       docType,
      document:   docNumber,
      reference:  ref,
      emailed_to: recipientEmail || null,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[invoice] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
}
