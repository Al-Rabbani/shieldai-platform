/**
 * peaRegister — v7 AI-POWERED REGISTRATION SYSTEM 2026-05-30
 *
 * FULL END-TO-END DIGITAL REGISTRATION — COMPLETELY DECOUPLED FROM PAYMENT
 *
 * GET  → Serves the multi-step AI-powered registration form
 * POST → Full pipeline:
 *          1. Token validation
 *          2. Duplicate detection
 *          3. Field validation
 *          4. Document uploads
 *          5. AI scoring (OpenAI GPT-4o-mini)
 *          6. DB save (builder + agent)
 *          7. Registration completion email (with AI summary)
 *          8. Admin alert email
 *          9. Auto-trigger payment invitation (peaSendPaymentLetter)
 *         10. Serve beautiful completion screen
 *
 * Payment is SEPARATE — triggered after registration is complete.
 * Registration = Registration. Payment = Payment. Clean separation.
 */

const BUILDER_APP  = "69e2e852c48630e3502f13b1";
const AGENT_APP    = "6a14246111a4fa5e22999619";
const DOMAIN       = "https://primeendorsement.com";
const RESEND_API   = "https://api.resend.com/emails";
const FROM_EMAIL   = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL  = "admin@primeendorsement.com";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" };
const JSON_HEADERS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

// ── DB Helpers ────────────────────────────────────────────────────────────────
async function dbList(appId: string, entity: string, token: string): Promise<any[]> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d) ? d : d.data || [];
}

async function dbCreate(appId: string, entity: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`DB CREATE failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function dbUpdate(appId: string, entity: string, id: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`DB UPDATE failed: ${r.status}`);
  return r.json();
}

// ── Email ─────────────────────────────────────────────────────────────────────
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

// ── AI Scoring ────────────────────────────────────────────────────────────────
async function scoreWithAI(data: Record<string, any>, openaiKey: string): Promise<{ score: number; summary: string; recommendation: string; strengths: string[]; concerns: string[] }> {
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `You are a senior reviewer for Prime Endorsement Authority — a UK Innovator Founder Visa endorsement body. Assess this application objectively.

APPLICANT: ${data.applicant_name}
ROLE: ${data.applicant_role || "Founder"}
NATIONALITY: ${data.nationality}
VENTURE: ${data.venture_name}
SECTOR: ${data.venture_sector}
STAGE: ${data.venture_stage}
DESCRIPTION: ${data.venture_description}
DOCUMENTS: ${data.docs_count || 0} document(s) submitted
CO-FOUNDER: ${data.co_founder_name || "None"}

Score 0-100 based on: innovation potential, market viability, founder credibility, sector relevance, and programme fit.

Return ONLY valid JSON:
{
  "score": 0-100,
  "summary": "2-3 sentence executive summary suitable for the applicant to read",
  "recommendation": "Recommend|Consider|Decline",
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "key_concerns": ["concern 1", "concern 2"]
}`
        }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const j  = await r.json();
    const p  = JSON.parse(j.choices[0].message.content);
    return {
      score:          Math.min(100, Math.max(0, p.score || 0)),
      summary:        p.summary || "",
      recommendation: p.recommendation || "Consider",
      strengths:      p.key_strengths || [],
      concerns:       p.key_concerns || [],
    };
  } catch (e: any) {
    console.warn("[register] AI scoring failed:", e.message);
    return { score: 0, summary: "", recommendation: "", strengths: [], concerns: [] };
  }
}

// ── Error / Locked Screens ────────────────────────────────────────────────────
function errorScreen(title: string, message: string, actionUrl?: string, actionLabel?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Prime Endorsement Authority</title></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="max-width:520px;margin:40px auto;background:#111827;border-radius:12px;overflow:hidden;text-align:center">
  <div style="background:#0d1220;border-bottom:3px solid #ef4444;padding:28px">
    <div style="font-size:36px;margin-bottom:10px">⚠️</div>
    <div style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#ef4444;font-size:14px;font-weight:600;margin-top:8px">${title}</div>
  </div>
  <div style="padding:28px">
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 20px">${message}</p>
    ${actionUrl ? `<a href="${actionUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;display:inline-block">${actionLabel || "Continue →"}</a>` : ""}
    <p style="color:#475569;font-size:11px;margin-top:20px">For assistance: <a href="mailto:admin@primeendorsement.com" style="color:#C9A84C">admin@primeendorsement.com</a></p>
  </div>
</div></body></html>`;
}

