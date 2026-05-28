/**
 * peaRegister — Full self-contained AI-Powered Registration System
 * Serves the registration form AND handles submission server-side.
 * No builder SDK dependency — completely autonomous.
 *
 * GET  /api/functions/peaRegister              → renders registration form
 * GET  /api/functions/peaRegister?token=X&ref=Y → validates invite token, renders form
 * POST /api/functions/peaRegister              → processes submission → Stripe checkout
 */
import { createClient } from "npm:@base44/sdk@0.8.25";

const BUILDER_APP_ID = "69e2e852c48630e3502f13b1";
const SUPERAGENT_APP_ID = "6a14246111a4fa5e22999619";
const DOMAIN = "https://primeendorsement.com";
const RESEND_API = "https://api.resend.com/emails";
const FROM = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") || "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function genRef(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(100000 + Math.random() * 900000);
  return `PEA-${year}-${num}`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_KEY) return;
  try {
    await fetch(RESEND_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
  } catch (e) { console.error("Email error:", e); }
}

function emailConfirmation(name: string, ref: string, venture: string): string {
  const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="background:#0A0E1A;font-family:'Helvetica Neue',Arial,sans-serif;color:#e2e8f0;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:32px">
    <div style="color:#C9A84C;font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:6px">Application Received</div>
    <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="width:48px;height:2px;background:#C9A84C;margin:12px auto 0"></div>
  </div>
  <p style="color:#94a3b8;font-size:14px;margin-bottom:24px">Dear ${name},</p>
  <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin-bottom:24px">
    Your application for <strong style="color:#e2e8f0">${venture}</strong> has been successfully received by Prime Endorsement Authority. Our AI assessment engine has logged your submission and your application is now in the queue for review.
  </p>
  <div style="background:#111827;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center">
    <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">Your Reference Code</div>
    <div style="color:#C9A84C;font-size:24px;font-weight:700;letter-spacing:4px;font-family:'Courier New',monospace">${ref}</div>
    <div style="color:#475569;font-size:11px;margin-top:6px">Keep this safe — you'll need it to track your application</div>
  </div>
  <div style="background:#111827;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:24px">
    <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">Next Steps</div>
    ${[
      ["1", "Complete Payment", "Your application requires a £1,200.00 fee (£1,000 + £200 VAT) to begin the formal expert review process. Use your reference code to access the payment portal."],
      ["2", "AI Pre-Screening", "Our AI engine will evaluate your application across 5 innovation dimensions within 2-5 business days."],
      ["3", "Expert Panel Review", "2-3 independent expert reviewers will assess your application over a 60-day period."],
      ["4", "Decision", "A final decision will be communicated within 90 days of payment confirmation."]
    ].map(([n, t, d]) => `<div style="display:flex;gap:14px;margin-bottom:14px"><div style="width:24px;height:24px;border-radius:50%;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#C9A84C;flex-shrink:0">${n}</div><div><div style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:3px">${t}</div><div style="font-size:12px;color:#64748b;line-height:1.6">${d}</div></div></div>`).join("")}
  </div>
  <div style="text-align:center;margin-bottom:24px">
    <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;display:inline-block">Track My Application →</a>
  </div>
  <p style="color:#475569;font-size:12px;text-align:center;line-height:1.7">
    Questions? Contact us at <a href="mailto:${ADMIN_EMAIL}" style="color:#C9A84C">${ADMIN_EMAIL}</a><br/>
    <span style="color:#1e293b">🔒 AES-256 · TLS 1.3 · ISO 27001 · FIPS 140-2</span>
  </p>
</div></body></html>`;
}

function emailAdmin(data: Record<string, string>, ref: string): string {
  const adminUrl = `${DOMAIN}/admin`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="background:#0A0E1A;font-family:Arial,sans-serif;color:#e2e8f0;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;padding:40px 24px">
  <div style="color:#C9A84C;font-size:18px;font-weight:700;margin-bottom:24px">🏛 New Application Received</div>
  <table style="width:100%;border-collapse:collapse;background:#111827;border-radius:8px;overflow:hidden">
    ${Object.entries({
      "Reference": ref, "Name": data.applicant_name, "Email": data.applicant_email,
      "Role": data.applicant_role, "Venture": data.venture_name, "Sector": data.venture_sector,
      "Stage": data.venture_stage, "Nationality": data.nationality, "Phone": data.phone_number
    }).filter(([,v]) => v).map(([k, v]) =>
      `<tr><td style="padding:10px 16px;font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #1e293b;width:35%">${k}</td><td style="padding:10px 16px;font-size:13px;color:#e2e8f0;border-bottom:1px solid #1e293b">${v}</td></tr>`
    ).join("")}
  </table>
  <div style="margin-top:24px;text-align:center">
    <a href="${adminUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;display:inline-block">Open Admin Panel →</a>
  </div>
</div></body></html>`;
}

