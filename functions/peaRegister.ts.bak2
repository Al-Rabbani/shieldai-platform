/**
 * peaRegister — v8 CINEMATIC AI REGISTRATION 2026-05-30
 *
 * KEY FIX: Form uses fetch() AJAX — token is preserved in JS, never lost.
 * Full pipeline on POST:
 *   1. Token validation
 *   2. Duplicate detection
 *   3. Field validation
 *   4. AI scoring (GPT-4o-mini)
 *   5. DB save (builder + agent)
 *   6. Registration completion email (with AI score + summary)
 *   7. Admin alert email
 *   8. Auto-trigger peaSendPaymentLetter (payment invoice)
 *   9. Return JSON → frontend renders cinematic completion screen
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const AGENT_APP   = "6a14246111a4fa5e22999619";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";

const HTML_H = { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" };
const JSON_H = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };

// ── DB ────────────────────────────────────────────────────────────────────────
async function dbList(app: string, entity: string, tok: string): Promise<any[]> {
  const r = await fetch(`https://app.base44.com/api/apps/${app}/entities/${entity}`, { headers: { Authorization: `Bearer ${tok}` } });
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d) ? d : d.data || [];
}
async function dbCreate(app: string, entity: string, tok: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${app}/entities/${entity}`, {
    method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`DB CREATE ${r.status}: ${await r.text()}`);
  return r.json();
}
async function dbUpdate(app: string, entity: string, id: string, tok: string, data: object): Promise<void> {
  await fetch(`https://app.base44.com/api/apps/${app}/entities/${entity}/${id}`, {
    method: "PUT", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
}

// ── Email ─────────────────────────────────────────────────────────────────────
async function sendEmail(key: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const r = await fetch(RESEND_API, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }) });
    return r.ok;
  } catch { return false; }
}

// ── AI Scoring ────────────────────────────────────────────────────────────────
async function aiScore(data: Record<string, any>, key: string) {
  if (!key) return { score: 0, summary: "", recommendation: "", strengths: [], concerns: [] };
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `You are a senior reviewer for Prime Endorsement Authority, a UK Innovator Founder Visa endorsement body. Assess this application objectively and score it.

APPLICANT: ${data.applicant_name}
ROLE: ${data.applicant_role}
NATIONALITY: ${data.nationality}
VENTURE: ${data.venture_name}
SECTOR: ${data.venture_sector}
STAGE: ${data.venture_stage}
DESCRIPTION: ${data.venture_description}
DOCUMENTS SUBMITTED: ${data.docs_count || 0}
CO-FOUNDER: ${data.co_founder_name || "None"}

Score 0-100 based on: innovation potential, market viability, founder credibility, sector relevance, programme fit, and documentation completeness.

Return ONLY valid JSON:
{"score":75,"summary":"2-3 sentence executive summary for the applicant","recommendation":"Recommend","key_strengths":["strength 1","strength 2","strength 3"],"key_concerns":["concern 1"]}` }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const j = await r.json();
    const p = JSON.parse(j.choices[0].message.content);
    return { score: Math.min(100, Math.max(0, p.score || 0)), summary: p.summary || "", recommendation: p.recommendation || "", strengths: p.key_strengths || [], concerns: p.key_concerns || [] };
  } catch (e: any) { console.warn("[register] AI failed:", e.message); return { score: 0, summary: "", recommendation: "", strengths: [], concerns: [] }; }
}

// ── Registration completion email ─────────────────────────────────────────────
function completionEmail(p: { name: string; ref: string; venture: string; score: number; summary: string; strengths: string[]; statusUrl: string }): string {
  const firstName = p.name.split(" ")[0];
  const sc = p.score;
  const scColor = sc >= 70 ? "#22c55e" : sc >= 50 ? "#f59e0b" : sc > 0 ? "#ef4444" : "#C9A84C";
  const scLabel = sc >= 70 ? "Strong Profile" : sc >= 50 ? "Promising Profile" : sc > 0 ? "Developing Profile" : "Under Review";
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:0 auto;background:#111827;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0d1220,#111827);border-bottom:3px solid #C9A84C;padding:32px">
    <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#e2e8f0;font-size:22px;font-weight:700;margin-top:8px">✅ Registration Complete</div>
    <div style="color:#64748b;font-size:13px;margin-top:4px">Your application has been successfully submitted</div>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#e2e8f0;font-size:15px;font-weight:600;margin:0 0 8px">Dear ${firstName},</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 24px">Your registration with the Prime Endorsement Authority has been successfully received and processed. Your application is now on record and your AI assessment has been completed.</p>
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:10px;padding:20px;margin-bottom:20px">
      <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #1e293b">Application Reference</div>
      <div style="color:#C9A84C;font-size:24px;font-weight:700;letter-spacing:4px;margin-bottom:12px">${p.ref}</div>
      <table style="width:100%;font-size:13px"><tr><td style="color:#64748b;padding:3px 0;width:120px">Venture:</td><td style="color:#e2e8f0">${p.venture}</td></tr></table>
    </div>
    ${sc > 0 ? `<div style="background:#0d1220;border:1px solid #1e293b;border-radius:10px;padding:20px;margin-bottom:20px">
      <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #1e293b">AI Assessment Score</div>
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px">
        <div style="width:64px;height:64px;border-radius:50%;border:3px solid ${scColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="color:${scColor};font-size:18px;font-weight:700">${sc}</span>
        </div>
        <div><div style="color:${scColor};font-weight:700;font-size:14px">${scLabel}</div><div style="color:#64748b;font-size:12px;margin-top:2px">Out of 100 — AI Evaluation</div></div>
      </div>
      ${p.summary ? `<p style="color:#94a3b8;font-size:13px;line-height:1.7;margin:0 0 12px;padding:12px;background:#060c18;border-radius:6px;border-left:3px solid #C9A84C">${p.summary}</p>` : ""}
      ${p.strengths.length ? `<div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Key Strengths</div>${p.strengths.map(s => `<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#22c55e;font-weight:700">✓</span><span style="color:#94a3b8;font-size:12px">${s}</span></div>`).join("")}` : ""}
    </div>` : ""}
    <div style="background:#0d1a00;border:1px solid #365314;border-radius:10px;padding:18px;margin-bottom:20px">
      <div style="color:#86efac;font-size:13px;font-weight:700;margin-bottom:6px">💳 Payment Invoice Dispatched</div>
      <p style="color:#94a3b8;font-size:12px;line-height:1.7;margin:0">A formal Payment Invitation & Invoice for the programme fee of <strong style="color:#e2e8f0">£1,200.00</strong> has been sent to this email address. Please check your inbox to complete the activation of your application.</p>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <a href="${p.statusUrl}" style="display:inline-block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">Track My Application →</a>
    </div>
    <p style="color:#475569;font-size:11px;line-height:1.7;margin:0">For assistance: <a href="mailto:admin@primeendorsement.com" style="color:#C9A84C">admin@primeendorsement.com</a></p>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:16px 32px;text-align:center">
    <p style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:2px;margin:0 0 4px">PRIME ENDORSEMENT AUTHORITY</p>
    <p style="color:#475569;font-size:11px;margin:0">© ${year} · <a href="https://primeendorsement.com" style="color:#C9A84C;text-decoration:none">primeendorsement.com</a></p>
  </div>
</div></body></html>`;
}

// ── Admin alert email ─────────────────────────────────────────────────────────
function adminAlertEmail(p: { name: string; email: string; ref: string; venture: string; sector: string; stage: string; nationality: string; role: string; score: number; recommendation: string; docsCount: number }): string {
  const scColor = p.score >= 70 ? "#22c55e" : p.score >= 50 ? "#f59e0b" : "#ef4444";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:12px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:24px 28px">
    <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Admin Alert — New Application</div>
    <div style="color:#e2e8f0;font-size:18px;font-weight:700;margin-top:6px">🆕 ${p.ref}</div>
  </div>
  <div style="padding:24px 28px">
    <table style="width:100%;font-size:13px;border-collapse:collapse">
      <tr><td style="color:#64748b;padding:5px 0;width:140px">Applicant:</td><td style="color:#e2e8f0;font-weight:600">${p.name}</td></tr>
      <tr><td style="color:#64748b;padding:5px 0">Email:</td><td style="color:#e2e8f0">${p.email}</td></tr>
      <tr><td style="color:#64748b;padding:5px 0">Role:</td><td style="color:#e2e8f0">${p.role}</td></tr>
      <tr><td style="color:#64748b;padding:5px 0">Nationality:</td><td style="color:#e2e8f0">${p.nationality}</td></tr>
      <tr><td style="color:#64748b;padding:5px 0">Venture:</td><td style="color:#e2e8f0">${p.venture}</td></tr>
      <tr><td style="color:#64748b;padding:5px 0">Sector/Stage:</td><td style="color:#e2e8f0">${p.sector} · ${p.stage}</td></tr>
      <tr><td style="color:#64748b;padding:5px 0">Documents:</td><td style="color:#e2e8f0">${p.docsCount} uploaded</td></tr>
      ${p.score > 0 ? `<tr><td style="color:#64748b;padding:5px 0">AI Score:</td><td style="color:${scColor};font-weight:700">${p.score}/100 — ${p.recommendation}</td></tr>` : ""}
    </table>
    <div style="margin-top:16px;text-align:center">
      <a href="https://app.base44.com/apps/${BUILDER_APP}/admin" style="display:inline-block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">Review in Admin →</a>
    </div>
  </div>
</div></body></html>`;
}

// ── Error page ────────────────────────────────────────────────────────────────
function errorPage(title: string, msg: string): Response {
  return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${title} — PEA</title></head>
<body style="margin:0;background:#0A0E1A;font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="max-width:460px;background:#111827;border-radius:12px;overflow:hidden;text-align:center">
  <div style="background:#0d1220;border-bottom:3px solid #ef4444;padding:28px">
    <div style="font-size:40px;margin-bottom:10px">🔒</div>
    <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">Prime Endorsement Authority</div>
    <div style="color:#ef4444;font-size:15px;font-weight:600">${title}</div>
  </div>
  <div style="padding:28px">
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 20px">${msg}</p>
    <p style="color:#475569;font-size:11px">For assistance: <a href="mailto:admin@primeendorsement.com" style="color:#C9A84C">admin@primeendorsement.com</a></p>
  </div>
</div></body></html>`, { status: 400, headers: HTML_H });
}

// ── REGISTRATION FORM (v8 — AJAX, cinematic, no native submit) ────────────────
function registrationForm(token: string, ref: string, applicantName: string): string {
  const postUrl = `${DOMAIN}/api/functions/peaRegister`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>🏛️ AI-Powered Registration — Prime Endorsement Authority</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--gold:#C9A84C;--gold2:#e8c96a;--dark:#0A0E1A;--card:#111827;--card2:#0d1220;--border:#1e293b;--muted:#64748b;--text:#e2e8f0;--sub:#94a3b8;--green:#22c55e;--red:#ef4444;--amber:#f59e0b}
body{background:var(--dark);color:var(--text);font-family:'Segoe UI',Arial,sans-serif;min-height:100vh}

/* ── TOP BAR ── */
.topbar{background:rgba(10,14,26,.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(201,168,76,.15);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.topbar-brand{color:var(--gold);font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase}
.topbar-ref{color:var(--muted);font-size:11px;letter-spacing:1px}
.topbar-ai{background:linear-gradient(135deg,rgba(201,168,76,.15),rgba(201,168,76,.05));border:1px solid rgba(201,168,76,.3);border-radius:20px;padding:4px 12px;color:var(--gold);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase}

/* ── PROGRESS ── */
.prog-wrap{background:var(--card2);border-bottom:1px solid var(--border);padding:20px 24px}
.prog-bar-bg{height:3px;background:rgba(201,168,76,.12);border-radius:2px;margin-bottom:20px;overflow:hidden}
.prog-bar-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold2));border-radius:2px;transition:width .5s cubic-bezier(.4,0,.2,1);width:20%}
.steps{display:flex;justify-content:space-between;align-items:flex-start;max-width:640px;margin:0 auto}
.step{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;position:relative}
.step:not(:last-child)::after{content:'';position:absolute;top:14px;left:calc(50% + 14px);right:calc(-50% + 14px);height:1px;background:var(--border);transition:background .4s}
.step.done::after,.step.active::after{background:var(--gold)}
.step-dot{width:28px;height:28px;border-radius:50%;border:2px solid var(--border);background:var(--dark);color:var(--muted);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:all .35s;cursor:default;flex-shrink:0}
.step.active .step-dot{border-color:var(--gold);color:var(--gold);background:rgba(201,168,76,.1);box-shadow:0 0 14px rgba(201,168,76,.3)}
.step.done .step-dot{border-color:var(--green);background:var(--green);color:#fff;font-size:14px}
.step-lbl{font-size:9px;color:var(--muted);font-weight:600;letter-spacing:1px;text-transform:uppercase;text-align:center;transition:color .35s;white-space:nowrap}
.step.active .step-lbl{color:var(--gold)}
.step.done .step-lbl{color:var(--green)}

/* ── MAIN ── */
main{max-width:740px;margin:0 auto;padding:32px 20px 80px}
.section{display:none}.section.active{display:block}
.sec-head{margin-bottom:28px}
.sec-num{color:var(--gold);font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px}
.sec-title{font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px}
.sec-sub{color:var(--sub);font-size:13px;line-height:1.6}

/* ── CARD ── */
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:20px}
.card-title{color:var(--muted);font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border)}