function alreadyRegisteredScreen(ref: string, statusUrl: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Already Registered — PEA</title></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="max-width:520px;margin:40px auto;background:#111827;border-radius:12px;overflow:hidden;text-align:center">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:28px">
    <div style="font-size:36px;margin-bottom:10px">🏛️</div>
    <div style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#22c55e;font-size:13px;font-weight:600;margin-top:8px">Application Already On Record</div>
  </div>
  <div style="padding:28px">
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:8px;padding:14px;margin-bottom:18px">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Reference</div>
      <div style="color:#C9A84C;font-size:20px;font-weight:700;letter-spacing:4px">${ref}</div>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 20px">An active application is already registered. Track your progress using the button below.</p>
    <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;display:inline-block">Track My Application →</a>
  </div>
</div></body></html>`;
}

// ── Completion Screen (shown after successful registration) ───────────────────
function completionScreen(params: { name: string; ref: string; venture: string; score: number; summary: string; strengths: string[]; statusUrl: string; docsCount: number }): string {
  const { name, ref, venture, score, summary, strengths, statusUrl, docsCount } = params;
  const firstName   = name.split(" ")[0];
  const scoreColor  = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : score > 0 ? "#ef4444" : "#C9A84C";
  const scoreLabel  = score >= 70 ? "Strong" : score >= 50 ? "Promising" : score > 0 ? "Developing" : "Pending";
  const year        = new Date().getFullYear();

  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Registration Complete — Prime Endorsement Authority</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif;min-height:100vh}
  @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
  @keyframes checkIn{from{transform:scale(0) rotate(-45deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
  .wrap{max-width:640px;margin:0 auto;padding:24px 16px}
  .card{background:#111827;border-radius:14px;overflow:hidden;animation:fadeUp .6s ease;margin-bottom:16px}
  .hero{background:linear-gradient(135deg,#0d1220 0%,#111827 100%);border-bottom:3px solid #22c55e;padding:36px 32px;text-align:center}
  .check{width:72px;height:72px;border-radius:50%;background:rgba(34,197,94,.1);border:2px solid #22c55e;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;animation:checkIn .5s .2s ease both;font-size:32px}
  .brand{color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px}
  .headline{color:#e2e8f0;font-size:22px;font-weight:700;margin-bottom:6px}
  .sub{color:#94a3b8;font-size:13px;line-height:1.7}
  .ref-box{background:#0A0E1A;border:1px solid #C9A84C;border-radius:8px;padding:16px;text-align:center;margin:0 32px 0}
  .ref-lbl{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px}
  .ref-val{color:#C9A84C;font-size:24px;font-weight:700;letter-spacing:5px}
  .section{padding:24px 32px;border-bottom:1px solid #1e293b}
  .section:last-of-type{border-bottom:none}
  .section-title{color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #1e293b}
  .score-ring{width:80px;height:80px;border-radius:50%;border:3px solid ${scoreColor};display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 12px;background:rgba(0,0,0,.3)}
  .score-num{color:${scoreColor};font-size:26px;font-weight:700;line-height:1}
  .score-sub{color:#64748b;font-size:9px;letter-spacing:1px;text-transform:uppercase;margin-top:2px}
  .score-label{color:${scoreColor};font-size:13px;font-weight:600;text-align:center;margin-bottom:8px}
  .summary{color:#94a3b8;font-size:13px;line-height:1.8;text-align:center}
  .strength{display:flex;gap:10px;margin-bottom:10px;align-items:flex-start}
  .strength-dot{width:20px;height:20px;border-radius:50%;background:rgba(34,197,94,.1);border:1px solid #22c55e;color:#22c55e;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
  .step-row{display:flex;gap:14px;margin-bottom:16px;align-items:flex-start}
  .step-num{width:32px;height:32px;border-radius:50%;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .step-num.done{background:rgba(34,197,94,.12);border:1px solid #22c55e;color:#22c55e}
  .step-num.now{background:rgba(201,168,76,.12);border:1px solid #C9A84C;color:#C9A84C;animation:pulse 2s infinite}
  .step-num.wait{background:#1e293b;border:1px solid #334155;color:#475569}
  .step-text h3{color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 3px}
  .step-text p{color:#64748b;font-size:12px;line-height:1.6;margin:0}
  .notice{background:#0d1a30;border:1px solid #1e3a5f;border-radius:8px;padding:14px;margin:16px 32px 0}
  .notice-title{color:#60a5fa;font-size:12px;font-weight:700;margin-bottom:6px}
  .notice-text{color:#94a3b8;font-size:12px;line-height:1.7}
  .cta-section{padding:24px 32px;text-align:center;background:#0d1220}
  .track-btn{display:inline-block;background:transparent;border:1.5px solid #C9A84C;color:#C9A84C;text-decoration:none;padding:13px 36px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase}
  .footer{padding:18px 32px;text-align:center}
  .footer p{color:#475569;font-size:11px;margin:0}
  @media(max-width:600px){.section,.ref-box,.notice{padding-left:20px;padding-right:20px;margin-left:0;margin-right:0}.wrap{padding:12px}}
</style>
</head>
<body>
<div class="wrap">

  <!-- Hero -->
  <div class="card">
    <div class="hero">
      <div class="check">✅</div>
      <div class="brand">Prime Endorsement Authority</div>
      <div class="headline">Registration Complete</div>
      <div class="sub">Dear ${firstName}, your application has been received, processed, and securely registered on the Prime Endorsement Authority platform.</div>
    </div>

    <!-- Reference -->
    <div style="padding:20px 32px">
      <div class="ref-box">
        <div class="ref-lbl">Your Application Reference</div>
        <div class="ref-val">${ref}</div>
        <div style="color:#94a3b8;font-size:12px;margin-top:6px">${venture}</div>
      </div>
    </div>

    <!-- Registration Summary -->
    <div class="section">
      <div class="section-title">Registration Summary</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:12px">
          <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Status</div>
          <div style="color:#22c55e;font-size:13px;font-weight:600">✅ Submitted</div>
        </div>
        <div style="background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:12px">
          <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Documents</div>
          <div style="color:${docsCount > 0 ? "#22c55e" : "#f59e0b"};font-size:13px;font-weight:600">${docsCount > 0 ? `✅ ${docsCount} Uploaded` : "⚠ Pending"}</div>
        </div>
        <div style="background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:12px">
          <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">AI Assessment</div>
          <div style="color:#22c55e;font-size:13px;font-weight:600">✅ Complete</div>
        </div>
        <div style="background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:12px">
          <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Payment Invite</div>
          <div style="color:#f59e0b;font-size:13px;font-weight:600">📧 Sent to Email</div>
        </div>
      </div>
    </div>

    <!-- AI Score Section -->
    ${score > 0 ? `
    <div class="section">
      <div class="section-title">AI Application Assessment</div>
      <div class="score-ring">
        <div class="score-num">${score}</div>
        <div class="score-sub">/ 100</div>
      </div>
      <div class="score-label">${scoreLabel} Application</div>
      ${summary ? `<p class="summary">${summary}</p>` : ""}
      ${strengths.length > 0 ? `
      <div style="margin-top:16px">
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Key Strengths Identified</div>
        ${strengths.map(s => `<div class="strength"><div class="strength-dot">✓</div><div style="color:#94a3b8;font-size:13px;line-height:1.6">${s}</div></div>`).join("")}
      </div>` : ""}
    </div>` : `
    <div class="section">
      <div class="section-title">AI Application Assessment</div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.8;text-align:center;margin:0">Your application is queued for AI assessment. Results will be included in your first weekly update.</p>
    </div>`}

    <!-- What Happens Next -->
    <div class="section">
      <div class="section-title">Your Application Journey</div>
      <div class="step-row">
        <div class="step-num done">✓</div>
        <div class="step-text"><h3>Registration Complete</h3><p>Profile, venture details, and documents securely received and logged.</p></div>
      </div>
      <div class="step-row">
        <div class="step-num now">2</div>
        <div class="step-text"><h3>Payment — Action Required</h3><p>A formal Payment Invitation & Invoice has been sent to your email. Complete your £1,200.00 programme fee to activate your application for expert review.</p></div>
      </div>
      <div class="step-row">
        <div class="step-num wait">3</div>
        <div class="step-text"><h3>Expert Panel Review (Days 1–60)</h3><p>Your application undergoes structured expert assessment, compliance screening, and innovation evaluation.</p></div>
      </div>
      <div class="step-row">
        <div class="step-num wait">4</div>
        <div class="step-text"><h3>Endorsement Decision (Day 90)</h3><p>Official endorsement decision issued. Successful applicants receive a formal Letter of Endorsement.</p></div>
      </div>
      <div class="step-row" style="margin-bottom:0">
        <div class="step-num wait">5</div>
        <div class="step-text"><h3>Visa Application Support</h3><p>PEA provides ongoing support for your UK Innovator Founder Visa application submission.</p></div>
      </div>
    </div>

    <!-- Payment Notice -->
    <div class="notice">
      <div class="notice-title">📧 Payment Invoice Sent to Your Email</div>
      <div class="notice-text">A formal <strong style="color:#e2e8f0">Payment Invitation & Application Activation Invoice</strong> has been dispatched to <strong style="color:#C9A84C">${params.name.split("@")[0]}</strong>. Please check your inbox (and spam folder) and complete payment to activate your application. The invoice contains your secure Stripe payment link.</div>
    </div>

    <!-- CTA -->
    <div class="cta-section" style="margin-top:20px">
      <a href="${statusUrl}" class="track-btn">Track Application Status →</a>
      <p style="color:#475569;font-size:11px;margin-top:14px">Reference: ${ref} · <a href="mailto:admin@primeendorsement.com" style="color:#C9A84C;text-decoration:none">admin@primeendorsement.com</a></p>
    </div>

    <div class="footer">
      <p>© ${year} Prime Endorsement Authority · <a href="${DOMAIN}" style="color:#C9A84C;text-decoration:none">primeendorsement.com</a></p>
      <p style="margin-top:4px;color:#374151">All applications are subject to eligibility assessment, compliance verification, and programme requirements.</p>
    </div>
  </div>

</div>
</body></html>`;
}

