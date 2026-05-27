/**
 * peaStatusPage — Standalone HTML status tracker
 * Served at /api/functions/peaStatusPage?ref=PEA-2026-XXXXXX
 * Full self-contained page — no React bundle dependency.
 * This is the WORKING status page while the builder frontend bundle is frozen.
 */
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") || "").trim().toUpperCase();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Application Status | Prime Endorsement Authority</title>
<meta name="description" content="Track your Prime Endorsement Authority application status in real time."/>
<meta name="robots" content="noindex,nofollow"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0E1A;font-family:'Inter',Arial,sans-serif;color:#e2e8f0;min-height:100vh;padding:44px 16px 80px}
a{color:#C9A84C;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:600px;margin:0 auto}

/* Header */
.hdr{text-align:center;margin-bottom:40px}
.hdr-eyebrow{color:#C9A84C;font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:8px}
.hdr-title{color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px;text-transform:uppercase}
.hdr-line{width:56px;height:2px;background:#C9A84C;margin:12px auto 0}

/* Search */
.search-card{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:22px 26px;margin-bottom:24px}
.field-label{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px}
.search-row{display:flex;gap:10px}
.ref-input{flex:1;background:#0A0E1A;border:1px solid #334155;border-radius:6px;padding:12px 14px;color:#e2e8f0;font-size:14px;letter-spacing:2px;outline:none;font-family:'Courier New',monospace;transition:border-color .2s}
.ref-input:focus{border-color:#C9A84C}
.btn-track{background:#C9A84C;color:#0A0E1A;border:none;border-radius:6px;padding:12px 24px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;white-space:nowrap;transition:background .2s}
.btn-track:hover{background:#d4b45a}
.btn-track:disabled{opacity:.6;cursor:wait}

/* States */
.loading{text-align:center;color:#C9A84C;padding:48px;display:none}
.spinner{display:inline-block;width:36px;height:36px;border:3px solid #1e293b;border-top-color:#C9A84C;border-radius:50%;animation:spin .8s linear infinite;margin-bottom:12px}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-txt{font-size:12px;letter-spacing:3px;text-transform:uppercase}

.error-card{background:#130a0a;border:1px solid #7f1d1d;border-radius:10px;padding:32px;text-align:center;display:none}
.error-icon{font-size:30px;margin-bottom:10px}
.error-title{color:#f87171;font-weight:600;font-size:15px;margin-bottom:8px}
.error-msg{color:#94a3b8;font-size:13px;margin-bottom:14px;line-height:1.6}
.error-hint{color:#64748b;font-size:12px;line-height:1.7}

/* Result card */
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

/* Journey steps */
.section-lbl{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px}
.steps-row{display:flex;align-items:flex-start;margin-bottom:26px}
.step-node{display:flex;flex-direction:column;align-items:center}
.step-circle{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}
.step-lbl{font-size:10px;margin-top:7px;text-align:center;max-width:76px;line-height:1.4;white-space:pre-line}
.step-connector{flex:1;height:2px;margin:15px 4px 0;flex-shrink:0}

/* Progress bar */
.progress-wrap{margin-bottom:24px}
.progress-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.progress-title{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase}
.progress-val{color:#C9A84C;font-size:12px;font-weight:600}
.progress-track{background:#1e293b;border-radius:6px;height:10px;overflow:hidden}
.progress-bar{background:linear-gradient(90deg,#C9A84C,#e8c96e);border-radius:6px;height:100%;transition:width 1s ease}
.progress-ticks{display:flex;justify-content:space-between;margin-top:6px}
.progress-ticks span{color:#475569;font-size:10px}

/* Payment CTA */
.pay-cta{background:#1e1400;border:1px solid rgba(201,168,76,.5);border-radius:8px;padding:20px 22px;margin-bottom:20px;text-align:center}
.pay-cta-title{color:#C9A84C;font-weight:700;font-size:14px;margin-bottom:6px}
.pay-cta-desc{color:#94a3b8;font-size:12px;line-height:1.7;margin-bottom:16px}
.btn-pay{background:#C9A84C;color:#0A0E1A;border:none;border-radius:6px;padding:13px 40px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:background .2s;font-family:'Inter',Arial,sans-serif}
.btn-pay:hover{background:#d4b45a}
.btn-pay:disabled{opacity:.6;cursor:wait}

.submitted-date{color:#475569;font-size:11px;text-align:center;margin-top:4px}

.card-footer{background:#0d1220;border-top:1px solid #1e293b;padding:14px 26px;text-align:center}
.card-footer p{color:#64748b;font-size:12px;line-height:1.7}

/* Bottom */
.bottom-links{text-align:center;margin-top:30px;display:flex;justify-content:center;gap:28px}
.bottom-links a{color:#475569;font-size:11px;letter-spacing:2px;text-transform:uppercase;transition:color .2s}
.bottom-links a:hover{color:#C9A84C;text-decoration:none}

/* Secure badge */
.secure-badge{text-align:center;margin-top:24px;color:#1e293b;font-size:10px;letter-spacing:2px}
</style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div class="hdr">
    <a href="https://primeendorsement.com" style="text-decoration:none">
      <div class="hdr-eyebrow">Application Status Portal</div>
      <div class="hdr-title">Prime Endorsement Authority</div>
      <div class="hdr-line"></div>
    </a>
  </div>

  <!-- Search -->
  <div class="search-card">
    <div class="field-label">Track Your Application</div>
    <div class="search-row">
      <input id="refInput" class="ref-input" type="text" placeholder="PEA-2026-XXXXXX" value="${ref}" autocomplete="off" spellcheck="false" maxlength="30"/>
      <button class="btn-track" id="trackBtn" onclick="lookup()">Track →</button>
    </div>
  </div>

  <!-- Loading -->
  <div class="loading" id="loading">
    <div class="spinner"></div>
    <div class="loading-txt">Loading your status…</div>
  </div>

  <!-- Error -->
  <div class="error-card" id="errorCard">
    <div class="error-icon">🔍</div>
    <div class="error-title">Application Not Found</div>
    <div class="error-msg" id="errorMsg">No application was found with that reference code.</div>
    <div class="error-hint">
      Double-check your reference code (format: PEA-2026-XXXXXX)<br/>
      or contact <a href="mailto:admin@primeendorsement.com">admin@primeendorsement.com</a>
    </div>
  </div>

  <!-- Result -->
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
        <div class="progress-ticks">
          <span>Day 0</span><span>Day 30</span><span>Day 60</span><span>Day 90</span>
        </div>
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
      <p>Questions? Email <a href="mailto:admin@primeendorsement.com">admin@primeendorsement.com</a> quoting your reference code.</p>
    </div>
  </div>

  <div class="bottom-links">
    <a href="https://primeendorsement.com/apply">New Application</a>
    <a href="https://primeendorsement.com">Home</a>
    <a href="mailto:admin@primeendorsement.com">Contact</a>
  </div>
  <div class="secure-badge">🔒 AES-256 · TLS 1.3 · PCI DSS Compliant</div>
</div>

<script>
var STATUS={
  submitted:       {label:"Submitted",        color:"#3B82F6",bg:"#0d1e3a"},
  pending_payment: {label:"Pending Payment",  color:"#F59E0B",bg:"#1e1400"},
  under_review:    {label:"Under Review",     color:"#8B5CF6",bg:"#150d2e"},
  payment_received:{label:"Payment Received", color:"#10B981",bg:"#041f12"},
  approved:        {label:"Endorsed ✓",       color:"#C9A84C",bg:"#1a1200"},
  rejected:        {label:"Unsuccessful",     color:"#EF4444",bg:"#1a0505"},
  on_hold:         {label:"On Hold",          color:"#F59E0B",bg:"#1e1400"},
  draft:           {label:"Draft",            color:"#64748b",bg:"#0d1220"},
};
var STEPS=[
  {key:"submitted",    label:"Application\\nSubmitted"},
  {key:"under_review", label:"Expert Review\\n(90 Days)"},
  {key:"approved",     label:"Decision\\nIssued"}
];
var currentApp=null;

function stepIndex(s){
  if(["approved","rejected"].includes(s))return 2;
  if(["under_review","payment_received","on_hold"].includes(s))return 1;
  return 0;
}
function daysElapsed(start){
  if(!start)return null;
  return Math.floor((Date.now()-new Date(start).getTime())/86400000);
}
function ukDate(d){
  if(!d)return null;
  return new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
}
function show(id){document.getElementById(id).style.display="block"}
function hide(id){document.getElementById(id).style.display="none"}

async function lookup(){
  var ref=document.getElementById("refInput").value.trim().toUpperCase();
  if(!ref)return;
  document.getElementById("refInput").value=ref;
  var btn=document.getElementById("trackBtn");
  btn.disabled=true; btn.textContent="…";
  hide("errorCard"); hide("resultCard");
  show("loading");

  try{
    var r=await fetch("/api/functions/peaGetStatus?ref="+encodeURIComponent(ref));
    var d=await r.json();
    hide("loading");
    if(d.success&&d.application){
      render(d.application);
    } else {
      document.getElementById("errorMsg").textContent=d.message||"Application not found.";
      show("errorCard");
    }
  }catch(e){
    hide("loading");
    document.getElementById("errorMsg").textContent="Connection error. Please try again.";
    show("errorCard");
  }
  btn.disabled=false; btn.textContent="Track →";
}

function render(app){
  currentApp=app;
  var sc=STATUS[app.status]||STATUS.submitted;
  var si=stepIndex(app.status);

  /* Banner */
  var banner=document.getElementById("banner");
  banner.style.background=sc.bg;
  banner.style.borderBottomColor=sc.color;
  var st=document.getElementById("statusText");
  st.textContent=sc.label; st.style.color=sc.color;
  document.getElementById("refText").textContent=app.reference_code;

  /* Info grid */
  var paid=app.payment_status==="paid";
  var cells=[
    ["Applicant", app.applicant_name||"—"],
    ["Venture",   app.venture_name||"—"],
    ["Role",      app.applicant_role||"Founder"],
    ["Payment",   paid?"✅ Confirmed — £1,200":"⚠️ Outstanding"],
  ];
  document.getElementById("infoGrid").innerHTML=cells.map(function(c){
    return '<div class="info-cell"><div class="lbl">'+c[0]+'</div><div class="val">'+c[1]+'</div></div>';
  }).join("");

  /* Steps */
  var html="";
  STEPS.forEach(function(step,i){
    var active=i<=si;
    var done=i<si;
    html+='<div class="step-node">'
      +'<div class="step-circle" style="background:'+(active?"#C9A84C":"#1e293b")+';color:'+(active?"#0A0E1A":"#475569")+'">'+(done?"✓":(i+1))+'</div>'
      +'<div class="step-lbl" style="color:'+(active?"#e2e8f0":"#475569")+'">'+step.label+'</div>'
      +'</div>';
    if(i<STEPS.length-1){
      html+='<div class="step-connector" style="background:'+(i<si?"#C9A84C":"#1e293b")+'"></div>';
    }
  });
  document.getElementById("stepsRow").innerHTML=html;

  /* 90-day bar */
  if(app.day_90_start){
    var days=daysElapsed(app.day_90_start);
    var pct=Math.min(Math.round(days/90*100),100);
    show("progressWrap");
    document.getElementById("progressVal").textContent="Day "+days+" of 90 ("+pct+"%)";
    setTimeout(function(){document.getElementById("progressBar").style.width=pct+"%";},100);
  }

  /* Payment CTA */
  if(!paid){show("payCta");}

  /* Submitted date */
  var sd=ukDate(app.submitted_at);
  if(sd){document.getElementById("submittedDate").textContent="Submitted: "+sd;}

  show("resultCard");
}

async function handlePay(){
  if(!currentApp)return;
  var btn=document.getElementById("payBtn");
  btn.textContent="Redirecting…"; btn.disabled=true;
  try{
    var r=await fetch("https://primeendorsement.com/api/functions/peaCreateStripeCheckout",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({reference_code:currentApp.reference_code})
    });
    var d=await r.json();
    if(d.url||d.checkout_url){
      window.location.href=d.url||d.checkout_url;
    } else {
      alert("Payment error — please contact admin@primeendorsement.com");
    }
  }catch(e){
    alert("Payment error. Please try again.");
  }
  btn.textContent="Complete Payment — £1,200.00"; btn.disabled=false;
}

/* Auto-lookup on page load if ref in URL */
(function(){
  var ref="${ref}";
  if(ref){
    document.getElementById("refInput").value=ref;
    lookup();
  }
})();

/* Enter key on input */
document.getElementById("refInput").addEventListener("keydown",function(e){
  if(e.key==="Enter")lookup();
});

/* ===== BOTTOM NAVIGATION BAR ===== */
(function(){
  var GOLD="#C9A84C",GOLD25="rgba(201,168,76,0.25)",GOLD20="rgba(201,168,76,0.2)";
  var BG="rgba(10,14,26,0.97)",NAV_H=52,ID="__pea_bnav__";
  var PAGES=[
    ["/","Home"],
    ["/how-it-works","How It Works"],
    ["/api/functions/peaStatusPage","Track Application"],
    ["/verify-endorsement","Verify Certificate"],
    ["/member-login","Member Login"]
  ];
  // On the status page, we're always at index 2
  var i=2, canB=true, canF=true;
  var cur=PAGES[i];
  var dots="";
  for(var d=0;d<PAGES.length;d++){
    var dw=d===i?"18px":"5px", dc=d===i?GOLD:GOLD25;
    dots+='<a href="'+PAGES[d][0]+'" data-dot="'+d+'" style="width:'+dw+';height:5px;border-radius:3px;background:'+dc+';display:inline-block;transition:all 0.3s;flex-shrink:0;text-decoration:none"></a>';
  }
  var nav=document.createElement("div");
  nav.id=ID;
  nav.setAttribute("style","position:fixed;bottom:0;left:0;right:0;z-index:99999;height:"+NAV_H+"px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:"+BG+";backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid "+GOLD20+";box-shadow:0 -4px 24px rgba(0,0,0,0.5);font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;box-sizing:border-box");
  nav.innerHTML=
    '<a href="'+PAGES[i-1][0]+'" style="color:'+GOLD+';font-size:12px;font-weight:600;letter-spacing:1px;display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:5px;text-decoration:none;min-width:110px;white-space:nowrap">'
    +'<span style="font-size:15px">&larr;</span><span>'+PAGES[i-1][1]+'</span></a>'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:5px;flex:1;padding:0 8px">'
    +'<div style="color:'+GOLD+';font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:600;white-space:nowrap">'+(i+1)+' / '+PAGES.length+' &nbsp;&middot;&nbsp; '+cur[1]+'</div>'
    +'<div style="display:flex;gap:5px;align-items:center">'+dots+'</div>'
    +'</div>'
    +'<a href="'+PAGES[i+1][0]+'" style="color:'+GOLD+';font-size:12px;font-weight:600;letter-spacing:1px;display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:5px;text-decoration:none;min-width:110px;white-space:nowrap;justify-content:flex-end">'
    +'<span>'+PAGES[i+1][1]+'</span><span style="font-size:15px">&rarr;</span></a>';
  document.addEventListener("DOMContentLoaded",function(){
    document.body.appendChild(nav);
    document.body.style.paddingBottom=(NAV_H+8)+"px";
  });
})();

</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