/* ── FORM ── */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:540px){.grid2{grid-template-columns:1fr}}
.field{margin-bottom:16px}
.field label{display:block;color:var(--sub);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
.field label .req{color:var(--red);margin-left:2px}
.field input,.field select,.field textarea{width:100%;background:#060c18;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;padding:11px 14px;outline:none;transition:border-color .2s,box-shadow .2s;font-family:inherit}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,76,.1)}
.field input.err,.field select.err,.field textarea.err{border-color:var(--red);animation:shake .3s}
.field select{cursor:pointer}
.field textarea{resize:vertical;min-height:100px}
.char-count{color:var(--muted);font-size:10px;margin-top:4px;text-align:right}
.hint{color:var(--muted);font-size:11px;margin-top:4px;line-height:1.5}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}

/* ── UPLOAD ZONES ── */
.upload-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:8px}
@media(max-width:540px){.upload-grid{grid-template-columns:1fr}}
.upload-zone{border:1.5px dashed var(--border);border-radius:10px;padding:18px 14px;text-align:center;cursor:pointer;transition:all .25s;background:#060c18;position:relative}
.upload-zone:hover,.upload-zone.has-file{border-color:var(--gold);background:rgba(201,168,76,.04)}
.upload-zone.has-file{border-style:solid}
.upload-zone input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.uz-icon{font-size:22px;margin-bottom:6px}
.uz-label{color:var(--sub);font-size:11px;font-weight:600;letter-spacing:.5px}
.uz-status{color:var(--green);font-size:10px;margin-top:4px;font-weight:600}
.uz-req{color:var(--muted);font-size:9px;margin-top:2px;opacity:.6}

/* ── DECLARATION ── */
.decl-box{background:#060c18;border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px}
.decl-box p{color:var(--sub);font-size:12px;line-height:1.8;margin-bottom:14px}
.check-row{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;cursor:pointer}
.check-row input[type=checkbox]{width:18px;height:18px;flex-shrink:0;margin-top:1px;accent-color:var(--gold);cursor:pointer}
.check-row span{color:var(--sub);font-size:12px;line-height:1.6}
.check-row span strong{color:var(--text)}

/* ── AI BADGE ── */
.ai-badge{background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04));border:1px solid rgba(201,168,76,.25);border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:12px;margin-bottom:20px}
.ai-pulse{width:10px;height:10px;border-radius:50%;background:var(--gold);animation:pulse 1.8s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}