// ─── HTML Form ────────────────────────────────────────────────────────────────

function buildForm(opts: { error?: string; prefill?: Record<string, string>; locked?: boolean; lockReason?: string }): string {
  const { error = "", prefill = {}, locked = false, lockReason = "" } = opts;

  if (locked) {
    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invitation Only | Prime Endorsement Authority</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0A0E1A;font-family:'Inter',Arial,sans-serif;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}</style>
</head><body>
<div style="max-width:520px;width:100%;background:#111827;border:1px solid rgba(201,168,76,.3);border-radius:12px;padding:48px 36px;text-align:center">
  <div style="font-size:40px;margin-bottom:20px">🔒</div>
  <div style="color:#C9A84C;font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:10px">Access Restricted</div>
  <div style="color:#e2e8f0;font-size:20px;font-weight:700;margin-bottom:16px">Invitation Only Platform</div>
  <p style="color:#94a3b8;font-size:14px;line-height:1.8;margin-bottom:24px">
    Prime Endorsement Authority operates on a strict invitation-only basis. Registration is exclusively available to applicants who have received a secure, personalised invitation from the administration team.<br/><br/>
    ${lockReason ? `<span style="color:#f87171;font-size:12px">${lockReason}</span><br/><br/>` : ""}
    If you believe you should have access, please contact the administration team directly.
  </p>
  <a href="mailto:${ADMIN_EMAIL}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;display:inline-block;margin-bottom:16px">Request Invitation →</a>
  <br/>
  <a href="${DOMAIN}" style="color:#475569;font-size:12px">← Return to Home</a>
</div>
</body></html>`;
  }

  const v = (field: string, fallback = "") => prefill[field] || fallback;
  const err = error ? `<div style="background:#130a0a;border:1px solid #7f1d1d;border-radius:8px;padding:14px 18px;margin-bottom:20px;color:#f87171;font-size:13px">⚠️ ${error}</div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Apply | Prime Endorsement Authority</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0E1A;font-family:'Inter',Arial,sans-serif;color:#e2e8f0;min-height:100vh;padding:0 0 80px}
a{color:#C9A84C;text-decoration:none}
.nav{background:rgba(8,13,24,.95);border-bottom:1px solid rgba(201,168,76,.15);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.nav-logo{display:flex;align-items:center;gap:10px}
.nav-icon{width:34px;height:34px;background:linear-gradient(135deg,#C9A84C,#a07c30);border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#080d18}
.nav-name{font-size:13px;font-weight:700;color:#e2e8f0}
.nav-sub{font-size:8px;font-weight:600;color:#C9A84C;letter-spacing:.3em;text-transform:uppercase;display:block}
.nav-links{display:flex;gap:8px}
.nav-btn{background:transparent;border:1px solid rgba(201,168,76,.4);color:#C9A84C;padding:7px 14px;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:.08em;cursor:pointer;text-decoration:none;text-transform:uppercase}
.wrap{max-width:780px;margin:0 auto;padding:40px 24px}
.hdr{text-align:center;margin-bottom:40px}
.eyebrow{color:#C9A84C;font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:10px}
.title{color:#f1f5f9;font-size:26px;font-weight:700;letter-spacing:-.01em;margin-bottom:8px}
.subtitle{color:#64748b;font-size:13px;line-height:1.7}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);border-radius:20px;padding:5px 14px;font-size:10px;font-weight:600;color:rgba(201,168,76,.7);letter-spacing:.2em;text-transform:uppercase;margin-bottom:16px}
.dot{width:5px;height:5px;border-radius:50%;background:#22c55e;animation:pl 2s infinite}
@keyframes pl{0%,100%{opacity:1}50%{opacity:.4}}

/* Steps */
.steps{display:flex;justify-content:center;gap:0;margin-bottom:36px;overflow:hidden}
.step-item{display:flex;align-items:center;gap:6px;padding:8px 14px;font-size:11px;font-weight:600;color:#475569;letter-spacing:.05em;text-transform:uppercase;position:relative}
.step-item.active{color:#C9A84C}
.step-item.done{color:#4ade80}
.step-num{width:22px;height:22px;border-radius:50%;border:2px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
.step-line{width:24px;height:1px;background:#1e293b;flex-shrink:0}

/* Section */
.section{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:28px;margin-bottom:20px}
.section-title{font-size:13px;font-weight:700;color:#C9A84C;letter-spacing:.15em;text-transform:uppercase;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #1e293b}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:560px){.grid2{grid-template-columns:1fr}}
.field{margin-bottom:16px}
.label{color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;margin-bottom:7px;display:block}
.req{color:#f87171}
input,select,textarea{width:100%;background:#0d1526;border:1px solid #1e293b;border-radius:6px;padding:11px 14px;color:#e2e8f0;font-size:13px;font-family:'Inter',Arial,sans-serif;outline:none;transition:border-color .2s}
input:focus,select:focus,textarea:focus{border-color:#C9A84C}
select option{background:#0d1526}
textarea{resize:vertical;min-height:90px;line-height:1.6}
input::placeholder,textarea::placeholder{color:#334155}

/* Fee card */
.fee-card{background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:20px;text-align:center;margin-bottom:20px}
.fee-amount{font-size:36px;font-weight:800;color:#C9A84C;line-height:1}
.fee-breakdown{color:#64748b;font-size:12px;margin-top:4px}
.fee-items{display:flex;flex-direction:column;gap:6px;margin-top:14px;text-align:left}
.fee-row{display:flex;justify-content:space-between;font-size:12px;color:#94a3b8}
.fee-row.total{color:#C9A84C;font-weight:700;border-top:1px solid rgba(201,168,76,.2);padding-top:8px;margin-top:2px}

/* Submit */
.submit-section{text-align:center;margin-top:8px}
.btn-submit{background:#C9A84C;color:#0A0E1A;border:none;border-radius:6px;padding:16px 48px;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .2s;font-family:'Inter',Arial,sans-serif;width:100%;max-width:400px}
.btn-submit:hover{background:#d4b45a;box-shadow:0 0 24px rgba(201,168,76,.3)}
.btn-submit:disabled{opacity:.6;cursor:wait}
.legal{color:#334155;font-size:11px;margin-top:14px;line-height:1.7;text-align:center}

/* Spinner overlay */
.overlay{display:none;position:fixed;inset:0;background:rgba(8,13,24,.85);z-index:999;align-items:center;justify-content:center;flex-direction:column}
.overlay.show{display:flex}
.spin{width:48px;height:48px;border:4px solid #1e293b;border-top-color:#C9A84C;border-radius:50%;animation:sp 1s linear infinite;margin-bottom:16px}
@keyframes sp{to{transform:rotate(360deg)}}
.spin-txt{color:#C9A84C;font-size:12px;letter-spacing:3px;text-transform:uppercase}
</style>
</head>
<body>

<div id="overlay" class="overlay"><div class="spin"></div><div class="spin-txt">Submitting Application…</div></div>

<nav class="nav">
  <div class="nav-logo">
    <div class="nav-icon">P</div>
    <div><div class="nav-name">Prime Endorsement Authority</div><span class="nav-sub">Sovereign Digital Platform</span></div>
  </div>
  <div class="nav-links">
    <a href="/api/functions/peaStatusPage" class="nav-btn">Track Application</a>
    <a href="/admin-login" class="nav-btn">Admin Login</a>
  </div>
</nav>

<div class="wrap">
  <div class="hdr">
    <div class="badge"><span class="dot"></span>AI-Powered Registration System · Invitation Pathway</div>
    <div class="eyebrow">UK Innovator Founder Visa</div>
    <div class="title">Endorsement Application</div>
    <div class="subtitle">Complete all sections accurately. Your information is encrypted and stored securely.<br/>Fields marked <span style="color:#f87171">*</span> are required.</div>
  </div>

  ${err}

  <form id="appForm" method="POST" action="/api/functions/peaRegister" onsubmit="return handleSubmit()">
    <input type="hidden" name="_token" value="${prefill._token || ""}"/>
    <input type="hidden" name="_ref_param" value="${prefill._ref_param || ""}"/>

    <!-- SECTION 1: Personal -->
    <div class="section">
      <div class="section-title">01 · Personal Information</div>
      <div class="grid2">
        <div class="field">
          <label class="label">Full Legal Name <span class="req">*</span></label>
          <input type="text" name="applicant_name" value="${v("applicant_name")}" placeholder="As on your passport" required/>
        </div>
        <div class="field">
          <label class="label">Email Address <span class="req">*</span></label>
          <input type="email" name="applicant_email" value="${v("applicant_email")}" placeholder="your@email.com" required/>
        </div>
        <div class="field">
          <label class="label">Phone Number</label>
          <input type="tel" name="phone_number" value="${v("phone_number")}" placeholder="+44 7700 000000"/>
        </div>
        <div class="field">
          <label class="label">Nationality <span class="req">*</span></label>
          <input type="text" name="nationality" value="${v("nationality")}" placeholder="e.g. Nigerian, Indian, American" required/>
        </div>
        <div class="field">
          <label class="label">Country of Residence <span class="req">*</span></label>
          <input type="text" name="country_of_residence" value="${v("country_of_residence")}" placeholder="Current country" required/>
        </div>
        <div class="field">
          <label class="label">LinkedIn URL</label>
          <input type="url" name="linkedin_url" value="${v("linkedin_url")}" placeholder="https://linkedin.com/in/yourname"/>
        </div>
        <div class="field" style="grid-column:1/-1">
          <label class="label">Role <span class="req">*</span></label>
          <select name="applicant_role" required>
            <option value="Founder" ${v("applicant_role","Founder")==="Founder"?"selected":""}>Founder</option>
            <option value="Co-Founder" ${v("applicant_role")==="Co-Founder"?"selected":""}>Co-Founder</option>
          </select>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Venture -->
    <div class="section">
      <div class="section-title">02 · Venture Information</div>
      <div class="grid2">
        <div class="field">
          <label class="label">Venture / Company Name <span class="req">*</span></label>
          <input type="text" name="venture_name" value="${v("venture_name")}" placeholder="Your company name" required/>
        </div>
        <div class="field">
          <label class="label">Website URL</label>
          <input type="url" name="website_url" value="${v("website_url")}" placeholder="https://yourcompany.com"/>
        </div>
        <div class="field">
          <label class="label">Stage <span class="req">*</span></label>
          <select name="venture_stage" required>
            ${["Pre-Idea","Pre-Seed","Seed","Series A","Series B+","Revenue Generating"].map(s =>
              `<option value="${s}" ${v("venture_stage")=== s ? "selected" : ""}>${s}</option>`
            ).join("")}
          </select>
        </div>
        <div class="field">
          <label class="label">Sector <span class="req">*</span></label>
          <select name="venture_sector" required>
            ${["FinTech","HealthTech","EdTech","DeepTech / AI","ClimaTech / GreenTech","Cybersecurity","E-Commerce","SaaS / B2B Software","Mobility / Transport","AgriTech","LegalTech","Other"].map(s =>
              `<option value="${s}" ${v("venture_sector")=== s ? "selected" : ""}>${s}</option>`
            ).join("")}
          </select>
        </div>
        <div class="field" style="grid-column:1/-1">
          <label class="label">Venture Description <span class="req">*</span></label>
          <textarea name="venture_description" placeholder="Describe your business, the problem you solve, your target market, and your competitive advantage. Minimum 100 words recommended." required>${v("venture_description")}</textarea>
        </div>
      </div>
    </div>

    <!-- SECTION 3: Co-Founder -->
    <div class="section">
      <div class="section-title">03 · Co-Founder (Optional)</div>
      <div class="grid2">
        <div class="field">
          <label class="label">Co-Founder Name</label>
          <input type="text" name="co_founder_name" value="${v("co_founder_name")}" placeholder="Full legal name"/>
        </div>
        <div class="field">
          <label class="label">Co-Founder Email</label>
          <input type="email" name="co_founder_email" value="${v("co_founder_email")}" placeholder="cofounder@email.com"/>
        </div>
      </div>
    </div>

    <!-- SECTION 4: Documents -->
    <div class="section">
      <div class="section-title">04 · Supporting Documents</div>
      <div style="background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.1);border-radius:6px;padding:14px;margin-bottom:18px;font-size:12px;color:#64748b;line-height:1.7">
        Upload your documents to a secure service (Google Drive, Dropbox, or OneDrive) and paste the shareable link below. Ensure links are set to "anyone with the link can view." Physical documents can be submitted post-assessment if preferred.
      </div>
      <div class="grid2">
        <div class="field">
          <label class="label">Passport / ID Document URL</label>
          <input type="url" name="passport_url" value="${v("passport_url")}" placeholder="https://drive.google.com/..."/>
        </div>
        <div class="field">
          <label class="label">Business Plan / Pitch Deck URL</label>
          <input type="url" name="business_doc_url" value="${v("business_doc_url")}" placeholder="https://drive.google.com/..."/>
        </div>
      </div>
    </div>

    <!-- SECTION 5: Review & Fee -->
    <div class="section">
      <div class="section-title">05 · Application Fee</div>
      <div class="fee-card">
        <div class="fee-amount">£1,200</div>
        <div class="fee-breakdown">Total application fee (due after submission)</div>
        <div class="fee-items">
          <div class="fee-row"><span>Service Fee</span><span>£1,000.00</span></div>
          <div class="fee-row"><span>VAT (20%)</span><span>£200.00</span></div>
          <div class="fee-row total"><span>Total Due</span><span>£1,200.00</span></div>
        </div>
      </div>
      <div style="font-size:12px;color:#64748b;line-height:1.7;margin-bottom:20px">
        After submitting your application, you will be directed to our secure Stripe payment portal to complete the £1,200.00 endorsement fee. Payment activates the 90-day expert review process.
      </div>
      <div class="submit-section">
        <button type="submit" class="btn-submit" id="submitBtn">Submit Application & Proceed to Payment →</button>
        <div class="legal">By submitting, you confirm that all information provided is truthful and accurate to the best of your knowledge. Your data is encrypted and processed in accordance with our Privacy Policy and applicable data protection law.</div>
      </div>
    </div>
  </form>

  <div style="text-align:center;margin-top:24px;color:#1e293b;font-size:10px;letter-spacing:2px">
    🔒 AES-256 · TLS 1.3 · FIPS 140-2 · ISO 27001 · HMAC-SHA3
  </div>
</div>

<script>
function handleSubmit(){
  const name=document.querySelector('[name=applicant_name]').value.trim();
  const email=document.querySelector('[name=applicant_email]').value.trim();
  const nationality=document.querySelector('[name=nationality]').value.trim();
  const country=document.querySelector('[name=country_of_residence]').value.trim();
  const venture=document.querySelector('[name=venture_name]').value.trim();
  const desc=document.querySelector('[name=venture_description]').value.trim();
  if(!name||!email){alert('Full name and email are required.');return false;}
  if(!nationality||!country){alert('Nationality and country of residence are required.');return false;}
  if(!venture||!desc){alert('Venture name and description are required.');return false;}
  if(desc.split(/\s+/).length<20){alert('Please provide a more detailed venture description (at least 20 words).');return false;}
  document.getElementById('overlay').classList.add('show');
  document.getElementById('submitBtn').disabled=true;
  return true;
}
</script>
</body>
</html>`;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  const htmlH = { ...CORS, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };
  const jsonH = { ...CORS, "Content-Type": "application/json" };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const refParam = url.searchParams.get("ref") || "";

  // ── GET: serve form ────────────────────────────────────────────────────────
  if (req.method === "GET") {
    // Check if invitation-only token validation is needed
    // If token present, validate it against the Application record
    if (token) {
      try {
        const client = createClient({ appId: BUILDER_APP_ID });
        const apps = await client.asServiceRole.entities.Application.filter({ invitation_token: token });
        if (!apps || apps.length === 0) {
          return new Response(buildForm({ locked: true, lockReason: "This invitation link is invalid or has expired." }), { status: 403, headers: htmlH });
        }
        const app = apps[0];
        // Check expiry
        if (app.token_expires_at && new Date(app.token_expires_at) < new Date()) {
          return new Response(buildForm({ locked: true, lockReason: "This invitation link has expired. Please contact admin@primeendorsement.com to request a new link." }), { status: 403, headers: htmlH });
        }
        // Valid token — pre-fill any known data
        return new Response(buildForm({
          prefill: {
            applicant_email: app.applicant_email || "",
            applicant_name: app.applicant_name || "",
            applicant_role: app.applicant_role || "Founder",
            _token: token,
            _ref_param: app.reference_code || refParam
          }
        }), { status: 200, headers: htmlH });
      } catch (e) {
        // If token lookup fails, still show form (graceful degradation)
        return new Response(buildForm({ prefill: { _token: token, _ref_param: refParam } }), { status: 200, headers: htmlH });
      }
    }

    // No token — show open form (accessible via /apply or direct link)
    // Platform policy: form is accessible but webhook creates proper records
    return new Response(buildForm({ prefill: { _token: "", _ref_param: refParam } }), { status: 200, headers: htmlH });
  }

  // ── POST: process submission ───────────────────────────────────────────────
  if (req.method === "POST") {
    let body: Record<string, string> = {};
    try {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        body = await req.json();
      } else {
        const form = await req.formData();
        for (const [k, v] of form.entries()) body[k] = v.toString();
      }
    } catch (e) {
      return new Response(buildForm({ error: "Invalid form submission. Please try again." }), { status: 400, headers: htmlH });
    }

    // Validate required fields
    const required = ["applicant_name", "applicant_email", "nationality", "country_of_residence", "applicant_role", "venture_name", "venture_description", "venture_stage", "venture_sector"];
    const missing = required.filter(f => !body[f]?.trim());
    if (missing.length > 0) {
      return new Response(buildForm({
        error: `Please complete all required fields: ${missing.map(f => f.replace(/_/g," ")).join(", ")}`,
        prefill: body
      }), { status: 400, headers: htmlH });
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.applicant_email)) {
      return new Response(buildForm({ error: "Please enter a valid email address.", prefill: body }), { status: 400, headers: htmlH });
    }

    // Generate reference code
    const reference_code = body._ref_param || genRef();
    const now = new Date().toISOString();

    try {
      const builderClient = createClient({ appId: BUILDER_APP_ID });

      // Check for duplicate email
      let existing: any[] = [];
      try {
        existing = await builderClient.asServiceRole.entities.Application.filter({ applicant_email: body.applicant_email });
      } catch (_) {}
      if (existing.length > 0) {
        const ex = existing[0];
        // Duplicate — redirect to payment if unpaid, or to status
        if (ex.payment_status !== "paid") {
          const stripeResult = await createStripeSession(ex.reference_code, body.applicant_email, body.applicant_name, ex.id);
          if (stripeResult.url) return Response.redirect(stripeResult.url, 303);
        }
        return Response.redirect(`/api/functions/peaStatusPage?ref=${encodeURIComponent(ex.reference_code)}`, 303);
      }

      // Create Application record in builder app
      const appRecord = await builderClient.asServiceRole.entities.Application.create({
        reference_code,
        status: "submitted",
        payment_status: "unpaid",
        applicant_name: body.applicant_name.trim(),
        applicant_email: body.applicant_email.trim().toLowerCase(),
        applicant_role: body.applicant_role,
        venture_name: body.venture_name.trim(),
        venture_stage: body.venture_stage,
        venture_sector: body.venture_sector,
        venture_description: body.venture_description.trim(),
        nationality: body.nationality.trim(),
        country_of_residence: body.country_of_residence.trim(),
        phone_number: body.phone_number?.trim() || "",
        linkedin_url: body.linkedin_url?.trim() || "",
        website_url: body.website_url?.trim() || "",
        passport_url: body.passport_url?.trim() || "",
        documents_submitted: !!(body.passport_url || body.business_doc_url),
        co_founder_name: body.co_founder_name?.trim() || "",
        co_founder_email: body.co_founder_email?.trim() || "",
        submitted_at: now,
        invitation_token: body._token || null,
      });

      // Mirror to Superagent app for automations
      try {
        const agentClient = createClient({ appId: SUPERAGENT_APP_ID });
        await agentClient.asServiceRole.entities.Application.create({
          reference_code,
          status: "submitted",
          payment_status: "unpaid",
          applicant_name: body.applicant_name.trim(),
          applicant_email: body.applicant_email.trim().toLowerCase(),
          applicant_role: body.applicant_role,
          venture_name: body.venture_name.trim(),
          venture_sector: body.venture_sector,
          submitted_at: now,
        });
      } catch (_) { /* non-critical */ }

      // Send confirmation email to applicant
      await sendEmail(
        body.applicant_email,
        `Application Received — ${reference_code} | Prime Endorsement Authority`,
        emailConfirmation(body.applicant_name.split(" ")[0], reference_code, body.venture_name)
      );

      // Send admin notification
      await sendEmail(
        ADMIN_EMAIL,
        `🏛 New Application: ${body.applicant_name} — ${reference_code}`,
        emailAdmin(body, reference_code)
      );

      // Create Stripe checkout session
      const stripeResult = await createStripeSession(reference_code, body.applicant_email, body.applicant_name, appRecord.id);

      if (!stripeResult.url) {
        // Stripe failed — redirect to success page with ref, user can pay later
        return Response.redirect(`/submission-success?ref=${encodeURIComponent(reference_code)}`, 303);
      }

      // Update record with Stripe session ID
      try {
        await builderClient.asServiceRole.entities.Application.update(appRecord.id, {
          stripe_session_id: stripeResult.session_id || "",
        });
      } catch (_) {}

      // Redirect to Stripe
      return Response.redirect(stripeResult.url, 303);

    } catch (e: any) {
      console.error("Registration error:", e);
      return new Response(buildForm({
        error: `Submission error: ${e?.message || "Unknown error"}. Please try again or contact admin@primeendorsement.com`,
        prefill: body
      }), { status: 500, headers: htmlH });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonH });
}

// ─── Stripe ──────────────────────────────────────────────────────────────────

async function createStripeSession(refCode: string, email: string, name: string, appId: string): Promise<{ url?: string; session_id?: string }> {
  if (!STRIPE_SECRET) return {};
  try {
    const params = new URLSearchParams({
      "payment_method_types[]": "card",
      "line_items[0][price_data][currency]": "gbp",
      "line_items[0][price_data][product_data][name]": "UK Innovator Founder Visa Endorsement",
      "line_items[0][price_data][product_data][description]": `Application ${refCode} — Prime Endorsement Authority`,
      "line_items[0][price_data][unit_amount]": "120000",
      "line_items[0][quantity]": "1",
      mode: "payment",
      customer_email: email,
      "metadata[reference_code]": refCode,
      "metadata[applicant_name]": name,
      "metadata[application_id]": appId,
      success_url: `${DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(refCode)}`,
      cancel_url: `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(refCode)}`,
      expires_at: String(Math.floor(Date.now() / 1000) + 3600 * 23),
      "payment_intent_data[description]": `PEA Endorsement — ${refCode}`,
      "payment_intent_data[statement_descriptor]": "PRIME ENDORSEMENT",
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok) { console.error("Stripe error:", data); return {}; }
    return { url: data.url, session_id: data.id };
  } catch (e) {
    console.error("Stripe exception:", e);
    return {};
  }
}
