/**
 * peaStatusPage v3 — Self-contained status tracker
 * Queries Application entity directly — no peaGetStatus dependency.
 * URL: /api/functions/peaStatusPage?ref=PEA-2026-XXXXXX
 */
// @ts-ignore
import { base44 } from "npm:@base44/sdk@latest";

export default async function handler(req: Request): Promise<Response> {
  const H = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });

  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") || "").trim().toUpperCase();

  // Fetch application data server-side if ref provided
  let appData: any = null;
  let fetchError = "";

  if (ref && ref.startsWith("PEA-")) {
    try {
      const client = base44.createClient({ appId: "69e2e852c48630e3502f13b1" });
      const results = await client.asServiceRole.entities.Application.filter({ reference_code: ref });
      if (results && results.length > 0) {
        const a = results[0];
        // Normalise nested vs flat schema
        const vName = a.venture_name || (a.venture && a.venture.name) || "";
        const aName = a.applicant_name || (a.founder && a.founder.name) || "";
        const aRole = a.applicant_role || a.application_type || "Founder";
        const pStatus = (a.payment_status === "pending" ? "unpaid" : a.payment_status) || "unpaid";
        appData = {
          reference_code: a.reference_code,
          applicant_name: aName ? aName.split(" ")[0] + " " + (aName.split(" ").slice(-1)[0] || "").charAt(0) + "." : "—",
          venture_name: vName || "—",
          applicant_role: aRole,
          status: a.status || "submitted",
          payment_status: pStatus,
          submitted_at: a.submitted_at || a.created_date,
          day_90_start: a.day_90_start || null,
          ai_score: a.ai_score || null
        };
      } else {
        fetchError = "not_found";
      }
    } catch (e: any) {
      fetchError = "error";
    }
  }

  const STATUS_MAP: Record<string, { label: string; color: string; bg: string; step: number }> = {
    draft:        { label: "Draft",                color: "#64748b", bg: "#0f172a", step: 0 },
    invited:      { label: "Invitation Sent",      color: "#818cf8", bg: "#1e1b4b", step: 1 },
    submitted:    { label: "Submitted",             color: "#C9A84C", bg: "#1c1500", step: 2 },
    under_review: { label: "Under Review",          color: "#38bdf8", bg: "#0c1a2e", step: 3 },
    ai_screening: { label: "AI Screening",          color: "#a78bfa", bg: "#1a1030", step: 3 },
    payment_due:  { label: "Payment Required",      color: "#fb923c", bg: "#1c0f00", step: 3 },
    in_review:    { label: "Expert Review",         color: "#38bdf8", bg: "#0c1a2e", step: 4 },
    approved:     { label: "Endorsed ✓",            color: "#4ade80", bg: "#052e16", step: 5 },
    rejected:     { label: "Not Endorsed",          color: "#f87171", bg: "#130a0a", step: 5 },
    on_hold:      { label: "On Hold",               color: "#fbbf24", bg: "#1c1400", step: 3 },
    withdrawn:    { label: "Withdrawn",             color: "#94a3b8", bg: "#0f172a", step: 5 },
    closed:       { label: "Closed",                color: "#64748b", bg: "#0f172a", step: 5 },
  };

  const STEPS = ["Registration", "Invited", "Submitted", "Under Review", "Expert Panel", "Decision"];

  function progress90(day90start: string | null): number {
    if (!day90start) return 0;
    const start = new Date(day90start).getTime();
    const now = Date.now();
    const days = Math.floor((now - start) / 86400000);
    return Math.min(Math.max(Math.round((days / 90) * 100), 0), 100);
  }

  function fmtDate(d: string | null): string {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
    catch { return "—"; }
  }

  const sd = appData ? STATUS_MAP[appData.status] || STATUS_MAP["submitted"] : null;
  const prog = appData ? progress90(appData.day_90_start) : 0;
  const currentStep = sd ? sd.step : 0;

  const stepsHTML = STEPS.map((s, i) => {
    const done = i < currentStep;
    const active = i === currentStep;
    const bg = done ? "#C9A84C" : active ? sd!.color : "#1e293b";
    const tc = done || active ? "#0A0E1A" : "#475569";
    const lc = done ? "#C9A84C" : active ? sd!.color : "#334155";
    const isLast = i === STEPS.length - 1;
    return `<div class="step-node">
      <div class="step-circle" style="background:${bg};color:${tc}">${done ? "✓" : i + 1}</div>
      <div class="step-lbl" style="color:${lc}">${s}</div>
    </div>${!isLast ? `<div class="step-connector" style="background:${done ? "#C9A84C" : "#1e293b"}"></div>` : ""}`;
  }).join("");

  const infoHTML = appData ? `
    <div class="info-cell"><div class="lbl">Applicant</div><div class="val">${appData.applicant_name}</div></div>
    <div class="info-cell"><div class="lbl">Role</div><div class="val">${appData.applicant_role}</div></div>
    <div class="info-cell"><div class="lbl">Venture</div><div class="val">${appData.venture_name}</div></div>
    <div class="info-cell"><div class="lbl">Payment</div><div class="val" style="color:${appData.payment_status === "paid" ? "#4ade80" : "#fb923c"}">${appData.payment_status === "paid" ? "Paid ✓" : "Pending"}</div></div>
    ${appData.ai_score ? `<div class="info-cell"><div class="lbl">AI Score</div><div class="val" style="color:#C9A84C">${appData.ai_score}/100</div></div>` : ""}
  ` : "";

  // Pre-render server-side result if ref was provided
  const serverResult = appData ? `
    <script>
    window.__PEA_DATA__ = ${JSON.stringify(appData)};
    window.__PEA_ERROR__ = "";
    </script>` : ref ? `<script>window.__PEA_DATA__=null;window.__PEA_ERROR__="${fetchError}";</script>` : `<script>window.__PEA_DATA__=null;window.__PEA_ERROR__="";</script>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Application Status | Prime Endorsement Authority</title>
<meta name="robots" content="noindex,nofollow"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0E1A;font-family:'Inter',Arial,sans-serif;color:#e2e8f0;min-height:100vh;padding:44px 16px 80px}
a{color:#C9A84C;text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:600px;margin:0 auto}
.hdr{text-align:center;margin-bottom:40px}
.hdr-eyebrow{color:#C9A84C;font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:8px}
.hdr-title{color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px;text-transform:uppercase}
.hdr-line{width:56px;height:2px;background:#C9A84C;margin:12px auto 0}
.search-card{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:22px 26px;margin-bottom:24px}
.field-label{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px}
.search-row{display:flex;gap:10px}
.ref-input{flex:1;background:#0A0E1A;border:1px solid #334155;border-radius:6px;padding:12px 14px;color:#e2e8f0;font-size:14px;letter-spacing:2px;outline:none;font-family:'Courier New',monospace;transition:border-color .2s}
.ref-input:focus{border-color:#C9A84C}
.btn-track{background:#C9A84C;color:#0A0E1A;border:none;border-radius:6px;padding:12px 24px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;white-space:nowrap;transition:background .2s}
.btn-track:hover{background:#d4b45a}.btn-track:disabled{opacity:.6;cursor:wait}
.loading{text-align:center;color:#C9A84C;padding:48px;display:none}
.spinner{display:inline-block;width:36px;height:36px;border:3px solid #1e293b;border-top-color:#C9A84C;border-radius:50%;animation:spin .8s linear infinite;margin-bottom:12px}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-txt{font-size:12px;letter-spacing:3px;text-transform:uppercase}
.error-card{background:#130a0a;border:1px solid #7f1d1d;border-radius:10px;padding:32px;text-align:center;display:none}
.error-icon{font-size:30px;margin-bottom:10px}
.error-title{color:#f87171;font-weight:600;font-size:15px;margin-bottom:8px}
.error-msg{color:#94a3b8;font-size:13px;margin-bottom:14px;line-height:1.6}
.error-hint{color:#64748b;font-size:12px;line-height:1.7}
.result-card{background:#111827;border:1px solid #1e293b;border-radius:10px;overflow:hidden;display:none}
.banner{padding:22px 26px;display:flex;justify-content:space-between;align-items:center;border-bottom-width:3px;border-bottom-style:solid}
.banner-left .label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#94a3b8;margin-bottom:5px}
.banner-left .status-text{font-size:21px;font-weight:700}
.banner-right{text-align:right}
.banner-right .label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#64748b;margin-bottom:5px}
.banner-right .ref-text{color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:3px;font-family:'Courier New',monospace}
.card-body{padding:24px 26px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px}
@media(max-width:400px){.info-grid{grid-template-columns:1fr}}
.info-cell{background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:11px 14px}
.info-cell .lbl{color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
.info-cell .val{color:#e2e8f0;font-size:13px;font-weight:500}
.section-lbl{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px}
.steps-row{display:flex;align-items:flex-start;margin-bottom:26px}
.step-node{display:flex;flex-direction:column;align-items:center}
.step-circle{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}
.step-lbl{font-size:10px;margin-top:7px;text-align:center;max-width:76px;line-height:1.4;white-space:pre-line}
.step-connector{flex:1;height:2px;margin:15px 4px 0;flex-shrink:0}
.progress-wrap{margin-bottom:24px}
.progress-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.progress-title{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase}
.progress-val{color:#C9A84C;font-size:12px;font-weight:600}
.progress-track{background:#1e293b;border-radius:6px;height:10px;overflow:hidden}
.progress-bar{background:linear-gradient(90deg,#C9A84C,#e8c96e);border-radius:6px;height:100%;transition:width 1s ease}
.progress-ticks{display:flex;justify-content:space-between;margin-top:6px}
.progress-ticks span{color:#475569;font-size:10px}
.pay-cta{background:#1e1400;border:1px solid rgba(201,168,76,.5);border-radius:8px;padding:20px 22px;margin-bottom:20px;text-align:center}
.pay-cta-title{color:#C9A84C;font-weight:700;font-size:14px;margin-bottom:6px}
.pay-cta-desc{color:#94a3b8;font-size:12px;line-height:1.7;margin-bottom:16px}
.btn-pay{background:#C9A84C;color:#0A0E1A;border:none;border-radius:6px;padding:13px 40px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:background .2s;font-family:'Inter',Arial,sans-serif}
.btn-pay:hover{background:#d4b45a}.btn-pay:disabled{opacity:.6;cursor:wait}
.submitted-date{color:#475569;font-size:11px;text-align:center;margin-top:4px}
.card-footer{background:#0d1220;border-top:1px solid #1e293b;padding:14px 26px;text-align:center}
.card-footer p{color:#64748b;font-size:12px;line-height:1.7}
.bottom-links{text-align:center;margin-top:30px;display:flex;justify-content:center;gap:28px}
.bottom-links a{color:#475569;font-size:11px;letter-spacing:2px;text-transform:uppercase;transition:color .2s}
.bottom-links a:hover{color:#C9A84C;text-decoration:none}
.secure-badge{text-align:center;margin-top:24px;color:#1e293b;font-size:10px;letter-spacing:2px}
</style>
</head>
<body>
${serverResult}
<div class="wrap">
  <div class="hdr">
    <a href="https://primeendorsement.com" style="text-decoration:none">
      <div class="hdr-eyebrow">Application Status Portal</div>
      <div class="hdr-title">Prime Endorsement Authority</div>
      <div class="hdr-line"></div>
    </a>
  </div>

  <div class="search-card">
    <div class="field-label">Track Your Application</div>
    <div class="search-row">
      <input id="refInput" class="ref-input" type="text" placeholder="PEA-2026-XXXXXX" value="${ref}" autocomplete="off" spellcheck="false" maxlength="30"/>
      <button class="btn-track" id="trackBtn" onclick="lookup()">Track →</button>
    </div>
  </div>

  <div class="loading" id="loading">
    <div class="spinner"></div>
    <div class="loading-txt">Loading your status…</div>
  </div>

  <div class="error-card" id="errorCard">
    <div class="error-icon">🔍</div>
    <div class="error-title" id="errorTitle">Application Not Found</div>
    <div class="error-msg" id="errorMsg">No application was found with that reference code.</div>
    <div class="error-hint">
      Double-check your reference code (format: PEA-2026-XXXXXX)<br/>
      or contact <a href="mailto:admin@primeendorsement.com">admin@primeendorsement.com</a>
    </div>
  </div>

  <div class="result-card" id="resultCard">
    <div class="banner" id="banner">
      <div class="banner-left">
        <div class="label">Current Status</div>
        <div class="status-text" id="statusText"></div>
      </div>
      <div class="banner-right">
        <div class="label">Reference</div>
        <div class="ref-text" id="refText"></div>
      </div>
    </div>
    <div class="card-body">
      <div class="info-grid" id="infoGrid"></div>
      <div class="section-lbl">Application Journey</div>
      <div class="steps-row" id="stepsRow"></div>
      <div class="progress-wrap" id="progressWrap" style="display:none">
        <div class="progress-header">
          <span class="progress-title">90-Day Review Progress</span>
          <span class="progress-val" id="progressVal"></span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" id="progressBar" style="width:0%"></div>
        </div>
        <div class="progress-ticks"><span>Day 0</span><span>Day 30</span><span>Day 60</span><span>Day 90</span></div>
      </div>
      <div class="pay-cta" id="payCta" style="display:none">
        <div class="pay-cta-title">⚠️ Payment Required to Begin Your Review</div>
        <div class="pay-cta-desc">
          Complete your endorsement fee to start the 90-day expert review.<br/>
          <strong style="color:#e2e8f0">£1,000.00</strong> service fee + <strong style="color:#e2e8f0">£200.00</strong> VAT = <strong style="color:#C9A84C">£1,200.00 total</strong>
        </div>
        <button class="btn-pay" id="payBtn" onclick="handlePay()">Complete Payment — £1,200.00</button>
      </div>
      <div class="submitted-date" id="submittedDate"></div>
    </div>
    <div class="card-footer">
      <p>Questions? Email <a href="mailto:admin@primeendorsement.com">admin@primeendorsement.com</a></p>
    </div>
  </div>

  <div class="bottom-links">
    <a href="https://primeendorsement.com">← Home</a>
    <a href="/api/functions/peaStatusPage">Track Application</a>
    <a href="/admin-login">Admin Login</a>
  </div>
  <div class="secure-badge">🔒 AES-256 · TLS 1.3 · FIPS 140-2 · ISO 27001</div>
</div>

<script>
const STATUS_MAP={
  draft:{label:"Draft",color:"#64748b",bg:"#0f172a",step:0},
  invited:{label:"Invitation Sent",color:"#818cf8",bg:"#1e1b4b",step:1},
  submitted:{label:"Submitted",color:"#C9A84C",bg:"#1c1500",step:2},
  under_review:{label:"Under Review",color:"#38bdf8",bg:"#0c1a2e",step:3},
  ai_screening:{label:"AI Screening",color:"#a78bfa",bg:"#1a1030",step:3},
  payment_due:{label:"Payment Required",color:"#fb923c",bg:"#1c0f00",step:3},
  in_review:{label:"Expert Review",color:"#38bdf8",bg:"#0c1a2e",step:4},
  approved:{label:"Endorsed ✓",color:"#4ade80",bg:"#052e16",step:5},
  rejected:{label:"Not Endorsed",color:"#f87171",bg:"#130a0a",step:5},
  on_hold:{label:"On Hold",color:"#fbbf24",bg:"#1c1400",step:3},
  withdrawn:{label:"Withdrawn",color:"#94a3b8",bg:"#0f172a",step:5},
  closed:{label:"Closed",color:"#64748b",bg:"#0f172a",step:5}
};
const STEPS=["Registration","Invited","Submitted","Under Review","Expert Panel","Decision"];

function show(id){document.getElementById(id).style.display='block';}
function hide(id){document.getElementById(id).style.display='none';}

function renderResult(d){
  const sd=STATUS_MAP[d.status]||STATUS_MAP['submitted'];
  const banner=document.getElementById('banner');
  banner.style.background=sd.bg;
  banner.style.borderBottomColor=sd.color;
  document.getElementById('statusText').textContent=sd.label;
  document.getElementById('statusText').style.color=sd.color;
  document.getElementById('refText').textContent=d.reference_code;

  const infoHTML=[
    ['Applicant',d.applicant_name||'—'],
    ['Role',d.applicant_role||'—'],
    ['Venture',d.venture_name||'—'],
    ['Payment',d.payment_status==='paid'?'Paid ✓':'Pending']
  ].map(([l,v])=>'<div class="info-cell"><div class="lbl">'+l+'</div><div class="val" style="'+(l==='Payment'?(d.payment_status==='paid'?'color:#4ade80':'color:#fb923c'):'')+'">'+v+'</div></div>').join('');
  document.getElementById('infoGrid').innerHTML=infoHTML+(d.ai_score?'<div class="info-cell"><div class="lbl">AI Score</div><div class="val" style="color:#C9A84C">'+d.ai_score+'/100</div></div>':'');

  const stepsHTML=STEPS.map((s,i)=>{
    const done=i<sd.step,active=i===sd.step;
    const bg=done?'#C9A84C':active?sd.color:'#1e293b';
    const tc=(done||active)?'#0A0E1A':'#475569';
    const lc=done?'#C9A84C':active?sd.color:'#334155';
    return '<div class="step-node"><div class="step-circle" style="background:'+bg+';color:'+tc+'">'+(done?'✓':i+1)+'</div><div class="step-lbl" style="color:'+lc+'">'+s+'</div></div>'+(i<STEPS.length-1?'<div class="step-connector" style="background:'+(done?'#C9A84C':'#1e293b')+'"></div>':'');
  }).join('');
  document.getElementById('stepsRow').innerHTML=stepsHTML;

  if(d.day_90_start){
    const start=new Date(d.day_90_start).getTime(),now=Date.now();
    const days=Math.floor((now-start)/86400000);
    const pct=Math.min(Math.max(Math.round((days/90)*100),0),100);
    document.getElementById('progressWrap').style.display='block';
    document.getElementById('progressVal').textContent='Day '+Math.min(days,90)+' / 90 ('+pct+'%)';
    setTimeout(()=>{document.getElementById('progressBar').style.width=pct+'%';},100);
  }

  if(d.payment_status!=='paid' && ['submitted','under_review','ai_screening','in_review'].includes(d.status)){
    document.getElementById('payCta').style.display='block';
  }

  if(d.submitted_at){
    try{document.getElementById('submittedDate').textContent='Submitted: '+new Date(d.submitted_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});}catch(e){}
  }

  hide('loading');show('resultCard');
}

async function lookup(){
  const ref=(document.getElementById('refInput').value||'').trim().toUpperCase();
  if(!ref){return;}
  if(!ref.startsWith('PEA-')){
    document.getElementById('errorTitle').textContent='Invalid Format';
    document.getElementById('errorMsg').textContent='Reference codes start with PEA- (e.g. PEA-2026-123456)';
    hide('loading');hide('resultCard');show('errorCard');return;
  }
  document.getElementById('trackBtn').disabled=true;
  hide('errorCard');hide('resultCard');show('loading');

  try {
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),12000);
    const r=await fetch('/api/functions/peaStatusPage?ref='+encodeURIComponent(ref)+'&json=1',{signal:ctrl.signal});
    clearTimeout(timer);
    if(!r.ok){throw new Error('HTTP '+r.status);}
    const data=await r.json();
    if(data.success && data.application){
      renderResult(data.application);
    } else {
      document.getElementById('errorTitle').textContent='Application Not Found';
      document.getElementById('errorMsg').textContent='No application was found with reference code '+ref+'.';
      hide('loading');show('errorCard');
    }
  } catch(e:any){
    if(e.name==='AbortError'){
      document.getElementById('errorTitle').textContent='Connection Timeout';
      document.getElementById('errorMsg').textContent='The request timed out. Please check your connection and try again.';
    } else {
      document.getElementById('errorTitle').textContent='Connection Error';
      document.getElementById('errorMsg').textContent='Unable to reach the server. Please try again in a moment.';
    }
    hide('loading');show('errorCard');
  } finally {
    document.getElementById('trackBtn').disabled=false;
  }
}

async function handlePay(){
  const ref=document.getElementById('refText').textContent;
  const btn=document.getElementById('payBtn');
  btn.disabled=true;btn.textContent='Creating checkout…';
  try{
    const r=await fetch('https://primeendorsement.com/api/functions/peaSendPaymentLetter',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({reference_code:ref})
    });
    const d=await r.json();
    if(d.checkout_url||d.url){window.location.href=d.checkout_url||d.url;}
    else{btn.disabled=false;btn.textContent='Complete Payment — £1,200.00';alert('Payment error. Please contact admin@primeendorsement.com');}
  }catch(e){
    btn.disabled=false;btn.textContent='Complete Payment — £1,200.00';
    alert('Connection error. Please try again.');
  }
}

// On load: auto-render server-side data OR auto-lookup from URL
window.addEventListener('DOMContentLoaded',function(){
  // Handle JSON API mode
  const urlParams=new URLSearchParams(window.location.search);
  const isJson=urlParams.get('json')==='1';
  if(isJson) return; // JSON responses handled server-side

  if(window.__PEA_DATA__){
    renderResult(window.__PEA_DATA__);
  } else if(window.__PEA_ERROR__==='not_found'){
    const ref=urlParams.get('ref')||'';
    document.getElementById('errorTitle').textContent='Application Not Found';
    document.getElementById('errorMsg').textContent='No application was found with reference '+ref+'.';
    show('errorCard');
  } else if(window.__PEA_ERROR__==='error'){
    document.getElementById('errorTitle').textContent='System Error';
    document.getElementById('errorMsg').textContent='A temporary error occurred. Please try again.';
    show('errorCard');
  }

  // Auto-submit if ref in URL and no server data
  const ref=urlParams.get('ref');
  if(ref && !window.__PEA_DATA__ && !window.__PEA_ERROR__){lookup();}

  // Enter key
  document.getElementById('refInput').addEventListener('keydown',function(e){if(e.key==='Enter')lookup();});
});
</script>
</body>
</html>`;

  // JSON API mode — return raw application data
  const urlCheck = new URL(req.url);
  if (urlCheck.searchParams.get("json") === "1") {
    const jsonH = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json", "Cache-Control": "no-store" };
    if (appData) {
      return new Response(JSON.stringify({ success: true, application: appData }), { status: 200, headers: jsonH });
    } else if (ref) {
      return new Response(JSON.stringify({ success: false, error: fetchError }), { status: 404, headers: jsonH });
    } else {
      return new Response(JSON.stringify({ success: false, error: "no_ref" }), { status: 400, headers: jsonH });
    }
  }

  return new Response(html, { status: 200, headers: H });
}