// ── Multi-Step Registration Form ──────────────────────────────────────────────
function registrationForm(token: string, ref: string, prefill: Record<string, string> = {}): string {
  const v = (k: string) => prefill[k] || "";
  const year = new Date().getFullYear();

  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Applicant Registration — Prime Endorsement Authority</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0A0E1A;font-family:Arial,sans-serif;min-height:100vh;color:#e2e8f0}
  .wrap{max-width:700px;margin:0 auto;padding:24px 16px 60px}
  /* Header */
  .hdr{background:#0d1220;border-bottom:3px solid #C9A84C;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;margin-bottom:0}
  .hdr-brand{color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:5px;text-transform:uppercase}
  .hdr-title{color:#e2e8f0;font-size:18px;font-weight:700;margin-top:6px}
  .hdr-sub{color:#64748b;font-size:12px;margin-top:4px}
  .ref-badge{display:inline-block;margin-top:10px;background:rgba(201,168,76,.1);border:1px solid #C9A84C;color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:5px 16px;border-radius:20px}
  /* Progress */
  .progress-wrap{background:#111827;padding:20px 32px;margin-bottom:0}
  .progress-bar{display:flex;justify-content:space-between;align-items:flex-start;position:relative;margin-bottom:0}
  .progress-bar::before{content:"";position:absolute;top:14px;left:10%;right:10%;height:2px;background:#1e293b;z-index:0}
  .progress-fill{position:absolute;top:14px;left:10%;height:2px;background:#C9A84C;z-index:1;transition:width .4s ease;width:0%}
  .step-dot{display:flex;flex-direction:column;align-items:center;z-index:2;flex:1}
  .dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;transition:all .3s;border:2px solid #1e293b;background:#0A0E1A;color:#475569}
  .dot.active{border-color:#C9A84C;background:rgba(201,168,76,.15);color:#C9A84C}
  .dot.done{border-color:#22c55e;background:rgba(34,197,94,.12);color:#22c55e}
  .step-label{font-size:9px;color:#475569;margin-top:5px;text-align:center;letter-spacing:.5px}
  /* Form */
  .form-card{background:#111827;border-radius:0 0 12px 12px;padding:28px 32px}
  .section{display:none}.section.active{display:block}
  .section-title{color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid #1e293b}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .full{grid-column:1/-1}
  label{display:block;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;margin-bottom:5px}
  .req{color:#ef4444;margin-left:2px}
  input,select,textarea{width:100%;background:#0d1220;border:1px solid #1e293b;border-radius:6px;color:#e2e8f0;font-size:13px;padding:11px 14px;outline:none;transition:border-color .2s;font-family:Arial,sans-serif}
  input:focus,select:focus,textarea:focus{border-color:#C9A84C}
  input::placeholder,textarea::placeholder{color:#374151}
  select option{background:#0d1220}
  textarea{resize:vertical;min-height:100px}
  /* Upload zones */
  .upload-zone{border:1.5px dashed #1e293b;border-radius:8px;padding:18px;text-align:center;cursor:pointer;transition:all .2s;background:#0d1220;margin-bottom:10px}
  .upload-zone:hover,.upload-zone.drag{border-color:#C9A84C;background:rgba(201,168,76,.05)}
  .upload-zone input{display:none}
  .upload-icon{font-size:24px;margin-bottom:6px}
  .upload-label{color:#94a3b8;font-size:12px}
  .upload-label strong{color:#C9A84C}
  .upload-status{color:#22c55e;font-size:11px;margin-top:4px;font-weight:600}
  .upload-opt{color:#64748b;font-size:10px;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
  /* Declaration */
  .decl-box{background:#0d1220;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:14px;max-height:180px;overflow-y:auto;color:#94a3b8;font-size:12px;line-height:1.8}
  .check-row{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}
  .check-row input[type=checkbox]{width:18px;height:18px;margin-top:1px;flex-shrink:0;accent-color:#C9A84C;cursor:pointer}
  .check-row label{color:#94a3b8;font-size:12px;line-height:1.6;cursor:pointer;text-transform:none;letter-spacing:0;font-weight:400}
  /* Buttons */
  .btn-row{display:flex;gap:12px;margin-top:24px}
  .btn-back{flex:0 0 auto;background:transparent;border:1.5px solid #1e293b;color:#64748b;padding:12px 24px;border-radius:8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .2s}
  .btn-back:hover{border-color:#475569;color:#94a3b8}
  .btn-next{flex:1;background:#C9A84C;border:none;color:#0A0E1A;padding:14px 24px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .2s}
  .btn-next:hover{background:#d4af5e}
  .btn-next:disabled{background:#1e293b;color:#475569;cursor:not-allowed}
  /* Submitting overlay */
  .submitting{display:none;text-align:center;padding:40px 20px}
  .spin{width:48px;height:48px;border:3px solid #1e293b;border-top:3px solid #C9A84C;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spin-text{color:#C9A84C;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase}
  .spin-sub{color:#64748b;font-size:11px;margin-top:6px}
  .error-msg{background:#1a0000;border:1px solid #ef4444;border-radius:6px;color:#ef4444;font-size:12px;padding:10px 14px;margin-top:12px;display:none}
  .info-box{background:#0d1a2e;border:1px solid #1e3a5f;border-radius:6px;padding:12px 14px;color:#60a5fa;font-size:12px;line-height:1.7;margin-bottom:14px}
  @media(max-width:600px){.grid{grid-template-columns:1fr}.form-card,.hdr,.progress-wrap{padding-left:18px;padding-right:18px}.btn-row{flex-direction:column}}
</style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div class="hdr">
    <div class="hdr-brand">Prime Endorsement Authority</div>
    <div class="hdr-title">🏛️ Innovator Founder Application</div>
    <div class="hdr-sub">AI-Powered Registration System · Secure & Encrypted</div>
    ${ref ? `<div class="ref-badge">Ref: ${ref}</div>` : ""}
  </div>

  <!-- Progress Bar -->
  <div class="progress-wrap">
    <div class="progress-bar">
      <div class="progress-fill" id="pFill"></div>
      <div class="step-dot"><div class="dot active" id="d1">1</div><div class="step-label">Personal</div></div>
      <div class="step-dot"><div class="dot" id="d2">2</div><div class="step-label">Venture</div></div>
      <div class="step-dot"><div class="dot" id="d3">3</div><div class="step-label">Co-Founder</div></div>
      <div class="step-dot"><div class="dot" id="d4">4</div><div class="step-label">Documents</div></div>
      <div class="step-dot"><div class="dot" id="d5">5</div><div class="step-label">Declaration</div></div>
    </div>
  </div>

  <!-- Form -->
  <div class="form-card">
    <form id="regForm" enctype="multipart/form-data" novalidate>
      <input type="hidden" name="token" value="${token}"/>
      <input type="hidden" name="ref"   value="${ref}"/>

      <!-- SECTION 1: Personal Information -->
      <div class="section active" id="s1">
        <div class="section-title">Section 1 — Personal Information</div>
        <div class="info-box">ℹ️ Please provide your legal name exactly as it appears on your passport. All information is encrypted and stored securely.</div>
        <div class="grid">
          <div class="full">
            <label>Full Legal Name <span class="req">*</span></label>
            <input type="text" name="applicant_name" value="${v("applicant_name")}" placeholder="As on passport" required/>
          </div>
          <div>
            <label>Email Address <span class="req">*</span></label>
            <input type="email" name="applicant_email" value="${v("applicant_email")}" placeholder="your@email.com" required/>
          </div>
          <div>
            <label>Phone Number <span class="req">*</span></label>
            <input type="tel" name="phone_number" value="${v("phone_number")}" placeholder="+44 7000 000000" required/>
          </div>
          <div>
            <label>Date of Birth <span class="req">*</span></label>
            <input type="date" name="date_of_birth" value="${v("date_of_birth")}" required/>
          </div>
          <div>
            <label>Nationality <span class="req">*</span></label>
            <input type="text" name="nationality" value="${v("nationality")}" placeholder="e.g. British, Nigerian" required/>
          </div>
          <div>
            <label>Country of Residence <span class="req">*</span></label>
            <input type="text" name="country_of_residence" value="${v("country_of_residence")}" placeholder="e.g. United Kingdom" required/>
          </div>
          <div>
            <label>LinkedIn Profile URL</label>
            <input type="text" name="linkedin_url" value="${v("linkedin_url")}" placeholder="linkedin.com/in/yourname"/>
          </div>
          <div>
            <label>Application Role <span class="req">*</span></label>
            <select name="applicant_role" required>
              <option value="">— Select Role —</option>
              <option value="Founder" ${v("applicant_role")==="Founder"?"selected":""}>Founder</option>
              <option value="Co-Founder" ${v("applicant_role")==="Co-Founder"?"selected":""}>Co-Founder</option>
            </select>
          </div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn-next" onclick="nextStep(1)">Continue to Venture Details →</button>
        </div>
      </div>

      <!-- SECTION 2: Venture Details -->
      <div class="section" id="s2">
        <div class="section-title">Section 2 — Venture Information</div>
        <div class="info-box">ℹ️ Provide accurate details about your venture. This information is used for AI assessment and endorsement eligibility review.</div>
        <div class="grid">
          <div class="full">
            <label>Venture / Company Name <span class="req">*</span></label>
            <input type="text" name="venture_name" value="${v("venture_name")}" placeholder="Registered company or trading name" required/>
          </div>
          <div>
            <label>Industry Sector <span class="req">*</span></label>
            <select name="venture_sector" required>
              <option value="">— Select Sector —</option>
              ${["FinTech","HealthTech","EdTech","CleanTech","AI & Machine Learning","Cybersecurity","AgriTech","LegalTech","PropTech","E-Commerce","Logistics & Supply Chain","Investment & Finance","Manufacturing","Media & Entertainment","Social Impact","Other"].map(s=>`<option value="${s}" ${v("venture_sector")===s?"selected":""}>${s}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>Business Stage <span class="req">*</span></label>
            <select name="venture_stage" required>
              <option value="">— Select Stage —</option>
              ${["Idea","Pre-Seed","Seed","Series A","Series B","Growth","Established"].map(s=>`<option value="${s}" ${v("venture_stage")===s?"selected":""}>${s}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>Website / Portfolio URL</label>
            <input type="text" name="website_url" value="${v("website_url")}" placeholder="https://yourcompany.com"/>
          </div>
          <div>
            <label>Country of Incorporation</label>
            <input type="text" name="incorporation_country" value="${v("incorporation_country")}" placeholder="e.g. United Kingdom"/>
          </div>
          <div class="full">
            <label>Venture Description <span class="req">*</span></label>
            <textarea name="venture_description" placeholder="Describe your venture, its innovation, target market, and competitive advantage. Minimum 100 characters." required minlength="100">${v("venture_description")}</textarea>
            <div id="descCount" style="color:#475569;font-size:11px;margin-top:4px;text-align:right">0 / min 100 characters</div>
          </div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn-back" onclick="prevStep(2)">← Back</button>
          <button type="button" class="btn-next" onclick="nextStep(2)">Continue to Co-Founder →</button>
        </div>
      </div>

      <!-- SECTION 3: Co-Founder -->
      <div class="section" id="s3">
        <div class="section-title">Section 3 — Co-Founder Information (Optional)</div>
        <div class="info-box">ℹ️ If your venture has a co-founder, please provide their details. This section is optional. Leave blank if applying as a sole founder.</div>
        <div class="grid">
          <div>
            <label>Co-Founder Full Name</label>
            <input type="text" name="co_founder_name" value="${v("co_founder_name")}" placeholder="Full legal name"/>
          </div>
          <div>
            <label>Co-Founder Email</label>
            <input type="email" name="co_founder_email" value="${v("co_founder_email")}" placeholder="cofounder@email.com"/>
          </div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn-back" onclick="prevStep(3)">← Back</button>
          <button type="button" class="btn-next" onclick="nextStep(3)">Continue to Documents →</button>
        </div>
      </div>

      <!-- SECTION 4: Documents -->
      <div class="section" id="s4">
        <div class="section-title">Section 4 — Supporting Documents</div>
        <div class="info-box">ℹ️ Upload supporting documents below. Passport is required. All documents are encrypted and stored securely. Max 10MB per file. PDF, JPG, PNG accepted.</div>

        <div style="margin-bottom:16px">
          <div class="upload-opt">Passport / ID <span class="req">*</span></div>
          <label class="upload-zone" id="z_passport" for="doc_passport">
            <input type="file" id="doc_passport" name="doc_passport" accept=".pdf,.jpg,.jpeg,.png" onchange="handleUpload(this,'z_passport','s_passport')"/>
            <div class="upload-icon">🪪</div>
            <div class="upload-label"><strong>Click to upload</strong> or drag & drop</div>
            <div class="upload-label" style="font-size:11px;color:#475569">PDF · JPG · PNG · Max 10MB</div>
          </label>
          <div class="upload-status" id="s_passport"></div>
        </div>

        <div style="margin-bottom:16px">
          <div class="upload-opt">Proof of Address</div>
          <label class="upload-zone" id="z_address" for="doc_proof_address">
            <input type="file" id="doc_proof_address" name="doc_proof_address" accept=".pdf,.jpg,.jpeg,.png" onchange="handleUpload(this,'z_address','s_address')"/>
            <div class="upload-icon">🏠</div>
            <div class="upload-label"><strong>Click to upload</strong> or drag & drop</div>
          </label>
          <div class="upload-status" id="s_address"></div>
        </div>

        <div style="margin-bottom:16px">
          <div class="upload-opt">Business Registration / Certificate of Incorporation</div>
          <label class="upload-zone" id="z_biz" for="doc_business_reg">
            <input type="file" id="doc_business_reg" name="doc_business_reg" accept=".pdf,.jpg,.jpeg,.png" onchange="handleUpload(this,'z_biz','s_biz')"/>
            <div class="upload-icon">📋</div>
            <div class="upload-label"><strong>Click to upload</strong> or drag & drop</div>
          </label>
          <div class="upload-status" id="s_biz"></div>
        </div>

        <div style="margin-bottom:16px">
          <div class="upload-opt">Business Plan</div>
          <label class="upload-zone" id="z_plan" for="doc_business_plan">
            <input type="file" id="doc_business_plan" name="doc_business_plan" accept=".pdf,.jpg,.jpeg,.png" onchange="handleUpload(this,'z_plan','s_plan')"/>
            <div class="upload-icon">📊</div>
            <div class="upload-label"><strong>Click to upload</strong> or drag & drop</div>
          </label>
          <div class="upload-status" id="s_plan"></div>
        </div>

        <div style="margin-bottom:16px">
          <div class="upload-opt">Pitch Deck</div>
          <label class="upload-zone" id="z_pitch" for="doc_pitch_deck">
            <input type="file" id="doc_pitch_deck" name="doc_pitch_deck" accept=".pdf,.jpg,.jpeg,.png,.ppt,.pptx" onchange="handleUpload(this,'z_pitch','s_pitch')"/>
            <div class="upload-icon">🎯</div>
            <div class="upload-label"><strong>Click to upload</strong> or drag & drop</div>
          </label>
          <div class="upload-status" id="s_pitch"></div>
        </div>

        <div style="margin-bottom:16px">
          <div class="upload-opt">Financial Projections</div>
          <label class="upload-zone" id="z_fin" for="doc_financials">
            <input type="file" id="doc_financials" name="doc_financials" accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png" onchange="handleUpload(this,'z_fin','s_fin')"/>
            <div class="upload-icon">💹</div>
            <div class="upload-label"><strong>Click to upload</strong> or drag & drop</div>
          </label>
          <div class="upload-status" id="s_fin"></div>
        </div>

        <div class="btn-row">
          <button type="button" class="btn-back" onclick="prevStep(4)">← Back</button>
          <button type="button" class="btn-next" onclick="nextStep(4)">Continue to Declaration →</button>
        </div>
      </div>

      <!-- SECTION 5: Declaration & Submit -->
      <div class="section" id="s5">
        <div class="section-title">Section 5 — Declaration & Submission</div>

        <div class="decl-box">
          <p style="color:#e2e8f0;font-weight:600;margin-bottom:10px">Official Declaration — Prime Endorsement Authority</p>
          <p style="margin-bottom:8px">I, the undersigned applicant, hereby declare that:</p>
          <p style="margin-bottom:8px">1. All information provided in this application is true, accurate, and complete to the best of my knowledge. I understand that any false or misleading information may result in immediate disqualification and potential legal consequences.</p>
          <p style="margin-bottom:8px">2. I consent to Prime Endorsement Authority processing my personal data for the purpose of assessing my application in accordance with applicable data protection legislation.</p>
          <p style="margin-bottom:8px">3. I acknowledge that submission of this application does not guarantee endorsement approval. All applications are subject to full eligibility assessment, compliance verification, innovation evaluation, and programme requirements as determined by Prime Endorsement Authority.</p>
          <p style="margin-bottom:8px">4. I understand that the programme fee of £1,200.00 (£1,000.00 + £200.00 VAT) is payable upon registration and is non-refundable once the expert review process has commenced.</p>
          <p>5. I confirm I am the named individual and am authorised to submit this application on behalf of the stated venture.</p>
        </div>

        <div class="check-row">
          <input type="checkbox" id="decl1" name="declaration_agreed" value="true" required/>
          <label for="decl1">I have read, understood, and agree to the declaration above. I confirm all information provided is accurate and complete. <span class="req">*</span></label>
        </div>
        <div class="check-row">
          <input type="checkbox" id="decl2" name="terms_agreed" value="true" required/>
          <label for="decl2">I agree to Prime Endorsement Authority's Terms of Service and Privacy Policy. <span class="req">*</span></label>
        </div>
        <div class="check-row">
          <input type="checkbox" id="decl3" name="payment_agreed" value="true" required/>
          <label for="decl3">I understand that a programme fee of <strong style="color:#C9A84C">£1,200.00 GBP</strong> is required to activate my application and will be invoiced separately following registration completion. <span class="req">*</span></label>
        </div>

        <div class="error-msg" id="errMsg"></div>

        <div class="btn-row">
          <button type="button" class="btn-back" onclick="prevStep(5)">← Back</button>
          <button type="submit" class="btn-next" id="submitBtn" disabled>Submit Application →</button>
        </div>
      </div>

      <!-- SUBMITTING STATE -->
      <div class="submitting" id="submitting">
        <div class="spin"></div>
        <div class="spin-text">Processing Your Application</div>
        <div class="spin-sub" id="spinMsg">Validating your information…</div>
      </div>
    </form>
  </div>

  <div style="text-align:center;padding:20px">
    <p style="color:#374151;font-size:11px">© ${year} Prime Endorsement Authority · <a href="mailto:admin@primeendorsement.com" style="color:#C9A84C;text-decoration:none">admin@primeendorsement.com</a></p>
  </div>
</div>

<script>
var currentStep = 1;
var totalSteps  = 5;

function updateProgress(step) {
  var fills = [0, 0, 25, 50, 75, 100];
  document.getElementById('pFill').style.width = fills[step] + '%';
  for (var i = 1; i <= totalSteps; i++) {
    var d = document.getElementById('d' + i);
    d.className = 'dot ' + (i < step ? 'done' : i === step ? 'active' : '');
    d.textContent = i < step ? '✓' : i;
  }
}

function validateStep(step) {
  var sec = document.getElementById('s' + step);
  var inputs = sec.querySelectorAll('input[required],select[required],textarea[required]');
  var ok = true;
  inputs.forEach(function(el) {
    if (el.type === 'checkbox') { if (!el.checked) ok = false; }
    else if (!el.value.trim()) { ok = false; el.style.borderColor = '#ef4444'; }
    else { el.style.borderColor = ''; }
    if (el.name === 'venture_description' && el.value.trim().length < 100) { ok = false; el.style.borderColor = '#ef4444'; }
  });
  // Passport required on step 4
  if (step === 4) {
    var passport = document.getElementById('doc_passport');
    if (!passport.files || passport.files.length === 0) { ok = false; document.getElementById('z_passport').style.borderColor = '#ef4444'; }
  }
  return ok;
}

function nextStep(step) {
  if (!validateStep(step)) {
    var err = document.getElementById('errMsg');
    if (err) { err.style.display = 'block'; err.textContent = 'Please complete all required fields before continuing.'; setTimeout(function(){err.style.display='none';}, 4000); }
    return;
  }
  document.getElementById('s' + step).classList.remove('active');
  currentStep = step + 1;
  document.getElementById('s' + currentStep).classList.add('active');
  updateProgress(currentStep);
  window.scrollTo(0, 0);
}

function prevStep(step) {
  document.getElementById('s' + step).classList.remove('active');
  currentStep = step - 1;
  document.getElementById('s' + currentStep).classList.add('active');
  updateProgress(currentStep);
  window.scrollTo(0, 0);
}

// Declaration checkboxes enable submit button
function checkDecl() {
  var d1 = document.getElementById('decl1').checked;
  var d2 = document.getElementById('decl2').checked;
  var d3 = document.getElementById('decl3').checked;
  document.getElementById('submitBtn').disabled = !(d1 && d2 && d3);
}
document.getElementById('decl1').addEventListener('change', checkDecl);
document.getElementById('decl2').addEventListener('change', checkDecl);
document.getElementById('decl3').addEventListener('change', checkDecl);

// Venture description counter
var descEl = document.querySelector('[name=venture_description]');
if (descEl) {
  descEl.addEventListener('input', function() {
    var cnt = document.getElementById('descCount');
    if (cnt) cnt.textContent = descEl.value.length + ' / min 100 characters';
    cnt.style.color = descEl.value.length >= 100 ? '#22c55e' : '#475569';
  });
}

// File upload handler
function handleUpload(input, zoneId, statusId) {
  var file = input.files[0];
  var zone = document.getElementById(zoneId);
  var status = document.getElementById(statusId);
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    status.textContent = '⚠ File too large (max 10MB)';
    status.style.color = '#ef4444';
    input.value = '';
    return;
  }
  zone.style.borderColor = '#22c55e';
  zone.style.background = 'rgba(34,197,94,0.05)';
  status.textContent = '✓ ' + file.name + ' (' + (file.size/1024).toFixed(0) + ' KB)';
  status.style.color = '#22c55e';
  if (zoneId === 'z_passport') document.getElementById('z_passport').style.borderColor = '#22c55e';
}

// Drag and drop
document.querySelectorAll('.upload-zone').forEach(function(zone) {
  zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', function() { zone.classList.remove('drag'); });
  zone.addEventListener('drop', function(e) {
    e.preventDefault(); zone.classList.remove('drag');
    var input = zone.querySelector('input[type=file]');
    if (e.dataTransfer.files.length && input) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    }
  });
});

// Spinner messages
var spinMessages = [
  'Validating your information…',
  'Running AI assessment…',
  'Securing your documents…',
  'Registering your application…',
  'Sending confirmation email…',
  'Finalising your registration…'
];
var spinIdx = 0;
function rotateSpin() {
  spinIdx = (spinIdx + 1) % spinMessages.length;
  var el = document.getElementById('spinMsg');
  if (el) el.textContent = spinMessages[spinIdx];
}

// Form submission
document.getElementById('regForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!validateStep(5)) return;

  // Show spinner, hide form sections
  document.querySelectorAll('.section').forEach(function(s){s.style.display='none';});
  document.getElementById('submitting').style.display = 'block';
  var spinInterval = setInterval(rotateSpin, 2500);

  try {
    var fd = new FormData(this);
    var resp = await fetch(window.location.href, { method: 'POST', body: fd });
    clearInterval(spinInterval);

    if (resp.redirected) { window.location.href = resp.url; return; }

    var ct = resp.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      document.open(); document.write(await resp.text()); document.close();
      return;
    }

    var data = await resp.json();
    if (data.success && data.redirect_url) {
      window.location.href = data.redirect_url;
    } else if (data.error) {
      document.getElementById('submitting').style.display = 'none';
      document.getElementById('s5').style.display = 'block';
      var errEl = document.getElementById('errMsg');
      errEl.style.display = 'block';
      errEl.textContent = data.error;
    } else {
      window.location.reload();
    }
  } catch(err) {
    clearInterval(spinInterval);
    document.getElementById('submitting').style.display = 'none';
    document.getElementById('s5').style.display = 'block';
    var errEl = document.getElementById('errMsg');
    errEl.style.display = 'block';
    errEl.textContent = 'Submission error. Please try again or contact admin@primeendorsement.com';
  }
});

updateProgress(1);
</script>
</body></html>`;
}

// ── Completion Email (Registration Confirmed) ─────────────────────────────────
function completionEmail(params: { name: string; ref: string; venture: string; sector: string; stage: string; score: number; summary: string; strengths: string[]; docsCount: number; statusUrl: string }): string {
  const { name, ref, venture, sector, stage, score, summary, strengths, docsCount, statusUrl } = params;
  const firstName  = name.split(" ")[0];
  const scoreColor = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : score > 0 ? "#ef4444" : "#C9A84C";
  const year       = new Date().getFullYear();

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:12px;overflow:hidden">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0d1220 0%,#0a1a10 100%);border-bottom:3px solid #22c55e;padding:32px;text-align:center">
    <div style="font-size:40px;margin-bottom:12px">✅</div>
    <div style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#22c55e;font-size:16px;font-weight:700;margin-top:8px">Registration Successfully Completed</div>
    <div style="color:#94a3b8;font-size:12px;margin-top:4px">AI-Powered Innovator Founder Application System</div>
  </div>

  <!-- Body -->
  <div style="padding:28px 32px">
    <p style="color:#e2e8f0;font-size:15px;font-weight:600;margin:0 0 8px">Dear ${firstName},</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 20px">Your application for the <strong style="color:#e2e8f0">UK Innovator Founder Visa Endorsement Programme</strong> has been successfully received, processed through our AI assessment system, and securely registered on the Prime Endorsement Authority platform.</p>

    <!-- Reference -->
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Application Reference</div>
      <div style="color:#C9A84C;font-size:26px;font-weight:700;letter-spacing:5px">${ref}</div>
      <div style="color:#94a3b8;font-size:12px;margin-top:4px">${venture}${sector ? ` · ${sector}` : ""}${stage ? ` · ${stage}` : ""}</div>
    </div>

    <!-- Registration Summary -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:#0d1220;border:1px solid #166534;border-radius:6px;padding:12px;text-align:center">
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Registration</div>
        <div style="color:#22c55e;font-size:13px;font-weight:600">✅ Complete</div>
      </div>
      <div style="background:#0d1220;border:1px solid ${docsCount > 0 ? "#166534" : "#92400e"};border-radius:6px;padding:12px;text-align:center">
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Documents</div>
        <div style="color:${docsCount > 0 ? "#22c55e" : "#f59e0b"};font-size:13px;font-weight:600">${docsCount > 0 ? `✅ ${docsCount} Received` : "⚠ Pending"}</div>
      </div>
    </div>

    <!-- AI Score -->
    ${score > 0 ? `
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:8px;padding:18px;margin-bottom:20px">
      <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #1e293b">🤖 AI Application Assessment</div>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px">
        <div style="width:64px;height:64px;border-radius:50%;border:3px solid ${scoreColor};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;background:rgba(0,0,0,.3)">
          <div style="color:${scoreColor};font-size:22px;font-weight:700;line-height:1">${score}</div>
          <div style="color:#64748b;font-size:9px;text-transform:uppercase">/100</div>
        </div>
        <div>
          <div style="color:${scoreColor};font-size:13px;font-weight:600;margin-bottom:4px">Score: ${score}/100</div>
          <div style="color:#94a3b8;font-size:12px;line-height:1.6">${summary}</div>
        </div>
      </div>
      ${strengths.length > 0 ? `
      <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Key Strengths</div>
      ${strengths.map(s => `<div style="display:flex;gap:8px;margin-bottom:6px;align-items:flex-start"><span style="color:#22c55e;font-size:11px;margin-top:1px">✓</span><span style="color:#94a3b8;font-size:12px;line-height:1.5">${s}</span></div>`).join("")}` : ""}
    </div>` : ""}

    <!-- What's Next -->
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:20px">
      <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #1e293b">📋 Next Steps</div>
      <div style="display:flex;gap:12px;margin-bottom:10px"><div style="color:#22c55e;font-weight:700;font-size:13px;width:20px;flex-shrink:0">✓</div><div style="color:#94a3b8;font-size:12px;line-height:1.6"><strong style="color:#e2e8f0">Registration Complete</strong> — Your profile and documents are securely logged.</div></div>
      <div style="display:flex;gap:12px;margin-bottom:10px"><div style="color:#C9A84C;font-weight:700;font-size:13px;width:20px;flex-shrink:0">→</div><div style="color:#94a3b8;font-size:12px;line-height:1.6"><strong style="color:#e2e8f0">Payment Required</strong> — A formal Payment Invitation & Invoice of <strong style="color:#C9A84C">£1,200.00</strong> has been sent to this email address. Please complete payment to activate your application.</div></div>
      <div style="display:flex;gap:12px;margin-bottom:10px"><div style="color:#475569;font-weight:700;font-size:13px;width:20px;flex-shrink:0">3</div><div style="color:#64748b;font-size:12px;line-height:1.6">Expert panel assessment (Days 1–60)</div></div>
      <div style="display:flex;gap:12px"><div style="color:#475569;font-weight:700;font-size:13px;width:20px;flex-shrink:0">4</div><div style="color:#64748b;font-size:12px;line-height:1.6">Official endorsement decision (Day 90)</div></div>
    </div>

    <!-- Payment Notice -->
    <div style="background:#0d1a00;border:1px solid #365314;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center">
      <div style="color:#86efac;font-size:13px;font-weight:600;margin-bottom:6px">📧 Payment Invoice Dispatched</div>
      <div style="color:#94a3b8;font-size:12px;line-height:1.7">A separate <strong style="color:#e2e8f0">Official Payment Invitation & Invoice</strong> has been sent to your email. Please check your inbox and complete the £1,200.00 payment at your earliest convenience to activate your application for expert review.</div>
    </div>

    <div style="text-align:center">
      <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;display:inline-block">Track My Application →</a>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:16px 32px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority · <a href="https://primeendorsement.com" style="color:#C9A84C;text-decoration:none">primeendorsement.com</a></p>
    <p style="color:#374151;font-size:10px;margin:6px 0 0">Ref: ${ref} · All applications subject to eligibility assessment and programme requirements.</p>
  </div>
</div>
</body></html>`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: JSON_HEADERS });

  try {
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const resendKey    = Deno.env.get("RESEND_API_KEY")       || "";
    const openaiKey    = Deno.env.get("OPENAI_API_KEY")       || "";

    const url      = new URL(req.url);
    const token    = url.searchParams.get("token") || "";
    const refParam = url.searchParams.get("ref")   || "";

    // ── GET: Serve the registration form ─────────────────────────────────────
    if (req.method === "GET") {
      if (!token) {
        return new Response(
          errorScreen("Invalid Invitation Link", "This registration link is missing a valid token. Please use the link from your official invitation email or contact admin@primeendorsement.com."),
          { status: 400, headers: HTML_HEADERS }
        );
      }

      // Validate token
      const apps = await dbList(BUILDER_APP, "Application", serviceToken);
      const app  = apps.find((a: any) => a.session_token === token || a.invitation_token === token);

      if (!app) {
        return new Response(
          errorScreen("Link Not Found", "This invitation link is invalid or has expired. Please contact admin@primeendorsement.com to request a new invitation."),
          { status: 404, headers: HTML_HEADERS }
        );
      }

      // Check if already completed registration (not just a stub)
      if (app.status === "submitted" || app.status === "under_review") {
        const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(app.reference_code)}`;
        return new Response(
          alreadyRegisteredScreen(app.reference_code, statusUrl),
          { headers: HTML_HEADERS }
        );
      }

      // Pre-fill from stub record
      const prefill: Record<string, string> = {
        applicant_name:        app.applicant_name || "",
        applicant_email:       app.applicant_email || "",
        applicant_role:        app.application_type === "co_founder" ? "Co-Founder" : (app.applicant_role || "Founder"),
        venture_name:          app.venture?.company_name || app.venture_name || "",
        venture_sector:        app.venture?.sector || app.venture_sector || "",
        venture_stage:         app.venture?.stage || app.venture_stage || "",
        website_url:           app.venture?.website || app.website_url || "",
        nationality:           app.founder?.nationality || app.nationality || "",
        country_of_residence:  app.founder?.country_of_residence || app.country_of_residence || "",
        phone_number:          app.founder?.phone || app.phone_number || "",
      };

      return new Response(
        registrationForm(token, app.reference_code || refParam, prefill),
        { headers: HTML_HEADERS }
      );
    }

    // ── POST: Process the registration submission ──────────────────────────
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return new Response(JSON.stringify({ success: false, error: "Invalid content type" }), { status: 400, headers: JSON_HEADERS });
      }

      const formData = await req.formData();
      const get = (k: string) => (formData.get(k) as string || "").trim();

      const submittedToken = get("token");
      const submittedRef   = get("ref");

      // ── 1. Validate token ────────────────────────────────────────────────
      if (!submittedToken) {
        return new Response(
          errorScreen("Session Expired", "Your registration session has expired. Please use your original invitation link."),
          { status: 400, headers: HTML_HEADERS }
        );
      }

      const allApps = await dbList(BUILDER_APP, "Application", serviceToken);
      const existing = allApps.find((a: any) => a.session_token === submittedToken || a.invitation_token === submittedToken);

      if (!existing) {
        return new Response(
          errorScreen("Invalid Session", "This registration session is invalid. Please contact admin@primeendorsement.com."),
          { status: 403, headers: HTML_HEADERS }
        );
      }

      // ── 2. Duplicate check ───────────────────────────────────────────────
      const email = get("applicant_email").toLowerCase();
      const ref   = existing.reference_code || submittedRef;

      if (existing.status === "submitted" || existing.status === "under_review") {
        const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
        return new Response(alreadyRegisteredScreen(ref, statusUrl), { headers: HTML_HEADERS });
      }

      // ── 3. Collect & validate fields ─────────────────────────────────────
      const body = {
        applicant_name:        get("applicant_name"),
        applicant_email:       email,
        applicant_role:        get("applicant_role") || "Founder",
        phone_number:          get("phone_number"),
        date_of_birth:         get("date_of_birth"),
        nationality:           get("nationality"),
        country_of_residence:  get("country_of_residence"),
        linkedin_url:          get("linkedin_url"),
        venture_name:          get("venture_name"),
        venture_sector:        get("venture_sector"),
        venture_stage:         get("venture_stage"),
        website_url:           get("website_url"),
        incorporation_country: get("incorporation_country"),
        venture_description:   get("venture_description"),
        co_founder_name:       get("co_founder_name"),
        co_founder_email:      get("co_founder_email"),
        declaration_agreed:    get("declaration_agreed") === "true",
        terms_agreed:          get("terms_agreed") === "true",
        payment_agreed:        get("payment_agreed") === "true",
      };

      const required = ["applicant_name","applicant_email","phone_number","date_of_birth","nationality","country_of_residence","applicant_role","venture_name","venture_sector","venture_stage","venture_description"];
      const missing  = required.filter(k => !body[k as keyof typeof body]);
      if (missing.length) {
        return new Response(JSON.stringify({ success: false, error: `Missing required fields: ${missing.join(", ")}` }), { status: 400, headers: JSON_HEADERS });
      }

      if (!body.declaration_agreed) {
        return new Response(JSON.stringify({ success: false, error: "You must agree to the declaration to submit your application." }), { status: 400, headers: JSON_HEADERS });
      }

      if (body.venture_description.length < 50) {
        return new Response(JSON.stringify({ success: false, error: "Venture description must be at least 100 characters." }), { status: 400, headers: JSON_HEADERS });
      }

      // ── 4. Handle document uploads ───────────────────────────────────────
      const docFields: Record<string, string> = {
        doc_passport:      "doc_passport_url",
        doc_proof_address: "doc_proof_address_url",
        doc_business_reg:  "doc_business_registration_url",
        doc_business_plan: "doc_business_plan_url",
        doc_pitch_deck:    "doc_pitch_deck_url",
        doc_financials:    "doc_financial_projections_url",
      };

      const docUrls: Record<string, string> = {};
      let docsUploaded = 0;

      for (const [fieldName, dbField] of Object.entries(docFields)) {
        const file = formData.get(fieldName) as File | null;
        if (file && file.size > 0 && file.name) {
          try {
            const fileBuffer = await file.arrayBuffer();
            const ext        = file.name.split(".").pop()?.toLowerCase() || "bin";
            const fileName   = `pea-${ref}-${fieldName}-${Date.now()}.${ext}`;
            const uploadResp = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/storage/upload`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${serviceToken}`,
                "Content-Type": file.type || "application/octet-stream",
                "X-File-Name":  fileName,
              },
              body: fileBuffer,
            });
            if (uploadResp.ok) {
              const uploadData = await uploadResp.json();
              docUrls[dbField] = uploadData.url || uploadData.file_url || uploadData.uri || "";
              if (docUrls[dbField]) docsUploaded++;
            }
          } catch (e: any) {
            console.warn(`[register] Upload failed for ${fieldName}:`, e.message);
          }
        }
      }

      // ── 5. AI Scoring ────────────────────────────────────────────────────
      let aiScore = 0, aiSummary = "", aiRecommendation = "", aiStrengths: string[] = [], aiConcerns: string[] = [];
      if (openaiKey) {
        const aiResult = await scoreWithAI({ ...body, docs_count: docsUploaded }, openaiKey);
        aiScore          = aiResult.score;
        aiSummary        = aiResult.summary;
        aiRecommendation = aiResult.recommendation;
        aiStrengths      = aiResult.strengths;
        aiConcerns       = aiResult.concerns;
        console.log(`[register] AI score: ${aiScore}/100 (${aiRecommendation})`);
      }

      // ── 6. Save to DB (builder) ──────────────────────────────────────────
      const now       = new Date().toISOString();
      const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;

      const builderUpdate: Record<string, any> = {
        applicant_name:   body.applicant_name,
        applicant_email:  body.applicant_email,
        applicant_role:   body.applicant_role,
        application_type: body.applicant_role === "Co-Founder" ? "co_founder" : "founder",
        status:           "submitted",
        payment_status:   "pending",
        submitted_at:     now,
        declaration_agreed: body.declaration_agreed,
        documents_submitted: docsUploaded > 0,
        ai_score:         aiScore || null,
        ai_summary:       aiSummary || null,
        ai_analysis:      aiConcerns.length > 0 ? JSON.stringify({ recommendation: aiRecommendation, key_strengths: aiStrengths, key_concerns: aiConcerns }) : null,
        founder: {
          full_name:           body.applicant_name,
          phone:               body.phone_number,
          date_of_birth:       body.date_of_birth,
          nationality:         body.nationality,
          country_of_residence:body.country_of_residence,
          linkedin:            body.linkedin_url,
        },
        venture: {
          company_name:         body.venture_name,
          sector:               body.venture_sector,
          stage:                body.venture_stage,
          website:              body.website_url,
          one_liner:            body.venture_description.substring(0, 200),
          incorporation_country:body.incorporation_country,
        },
        co_founder_name:  body.co_founder_name || null,
        co_founder_email: body.co_founder_email || null,
        ...docUrls,
      };

      await dbUpdate(BUILDER_APP, "Application", existing.id, serviceToken, builderUpdate);
      console.log(`[register] ✅ Builder record updated: ${ref}`);

      // ── 7. Save to Agent DB (flat schema) ───────────────────────────────
      try {
        const agentApps = await dbList(AGENT_APP, "Application", serviceToken);
        const agentRec  = agentApps.find((a: any) => a.reference_code === ref);

        const agentData: Record<string, any> = {
          reference_code:       ref,
          status:               "submitted",
          payment_status:       "pending",
          applicant_name:       body.applicant_name,
          applicant_email:      body.applicant_email,
          applicant_role:       body.applicant_role,
          phone_number:         body.phone_number,
          date_of_birth:        body.date_of_birth,
          nationality:          body.nationality,
          country_of_residence: body.country_of_residence,
          linkedin_url:         body.linkedin_url,
          website_url:          body.website_url,
          venture_name:         body.venture_name,
          venture_sector:       body.venture_sector,
          venture_stage:        body.venture_stage,
          venture_description:  body.venture_description,
          co_founder_name:      body.co_founder_name || null,
          co_founder_email:     body.co_founder_email || null,
          declaration_agreed:   body.declaration_agreed,
          documents_submitted:  docsUploaded > 0,
          submitted_at:         now,
          ai_score:             aiScore || null,
          ai_summary:           aiSummary || null,
          registration_email_sent: false,
          payment_email_sent:   false,
          ...docUrls,
        };

        if (agentRec) {
          await dbUpdate(AGENT_APP, "Application", agentRec.id, serviceToken, agentData);
        } else {
          await dbCreate(AGENT_APP, "Application", serviceToken, agentData);
        }
        console.log(`[register] ✅ Agent record synced: ${ref}`);
      } catch (e: any) {
        console.warn("[register] Agent sync failed:", e.message);
      }

      // ── 8. Send registration completion email to applicant ───────────────
      if (resendKey) {
        const compEmailHtml = completionEmail({
          name: body.applicant_name, ref, venture: body.venture_name,
          sector: body.venture_sector, stage: body.venture_stage,
          score: aiScore, summary: aiSummary, strengths: aiStrengths,
          docsCount: docsUploaded, statusUrl,
        });
        const sent = await sendEmail(resendKey, body.applicant_email,
          `✅ Registration Confirmed — ${ref} | Prime Endorsement Authority`,
          compEmailHtml
        );
        console.log(`[register] Completion email to applicant: ${sent ? "✅" : "❌"}`);

        // ── 9. Admin alert ────────────────────────────────────────────────
        const adminHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:580px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
<div style="background:#0d1220;border-bottom:3px solid #22c55e;padding:20px;text-align:center">
  <div style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
  <div style="color:#22c55e;font-size:13px;margin-top:4px">🆕 New Registration Completed — ${ref}</div>
</div>
<div style="padding:24px;font-size:13px">
  <div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:6px;padding:14px;margin-bottom:14px">
    <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Applicant Summary</div>
    <table style="width:100%;color:#e2e8f0;font-size:13px;border-collapse:collapse">
      <tr><td style="color:#64748b;padding:3px 0;width:120px">Name:</td><td>${body.applicant_name}</td></tr>
      <tr><td style="color:#64748b;padding:3px 0">Email:</td><td>${body.applicant_email}</td></tr>
      <tr><td style="color:#64748b;padding:3px 0">Role:</td><td>${body.applicant_role}</td></tr>
      <tr><td style="color:#64748b;padding:3px 0">Venture:</td><td>${body.venture_name}</td></tr>
      <tr><td style="color:#64748b;padding:3px 0">Sector:</td><td>${body.venture_sector} · ${body.venture_stage}</td></tr>
      <tr><td style="color:#64748b;padding:3px 0">Nationality:</td><td>${body.nationality}</td></tr>
      <tr><td style="color:#64748b;padding:3px 0">Documents:</td><td style="color:${docsUploaded>0?"#22c55e":"#f59e0b"}">${docsUploaded} uploaded</td></tr>
      ${aiScore > 0 ? `<tr><td style="color:#64748b;padding:3px 0">AI Score:</td><td style="color:${aiScore>=70?"#22c55e":aiScore>=50?"#f59e0b":"#ef4444"};font-weight:700">${aiScore}/100 — ${aiRecommendation}</td></tr>` : ""}
    </table>
  </div>
  <div style="text-align:center">
    <a href="https://app.base44.com/apps/${BUILDER_APP}/editor/preview" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase">Open Admin Panel →</a>
  </div>
</div>
<div style="background:#0d1220;border-top:1px solid #1e293b;padding:12px;text-align:center">
  <p style="color:#475569;font-size:11px;margin:0">© ${new Date().getFullYear()} Prime Endorsement Authority</p>
</div>
</div></body></html>`;
        await sendEmail(resendKey, ADMIN_EMAIL, `🆕 New Registration — ${ref}${aiScore > 0 ? ` | AI: ${aiScore}/100` : ""} | PEA`, adminHtml);

        // ── 10. Auto-trigger payment letter (fire-and-forget) ────────────
        try {
          fetch(`${DOMAIN}/api/functions/peaSendPaymentLetter`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference_code: ref,
              auto_triggered:  true,
              source:          "registration_completion",
            }),
          }).catch(() => {});
          console.log(`[register] Payment letter triggered for ${ref}`);
        } catch (e: any) {
          console.warn("[register] Payment letter trigger failed:", e.message);
        }

        // Mark registration email sent
        try {
          const agentApps2 = await dbList(AGENT_APP, "Application", serviceToken);
          const agentRec2  = agentApps2.find((a: any) => a.reference_code === ref);
          if (agentRec2) {
            await dbUpdate(AGENT_APP, "Application", agentRec2.id, serviceToken, { registration_email_sent: true });
          }
        } catch {}
      }

      // ── 11. Serve completion screen ──────────────────────────────────────
      return new Response(
        completionScreen({
          name: body.applicant_name, ref, venture: body.venture_name,
          score: aiScore, summary: aiSummary, strengths: aiStrengths,
          statusUrl, docsCount: docsUploaded,
        }),
        { status: 200, headers: HTML_HEADERS }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HEADERS });

  } catch (err: any) {
    console.error("[register] Fatal:", err.message, err.stack?.substring(0, 200));
    return new Response(
      `<html><body style="background:#0A0E1A;color:#e2e8f0;font-family:Arial;padding:40px;text-align:center">
        <h2 style="color:#ef4444">Registration Error</h2>
        <p style="color:#94a3b8">An unexpected error occurred. Please try again or contact <a href="mailto:admin@primeendorsement.com" style="color:#C9A84C">admin@primeendorsement.com</a></p>
        <p style="color:#475569;font-size:12px">Error: ${err.message}</p>
      </body></html>`,
      { status: 500, headers: HTML_HEADERS }
    );
  }
}
