/**
 * peaAdminPortal — Lightweight admin API + minimal HTML portal
 * GET  /api/functions/peaAdminPortal          → HTML login + dashboard shell
 * GET  /api/functions/peaAdminPortal?action=dashboard → JSON data
 * POST /api/functions/peaAdminPortal?action=sendinvite
 * POST /api/functions/peaAdminPortal?action=paymentlink
 * POST /api/functions/peaAdminPortal?action=updateapp
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const DOMAIN = "https://primeendorsement.com";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

async function apiDashboard(b44: any) {
  const [apps, txs] = await Promise.all([
    b44.asServiceRole.entities.Application.list("-created_date", 500).catch(() => []),
    b44.asServiceRole.entities.PaymentTransaction.list("-created_date", 200).catch(() => []),
  ]);
  const revenue = txs
    .filter((t: any) => t.status === "paid" || t.status === "completed")
    .reduce((s: number, t: any) => s + (parseFloat(t.total) || parseFloat(t.amount) || 0), 0);
  return { apps, txs, revenue };
}

async function apiSendInvite(b44: any, body: any) {
  const rk = Deno.env.get("RESEND_API_KEY");
  if (!rk) throw new Error("Resend API key not configured");
  const { applicant_name, applicant_email, applicant_role, venture_name } = body;
  if (!applicant_email) throw new Error("applicant_email required");
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const refCode = `PEA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const app = await b44.asServiceRole.entities.Application.create({
    reference_code: refCode, applicant_name: applicant_name || "",
    applicant_email, applicant_role: applicant_role || "founder",
    venture_name: venture_name || "", status: "draft", payment_status: "pending",
    invitation_token: token,
    token_expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    submitted_at: new Date().toISOString(),
  });
  const regUrl = `${DOMAIN}/apply?token=${token}&ref=${refCode}`;
  const firstName = (applicant_name || "Applicant").split(" ")[0];
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${rk}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Prime Endorsement Authority <admin@primeendorsement.com>",
      to: [applicant_email],
      subject: `Your PEA Registration Link — ${refCode}`,
      html: `<div style="background:#0A0E1A;color:#e2e8f0;font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto"><div style="color:#C9A84C;font-size:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px">PRIME ENDORSEMENT AUTHORITY</div><p>Dear ${firstName},</p><p style="margin:12px 0">You have been invited to apply for Prime Endorsement Authority certification.</p><p><strong>Reference:</strong> ${refCode}<br/><strong>Role:</strong> ${applicant_role || "Founder"}</p><div style="text-align:center;margin:30px 0"><a href="${regUrl}" style="background:#C9A84C;color:#0A0E1A;padding:14px 40px;border-radius:6px;font-weight:700;text-decoration:none;font-size:14px;letter-spacing:2px">BEGIN REGISTRATION</a></div><p style="color:#64748b;font-size:12px">Link expires in 72 hours. Ref: ${refCode}</p></div>`,
    }),
  });
  return { success: true, reference_code: refCode, application_id: app.id };
}

async function apiPaymentLink(b44: any, body: any) {
  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  if (!sk) throw new Error("Stripe not configured");
  const { application_id } = body;
  if (!application_id) throw new Error("application_id required");
  const app = await b44.asServiceRole.entities.Application.get(application_id);
  if (!app) throw new Error("Application not found");
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      "mode": "payment", "currency": "gbp",
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
  if (!r.ok) throw new Error(await r.text());
  const s = await r.json();
  return { success: true, checkout_url: s.url, session_id: s.id };
}

async function apiUpdateApp(b44: any, body: any) {
  const { application_id, updates } = body;
  if (!application_id) throw new Error("application_id required");
  await b44.asServiceRole.entities.Application.update(application_id, updates);
  return { success: true };
}

const HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>PEA — Admin Command Centre</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#080d18;color:#e2e8f0;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh}:root{--g:#C9A84C;--c:#0d1526;--b:#1e2d45;--m:#64748b;--gr:#22c55e;--r:#ef4444}
.lw{display:flex;align-items:center;justify-content:center;min-height:100vh;background:radial-gradient(ellipse at 50% 0%,#1a1500,#080d18 60%)}.lb{background:var(--c);border:1px solid var(--g);border-radius:8px;padding:44px;width:100%;max-width:400px}
.ll{text-align:center;color:var(--g);font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:700;margin-bottom:6px}.lt{text-align:center;font-size:19px;color:#f1f5f9;font-weight:600;margin-bottom:4px}.ls{text-align:center;font-size:11px;color:var(--m);letter-spacing:2px;text-transform:uppercase;margin-bottom:28px}
label{display:block;font-size:10px;letter-spacing:2px;color:var(--m);text-transform:uppercase;margin-bottom:5px}
input,select{width:100%;background:#060c18;border:1px solid #1e2d45;border-radius:4px;padding:11px 13px;color:#f1f5f9;font-size:14px;outline:none;margin-bottom:14px}input:focus,select:focus{border-color:var(--g)}
.bg{width:100%;background:var(--g);color:#080d18;border:none;border-radius:4px;padding:12px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer}.bg:hover{background:#d4a93c}.bg:disabled{background:#2d2000;color:#5a4a00;cursor:not-allowed}
.em{color:var(--r);font-size:11px;text-align:center;margin-top:6px;min-height:16px}
.dsh{display:none;flex-direction:column;min-height:100vh}
.tb{background:#0a0f1e;border-bottom:1px solid var(--b);padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:52px;position:sticky;top:0;z-index:99}
.tl{color:var(--g);font-size:10px;letter-spacing:3px;font-weight:700;text-transform:uppercase}.tbg{background:#0f2310;border:1px solid #166534;color:var(--gr);font-size:9px;padding:2px 7px;border-radius:3px;letter-spacing:2px;font-weight:700}
.bso{background:transparent;border:1px solid var(--b);color:var(--m);font-size:10px;padding:5px 12px;border-radius:3px;cursor:pointer}.bso:hover{border-color:var(--r);color:var(--r)}
.tabs{background:#0a0f1e;border-bottom:1px solid var(--b);padding:0 20px;display:flex;gap:2px;overflow-x:auto}
.tab{padding:13px 16px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--m);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;font-weight:600;background:none;border-left:none;border-right:none;border-top:none}.tab.active{color:var(--g);border-bottom-color:var(--g)}.tab:hover:not(.active){color:#94a3b8}
.cnt{padding:24px 20px;flex:1;max-width:1400px;width:100%;margin:0 auto}
.sts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px}
.sc{background:var(--c);border:1px solid var(--b);border-radius:6px;padding:18px 20px}.sl{font-size:9px;letter-spacing:2px;color:var(--m);text-transform:uppercase;margin-bottom:5px}.sv{font-size:26px;font-weight:700;color:var(--g)}
.sec{background:var(--c);border:1px solid var(--b);border-radius:6px;padding:22px;margin-bottom:18px}
.stl{font-size:10px;letter-spacing:3px;color:var(--g);text-transform:uppercase;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}.stl::before{content:'';display:inline-block;width:3px;height:13px;background:var(--g);border-radius:2px}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}.fgp{display:flex;flex-direction:column;gap:5px}
.ba{background:var(--g);color:#080d18;border:none;border-radius:4px;padding:10px 22px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer}.ba:hover{background:#d4a93c}.ba:disabled{background:#2d2000;color:#5a4a00;cursor:not-allowed}
.bs{padding:5px 10px;font-size:10px;border-radius:3px;border:none;cursor:pointer;font-weight:600;letter-spacing:1px}
.bap{background:#0f2310;color:var(--gr);border:1px solid #166534}.bap:hover{background:#166534;color:#fff}
.bdc{background:#1e0808;color:var(--r);border:1px solid #7f1d1d}.bdc:hover{background:#7f1d1d;color:#fff}
.bif{background:#0d1a2e;color:#60a5fa;border:1px solid #1e3a5f}.bif:hover{background:#1e3a5f;color:#fff}
.bpy{background:#0f2310;color:var(--gr);border:1px solid #166534}.bpy:hover{background:#166534;color:#fff}
.brs{background:#1a1200;color:var(--g);border:1px solid #3d2e00}.brs:hover{background:#3d2e00}
.tw{overflow-x:auto;border-radius:6px;border:1px solid var(--b)}table{width:100%;border-collapse:collapse}
th{background:#060c18;color:var(--m);font-size:9px;letter-spacing:2px;text-transform:uppercase;padding:9px 12px;text-align:left;font-weight:600;white-space:nowrap}
td{padding:10px 12px;font-size:12px;color:#94a3b8;border-top:1px solid #0f1a2e;vertical-align:middle}tr:hover td{background:#0a1020}
.bdg{display:inline-block;padding:2px 7px;border-radius:3px;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
.bp{background:#0f2310;color:var(--gr);border:1px solid #166534}.bpe{background:#1a1200;color:var(--g);border:1px solid #3d2e00}.bde{background:#1e0808;color:var(--r);border:1px solid #7f1d1d}.bur{background:#0d1a2e;color:#60a5fa;border:1px solid #1e3a5f}.bdf{background:#111827;color:#64748b;border:1px solid #1e293b}
.rc{font-family:monospace;color:var(--g);font-size:11px;font-weight:700}.nd{text-align:center;padding:40px;color:var(--m);font-size:13px}
#toast{position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px}
.ti{background:var(--c);border:1px solid var(--b);border-radius:6px;padding:12px 16px;font-size:12px;max-width:340px;box-shadow:0 6px 20px rgba(0,0,0,.5);animation:si .3s ease}
.tok{border-left:3px solid var(--gr)}.ter{border-left:3px solid var(--r)}
@keyframes si{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
.tp{display:none}.tp.active{display:block}
.sp{display:inline-block;width:12px;height:12px;border:2px solid #1e2d45;border-top-color:var(--g);border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px}@keyframes spin{to{transform:rotate(360deg)}}
.er{display:none;background:#060c18}.er.open{display:table-row}.dg{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;padding:14px}
.di .dl{font-size:9px;color:var(--m);letter-spacing:1px;text-transform:uppercase;margin-bottom:2px}.di .dv{font-size:12px;color:#e2e8f0;word-break:break-all}
@media(max-width:600px){.fg{grid-template-columns:1fr}.sts{grid-template-columns:1fr 1fr}}
</style></head><body>
<div class="lw" id="LS">
  <div class="lb">
    <div class="ll">Prime Endorsement Authority</div>
    <div class="lt">Command Centre</div>
    <div class="ls">Supreme Administrator Access</div>
    <div id="SE">
      <label>Administrator Email</label>
      <input id="EI" type="email" placeholder="Enter email address" autocomplete="email"/>
      <button class="bg" onclick="submitEmail()">Verify Identity &rarr;</button>
      <div class="em" id="EE"></div>
    </div>
    <div id="SP" style="display:none">
      <label>6-Digit Authority Passcode</label>
      <input id="PI" type="password" maxlength="6" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;" autocomplete="off" style="letter-spacing:6px;font-size:20px;text-align:center"/>
      <button class="bg" onclick="submitPass()">Access System &rarr;</button>
      <div class="em" id="PE"></div>
      <div style="text-align:center;margin-top:10px"><span onclick="showES()" style="color:var(--m);font-size:11px;cursor:pointer">&larr; Back</span></div>
    </div>
  </div>
</div>
<div class="dsh" id="DS">
  <div class="tb">
    <div style="display:flex;align-items:center;gap:14px"><div class="tl">&#9878; Prime Endorsement Authority</div><div class="tbg">LIVE</div></div>
    <div style="display:flex;align-items:center;gap:14px"><span style="color:var(--m);font-size:11px">justicejeleel@gmail.com</span><button class="bso" onclick="signOut()">Sign Out</button></div>
  </div>
  <div class="tabs">
    <button class="tab active" onclick="st('command',this)">&#9889; Command</button>
    <button class="tab" onclick="st('applications',this)">&#128203; Applications</button>
    <button class="tab" onclick="st('registrations',this)">&#128221; Registrations</button>
    <button class="tab" onclick="st('payments',this)">&#128179; Payments</button>
    <button class="tab" onclick="st('settings',this)">&#9881; Settings</button>
  </div>
  <div class="cnt">
    <div class="tp active" id="tp-command">
      <div class="sts">
        <div class="sc"><div class="sl">Total Applications</div><div class="sv" id="s0">—</div></div>
        <div class="sc"><div class="sl">Awaiting Payment</div><div class="sv" id="s1">—</div></div>
        <div class="sc"><div class="sl">Approved</div><div class="sv" id="s2">—</div></div>
        <div class="sc"><div class="sl">Total Revenue</div><div class="sv" id="s3">—</div></div>
      </div>
      <div class="sec">
        <div class="stl">AI Registration Engine</div>
        <div class="fg">
          <div class="fgp"><label>Applicant Name</label><input id="in" placeholder="Full name"/></div>
          <div class="fgp"><label>Applicant Email</label><input id="ie" type="email" placeholder="email@example.com"/></div>
          <div class="fgp"><label>Role</label><select id="ir"><option value="founder">Founder</option><option value="co_founder">Co-Founder</option></select></div>
          <div class="fgp"><label>Venture Name</label><input id="iv" placeholder="Company / venture name"/></div>
        </div>
        <button class="ba" id="ib" onclick="sendInvite()">Generate &amp; Send Registration Link</button>
        <div id="ir2" style="margin-top:10px;font-size:11px;color:var(--m)"></div>
      </div>
      <div class="sec">
        <div class="stl">Payment Authority &mdash; Stripe Gateway</div>
        <div id="pal"><div class="nd"><span class="sp"></span>Loading&hellip;</div></div>
      </div>
    </div>
    <div class="tp" id="tp-applications">
      <div class="sec"><div class="stl">All Applications</div>
        <div class="tw"><table><thead><tr><th>Ref</th><th>Name</th><th>Venture</th><th>Status</th><th>Payment</th><th>Submitted</th><th>Actions</th></tr></thead>
        <tbody id="at"><tr><td colspan="7" class="nd"><span class="sp"></span>Loading&hellip;</td></tr></tbody></table></div>
      </div>
    </div>
    <div class="tp" id="tp-registrations">
      <div class="sec"><div class="stl">Pending Registrations</div>
        <div class="tw"><table><thead><tr><th>Ref</th><th>Name</th><th>Email</th><th>Role</th><th>Venture</th><th>Created</th><th>Action</th></tr></thead>
        <tbody id="rt"><tr><td colspan="7" class="nd"><span class="sp"></span>Loading&hellip;</td></tr></tbody></table></div>
      </div>
    </div>
    <div class="tp" id="tp-payments">
      <div class="sec"><div class="stl">Payment Transactions</div>
        <div id="rv" style="color:var(--g);font-size:12px;font-weight:700;margin-bottom:14px"></div>
        <div class="tw"><table><thead><tr><th>Ref</th><th>Applicant</th><th>Amount</th><th>VAT</th><th>Total</th><th>Curr</th><th>Status</th><th>Paid At</th></tr></thead>
        <tbody id="tt"><tr><td colspan="8" class="nd"><span class="sp"></span>Loading&hellip;</td></tr></tbody></table></div>
      </div>
    </div>
    <div class="tp" id="tp-settings">
      <div class="sec" style="max-width:440px"><div class="stl">Account Settings</div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="di"><div class="dl">Logged In As</div><div class="dv">justicejeleel@gmail.com</div></div>
          <div class="di"><div class="dl">Role</div><div class="dv">Supreme Administrator</div></div>
          <div class="di"><div class="dl">Admin Portal URL</div><div class="dv" style="font-size:10px;color:var(--m)">PORTAL_URL</div></div>
          <div class="di"><div class="dl">Session</div><div class="dv" id="si2">Active</div></div>
          <button class="bg" style="max-width:180px;margin-top:8px" onclick="signOut()">Sign Out</button>
        </div>
      </div>
    </div>
  </div>
</div>
<div id="toast"></div>
<script>
const A='PORTAL_URL';
let _a=[],_t=[];
function chk(){return sessionStorage.getItem('pea_admin_auth')==='granted';}
function boot(){if(chk()){showD();loadData();}}
function showES(){document.getElementById('SP').style.display='none';document.getElementById('SE').style.display='block';}
function submitEmail(){
  const v=document.getElementById('EI').value.trim().toLowerCase();
  if(v!=='justicejeleel@gmail.com'){document.getElementById('EE').textContent='ACCESS DENIED: Unauthorised email.';return;}
  document.getElementById('EE').textContent='';
  document.getElementById('SE').style.display='none';document.getElementById('SP').style.display='block';
  setTimeout(()=>document.getElementById('PI').focus(),80);
}
function submitPass(){
  const v=document.getElementById('PI').value;
  if(v!=='727272'){document.getElementById('PE').textContent='ACCESS DENIED: Invalid passcode.';document.getElementById('PI').value='';return;}
  sessionStorage.setItem('pea_admin_auth','granted');sessionStorage.setItem('pea_admin_t',new Date().toISOString());
  showD();loadData();
}
function signOut(){sessionStorage.removeItem('pea_admin_auth');sessionStorage.removeItem('pea_admin_t');location.reload();}
function showD(){
  document.getElementById('LS').style.display='none';document.getElementById('DS').style.display='flex';
  const t=sessionStorage.getItem('pea_admin_t');
  if(t)document.getElementById('si2').textContent='Active since '+new Date(t).toLocaleTimeString();
}
function st(id,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tp').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');document.getElementById('tp-'+id).classList.add('active');
}
function toast(m,ok=true){
  const c=document.getElementById('toast'),d=document.createElement('div');
  d.className='ti '+(ok?'tok':'ter');d.textContent=(ok?'✅ ':'❌ ')+m;c.appendChild(d);setTimeout(()=>d.remove(),5000);
}
async function loadData(){
  try{
    const r=await fetch(A+'?action=dashboard',{headers:{'X-Admin-Token':'pea_admin'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const d=await r.json();_a=d.apps||[];_t=d.txs||[];
    rStats(d);rPay();rApps();rRegs();rTxs();
  }catch(e){toast('Load failed: '+e.message,false);}
}
function rStats(d){
  document.getElementById('s0').textContent=_a.length;
  document.getElementById('s1').textContent=_a.filter(a=>!a.payment_status||a.payment_status==='pending'||a.payment_status==='unpaid').length;
  document.getElementById('s2').textContent=_a.filter(a=>a.status==='approved').length;
  document.getElementById('s3').textContent='£'+(d.revenue||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function bdg(v){
  if(!v||v==='null')return '<span class="bdg bdf">—</span>';
  const c=['paid','approved','completed'].includes(v)?'bp':['pending','draft','submitted','unpaid'].includes(v)?'bpe':['declined','rejected','failed'].includes(v)?'bde':['under_review','processing'].includes(v)?'bur':'bdf';
  return '<span class="bdg '+c+'">'+esc(v.replace(/_/g,' '))+'</span>';
}
function fd(s){if(!s||s==='null')return '—';try{return new Date(s).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}catch{return s;}}
function fa(v){if(v==null||v==='')return '—';const n=parseFloat(v);return isNaN(n)?v:'£'+n.toFixed(2);}
function esc(s){const d=document.createElement('div');d.textContent=String(s==null?'':s);return d.innerHTML;}
function rPay(){
  const p=_a.filter(a=>!a.payment_status||a.payment_status==='pending'||a.payment_status==='unpaid');
  const e=document.getElementById('pal');
  if(!p.length){e.innerHTML='<div class="nd">No applications awaiting payment.</div>';return;}
  e.innerHTML='<div class="tw"><table><thead><tr><th>Ref</th><th>Applicant</th><th>Venture</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
    p.map(a=>'<tr><td class="rc">'+esc(a.reference_code||'—')+'</td><td style="color:#e2e8f0">'+esc(a.applicant_name||'—')+'</td><td>'+esc(a.venture_name||'—')+'</td><td>'+bdg(a.status)+'</td><td><button class="bs bpy" onclick="sendPay(\''+esc(a.id)+'\')">Send Payment Link</button></td></tr>').join('')+
  '</tbody></table></div>';
}
async function sendPay(id){
  try{
    const r=await fetch(A+'?action=paymentlink',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':'pea_admin'},body:JSON.stringify({application_id:id})});
    const d=await r.json();
    if(d.checkout_url){try{await navigator.clipboard.writeText(d.checkout_url);}catch(_){}toast('Payment link ready — copied to clipboard!');window.open(d.checkout_url,'_blank');}
    else toast(d.error||'Failed',false);
  }catch(e){toast(e.message,false);}
}
function rApps(){
  const tb=document.getElementById('at');
  if(!_a.length){tb.innerHTML='<tr><td colspan="7" class="nd">No applications found</td></tr>';return;}
  tb.innerHTML=_a.map((a,i)=>'<tr onclick="tgl(\'er'+i+'\')" style="cursor:pointer"><td class="rc">'+esc(a.reference_code||'—')+'</td><td style="color:#e2e8f0">'+esc(a.applicant_name||'—')+'</td><td>'+esc(a.venture_name||'—')+'</td><td>'+bdg(a.status)+'</td><td>'+bdg(a.payment_status)+'</td><td>'+fd(a.submitted_at)+'</td><td onclick="event.stopPropagation()" style="display:flex;gap:4px;flex-wrap:wrap;padding:8px 12px"><button class="bs bap" onclick="upd(\''+esc(a.id)+'\',\'approved\')">Approve</button><button class="bs bdc" onclick="upd(\''+esc(a.id)+'\',\'declined\')">Decline</button><button class="bs bif" onclick="upd(\''+esc(a.id)+'\',\'additional_info_required\')">Req.Info</button></td></tr><tr class="er" id="er'+i+'"><td colspan="7"><div class="dg">'+Object.entries(a).filter(([k])=>k!=='id'&&k!=='created_by').map(([k,v])=>'<div class="di"><div class="dl">'+esc(k.replace(/_/g,' '))+'</div><div class="dv">'+esc(v==null?'—':String(v))+'</div></div>').join('')+'</div></td></tr>').join('');
}
function tgl(id){const e=document.getElementById(id);if(e)e.classList.toggle('open');}
async function upd(id,status){
  try{
    const r=await fetch(A+'?action=updateapp',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':'pea_admin'},body:JSON.stringify({application_id:id,updates:{status}})});
    const d=await r.json();if(d.success){toast('Status updated to: '+status);await loadData();}else toast(d.error||'Failed',false);
  }catch(e){toast(e.message,false);}
}
function rRegs(){
  const rg=_a.filter(a=>a.status==='draft'||a.invitation_token);
  const tb=document.getElementById('rt');
  if(!rg.length){tb.innerHTML='<tr><td colspan="7" class="nd">No pending registrations</td></tr>';return;}
  tb.innerHTML=rg.map(a=>'<tr><td class="rc">'+esc(a.reference_code||'—')+'</td><td style="color:#e2e8f0">'+esc(a.applicant_name||'—')+'</td><td style="font-size:11px">'+esc(a.applicant_email||'—')+'</td><td>'+bdg(a.applicant_role)+'</td><td>'+esc(a.venture_name||'—')+'</td><td>'+fd(a.created_date)+'</td><td><button class="bs brs" onclick="resend(\''+esc(a.applicant_email)+'\',\''+esc(a.applicant_name)+'\',\''+esc(a.applicant_role)+'\',\''+esc(a.venture_name)+'\')">Resend</button></td></tr>').join('');
}
function rTxs(){
  const tb=document.getElementById('tt');
  const rev=_t.filter(t=>t.status==='paid'||t.status==='completed').reduce((s,t)=>s+(parseFloat(t.total)||parseFloat(t.amount)||0),0);
  document.getElementById('rv').textContent='Total Confirmed Revenue: £'+rev.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(!_t.length){tb.innerHTML='<tr><td colspan="8" class="nd">No transactions found</td></tr>';return;}
  tb.innerHTML=_t.map(t=>'<tr><td class="rc">'+esc(t.reference_code||'—')+'</td><td style="color:#e2e8f0">'+esc(t.applicant_name||'—')+'</td><td>'+fa(t.amount)+'</td><td>'+fa(t.vat)+'</td><td style="color:var(--g);font-weight:700">'+fa(t.total||t.amount)+'</td><td>'+esc((t.currency||'GBP').toUpperCase())+'</td><td>'+bdg(t.status)+'</td><td>'+fd(t.paid_at)+'</td></tr>').join('');
}
async function sendInvite(){
  const nm=document.getElementById('in').value.trim(),em=document.getElementById('ie').value.trim(),ro=document.getElementById('ir').value,vn=document.getElementById('iv').value.trim();
  if(!em){toast('Email is required',false);return;}
  const btn=document.getElementById('ib');btn.disabled=true;btn.innerHTML='<span class="sp"></span>Sending&hellip;';document.getElementById('ir2').textContent='';
  try{
    const r=await fetch(A+'?action=sendinvite',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':'pea_admin'},body:JSON.stringify({applicant_name:nm,applicant_email:em,applicant_role:ro,venture_name:vn})});
    const d=await r.json();
    if(d.success){toast('Registration link sent to '+em+'!');document.getElementById('ir2').innerHTML='<span style="color:var(--gr)">&#10003; Ref: <strong style="color:var(--g)">'+esc(d.reference_code)+'</strong></span>';document.getElementById('in').value='';document.getElementById('ie').value='';document.getElementById('iv').value='';await loadData();}
    else toast(d.error||'Failed',false);
  }catch(e){toast(e.message,false);}
  btn.disabled=false;btn.textContent='Generate & Send Registration Link';
}
async function resend(em,nm,ro,vn){
  if(!em||em==='—'){toast('No email on file',false);return;}
  try{
    const r=await fetch(A+'?action=sendinvite',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':'pea_admin'},body:JSON.stringify({applicant_name:nm,applicant_email:em,applicant_role:ro,venture_name:vn})});
    const d=await r.json();d.success?toast('Resent to '+em):toast(d.error||'Failed',false);
  }catch(e){toast(e.message,false);}
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  if(document.getElementById('SE').style.display!=='none')submitEmail();
  else if(document.getElementById('SP').style.display!=='none')submitPass();
});
boot();
</script></body></html>`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url    = new URL(req.url);
  const action = url.searchParams.get("action") || "";
  const self   = url.origin + url.pathname;

  if (!action) {
    const html = HTML.replaceAll("PORTAL_URL", self);
    return new Response(html, { headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
  }

  if (req.headers.get("X-Admin-Token") !== "pea_admin") {
    return new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const b44 = createClientFromRequest(req);
  try {
    let result: any;
    if      (action === "dashboard")   result = await apiDashboard(b44);
    else if (action === "sendinvite")  result = await apiSendInvite(b44, await req.json());
    else if (action === "paymentlink") result = await apiPaymentLink(b44, await req.json());
    else if (action === "updateapp")   result = await apiUpdateApp(b44, await req.json());
    else return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    return new Response(JSON.stringify(result), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[peaAdminPortal]", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
}