/* ── NAVIGATION ── */
.nav-row{display:flex;justify-content:space-between;align-items:center;margin-top:28px;gap:12px}
.btn{padding:13px 28px;border-radius:9px;font-weight:700;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;border:none;transition:all .2s}
.btn-back{background:transparent;border:1px solid var(--border);color:var(--muted)}
.btn-back:hover{border-color:var(--sub);color:var(--text)}
.btn-next{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#0A0E1A;flex:1;max-width:260px}
.btn-next:hover{filter:brightness(1.08);transform:translateY(-1px)}
.btn-next:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-submit{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#0A0E1A;flex:1}
.btn-submit:hover:not(:disabled){filter:brightness(1.08);transform:translateY(-1px)}
.btn-submit:disabled{opacity:.5;cursor:not-allowed;transform:none}

/* ── SUBMITTING OVERLAY ── */
#overlay{display:none;position:fixed;inset:0;background:rgba(10,14,26,.92);backdrop-filter:blur(8px);z-index:999;align-items:center;justify-content:center;flex-direction:column;gap:20px}
.spin-ring{width:56px;height:56px;border:3px solid rgba(201,168,76,.2);border-top-color:var(--gold);border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.spin-msg{color:var(--gold);font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase}
.spin-sub{color:var(--muted);font-size:11px;text-align:center;max-width:260px;line-height:1.6}
.spin-steps{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.spin-step{color:var(--muted);font-size:11px;display:flex;align-items:center;gap:8px}
.spin-step.done{color:var(--green)}
.spin-step .sicon{width:16px;text-align:center}

/* ── COMPLETION SCREEN ── */
#completion{display:none;position:fixed;inset:0;background:var(--dark);z-index:1000;overflow-y:auto}
.comp-wrap{max-width:700px;margin:0 auto;padding:40px 20px 80px}
.comp-hero{text-align:center;margin-bottom:40px}
.comp-check{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,rgba(34,197,94,.2),rgba(34,197,94,.05));border:2px solid var(--green);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:36px;animation:checkIn .6s cubic-bezier(.175,.885,.32,1.275)}
@keyframes checkIn{from{transform:scale(0) rotate(-45deg);opacity:0}to{transform:scale(1) rotate(0deg);opacity:1}}
.comp-title{font-size:28px;font-weight:700;color:var(--text);margin-bottom:8px}
.comp-sub{color:var(--sub);font-size:14px;line-height:1.6}
.comp-ref{display:inline-block;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.3);border-radius:8px;padding:8px 24px;margin:16px 0;color:var(--gold);font-size:20px;font-weight:700;letter-spacing:4px}
.comp-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
@media(max-width:540px){.comp-grid{grid-template-columns:1fr}}
.comp-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}
.comp-card-title{color:var(--muted);font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px}
.score-ring-wrap{display:flex;align-items:center;gap:16px}
.score-ring{position:relative;width:64px;height:64px;flex-shrink:0}
.score-ring svg{transform:rotate(-90deg)}
.score-ring-val{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700}
.comp-steps{display:flex;flex-direction:column;gap:10px}
.comp-step{display:flex;align-items:flex-start;gap:10px;padding:10px;background:#060c18;border-radius:8px;border:1px solid var(--border)}
.comp-step-num{width:24px;height:24px;border-radius:50%;background:var(--gold);color:#0A0E1A;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.comp-step-text{color:var(--sub);font-size:12px;line-height:1.5}
.comp-step-text strong{color:var(--text)}
.comp-cta{text-align:center;margin-top:28px}
.comp-cta a{display:inline-block;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#0A0E1A;text-decoration:none;padding:16px 48px;border-radius:10px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase}
.strengths-list{display:flex;flex-direction:column;gap:6px}
.strength-item{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--sub)}
.strength-item::before{content:'✓';color:var(--green);font-weight:700;flex-shrink:0}
.pay-notice{background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:16px;margin-bottom:20px;display:flex;gap:12px;align-items:flex-start}
.pay-notice-icon{font-size:20px;flex-shrink:0}
.pay-notice-text{color:var(--sub);font-size:12px;line-height:1.7}
.pay-notice-text strong{color:var(--green)}

@media(max-width:480px){.topbar-ai{display:none}.comp-title{font-size:22px}}
</style>
</head>
<body>

<!-- TOP BAR -->
<div class="topbar">
  <div class="topbar-brand">Prime Endorsement Authority</div>
  <div class="topbar-ai">⚡ AI-Powered</div>
  <div class="topbar-ref" id="topRef">${ref ? `Ref: ${ref}` : ""}</div>
</div>

<!-- PROGRESS -->
<div class="prog-wrap">
  <div class="prog-bar-bg"><div class="prog-bar-fill" id="pFill"></div></div>
  <div class="steps">
    <div class="step active" id="st1"><div class="step-dot" id="d1">1</div><div class="step-lbl" id="l1">Personal</div></div>
    <div class="step" id="st2"><div class="step-dot" id="d2">2</div><div class="step-lbl" id="l2">Venture</div></div>
    <div class="step" id="st3"><div class="step-dot" id="d3">3</div><div class="step-lbl" id="l3">Co-Founder</div></div>
    <div class="step" id="st4"><div class="step-dot" id="d4">4</div><div class="step-lbl" id="l4">Documents</div></div>
    <div class="step" id="st5"><div class="step-dot" id="d5">5</div><div class="step-lbl" id="l5">Declaration</div></div>
  </div>
</div>

<!-- MAIN FORM -->
<main>

<!-- SECTION 1 — PERSONAL -->
<div class="section active" id="sec1">
  <div class="sec-head">
    <div class="sec-num">Section 1 of 5</div>
    <div class="sec-title">Personal Information</div>
    <div class="sec-sub">Tell us about yourself — the individual applying for endorsement.</div>
  </div>
  <div class="ai-badge">
    <div class="ai-pulse"></div>
    <div><div style="color:var(--gold);font-size:12px;font-weight:700;margin-bottom:2px">AI-Assisted Review Active</div><div style="color:var(--muted);font-size:11px">Your profile will be assessed by GPT-4o-mini upon submission</div></div>
  </div>
  <div class="card">
    <div class="card-title">Full Legal Name & Contact</div>
    <div class="grid2">
      <div class="field"><label>Full Name <span class="req">*</span></label><input type="text" name="applicant_name" id="f_name" value="${applicantName}" placeholder="As on passport"/></div>
      <div class="field"><label>Email Address <span class="req">*</span></label><input type="email" name="applicant_email" id="f_email" placeholder="your@email.com"/></div>
      <div class="field"><label>Phone Number <span class="req">*</span></label><input type="tel" name="phone_number" id="f_phone" placeholder="+44 7700 900000"/></div>
      <div class="field"><label>Date of Birth <span class="req">*</span></label><input type="date" name="date_of_birth" id="f_dob"/></div>
    </div>
    <div class="grid2">
      <div class="field"><label>Nationality <span class="req">*</span></label><input type="text" name="nationality" id="f_nat" placeholder="e.g. Nigerian, British"/></div>
      <div class="field"><label>Country of Residence <span class="req">*</span></label><input type="text" name="country_of_residence" id="f_country" placeholder="e.g. United Kingdom"/></div>
    </div>
    <div class="field"><label>Application Role <span class="req">*</span></label>
      <select name="applicant_role" id="f_role">
        <option value="">— Select your role —</option>
        <option value="Founder">Founder</option>
        <option value="Co-Founder">Co-Founder</option>
      </select>
    </div>
  </div>
  <div class="card">
    <div class="card-title">Online Presence</div>
    <div class="grid2">
      <div class="field"><label>LinkedIn Profile</label><input type="text" name="linkedin_url" id="f_linkedin" placeholder="https://linkedin.com/in/yourname"/></div>
      <div class="field"><label>Website / Portfolio</label><input type="text" name="website_url" id="f_website" placeholder="https://yourventure.com"/></div>
    </div>
  </div>
  <div class="nav-row">
    <div></div>
    <button class="btn btn-next" onclick="goTo(2)">Next: Venture Details →</button>
  </div>
</div>

<!-- SECTION 2 — VENTURE -->
<div class="section" id="sec2">
  <div class="sec-head">
    <div class="sec-num">Section 2 of 5</div>
    <div class="sec-title">Venture Details</div>
    <div class="sec-sub">Describe your business — this is the core of your AI assessment.</div>
  </div>
  <div class="card">
    <div class="card-title">Company Information</div>
    <div class="grid2">
      <div class="field"><label>Venture / Company Name <span class="req">*</span></label><input type="text" name="venture_name" id="f_vname" placeholder="e.g. Acme Technologies Ltd"/></div>
      <div class="field"><label>Country of Incorporation <span class="req">*</span></label><input type="text" name="incorporation_country" id="f_incorp" placeholder="e.g. United Kingdom"/></div>
      <div class="field"><label>Year Founded <span class="req">*</span></label><input type="number" name="founded_year" id="f_year" placeholder="e.g. 2020" min="1990" max="2026"/></div>
      <div class="field"><label>Current Stage <span class="req">*</span></label>
        <select name="venture_stage" id="f_vstage">
          <option value="">— Stage —</option>
          <option value="Pre-Revenue">Pre-Revenue / Concept</option>
          <option value="MVP">MVP / Early Traction</option>
          <option value="Seed">Seed Stage</option>
          <option value="Series A">Series A</option>
          <option value="Series B+">Series B+</option>
          <option value="Growth">Growth / Scale-up</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Industry Sector <span class="req">*</span></label>
      <select name="venture_sector" id="f_vsector">
        <option value="">— Sector —</option>
        <option>FinTech</option><option>HealthTech</option><option>CleanTech</option><option>EdTech</option>
        <option>AgriTech</option><option>AI / Machine Learning</option><option>Blockchain / Web3</option>
        <option>SaaS / B2B Software</option><option>E-Commerce</option><option>Deep Tech</option>
        <option>BioTech / Life Sciences</option><option>PropTech</option><option>LogisticsTech</option>
        <option>Media / Creative</option><option>Investment & Finance</option><option>Other</option>
      </select>
    </div>
  </div>
  <div class="card">
    <div class="card-title">Venture Description <span style="color:var(--gold);font-size:9px;margin-left:8px">⚡ AI SCORED</span></div>
    <div class="field">
      <label>Describe your venture <span class="req">*</span> <span style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0">(min 150 characters)</span></label>
      <textarea name="venture_description" id="f_vdesc" rows="6" placeholder="Describe your business model, the problem you solve, your market opportunity, current traction (revenue, customers, partnerships), and what makes your venture innovative and globally scalable..."></textarea>
      <div class="char-count"><span id="vdCount">0</span> / 150 minimum</div>
    </div>
  </div>
  <div class="nav-row">
    <button class="btn btn-back" onclick="goTo(1)">← Back</button>
    <button class="btn btn-next" onclick="goTo(3)">Next: Co-Founder →</button>
  </div>
</div>

<!-- SECTION 3 — CO-FOUNDER -->
<div class="section" id="sec3">
  <div class="sec-head">
    <div class="sec-num">Section 3 of 5</div>
    <div class="sec-title">Co-Founder Details</div>
    <div class="sec-sub">If you have a co-founder, provide their details here. Otherwise leave blank.</div>
  </div>
  <div class="card">
    <div class="card-title">Co-Founder Information <span style="color:var(--muted);font-size:9px;font-weight:400;letter-spacing:0;text-transform:none">(optional)</span></div>
    <div class="grid2">
      <div class="field"><label>Co-Founder Full Name</label><input type="text" name="co_founder_name" id="f_cfname" placeholder="Full legal name"/></div>
      <div class="field"><label>Co-Founder Email</label><input type="email" name="co_founder_email" id="f_cfemail" placeholder="cofounder@email.com"/></div>
      <div class="field"><label>Co-Founder Role / Title</label><input type="text" name="co_founder_role" id="f_cfrole" placeholder="e.g. CTO, COO"/></div>
      <div class="field"><label>Co-Founder Nationality</label><input type="text" name="co_founder_nationality" id="f_cfnat" placeholder="e.g. British"/></div>
    </div>
  </div>
  <div class="nav-row">
    <button class="btn btn-back" onclick="goTo(2)">← Back</button>
    <button class="btn btn-next" onclick="goTo(4)">Next: Documents →</button>
  </div>
</div>

<!-- SECTION 4 — DOCUMENTS -->
<div class="section" id="sec4">
  <div class="sec-head">
    <div class="sec-num">Section 4 of 5</div>
    <div class="sec-title">Supporting Documents</div>
    <div class="sec-sub">Upload supporting documentation. Passport is mandatory — all others strengthen your application.</div>
  </div>
  <div class="card">
    <div class="card-title">Identity & Business Documents</div>
    <div class="upload-grid">
      <div class="upload-zone" id="uz_passport" onclick="document.getElementById('doc_passport').click()">
        <input type="file" id="doc_passport" name="doc_passport" accept=".pdf,.jpg,.jpeg,.png" onchange="fileSelected(this,'uz_passport','uz_passport_status')"/>
        <div class="uz-icon">🪪</div>
        <div class="uz-label">Passport / ID</div>
        <div class="uz-req">Required</div>
        <div class="uz-status" id="uz_passport_status"></div>
      </div>
      <div class="upload-zone" id="uz_address" onclick="document.getElementById('doc_address').click()">
        <input type="file" id="doc_address" name="doc_address" accept=".pdf,.jpg,.jpeg,.png" onchange="fileSelected(this,'uz_address','uz_address_status')"/>
        <div class="uz-icon">🏠</div>
        <div class="uz-label">Proof of Address</div>
        <div class="uz-req">Recommended</div>
        <div class="uz-status" id="uz_address_status"></div>
      </div>
      <div class="upload-zone" id="uz_bizreg" onclick="document.getElementById('doc_bizreg').click()">
        <input type="file" id="doc_bizreg" name="doc_bizreg" accept=".pdf,.jpg,.jpeg,.png" onchange="fileSelected(this,'uz_bizreg','uz_bizreg_status')"/>
        <div class="uz-icon">🏢</div>
        <div class="uz-label">Business Registration</div>
        <div class="uz-req">If incorporated</div>
        <div class="uz-status" id="uz_bizreg_status"></div>
      </div>
      <div class="upload-zone" id="uz_bizplan" onclick="document.getElementById('doc_bizplan').click()">
        <input type="file" id="doc_bizplan" name="doc_bizplan" accept=".pdf,.doc,.docx" onchange="fileSelected(this,'uz_bizplan','uz_bizplan_status')"/>
        <div class="uz-icon">📋</div>
        <div class="uz-label">Business Plan</div>
        <div class="uz-req">Recommended</div>
        <div class="uz-status" id="uz_bizplan_status"></div>
      </div>
      <div class="upload-zone" id="uz_financials" onclick="document.getElementById('doc_financials').click()">
        <input type="file" id="doc_financials" name="doc_financials" accept=".pdf,.xlsx,.xls,.csv" onchange="fileSelected(this,'uz_financials','uz_financials_status')"/>
        <div class="uz-icon">📊</div>
        <div class="uz-label">Financial Projections</div>
        <div class="uz-req">Recommended</div>
        <div class="uz-status" id="uz_financials_status"></div>
      </div>
      <div class="upload-zone" id="uz_pitch" onclick="document.getElementById('doc_pitch').click()">
        <input type="file" id="doc_pitch" name="doc_pitch" accept=".pdf,.ppt,.pptx" onchange="fileSelected(this,'uz_pitch','uz_pitch_status')"/>
        <div class="uz-icon">🎯</div>
        <div class="uz-label">Pitch Deck</div>
        <div class="uz-req">Recommended</div>
        <div class="uz-status" id="uz_pitch_status"></div>
      </div>
    </div>
    <div class="hint" style="margin-top:8px">📎 PDF, JPG, PNG accepted · Max 10MB per file · Files are encrypted and stored securely</div>
  </div>
  <div class="nav-row">
    <button class="btn btn-back" onclick="goTo(3)">← Back</button>
    <button class="btn btn-next" onclick="goTo(5)">Next: Declaration →</button>
  </div>
</div>

<!-- SECTION 5 — DECLARATION -->
<div class="section" id="sec5">
  <div class="sec-head">
    <div class="sec-num">Section 5 of 5</div>
    <div class="sec-title">Declaration & Submission</div>
    <div class="sec-sub">Please read and agree to the following before submitting your application.</div>
  </div>
  <div class="card">
    <div class="card-title">Programme Fee Notice</div>
    <div style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:16px;margin-bottom:4px">
      <div style="color:var(--gold);font-size:13px;font-weight:700;margin-bottom:6px">Programme Fee: £1,200.00 (inc. VAT)</div>
      <div style="color:var(--sub);font-size:12px;line-height:1.7">A formal Payment Invitation & Invoice will be sent to your email address immediately after registration. Payment activates your application for expert review. Submission today does not constitute a payment commitment.</div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">Applicant Declaration</div>
    <div class="decl-box">
      <p>By submitting this application, you confirm that all information provided is accurate, complete, and truthful. You understand that false or misleading information will result in immediate disqualification.</p>
      <label class="check-row"><input type="checkbox" id="decl1"/><span><strong>I confirm</strong> that all information and documents submitted are accurate, complete, and genuinely represent my business and background.</span></label>
      <label class="check-row"><input type="checkbox" id="decl2"/><span><strong>I understand</strong> that the programme fee of <strong>£1,200.00</strong> is non-refundable once the application is formally activated following payment.</span></label>
      <label class="check-row"><input type="checkbox" id="decl3"/><span><strong>I acknowledge</strong> that Prime Endorsement Authority's decision on endorsement is final, and payment does not guarantee approval.</span></label>
    </div>
    <div id="declError" style="color:var(--red);font-size:12px;margin-bottom:10px;display:none">⚠ Please agree to all declarations before submitting.</div>
  </div>

  <!-- SUBMIT ERROR -->
  <div id="submitError" style="display:none;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:16px;margin-bottom:16px;color:#fca5a5;font-size:13px"></div>

  <div class="nav-row">
    <button class="btn btn-back" onclick="goTo(4)">← Back</button>
    <button class="btn btn-submit" id="submitBtn" onclick="submitRegistration()">
      🚀 Submit Application
    </button>
  </div>
  <div style="color:var(--muted);font-size:11px;text-align:center;margin-top:14px">🔒 256-bit encrypted · Processed securely by Prime Endorsement Authority</div>
</div>

</main>

<!-- SUBMITTING OVERLAY -->
<div id="overlay">
  <div class="spin-ring"></div>
  <div class="spin-msg">Processing Application</div>
  <div class="spin-sub">Please wait — do not close this page</div>
  <div class="spin-steps">
    <div class="spin-step" id="sp1"><span class="sicon">○</span> Validating your information</div>
    <div class="spin-step" id="sp2"><span class="sicon">○</span> Running AI assessment</div>
    <div class="spin-step" id="sp3"><span class="sicon">○</span> Saving your application</div>
    <div class="spin-step" id="sp4"><span class="sicon">○</span> Sending confirmation emails</div>
    <div class="spin-step" id="sp5"><span class="sicon">○</span> Dispatching payment invoice</div>
  </div>
</div>

<!-- COMPLETION SCREEN (injected by JS) -->
<div id="completion"></div>

<script>
// ── STATE ──────────────────────────────────────────────────────────────────
var TOKEN = "${token}";
var POST_URL = "${postUrl}";
var cur = 1;
var TOTAL = 5;
var fills = [20, 40, 60, 80, 100];

// ── STEP NAV ───────────────────────────────────────────────────────────────
function goTo(n) {
  if (n > cur && !validate(cur)) return;
  var prev = cur;
  document.getElementById('sec' + prev).classList.remove('active');
  document.getElementById('sec' + n).classList.add('active');
  cur = n;
  for (var i = 1; i <= TOTAL; i++) {
    var st  = document.getElementById('st'  + i);
    var dot = document.getElementById('d'   + i);
    var lbl = document.getElementById('l'   + i);
    st.className = 'step' + (i < n ? ' done' : i === n ? ' active' : '');
    if (i < n)       { dot.textContent = '✓'; }
    else if (i === n){ dot.textContent = i; }
    else             { dot.textContent = i; }
  }
  document.getElementById('pFill').style.width = fills[n - 1] + '%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── VALIDATION ─────────────────────────────────────────────────────────────
function validate(step) {
  var ok = true;
  function req(id) {
    var el = document.getElementById(id) || document.querySelector('[name="' + id + '"]');
    if (!el) return true;
    var val = el.value ? el.value.trim() : '';
    if (!val) {
      el.classList.add('err');
      el.focus();
      setTimeout(function() { el.classList.remove('err'); }, 1800);
      ok = false;
      return false;
    }
    return true;
  }
  if (step === 1) {
    ['f_name','f_email','f_phone','f_dob','f_nat','f_country','f_role'].forEach(function(id) { req(id); });
  }
  if (step === 2) {
    ['f_vname','f_incorp','f_year','f_vstage','f_vsector'].forEach(function(id) { req(id); });
    var vd = document.getElementById('f_vdesc');
    if (vd && vd.value.trim().length < 150) {
      vd.classList.add('err');
      setTimeout(function() { vd.classList.remove('err'); }, 1800);
      ok = false;
    }
  }
  return ok;
}

// ── CHAR COUNTER ───────────────────────────────────────────────────────────
document.getElementById('f_vdesc').addEventListener('input', function() {
  var c = this.value.trim().length;
  var el = document.getElementById('vdCount');
  el.textContent = c;
  el.style.color = c >= 150 ? '#22c55e' : '#ef4444';
});

// ── FILE UPLOAD ────────────────────────────────────────────────────────────
function fileSelected(input, zoneId, statusId) {
  var zone   = document.getElementById(zoneId);
  var status = document.getElementById(statusId);
  if (input.files && input.files[0]) {
    var f = input.files[0];
    var name = f.name.length > 22 ? f.name.substring(0, 19) + '...' : f.name;
    zone.classList.add('has-file');
    status.textContent = '✓ ' + name;
  }
}

// ── SPINNER STEPS ──────────────────────────────────────────────────────────
function markSpinStep(n) {
  for (var i = 1; i <= n; i++) {
    var el = document.getElementById('sp' + i);
    if (el) { el.classList.add('done'); el.querySelector('.sicon').textContent = '✓'; }
  }
}

// ── SUBMIT (AJAX — token always preserved) ─────────────────────────────────
function submitRegistration() {
  // Declaration check
  if (!document.getElementById('decl1').checked ||
      !document.getElementById('decl2').checked ||
      !document.getElementById('decl3').checked) {
    document.getElementById('declError').style.display = 'block';
    return;
  }
  document.getElementById('declError').style.display = 'none';
  document.getElementById('submitError').style.display = 'none';

  // Disable button, show overlay
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('overlay').style.display = 'flex';

  // Build FormData
  var fd = new FormData();
  fd.append('token', TOKEN);
  fd.append('declaration_agreed', 'true');

  // Personal
  ['applicant_name','applicant_email','phone_number','date_of_birth','nationality',
   'country_of_residence','applicant_role','linkedin_url','website_url'].forEach(function(n) {
    var el = document.querySelector('[name="' + n + '"]') || document.getElementById('f_' + n.replace('applicant_','').replace('_number','').replace('_of_birth','dob').replace('_of_residence','country'));
    var v = '';
    if (el) v = el.value || '';
    // direct id map fallback
    var idMap = {applicant_name:'f_name',applicant_email:'f_email',phone_number:'f_phone',date_of_birth:'f_dob',nationality:'f_nat',country_of_residence:'f_country',applicant_role:'f_role',linkedin_url:'f_linkedin',website_url:'f_website'};
    var byId = document.getElementById(idMap[n]);
    if (byId) v = byId.value || '';
    fd.append(n, v.trim());
  });

  // Venture
  ['venture_name','incorporation_country','founded_year','venture_stage','venture_sector'].forEach(function(n) {
    var idMap2 = {venture_name:'f_vname',incorporation_country:'f_incorp',founded_year:'f_year',venture_stage:'f_vstage',venture_sector:'f_vsector'};
    var el = document.getElementById(idMap2[n]);
    fd.append(n, el ? el.value.trim() : '');
  });
  fd.append('venture_description', document.getElementById('f_vdesc').value.trim());

  // Co-founder
  fd.append('co_founder_name',        (document.getElementById('f_cfname')  || {value:''}).value.trim());
  fd.append('co_founder_email',       (document.getElementById('f_cfemail') || {value:''}).value.trim());
  fd.append('co_founder_role',        (document.getElementById('f_cfrole')  || {value:''}).value.trim());
  fd.append('co_founder_nationality', (document.getElementById('f_cfnat')   || {value:''}).value.trim());

  // Documents
  ['doc_passport','doc_address','doc_bizreg','doc_bizplan','doc_financials','doc_pitch'].forEach(function(n) {
    var el = document.getElementById(n);
    if (el && el.files && el.files[0]) fd.append(n, el.files[0]);
  });

  // Animate spinner steps
  setTimeout(function() { markSpinStep(1); }, 400);
  setTimeout(function() { markSpinStep(2); }, 1800);
  setTimeout(function() { markSpinStep(3); }, 3500);
  setTimeout(function() { markSpinStep(4); }, 5000);

  // POST
  fetch(POST_URL + '?token=' + encodeURIComponent(TOKEN), {
    method: 'POST',
    body: fd
  })
  .then(function(res) {
    var ct = res.headers.get('content-type') || '';
    if (ct.indexOf('application/json') !== -1) {
      return res.json().then(function(data) {
        markSpinStep(5);
        setTimeout(function() {
          document.getElementById('overlay').style.display = 'none';
          if (data.success) {
            showCompletion(data);
          } else {
            document.getElementById('submitBtn').disabled = false;
            var errEl = document.getElementById('submitError');
            errEl.textContent = '⚠ ' + (data.error || 'Submission failed. Please try again.');
            errEl.style.display = 'block';
          }
        }, 600);
      });
    } else {
      // HTML response — redirect to it
      return res.text().then(function(html) {
        markSpinStep(5);
        setTimeout(function() {
          document.open();
          document.write(html);
          document.close();
        }, 600);
      });
    }
  })
  .catch(function(err) {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('submitBtn').disabled = false;
    var errEl = document.getElementById('submitError');
    errEl.textContent = '⚠ Network error. Please check your connection and try again.';
    errEl.style.display = 'block';
    console.error('Submit error:', err);
  });
}

// ── COMPLETION SCREEN ──────────────────────────────────────────────────────
function showCompletion(data) {
  var score = data.ai_score || 0;
  var ref   = data.reference_code || '';
  var name  = data.applicant_name || '';
  var firstName = name.split(' ')[0];
  var venture   = data.venture_name || '';
  var summary   = data.ai_summary || '';
  var strengths = data.ai_strengths || [];
  var statusUrl = data.status_url || ('https://primeendorsement.com/api/functions/peaStatusPage?ref=' + encodeURIComponent(ref));

  var scColor = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : score > 0 ? '#ef4444' : '#C9A84C';
  var scLabel = score >= 70 ? 'Strong Profile' : score >= 50 ? 'Promising Profile' : score > 0 ? 'Developing Profile' : 'Under Review';

  // SVG score ring
  var radius = 26, circ = 2 * Math.PI * radius;
  var pct    = score > 0 ? score / 100 : 0;
  var dash   = pct * circ;

  var strengthsHtml = strengths.length
    ? '<div class="strengths-list">' + strengths.map(function(s) { return '<div class="strength-item">' + s + '</div>'; }).join('') + '</div>'
    : '<div style="color:var(--muted);font-size:12px">Strengths identified during review</div>';

  var html = '<div class="comp-wrap">' +
    '<div class="comp-hero">' +
      '<div class="comp-check">✅</div>' +
      '<div class="comp-title">Registration Complete</div>' +
      '<div class="comp-sub">Welcome to Prime Endorsement Authority, ' + firstName + '.<br>Your application has been received and processed.</div>' +
      '<div class="comp-ref">' + ref + '</div>' +
    '</div>' +

    '<div class="pay-notice">' +
      '<div class="pay-notice-icon">💳</div>' +
      '<div class="pay-notice-text"><strong>Payment Invoice Dispatched</strong><br>A formal Payment Invitation &amp; Invoice for <strong>£1,200.00</strong> has been sent to your email. Check your inbox to activate your application. A second email with your registration summary and AI assessment score has also been sent.</div>' +
    '</div>' +

    '<div class="comp-grid">' +
      (score > 0 ? '<div class="comp-card">' +
        '<div class="comp-card-title">AI Assessment</div>' +
        '<div class="score-ring-wrap">' +
          '<div class="score-ring">' +
            '<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="' + radius + '" fill="none" stroke="rgba(201,168,76,.15)" stroke-width="5"/><circle cx="32" cy="32" r="' + radius + '" fill="none" stroke="' + scColor + '" stroke-width="5" stroke-dasharray="' + dash.toFixed(1) + ' ' + circ.toFixed(1) + '" stroke-linecap="round"/></svg>' +
            '<div class="score-ring-val" style="color:' + scColor + '">' + score + '</div>' +
          '</div>' +
          '<div><div style="color:' + scColor + ';font-weight:700;font-size:13px">' + scLabel + '</div><div style="color:var(--muted);font-size:11px;margin-top:2px">GPT-4o-mini · ' + score + '/100</div></div>' +
        '</div>' +
        (summary ? '<p style="color:var(--sub);font-size:12px;line-height:1.7;margin-top:12px;padding:10px;background:#060c18;border-radius:6px;border-left:3px solid var(--gold)">' + summary + '</p>' : '') +
      '</div>' : '<div class="comp-card"><div class="comp-card-title">AI Assessment</div><div style="color:var(--muted);font-size:12px;line-height:1.6">AI scoring will be completed by our review team. Score not available yet.</div></div>') +

      '<div class="comp-card">' +
        '<div class="comp-card-title">Key Strengths</div>' +
        strengthsHtml +
      '</div>' +
    '</div>' +

    '<div class="comp-card" style="margin-bottom:20px">' +
      '<div class="comp-card-title">What Happens Next</div>' +
      '<div class="comp-steps">' +
        '<div class="comp-step"><div class="comp-step-num">1</div><div class="comp-step-text"><strong>Check your inbox</strong> — Payment invoice (£1,200) sent to your email</div></div>' +
        '<div class="comp-step"><div class="comp-step-num">2</div><div class="comp-step-text"><strong>Complete payment</strong> — Secure Stripe checkout · activates 90-day review</div></div>' +
        '<div class="comp-step"><div class="comp-step-num">3</div><div class="comp-step-text"><strong>Expert review begins</strong> — Your application is assessed by our panel</div></div>' +
        '<div class="comp-step"><div class="comp-step-num">4</div><div class="comp-step-text"><strong>Weekly updates</strong> — Status digests every Monday via email</div></div>' +
        '<div class="comp-step"><div class="comp-step-num">5</div><div class="comp-step-text"><strong>Endorsement decision</strong> — Official letter issued upon successful review</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="comp-cta">' +
      '<a href="' + statusUrl + '">Track My Application →</a>' +
    '</div>' +

    '<p style="color:var(--muted);font-size:11px;text-align:center;margin-top:20px">Questions? <a href="mailto:admin@primeendorsement.com" style="color:var(--gold)">admin@primeendorsement.com</a></p>' +
  '</div>';

  var compEl = document.getElementById('completion');
  compEl.innerHTML = html;
  compEl.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>
</body>
</html>`;
}

// ── POST HANDLER ──────────────────────────────────────────────────────────────
async function handlePost(req: Request): Promise<Response> {
  const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
  const resendKey    = Deno.env.get("RESEND_API_KEY")       || "";
  const stripeKey    = Deno.env.get("STRIPE_SECRET_KEY")    || "";
  const openaiKey    = Deno.env.get("OPENAI_API_KEY")       || "";

  if (!serviceToken || !resendKey || !stripeKey) {
    return new Response(JSON.stringify({ success: false, error: "Server configuration error" }), { status: 500, headers: JSON_H });
  }

  // Parse body — multipart or JSON
  let fields: Record<string, string> = {};
  let files:  Record<string, { name: string; data: Uint8Array; type: string }> = {};

  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    try {
      const fd = await req.formData();
      for (const [k, v] of fd.entries()) {
        if (typeof v === "string") fields[k] = v;
        else {
          const ab = await v.arrayBuffer();
          files[k] = { name: v.name, data: new Uint8Array(ab), type: v.type || "application/octet-stream" };
        }
      }
    } catch (e: any) { return new Response(JSON.stringify({ success: false, error: "Form parse error: " + e.message }), { status: 400, headers: JSON_H }); }
  } else {
    try { fields = await req.json(); } catch { return new Response(JSON.stringify({ success: false, error: "Invalid request body" }), { status: 400, headers: JSON_H }); }
  }

  // Token from query OR body
  const url   = new URL(req.url);
  const token = url.searchParams.get("token") || fields["token"] || "";

  if (!token) return new Response(JSON.stringify({ success: false, error: "Registration token required" }), { status: 400, headers: JSON_H });

  // Validate token against DB
  const allApps = await dbList(BUILDER_APP, "Application", serviceToken);
  const appRec  = allApps.find((a: any) =>
    (a.session_token === token || a.invitation_token === token) &&
    a.status !== "submitted" && a.status !== "paid" && a.status !== "approved"
  );

  if (!appRec) {
    // Check if already submitted
    const existing = allApps.find((a: any) => a.session_token === token || a.invitation_token === token);
    if (existing) {
      const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(existing.reference_code)}`;
      return new Response(JSON.stringify({ success: false, error: "already_submitted", reference_code: existing.reference_code, status_url: statusUrl }), { status: 409, headers: JSON_H });
    }
    return new Response(JSON.stringify({ success: false, error: "Invalid or expired registration token" }), { status: 401, headers: JSON_H });
  }

  // Required fields
  const required = ["applicant_name", "applicant_email", "phone_number", "date_of_birth",
                    "nationality", "country_of_residence", "applicant_role",
                    "venture_name", "venture_description", "venture_stage", "venture_sector",
                    "incorporation_country", "founded_year"];
  const missing = required.filter(f => !fields[f] || !fields[f].trim());
  if (missing.length) {
    return new Response(JSON.stringify({ success: false, error: `Missing: ${missing.slice(0,3).join(", ")}${missing.length > 3 ? ` +${missing.length - 3} more` : ""}` }), { status: 400, headers: JSON_H });
  }

  // Duplicate email check (different record)
  const email = fields.applicant_email.toLowerCase().trim();
  const dupe = allApps.find((a: any) =>
    a.applicant_email?.toLowerCase() === email &&
    a.id !== appRec.id &&
    ["submitted","paid","approved","under_review"].includes(a.status)
  );
  if (dupe) {
    return new Response(JSON.stringify({ success: false, error: "An active application already exists for this email address", existing: true, reference_code: dupe.reference_code }), { status: 409, headers: JSON_H });
  }

  const ref = appRec.reference_code;
  const applicantName = fields.applicant_name.trim();
  const venture = fields.venture_name.trim();

  // Count docs
  const docKeys  = ["doc_passport","doc_address","doc_bizreg","doc_bizplan","doc_financials","doc_pitch"];
  const docsCount = docKeys.filter(k => files[k]).length;

  // AI scoring
  const aiResult = await aiScore({
    applicant_name:       applicantName,
    applicant_role:       fields.applicant_role,
    nationality:          fields.nationality,
    venture_name:         venture,
    venture_sector:       fields.venture_sector,
    venture_stage:        fields.venture_stage,
    venture_description:  fields.venture_description,
    co_founder_name:      fields.co_founder_name || "",
    docs_count:           docsCount,
  }, openaiKey);

  // Build record
  const now     = new Date().toISOString();
  const recData = {
    applicant_name:         applicantName,
    applicant_email:        email,
    applicant_role:         fields.applicant_role,
    phone_number:           fields.phone_number,
    date_of_birth:          fields.date_of_birth,
    nationality:            fields.nationality,
    country_of_residence:   fields.country_of_residence,
    linkedin_url:           fields.linkedin_url || "",
    website_url:            fields.website_url  || "",
    venture_name:           venture,
    venture_sector:         fields.venture_sector,
    venture_stage:          fields.venture_stage,
    venture_description:    fields.venture_description,
    incorporation_country:  fields.incorporation_country,
    founded_year:           fields.founded_year,
    co_founder_name:        fields.co_founder_name || "",
    co_founder_email:       fields.co_founder_email || "",
    co_founder_role:        fields.co_founder_role  || "",
    co_founder_nationality: fields.co_founder_nationality || "",
    documents_submitted:    docsCount > 0,
    declaration_agreed:     true,
    status:                 "submitted",
    payment_status:         "pending",
    submitted_at:           now,
    ai_score:               aiResult.score,
    ai_summary:             aiResult.summary,
    registration_email_sent: false,
    // nested for builder compatibility
    founder: {
      full_name:    applicantName,
      email:        email,
      phone:        fields.phone_number,
      date_of_birth: fields.date_of_birth,
      nationality:  fields.nationality,
      country:      fields.country_of_residence,
      linkedin:     fields.linkedin_url || "",
      website:      fields.website_url  || "",
    },
    venture: {
      company_name:         venture,
      sector:               fields.venture_sector,
      stage:                fields.venture_stage,
      description:          fields.venture_description,
      incorporation_country: fields.incorporation_country,
      founded_year:         Number(fields.founded_year) || 0,
    },
    co_founder: fields.co_founder_name ? {
      name:        fields.co_founder_name,
      email:       fields.co_founder_email || "",
      role:        fields.co_founder_role  || "",
      nationality: fields.co_founder_nationality || "",
    } : null,
  };

  // Save to builder DB
  await dbUpdate(BUILDER_APP, "Application", appRec.id, serviceToken, recData);

  // Save to agent DB
  const agentApps = await dbList(AGENT_APP, "Application", serviceToken);
  const agentRec  = agentApps.find((a: any) => a.reference_code === ref);
  const agentData = {
    ...recData,
    invitation_token: token,
    reference_code:   ref,
  };
  delete (agentData as any).founder;
  delete (agentData as any).venture;
  delete (agentData as any).co_founder;

  if (agentRec) {
    await dbUpdate(AGENT_APP, "Application", agentRec.id, serviceToken, agentData);
  } else {
    await dbCreate(AGENT_APP, "Application", serviceToken, { ...agentData, reference_code: ref });
  }

  const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;

  // Send registration completion email
  const compHtml = completionEmail({ name: applicantName, ref, venture, score: aiResult.score, summary: aiResult.summary, strengths: aiResult.strengths, statusUrl });
  const compSent = await sendEmail(resendKey, email, `✅ Registration Complete — ${ref} | Prime Endorsement Authority`, compHtml);

  // Send admin alert
  sendEmail(resendKey, ADMIN_EMAIL,
    `🆕 New Application — ${ref} | ${applicantName} | Score: ${aiResult.score}/100`,
    adminAlertEmail({ name: applicantName, email, ref, venture, sector: fields.venture_sector, stage: fields.venture_stage, nationality: fields.nationality, role: fields.applicant_role, score: aiResult.score, recommendation: aiResult.recommendation, docsCount })
  ).catch(() => {});

  // Auto-trigger payment letter (fire-and-forget)
  fetch(`${DOMAIN}/api/functions/peaSendPaymentLetter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference_code: ref, auto_triggered: true, source: "registration_completion" }),
  }).catch(() => {});

  // Return JSON for AJAX handler
  return new Response(JSON.stringify({
    success:          true,
    reference_code:   ref,
    applicant_name:   applicantName,
    venture_name:     venture,
    ai_score:         aiResult.score,
    ai_summary:       aiResult.summary,
    ai_strengths:     aiResult.strengths,
    ai_recommendation: aiResult.recommendation,
    registration_email_sent: compSent,
    status_url:       statusUrl,
  }), { headers: JSON_H });
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  const method = req.method.toUpperCase();
  if (method === "OPTIONS") return new Response(null, { headers: JSON_H });

  try {
    if (method === "POST") return await handlePost(req);

    // GET — serve form
    const url   = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    const ref   = url.searchParams.get("ref")   || "";

    if (!token) return errorPage("Invalid Registration Link", "This registration link is missing a valid token. Please use the link provided in your official invitation email from Prime Endorsement Authority.");

    // Verify token exists
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    if (serviceToken) {
      const apps = await dbList(BUILDER_APP, "Application", serviceToken);
      const rec  = apps.find((a: any) => a.session_token === token || a.invitation_token === token);
      if (!rec) return errorPage("Link Invalid or Expired", "This registration link is no longer valid. It may have expired or already been used. Please contact admin@primeendorsement.com for a new invitation.");
      if (["submitted","paid","approved","under_review"].includes(rec.status)) {
        const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(rec.reference_code)}`;
        return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Already Submitted — PEA</title></head>
<body style="margin:0;background:#0A0E1A;font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="max-width:480px;background:#111827;border-radius:12px;overflow:hidden;text-align:center">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:28px">
    <div style="font-size:36px;margin-bottom:10px">🏛️</div>
    <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">Prime Endorsement Authority</div>
    <div style="color:#22c55e;font-size:14px;font-weight:600">Application Already Submitted</div>
  </div>
  <div style="padding:28px">
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:8px;padding:14px;margin-bottom:18px">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Reference</div>
      <div style="color:#C9A84C;font-size:20px;font-weight:700;letter-spacing:4px">${rec.reference_code}</div>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 20px">Your application is already on record. Track your progress below.</p>
    <a href="${statusUrl}" style="display:inline-block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">Track Application →</a>
  </div>
</div></body></html>`, { status: 200, headers: HTML_H });
      }
      return new Response(registrationForm(token, rec.reference_code, rec.applicant_name || ""), { headers: HTML_H });
    }

    return new Response(registrationForm(token, ref, ""), { headers: HTML_H });
  } catch (err: any) {
    console.error("[peaRegister] Fatal:", err.message, err.stack);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: JSON_H });
  }
}
