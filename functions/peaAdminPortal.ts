/**
 * peaAdminPortal — Full standalone admin dashboard served as HTML
 * Accessible at: https://primeendorsement.com/api/functions/peaAdminPortal
 * Includes: built-in 2-step login, AI Registration Engine, Payment Authority,
 * Applications management, Registrations, Payments, Settings
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const ADMIN_EMAIL  = "justicejeleel@gmail.com";
const ADMIN_PASS   = "727272";
const DOMAIN       = "https://primeendorsement.com";
const RESEND_KEY_ENV = "RESEND_API_KEY";
const STRIPE_KEY_ENV = "STRIPE_SECRET_KEY";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

// ── API handlers ──────────────────────────────────────────────────────────────

async function apiGetDashboard(base44: any) {
  const [apps, txs] = await Promise.all([
    base44.asServiceRole.entities.Application.list("-created_date", 500).catch(() => []),
    base44.asServiceRole.entities.PaymentTransaction.list("-created_date", 200).catch(() => []),
  ]);
  const revenue = txs
    .filter((t: any) => t.status === "paid" || t.status === "completed")
    .reduce((sum: number, t: any) => sum + (parseFloat(t.total) || parseFloat(t.amount) || 0), 0);
  return { apps, txs, revenue };
}

async function apiSendInvite(base44: any, body: any) {
  const resendKey = Deno.env.get(RESEND_KEY_ENV);
  if (!resendKey) throw new Error("Resend API key not configured");

  const { applicant_name, applicant_email, applicant_role, venture_name } = body;
  if (!applicant_email) throw new Error("applicant_email is required");

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const refCode = `PEA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const app = await base44.asServiceRole.entities.Application.create({
    reference_code: refCode,
    applicant_name: applicant_name || "",
    applicant_email,
    applicant_role: applicant_role || "founder",
    venture_name: venture_name || "",
    status: "draft",
    payment_status: "pending",
    invitation_token: token,
    token_expires_at: expires,
    submitted_at: new Date().toISOString(),
  });

  const regUrl = `${DOMAIN}/apply?token=${token}&ref=${refCode}`;
  const firstName = (applicant_name || "Applicant").split(" ")[0];

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Prime Endorsement Authority <admin@primeendorsement.com>",
      to: [applicant_email],
      subject: `Your PEA Registration Link — ${refCode}`,
      html: `<div style="background:#0A0E1A;color:#e2e8f0;font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto;">
        <div style="color:#C9A84C;font-size:18px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">PRIME ENDORSEMENT AUTHORITY</div>
        <p>Dear ${firstName},</p>
        <p>You have been invited to apply for Prime Endorsement Authority certification.</p>
        <p><strong>Reference:</strong> ${refCode}</p>
        <p><strong>Role:</strong> ${applicant_role || "Founder"}</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${regUrl}" style="background:#C9A84C;color:#0A0E1A;padding:14px 40px;border-radius:6px;font-weight:700;text-decoration:none;font-size:14px;letter-spacing:2px;">BEGIN REGISTRATION →</a>
        </div>
        <p style="color:#64748b;font-size:12px;">This link expires in 72 hours. Reference: ${refCode}</p>
      </div>`,
    }),
  });

  return { success: true, reference_code: refCode, application_id: app.id };
}

async function apiSendPaymentLink(base44: any, body: any) {
  const stripeKey = Deno.env.get(STRIPE_KEY_ENV);
  if (!stripeKey) throw new Error("Stripe secret key not configured");

  const { application_id } = body;
  if (!application_id) throw new Error("application_id is required");

  const app = await base44.asServiceRole.entities.Application.get(application_id);
  if (!app) throw new Error("Application not found");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      "mode": "payment",
      "currency": "gbp",
      "line_items[0][price_data][currency]": "gbp",
      "line_items[0][price_data][product_data][name]": "Prime Endorsement Authority — Application Fee",
      "line_items[0][price_data][unit_amount]": "120000",
      "line_items[0][quantity]": "1",
      "customer_email": app.applicant_email || "",
      "metadata[application_id]": application_id,
      "metadata[reference_code]": app.reference_code || "",
      "success_url": `${DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}&ref=${app.reference_code}`,
      "cancel_url": `${DOMAIN}/apply?ref=${app.reference_code}`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe error: ${err}`);
  }

  const session = await res.json();
  return { success: true, checkout_url: session.url, session_id: session.id };
}

async function apiUpdateApplication(base44: any, body: any) {
  const { application_id, updates } = body;
  if (!application_id) throw new Error("application_id required");
  await base44.asServiceRole.entities.Application.update(application_id, updates);
  return { success: true };
}

// ── HTML Portal ───────────────────────────────────────────────────────────────

function buildHTML(funcUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>PEA Admin — Command Centre</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#080d18;color:#e2e8f0;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh}
  :root{--gold:#C9A84C;--gold-dim:#a07c30;--bg:#080d18;--card:#0d1526;--border:#1e2d45;--muted:#64748b;--green:#22c55e;--red:#ef4444}
  /* Login */
  .login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;background:radial-gradient(ellipse at 50% 0%,#1a1500 0%,#080d18 60%)}
  .login-box{background:#0d1526;border:1px solid var(--gold);border-radius:8px;padding:48px 44px;width:100%;max-width:420px;box-shadow:0 0 60px rgba(201,168,76,0.1)}
  .login-logo{text-align:center;color:var(--gold);font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;margin-bottom:8px}
  .login-title{text-align:center;font-size:20px;color:#f1f5f9;font-weight:600;margin-bottom:4px}
  .login-sub{text-align:center;font-size:12px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:32px}
  .form-label{display:block;font-size:11px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:6px}
  .form-input{width:100%;background:#060c18;border:1px solid #1e2d45;border-radius:4px;padding:12px 14px;color:#f1f5f9;font-size:14px;outline:none;transition:border .2s}
  .form-input:focus{border-color:var(--gold)}
  .btn-gold{width:100%;background:var(--gold);color:#080d18;border:none;border-radius:4px;padding:13px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;margin-top:16px;transition:background .2s}
  .btn-gold:hover{background:#d4a93c}
  .error-msg{color:#ef4444;font-size:12px;text-align:center;margin-top:10px;min-height:18px}
  /* Dashboard */
  .dash{display:none;flex-direction:column;min-height:100vh}
  .topbar{background:#0a0f1e;border-bottom:1px solid var(--border);padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;z-index:100}
  .topbar-logo{color:var(--gold);font-size:11px;letter-spacing:3px;font-weight:700;text-transform:uppercase}
  .topbar-badge{background:#0f2310;border:1px solid #166534;color:#22c55e;font-size:10px;padding:3px 8px;border-radius:3px;letter-spacing:2px;font-weight:700}
  .topbar-right{display:flex;align-items:center;gap:16px}
  .btn-signout{background:transparent;border:1px solid #1e2d45;color:var(--muted);font-size:11px;padding:6px 14px;border-radius:3px;cursor:pointer;letter-spacing:1px;transition:all .2s}
  .btn-signout:hover{border-color:#ef4444;color:#ef4444}
  .tabs{background:#0a0f1e;border-bottom:1px solid var(--border);padding:0 24px;display:flex;gap:4px;overflow-x:auto}
  .tab{padding:14px 20px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .2s;font-weight:600;background:none;border-left:none;border-right:none;border-top:none}
  .tab.active{color:var(--gold);border-bottom-color:var(--gold)}
  .tab:hover:not(.active){color:#94a3b8}
  .content{padding:28px 24px;flex:1;max-width:1400px;width:100%;margin:0 auto}
  /* Stats */
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px}
  .stat-card{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:20px 22px}
  .stat-label{font-size:10px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:6px}
  .stat-value{font-size:28px;font-weight:700;color:var(--gold)}
  /* Sections */
  .section{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:24px;margin-bottom:20px}
  .section-title{font-size:11px;letter-spacing:3px;color:var(--gold);text-transform:uppercase;font-weight:700;margin-bottom:18px;display:flex;align-items:center;gap:8px}
  .section-title::before{content:'';display:inline-block;width:3px;height:14px;background:var(--gold);border-radius:2px}
  /* Form */
  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
  .form-group{display:flex;flex-direction:column;gap:6px}
  .field-label{font-size:11px;letter-spacing:1px;color:var(--muted);text-transform:uppercase}
  .field-input{background:#060c18;border:1px solid #1e2d45;border-radius:4px;padding:10px 12px;color:#f1f5f9;font-size:13px;outline:none;transition:border .2s}
  .field-input:focus{border-color:var(--gold)}
  .btn-action{background:var(--gold);color:#080d18;border:none;border-radius:4px;padding:11px 24px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:background .2s}
  .btn-action:hover{background:#d4a93c}
  .btn-action:disabled{background:#2d2000;color:#5a4a00;cursor:not-allowed}
  .btn-sm{padding:6px 12px;font-size:11px;border-radius:3px;border:none;cursor:pointer;font-weight:600;letter-spacing:1px;transition:all .2s}
  .btn-approve{background:#0f2310;color:#22c55e;border:1px solid #166534}
  .btn-approve:hover{background:#166534;color:#fff}
  .btn-decline{background:#1e0808;color:#ef4444;border:1px solid #7f1d1d}
  .btn-decline:hover{background:#7f1d1d;color:#fff}
  .btn-info{background:#0d1a2e;color:#60a5fa;border:1px solid #1e3a5f}
  .btn-info:hover{background:#1e3a5f;color:#fff}
  .btn-pay{background:#0f2310;color:#22c55e;border:1px solid #166534}
  .btn-pay:hover{background:#166534;color:#fff}
  .btn-resend{background:#1a1200;color:var(--gold);border:1px solid #3d2e00}
  .btn-resend:hover{background:#3d2e00}
  /* Table */
  .table-wrap{overflow-x:auto;border-radius:6px;border:1px solid var(--border)}
  table{width:100%;border-collapse:collapse}
  th{background:#060c18;color:var(--muted);font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:10px 14px;text-align:left;font-weight:600;white-space:nowrap}
  td{padding:11px 14px;font-size:13px;color:#94a3b8;border-top:1px solid #0f1a2e;vertical-align:middle}
  tr:hover td{background:#0a1020}
  .badge{display:inline-block;padding:3px 8px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
  .badge-paid,.badge-approved,.badge-completed{background:#0f2310;color:#22c55e;border:1px solid #166534}
  .badge-pending,.badge-draft,.badge-submitted{background:#1a1200;color:var(--gold);border:1px solid #3d2e00}
  .badge-declined,.badge-rejected,.badge-failed{background:#1e0808;color:#ef4444;border:1px solid #7f1d1d}
  .badge-review,.badge-under_review,.badge-processing{background:#0d1a2e;color:#60a5fa;border:1px solid #1e3a5f}
  .badge-default{background:#111827;color:#64748b;border:1px solid #1e293b}
  .refcode{font-family:monospace;color:var(--gold);font-size:12px;font-weight:700}
  .no-data{text-align:center;padding:48px;color:var(--muted);font-size:14px}
  /* Toast */
  #toast{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px}
  .toast-item{background:#0d1526;border:1px solid var(--border);border-radius:6px;padding:14px 18px;font-size:13px;max-width:360px;box-shadow:0 8px 24px rgba(0,0,0,0.5);animation:slideIn .3s ease}
  .toast-ok{border-left:3px solid var(--green);color:#e2e8f0}
  .toast-err{border-left:3px solid var(--red);color:#fca5a5}
  @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
  .tab-pane{display:none}.tab-pane.active{display:block}
  .spinner{display:inline-block;width:14px;height:14px;border:2px solid #1e2d45;border-top-color:var(--gold);border-radius:50%;animation:spin .6s linear infinite;margin-right:8px}
  @keyframes spin{to{transform:rotate(360deg)}}
  .expand-row{display:none;background:#060c18}
  .expand-row.open{display:table-row}
  .detail-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding:16px}
  .detail-item .dl{font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
  .detail-item .dv{font-size:13px;color:#e2e8f0}
  @media(max-width:640px){.form-grid{grid-template-columns:1fr}.stats{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>

<!-- LOGIN -->
<div class="login-wrap" id="loginScreen">
  <div class="login-box">
    <div class="login-logo">Prime Endorsement Authority</div>
    <div class="login-title">Command Centre</div>
    <div class="login-sub">Supreme Administrator Access</div>
    <div id="step-email">
      <label class="form-label">Administrator Email</label>
      <input class="form-input" id="emailInput" type="email" placeholder="Enter email address" autocomplete="email"/>
      <button class="btn-gold" onclick="submitEmail()">Verify Identity →</button>
      <div class="error-msg" id="emailErr"></div>
    </div>
    <div id="step-pass" style="display:none">
      <label class="form-label">6-Digit Authority Passcode</label>
      <input class="form-input" id="passInput" type="password" maxlength="6" placeholder="••••••" autocomplete="off" style="letter-spacing:6px;font-size:20px;text-align:center"/>
      <button class="btn-gold" onclick="submitPass()">Access System →</button>
      <div class="error-msg" id="passErr"></div>
      <div style="text-align:center;margin-top:12px"><span onclick="document.getElementById('step-pass').style.display='none';document.getElementById('step-email').style.display='block'" style="color:var(--muted);font-size:12px;cursor:pointer">← Back</span></div>
    </div>
  </div>
</div>

<!-- DASHBOARD -->
<div class="dash" id="dashScreen">
  <div class="topbar">
    <div style="display:flex;align-items:center;gap:16px">
      <div class="topbar-logo">⚖ Prime Endorsement Authority</div>
      <div class="topbar-badge">LIVE</div>
    </div>
    <div class="topbar-right">
      <span style="color:var(--muted);font-size:12px" id="adminLabel">justicejeleel@gmail.com</span>
      <button class="btn-signout" onclick="signOut()">Sign Out</button>
    </div>
  </div>
  <div class="tabs">
    <button class="tab active" onclick="switchTab('command',this)">⚡ Command</button>
    <button class="tab" onclick="switchTab('applications',this)">📋 Applications</button>
    <button class="tab" onclick="switchTab('registrations',this)">📝 Registrations</button>
    <button class="tab" onclick="switchTab('payments',this)">💳 Payments</button>
    <button class="tab" onclick="switchTab('settings',this)">⚙ Settings</button>
  </div>
  <div class="content">

    <!-- COMMAND TAB -->
    <div class="tab-pane active" id="tab-command">
      <div class="stats" id="statsRow">
        <div class="stat-card"><div class="stat-label">Total Applications</div><div class="stat-value" id="st-total">—</div></div>
        <div class="stat-card"><div class="stat-label">Awaiting Payment</div><div class="stat-value" id="st-pending">—</div></div>
        <div class="stat-card"><div class="stat-label">Approved</div><div class="stat-value" id="st-approved">—</div></div>
        <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value" id="st-revenue">—</div></div>
      </div>

      <div class="section">
        <div class="section-title">AI Registration Engine</div>
        <div class="form-grid">
          <div class="form-group"><label class="field-label">Applicant Name</label><input class="field-input" id="inv-name" placeholder="Full name"/></div>
          <div class="form-group"><label class="field-label">Applicant Email</label><input class="field-input" id="inv-email" type="email" placeholder="email@example.com"/></div>
          <div class="form-group"><label class="field-label">Role</label>
            <select class="field-input" id="inv-role">
              <option value="founder">Founder</option>
              <option value="co_founder">Co-Founder</option>
            </select>
          </div>
          <div class="form-group"><label class="field-label">Venture Name</label><input class="field-input" id="inv-venture" placeholder="Company / venture name"/></div>
        </div>
        <button class="btn-action" id="invBtn" onclick="sendInvite()">Generate &amp; Send Registration Link</button>
        <div id="invResult" style="margin-top:12px;font-size:12px;color:var(--muted)"></div>
      </div>

      <div class="section">
        <div class="section-title">Payment Authority — Stripe Gateway</div>
        <div id="payAuthList"><div class="no-data">Loading…</div></div>
      </div>
    </div>

    <!-- APPLICATIONS TAB -->
    <div class="tab-pane" id="tab-applications">
      <div class="section">
        <div class="section-title">All Applications</div>
        <div class="table-wrap"><table id="appsTable">
          <thead><tr><th>Ref</th><th>Name</th><th>Venture</th><th>Status</th><th>Payment</th><th>Submitted</th><th>Actions</th></tr></thead>
          <tbody id="appsTbody"><tr><td colspan="7" class="no-data">Loading…</td></tr></tbody>
        </table></div>
      </div>
    </div>

    <!-- REGISTRATIONS TAB -->
    <div class="tab-pane" id="tab-registrations">
      <div class="section">
        <div class="section-title">Pending Registrations</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Ref</th><th>Name</th><th>Email</th><th>Role</th><th>Venture</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody id="regTbody"><tr><td colspan="7" class="no-data">Loading…</td></tr></tbody>
        </table></div>
      </div>
    </div>

    <!-- PAYMENTS TAB -->
    <div class="tab-pane" id="tab-payments">
      <div class="section">
        <div class="section-title">Payment Transactions</div>
        <div id="revenueTotal" style="color:var(--gold);font-size:13px;margin-bottom:16px;font-weight:700"></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Ref</th><th>Applicant</th><th>Amount</th><th>VAT</th><th>Total</th><th>Currency</th><th>Status</th><th>Paid At</th></tr></thead>
          <tbody id="txTbody"><tr><td colspan="8" class="no-data">Loading…</td></tr></tbody>
        </table></div>
      </div>
    </div>

    <!-- SETTINGS TAB -->
    <div class="tab-pane" id="tab-settings">
      <div class="section" style="max-width:480px">
        <div class="section-title">Account Settings</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="detail-item"><div class="dl">Logged In As</div><div class="dv">justicejeleel@gmail.com</div></div>
          <div class="detail-item"><div class="dl">Role</div><div class="dv">Supreme Administrator</div></div>
          <div class="detail-item"><div class="dl">Portal URL</div><div class="dv" style="font-size:12px;color:var(--muted)">${DOMAIN}/api/functions/peaAdminPortal</div></div>
          <div class="detail-item"><div class="dl">Session</div><div class="dv" id="sessionInfo" style="font-size:12px">Active</div></div>
          <button class="btn-gold" style="max-width:200px" onclick="signOut()">Sign Out</button>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- TOAST -->
<div id="toast"></div>

<script>
const API = '${DOMAIN}/api/functions/peaAdminPortal';
let _apps = [], _txs = [];

// ── Auth ──────────────────────────────────────────────────────────────────
function checkSession(){
  return sessionStorage.getItem('pea_admin_auth')==='granted';
}
function boot(){
  if(checkSession()){
    showDash();
    loadData();
  }
}

function submitEmail(){
  const v = document.getElementById('emailInput').value.trim().toLowerCase();
  if(v !== '${ADMIN_EMAIL}'){
    document.getElementById('emailErr').textContent='ACCESS DENIED: Unauthorised email address.';
    return;
  }
  document.getElementById('emailErr').textContent='';
  document.getElementById('step-email').style.display='none';
  document.getElementById('step-pass').style.display='block';
  setTimeout(()=>document.getElementById('passInput').focus(),100);
}

function submitPass(){
  const v = document.getElementById('passInput').value;
  if(v !== '${ADMIN_PASS}'){
    document.getElementById('passErr').textContent='ACCESS DENIED: Invalid authority passcode.';
    document.getElementById('passInput').value='';
    return;
  }
  sessionStorage.setItem('pea_admin_auth','granted');
  sessionStorage.setItem('pea_admin_login_time', new Date().toISOString());
  showDash();
  loadData();
}

function signOut(){
  sessionStorage.removeItem('pea_admin_auth');
  sessionStorage.removeItem('pea_admin_login_time');
  location.reload();
}

function showDash(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('dashScreen').style.display='flex';
  const t = sessionStorage.getItem('pea_admin_login_time');
  if(t) document.getElementById('sessionInfo').textContent='Active since '+new Date(t).toLocaleTimeString();
}

// ── Tabs ──────────────────────────────────────────────────────────────────
function switchTab(id, el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-'+id).classList.add('active');
}

// ── Toast ─────────────────────────────────────────────────────────────────
function toast(msg, ok=true){
  const t=document.getElementById('toast');
  const d=document.createElement('div');
  d.className='toast-item '+(ok?'toast-ok':'toast-err');
  d.textContent=(ok?'✅ ':'❌ ')+msg;
  t.appendChild(d);
  setTimeout(()=>d.remove(),4500);
}

// ── Data ──────────────────────────────────────────────────────────────────
async function loadData(){
  try{
    const r = await fetch(API+'?action=dashboard', {headers:{'X-Admin-Token':'pea_admin'}});
    const d = await r.json();
    _apps = d.apps||[];
    _txs  = d.txs||[];
    renderStats(d);
    renderPayAuth();
    renderApps();
    renderRegs();
    renderTxs();
  }catch(e){toast('Failed to load data: '+e.message, false);}
}

function renderStats(d){
  document.getElementById('st-total').textContent = _apps.length;
  document.getElementById('st-pending').textContent = _apps.filter(a=>a.payment_status==='pending'||a.payment_status==='unpaid').length;
  document.getElementById('st-approved').textContent = _apps.filter(a=>a.status==='approved').length;
  const rev = d.revenue||0;
  document.getElementById('st-revenue').textContent = '£'+rev.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function badge(val){
  if(!val) return '<span class="badge badge-default">—</span>';
  const cls = ['paid','approved','completed'].includes(val)?'badge-paid':
              ['pending','draft','submitted','unpaid'].includes(val)?'badge-pending':
              ['declined','rejected','failed'].includes(val)?'badge-declined':
              ['under_review','processing','review'].includes(val)?'badge-review':'badge-default';
  return '<span class="badge '+cls+'">'+val.replace(/_/g,' ')+'</span>';
}

function fmtDate(s){
  if(!s) return '—';
  try{return new Date(s).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}catch{return s;}
}

// ── Payment Authority ─────────────────────────────────────────────────────
function renderPayAuth(){
  const pending = _apps.filter(a=>a.payment_status==='pending'||a.payment_status==='unpaid');
  const el = document.getElementById('payAuthList');
  if(!pending.length){ el.innerHTML='<div class="no-data">No applications awaiting payment</div>'; return; }
  el.innerHTML='<div class="table-wrap"><table><thead><tr><th>Ref</th><th>Applicant</th><th>Venture</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
    pending.map(a=>'<tr><td class="refcode">'+esc(a.reference_code||'—')+'</td><td style="color:#e2e8f0">'+esc(a.applicant_name||'—')+'</td><td>'+esc(a.venture_name||'—')+'</td><td>'+badge(a.status)+'</td><td><button class="btn-sm btn-pay" onclick="sendPayLink(\''+a.id+'\')">Send Payment Link</button></td></tr>').join('')+
  '</tbody></table></div>';
}

async function sendPayLink(appId){
  try{
    const r = await fetch(API+'?action=paymentlink',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':'pea_admin'},body:JSON.stringify({application_id:appId})});
    const d = await r.json();
    if(d.checkout_url){
      navigator.clipboard.writeText(d.checkout_url).catch(()=>{});
      toast('Payment link generated & copied to clipboard!');
    } else { toast(d.error||'Failed to generate link', false); }
  }catch(e){toast('Error: '+e.message,false);}
}

// ── Applications ──────────────────────────────────────────────────────────
function renderApps(){
  const tb = document.getElementById('appsTbody');
  if(!_apps.length){ tb.innerHTML='<tr><td colspan="7" class="no-data">No applications found</td></tr>'; return; }
  tb.innerHTML = _apps.map((a,i)=>'<tr onclick="toggleRow(\'er-'+i+'\')" style="cursor:pointer">'+
    '<td class="refcode">'+esc(a.reference_code||'—')+'</td>'+
    '<td style="color:#e2e8f0">'+esc(a.applicant_name||'—')+'</td>'+
    '<td>'+esc(a.venture_name||'—')+'</td>'+
    '<td>'+badge(a.status)+'</td>'+
    '<td>'+badge(a.payment_status)+'</td>'+
    '<td>'+fmtDate(a.submitted_at)+'</td>'+
    '<td onclick="event.stopPropagation()" style="display:flex;gap:6px;flex-wrap:wrap">'+
      '<button class="btn-sm btn-approve" onclick="updateApp(\''+a.id+'\',{status:\'approved\'})">Approve</button>'+
      '<button class="btn-sm btn-decline" onclick="updateApp(\''+a.id+'\',{status:\'declined\'})">Decline</button>'+
      '<button class="btn-sm btn-info" onclick="updateApp(\''+a.id+'\',{status:\'additional_info_required\'})">Request Info</button>'+
    '</td></tr>'+
    '<tr class="expand-row" id="er-'+i+'"><td colspan="7"><div class="detail-grid">'+
      Object.entries(a).filter(([k])=>!['id','created_by'].includes(k)).map(([k,v])=>'<div class="detail-item"><div class="dl">'+k.replace(/_/g,' ')+'</div><div class="dv">'+esc(String(v||'—'))+'</div></div>').join('')+
    '</div></td></tr>'
  ).join('');
}

function toggleRow(id){ const el=document.getElementById(id); el.classList.toggle('open'); }

async function updateApp(appId, updates){
  try{
    const r = await fetch(API+'?action=updateapp',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':'pea_admin'},body:JSON.stringify({application_id:appId,updates})});
    const d = await r.json();
    if(d.success){ toast('Application updated!'); await loadData(); }
    else toast(d.error||'Update failed',false);
  }catch(e){toast('Error: '+e.message,false);}
}

// ── Registrations ─────────────────────────────────────────────────────────
function renderRegs(){
  const regs = _apps.filter(a=>a.status==='draft'||(a.invitation_token));
  const tb = document.getElementById('regTbody');
  if(!regs.length){ tb.innerHTML='<tr><td colspan="7" class="no-data">No pending registrations</td></tr>'; return; }
  tb.innerHTML = regs.map(a=>'<tr>'+
    '<td class="refcode">'+esc(a.reference_code||'—')+'</td>'+
    '<td style="color:#e2e8f0">'+esc(a.applicant_name||'—')+'</td>'+
    '<td style="font-size:12px">'+esc(a.applicant_email||'—')+'</td>'+
    '<td>'+badge(a.applicant_role)+'</td>'+
    '<td>'+esc(a.venture_name||'—')+'</td>'+
    '<td>'+fmtDate(a.created_date)+'</td>'+
    '<td><button class="btn-sm btn-resend" onclick="resendInvite(\''+esc(a.applicant_email)+'\',\''+esc(a.applicant_name)+'\',\''+esc(a.applicant_role)+'\',\''+esc(a.venture_name)+'\')">Resend Invite</button></td>'+
  '</tr>').join('');
}

// ── Transactions ──────────────────────────────────────────────────────────
function renderTxs(){
  const tb = document.getElementById('txTbody');
  const rev = _txs.filter(t=>t.status==='paid'||t.status==='completed').reduce((s,t)=>s+(parseFloat(t.total)||parseFloat(t.amount)||0),0);
  document.getElementById('revenueTotal').textContent = 'Total Confirmed Revenue: £'+rev.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(!_txs.length){ tb.innerHTML='<tr><td colspan="8" class="no-data">No payment transactions found</td></tr>'; return; }
  tb.innerHTML = _txs.map(t=>'<tr>'+
    '<td class="refcode">'+esc(t.reference_code||'—')+'</td>'+
    '<td style="color:#e2e8f0">'+esc(t.applicant_name||'—')+'</td>'+
    '<td>'+fmtAmt(t.amount)+'</td>'+
    '<td>'+fmtAmt(t.vat)+'</td>'+
    '<td style="color:var(--gold);font-weight:700">'+fmtAmt(t.total)+'</td>'+
    '<td>'+esc((t.currency||'GBP').toUpperCase())+'</td>'+
    '<td>'+badge(t.status)+'</td>'+
    '<td>'+fmtDate(t.paid_at)+'</td>'+
  '</tr>').join('');
}

function fmtAmt(v){ if(!v&&v!==0) return '—'; return '£'+parseFloat(v).toFixed(2); }

// ── Send Invite ───────────────────────────────────────────────────────────
async function sendInvite(){
  const name=document.getElementById('inv-name').value.trim();
  const email=document.getElementById('inv-email').value.trim();
  const role=document.getElementById('inv-role').value;
  const venture=document.getElementById('inv-venture').value.trim();
  if(!email){ toast('Email is required',false); return; }
  const btn=document.getElementById('invBtn');
  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span>Sending…';
  document.getElementById('invResult').textContent='';
  try{
    const r=await fetch(API+'?action=sendinvite',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':'pea_admin'},body:JSON.stringify({applicant_name:name,applicant_email:email,applicant_role:role,venture_name:venture})});
    const d=await r.json();
    if(d.success){
      toast('Registration link sent to '+email+'!');
      document.getElementById('invResult').textContent='✅ Ref: '+d.reference_code;
      document.getElementById('inv-name').value='';
      document.getElementById('inv-email').value='';
      document.getElementById('inv-venture').value='';
      await loadData();
    } else { toast(d.error||'Failed to send invite',false); }
  }catch(e){ toast('Error: '+e.message,false); }
  btn.disabled=false; btn.textContent='Generate & Send Registration Link';
}

async function resendInvite(email,name,role,venture){
  if(!email){ toast('No email on file',false); return; }
  try{
    const r=await fetch(API+'?action=sendinvite',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':'pea_admin'},body:JSON.stringify({applicant_name:name,applicant_email:email,applicant_role:role,venture_name:venture})});
    const d=await r.json();
    if(d.success) toast('Invite resent to '+email);
    else toast(d.error||'Failed',false);
  }catch(e){toast(e.message,false);}
}

// ── Utils ─────────────────────────────────────────────────────────────────
function esc(s){ const d=document.createElement('div');d.textContent=String(s||'');return d.innerHTML; }

// keyboard enter support
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    if(document.getElementById('step-email').style.display!=='none') submitEmail();
    else if(document.getElementById('step-pass').style.display!=='none') submitPass();
  }
});

boot();
</script>
</body>
</html>`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const url    = new URL(req.url);
  const action = url.searchParams.get("action") || "";

  // Serve the HTML portal
  if (!action) {
    const html = buildHTML(url.origin + url.pathname);
    return new Response(html, {
      headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Admin token check for API actions
  const adminToken = req.headers.get("X-Admin-Token");
  if (adminToken !== "pea_admin") {
    return new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const base44 = createClientFromRequest(req);

  try {
    let result: any;

    if (action === "dashboard") {
      result = await apiGetDashboard(base44);
    } else if (action === "sendinvite" && req.method === "POST") {
      const body = await req.json();
      result = await apiSendInvite(base44, body);
    } else if (action === "paymentlink" && req.method === "POST") {
      const body = await req.json();
      result = await apiSendPaymentLink(base44, body);
    } else if (action === "updateapp" && req.method === "POST") {
      const body = await req.json();
      result = await apiUpdateApplication(base44, body);
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[peaAdminPortal] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
}
