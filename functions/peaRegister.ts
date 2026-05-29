/**
 * peaRegister — v5 ELITE REBUILD 2026-05-29
 *
 * Full multi-step registration with document uploads, declaration & success screen.
 *
 * GET  → multi-step registration form (5 sections, progress bar, file uploads)
 * POST → validate → AI score → DB save → document upload → Stripe checkout → success page
 *
 * SECTIONS:
 *   1. Personal Information
 *   2. Venture Details
 *   3. Supporting Documents (passport, address proof, business reg, business plan, financials, pitch deck)
 *   4. Co-Founder (optional)
 *   5. Declaration & Submission
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const AGENT_APP   = "6a14246111a4fa5e22999619";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";
const FEE_PENCE   = 120000; // £1,200.00

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8", "X-Frame-Options": "SAMEORIGIN" };
const JSON_HEADERS = { "Content-Type": "application/json" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function genRef(): string {
  return `PEA-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
}

async function dbList(appId: string, entity: string, token: string): Promise<any[]> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`DB list ${entity}: ${r.status}`);
  return r.json();
}

async function dbCreate(appId: string, entity: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`DB create ${entity}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function dbUpdate(appId: string, entity: string, id: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`DB update ${entity}/${id}: ${r.status}`);
  return r.json();
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const r = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!r.ok) console.error("[register] Email error:", r.status, await r.text());
}

async function createStripeCheckout(params: {
  email: string; name: string; venture: string; ref: string; appId: string; stripeKey: string;
}): Promise<{ url: string; sessionId: string } | null> {
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${params.stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      "payment_method_types[0]": "card",
      "line_items[0][price_data][currency]": "gbp",
      "line_items[0][price_data][product_data][name]": "Prime Endorsement Authority — Innovator Founder Endorsement Programme",
      "line_items[0][price_data][product_data][description]": `${params.venture} · Ref: ${params.ref}`,
      "line_items[0][price_data][unit_amount]": String(FEE_PENCE),
      "line_items[0][quantity]": "1",
      "mode": "payment",
      "customer_email": params.email,
      "metadata[reference_code]": params.ref,
      "metadata[application_id]": params.appId,
      "payment_intent_data[description]": `PEA Endorsement Fee — ${params.ref}`,
      "payment_intent_data[statement_descriptor]": "PRIME ENDORSEMENT",
      "success_url": `${DOMAIN}/api/functions/peaPaymentSuccess?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(params.ref)}`,
      "cancel_url":  `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(params.ref)}`,
    }),
  });
  if (!r.ok) { console.error("[register] Stripe error:", await r.text()); return null; }
  const s = await r.json();
  return { url: s.url, sessionId: s.id };
}

async function scoreWithAI(b: Record<string, any>, openaiKey: string): Promise<{ score: number; summary: string; analysis: object }> {
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `You are a senior reviewer for Prime Endorsement Authority. Score this Innovator Founder application 0-100.\nAPPLICANT: ${b.applicant_name}\nVENTURE: ${b.venture_name}\nSECTOR: ${b.venture_sector}\nSTAGE: ${b.venture_stage}\nNATIONALITY: ${b.nationality}\nDESCRIPTION: ${b.venture_description}\nReturn JSON: {"score":0-100,"summary":"2-3 sentence executive summary","recommendation":"Recommend|Consider|Decline","key_strengths":["s1"],"key_concerns":["c1"]}` }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const d = await r.json();
    const p = JSON.parse(d.choices[0].message.content);
    return { score: Math.min(100, Math.max(0, p.score || 0)), summary: p.summary || "", analysis: p };
  } catch (e: any) {
    console.warn("[register] AI scoring failed:", e.message);
    return { score: 0, summary: "", analysis: {} };
  }
}

// ── Locked / Error screens ────────────────────────────────────────────────────

function lockedScreen(reason: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Link Invalid — PEA</title>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0A0E1A;font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}</style>
</head><body>
<div style="max-width:440px;text-align:center;padding:40px;background:#111827;border-radius:16px;border:1px solid #1e293b">
  <div style="font-size:48px;margin-bottom:16px">🔒</div>
  <div style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">Prime Endorsement Authority</div>
  <div style="color:#e2e8f0;font-size:16px;font-weight:600;margin-bottom:12px">Link Invalid or Expired</div>
  <div style="color:#94a3b8;font-size:13px;line-height:1.7;margin-bottom:28px">${reason}</div>
  <a href="mailto:admin@primeendorsement.com" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;display:inline-block">Contact Admin →</a>
</div></body></html>`;
}

function duplicateScreen(ref: string, statusUrl: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Application Exists — PEA</title>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0A0E1A;font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}</style>
</head><body>
<div style="max-width:480px;text-align:center;padding:40px;background:#111827;border-radius:16px;border:1px solid #C9A84C">
  <div style="font-size:48px;margin-bottom:16px">📋</div>
  <div style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">Prime Endorsement Authority</div>
  <div style="color:#e2e8f0;font-size:18px;font-weight:700;margin-bottom:10px">Application Already Exists</div>
  <div style="color:#94a3b8;font-size:13px;line-height:1.7;margin-bottom:8px">An active application is already registered to this email address.</div>
  <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:8px;padding:12px;margin:20px 0;color:#C9A84C;font-weight:700;font-size:15px;letter-spacing:2px">${ref}</div>
  <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;display:inline-block">Track My Application →</a>
</div></body></html>`;
}

// ── Success Screen ────────────────────────────────────────────────────────────

function successScreen(params: { name: string; ref: string; venture: string; checkoutUrl: string; statusUrl: string }): string {
  const { name, ref, venture, checkoutUrl, statusUrl } = params;
  const firstName = name.split(" ")[0];
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Registration Complete — Prime Endorsement Authority</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0A0E1A;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;padding:32px 16px;display:flex;align-items:flex-start;justify-content:center}
    .wrap{max-width:600px;width:100%}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,.4)}50%{box-shadow:0 0 0 12px rgba(201,168,76,0)}}
    .hero{text-align:center;padding:48px 32px 36px;background:#111827;border-radius:16px 16px 0 0;border:1px solid #C9A84C;border-bottom:none;animation:fadeUp .6s ease}
    .tick{width:80px;height:80px;border-radius:50%;background:rgba(34,197,94,.12);border:2px solid #22c55e;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:36px;animation:pulse 2s infinite}
    .brand{color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px}
    h1{color:#e2e8f0;font-size:22px;font-weight:700;margin-bottom:8px}
    .sub{color:#94a3b8;font-size:13px;line-height:1.7}
    .ref-card{background:#0A0E1A;border:1px solid #C9A84C;border-radius:10px;padding:20px;text-align:center;margin:24px 0 0}
    .ref-lbl{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px}
    .ref-code{color:#C9A84C;font-size:26px;font-weight:700;letter-spacing:4px}
    .ref-venture{color:#94a3b8;font-size:12px;margin-top:6px}
    .steps{background:#111827;border:1px solid #1e293b;border-top:none;border-bottom:none;padding:28px 32px;animation:fadeUp .7s ease}
    .step{display:flex;gap:14px;margin-bottom:18px;align-items:flex-start}
    .step:last-child{margin-bottom:0}
    .step-num{width:28px;height:28px;border-radius:50%;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
    .step-num.done{background:rgba(34,197,94,.12);border:1px solid #22c55e;color:#22c55e}
    .step-num.next{background:rgba(201,168,76,.12);border:1px solid #C9A84C;color:#C9A84C;animation:pulse 2s infinite}
    .step-num.wait{background:#1e293b;border:1px solid #334155;color:#475569}
    .step-text h3{color:#e2e8f0;font-size:13px;font-weight:600;margin-bottom:3px}
    .step-text p{color:#64748b;font-size:12px;line-height:1.6}
    .cta{background:#111827;border:1px solid #C9A84C;border-top:none;border-radius:0 0 16px 16px;padding:28px 32px;text-align:center;animation:fadeUp .8s ease}
    .pay-btn{display:inline-block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:16px 48px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;width:100%;text-align:center}
    .track-link{display:block;color:#C9A84C;font-size:12px;text-decoration:none;margin-top:8px;opacity:.8}
    .notice{background:#0a1020;border:1px solid #1e3a5f;border-radius:8px;padding:14px 16px;margin-top:20px;color:#64748b;font-size:11px;line-height:1.7;text-align:left}
    .footer{text-align:center;padding:20px;color:#334155;font-size:11px}
  </style>
</head>
<body>
<div class="wrap">

  <div class="hero">
    <div class="brand">Prime Endorsement Authority</div>
    <div class="tick">✅</div>
    <h1>Registration Complete, ${firstName}!</h1>
    <p class="sub">Your application has been received and securely registered on the Prime Endorsement Authority platform. Your unique reference number is below.</p>
    <div class="ref-card">
      <div class="ref-lbl">Application Reference</div>
      <div class="ref-code">${ref}</div>
      <div class="ref-venture">${venture}</div>
    </div>
  </div>

  <div class="steps">
    <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid #1e293b">Your Application Journey</div>

    <div class="step">
      <div class="step-num done">✓</div>
      <div class="step-text">
        <h3>Step 1 — Registration &amp; Onboarding</h3>
        <p>Profile created. Personal information, venture details, and supporting documents received and logged.</p>
      </div>
    </div>

    <div class="step">
      <div class="step-num next">2</div>
      <div class="step-text">
        <h3>Step 2 — Application Payment</h3>
        <p>Complete your secure payment of <strong style="color:#C9A84C">£1,200.00</strong> to formally activate your application for expert review.</p>
      </div>
    </div>

    <div class="step">
      <div class="step-num wait">3</div>
      <div class="step-text">
        <h3>Step 3 — Application Activation &amp; Review</h3>
        <p>Your file will be activated for structured endorsement review, compliance assessment, and business evaluation.</p>
      </div>
    </div>

    <div class="step">
      <div class="step-num wait">4</div>
      <div class="step-text">
        <h3>Step 4 — Expert Panel Assessment (90 Days)</h3>
        <p>Senior reviewers conduct a full evaluation of your venture innovation, market opportunity, and global potential.</p>
      </div>
    </div>

    <div class="step">
      <div class="step-num wait">5</div>
      <div class="step-text">
        <h3>Step 5 — Endorsement Decision</h3>
        <p>Official endorsement decision and certification issued upon successful completion of the review process.</p>
      </div>
    </div>
  </div>

  <div class="cta">
    <div style="color:#e2e8f0;font-size:13px;font-weight:600;margin-bottom:16px">Complete Payment to Activate Your Application</div>
    <a href="${checkoutUrl}" class="pay-btn">Proceed to Secure Payment — £1,200.00 →</a>
    <a href="${statusUrl}" class="track-link">Track application status instead →</a>
    <div class="notice">
      ⓘ &nbsp;Successful payment activates your application for formal review. Payment does not constitute endorsement approval. All applications are subject to full eligibility assessment, compliance verification, and programme requirements.<br/><br/>
      A payment confirmation and official receipt will be sent to <strong style="color:#94a3b8">${""}</strong> upon successful transaction.
    </div>
  </div>

  <div class="footer">© ${year} Prime Endorsement Authority · primeendorsement.com · Ref: ${ref}</div>
</div>
</body></html>`;
}

// ── Main Multi-Step Form ──────────────────────────────────────────────────────

function buildForm(opts: {
  locked?: boolean; lockReason?: string;
  prefill?: Record<string, string>; error?: string; ref?: string;
} = {}): string {
  const { prefill = {}, error, ref } = opts;
  const v  = (k: string, def = "") => String(prefill[k] || def).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
  const sel = (k: string, val: string) => v(k) === val ? " selected" : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Application Registration — Prime Endorsement Authority</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0A0E1A;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;padding:32px 16px 60px}
    .page{max-width:720px;margin:0 auto}

    /* Header */
    .hdr{text-align:center;margin-bottom:32px}
    .hdr-icon{font-size:48px;margin-bottom:10px}
    .hdr-brand{color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:5px;text-transform:uppercase}
    .hdr-sub{color:#475569;font-size:12px;margin-top:6px}
    .inv-badge{display:inline-block;margin-top:12px;background:rgba(201,168,76,.1);border:1px solid #C9A84C;color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:6px 18px;border-radius:20px}

    /* Progress bar */
    .progress-wrap{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:20px 24px;margin-bottom:24px}
    .progress-steps{display:flex;justify-content:space-between;align-items:flex-start;position:relative}
    .progress-steps::before{content:'';position:absolute;top:14px;left:14px;right:14px;height:2px;background:#1e293b;z-index:0}
    .progress-line{position:absolute;top:14px;left:14px;height:2px;background:#C9A84C;z-index:1;transition:width .4s ease}
    .ps{display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;z-index:2;flex:1}
    .ps-dot{width:28px;height:28px;border-radius:50%;border:2px solid #1e293b;background:#0A0E1A;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#475569;transition:all .3s}
    .ps-dot.active{border-color:#C9A84C;background:#C9A84C;color:#0A0E1A}
    .ps-dot.done{border-color:#22c55e;background:#22c55e;color:#fff}
    .ps-lbl{color:#475569;font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-align:center;max-width:70px;line-height:1.3}
    .ps-lbl.active{color:#C9A84C}
    .ps-lbl.done{color:#22c55e}

    /* Sections */
    .section{display:none}
    .section.active{display:block}

    /* Cards */
    .card{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:28px;margin-bottom:20px}
    .card-title{color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #1e293b;display:flex;align-items:center;gap:8px}

    /* Form elements */
    .row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
    .row.single{grid-template-columns:1fr}
    .row.triple{grid-template-columns:1fr 1fr 1fr}
    .field{display:flex;flex-direction:column;gap:6px}
    label{color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase}
    .label-hint{color:#475569;font-size:10px;font-weight:400;letter-spacing:0;text-transform:none;margin-left:4px}
    input,select,textarea{background:#0A0E1A;border:1px solid #1e293b;color:#e2e8f0;font-size:13px;padding:10px 14px;border-radius:6px;outline:none;transition:border .2s;width:100%;font-family:inherit}
    input:focus,select:focus,textarea:focus{border-color:#C9A84C}
    input.valid{border-color:#22c55e}
    input.invalid{border-color:#ef4444}
    select option{background:#111827}
    textarea{resize:vertical;min-height:110px;line-height:1.6}
    .required-star{color:#ef4444;margin-left:2px}
    .field-hint{color:#475569;font-size:10px;margin-top:3px;line-height:1.4}

    /* File upload */
    .upload-zone{border:2px dashed #1e293b;border-radius:8px;padding:20px;text-align:center;cursor:pointer;transition:all .2s;position:relative;background:#0A0E1A}
    .upload-zone:hover,.upload-zone.drag{border-color:#C9A84C;background:rgba(201,168,76,.04)}
    .upload-zone.uploaded{border-color:#22c55e;background:rgba(34,197,94,.04)}
    .upload-zone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
    .upload-icon{font-size:24px;margin-bottom:6px}
    .upload-lbl{color:#64748b;font-size:12px}
    .upload-lbl strong{color:#C9A84C}
    .upload-status{font-size:11px;margin-top:6px;min-height:14px;color:#22c55e}
    .upload-status.err{color:#ef4444}
    .doc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .doc-item{background:#0A0E1A;border:1px solid #1e293b;border-radius:8px;padding:14px}
    .doc-item .doc-title{color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;display:flex;align-items:center;gap:4px}
    .doc-item .doc-desc{color:#475569;font-size:10px;margin-bottom:10px;line-height:1.4}

    /* Error / info boxes */
    .error-box{background:#1a0000;border:1px solid #ef4444;border-radius:8px;padding:14px 16px;color:#f87171;font-size:13px;margin-bottom:20px;display:flex;gap:10px;align-items:flex-start}
    .info-box{background:#0a1020;border:1px solid #1e3a5f;border-radius:8px;padding:14px 16px;color:#64748b;font-size:12px;margin-bottom:16px;line-height:1.7}

    /* Fee */
    .fee-box{background:#0a0e1a;border:1px solid #C9A84C;border-radius:10px;padding:20px;text-align:center;margin:20px 0}
    .fee-lbl{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px}
    .fee-amt{color:#C9A84C;font-size:28px;font-weight:700}
    .fee-breakdown{color:#475569;font-size:11px;margin-top:4px}

    /* Declaration */
    .decl-box{background:#0a0e1a;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:16px;font-size:12px;color:#64748b;line-height:1.9;max-height:180px;overflow-y:auto}
    .decl-box p{margin-bottom:8px}
    .checkbox-row{display:flex;gap:12px;align-items:flex-start;padding:14px;background:#111827;border:1px solid #1e293b;border-radius:8px;margin-bottom:12px;cursor:pointer}
    .checkbox-row:hover{border-color:#C9A84C}
    .checkbox-row input[type=checkbox]{width:18px;height:18px;accent-color:#C9A84C;flex-shrink:0;margin-top:1px;cursor:pointer}
    .checkbox-row label{color:#94a3b8;font-size:12px;line-height:1.6;cursor:pointer;text-transform:none;letter-spacing:0;font-weight:400}
    .checkbox-row label strong{color:#e2e8f0}

    /* Navigation buttons */
    .nav-row{display:flex;gap:12px;margin-top:8px}
    .btn-prev{flex:1;background:transparent;border:1px solid #334155;color:#94a3b8;padding:14px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;transition:all .2s;text-transform:uppercase;letter-spacing:2px}
    .btn-prev:hover{border-color:#C9A84C;color:#C9A84C}
    .btn-next{flex:2;background:#C9A84C;color:#0A0E1A;border:none;padding:14px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;transition:opacity .2s;text-transform:uppercase;letter-spacing:2px}
    .btn-next:hover{opacity:.9}
    .btn-next:disabled{opacity:.5;cursor:not-allowed}
    .submit-btn{width:100%;background:#C9A84C;color:#0A0E1A;border:none;padding:16px;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;transition:opacity .2s;margin-top:8px}
    .submit-btn:hover{opacity:.9}
    .submit-btn:disabled{opacity:.5;cursor:not-allowed}
    .loading{display:none;text-align:center;padding:20px;color:#C9A84C;font-size:13px}

    /* Char count */
    .char-count{color:#475569;font-size:10px;text-align:right;margin-top:3px}
    .char-count.ok{color:#22c55e}
    .char-count.warn{color:#f59e0b}

    /* Optional badge */
    .opt-badge{display:inline-block;background:#1e293b;color:#475569;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:2px 7px;border-radius:4px;margin-left:6px;vertical-align:middle}

    @media(max-width:600px){
      .row,.row.triple{grid-template-columns:1fr}
      .doc-grid{grid-template-columns:1fr}
      .progress-steps::before,.progress-line{display:none}
      .ps-lbl{display:none}
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="hdr">
    <div class="hdr-icon">🏛️</div>
    <div class="hdr-brand">Prime Endorsement Authority</div>
    <div class="hdr-sub">Innovator Founder Visa Endorsement Programme</div>
    ${ref ? `<div class="inv-badge">Invitation Ref: ${ref}</div>` : ""}
  </div>

  <!-- Progress -->
  <div class="progress-wrap">
    <div class="progress-steps" id="progressSteps">
      <div class="progress-line" id="progressLine" style="width:0%"></div>
      <div class="ps" data-step="1"><div class="ps-dot active" id="dot1">1</div><div class="ps-lbl active" id="lbl1">Personal</div></div>
      <div class="ps" data-step="2"><div class="ps-dot" id="dot2">2</div><div class="ps-lbl" id="lbl2">Venture</div></div>
      <div class="ps" data-step="3"><div class="ps-dot" id="dot3">3</div><div class="ps-lbl" id="lbl3">Documents</div></div>
      <div class="ps" data-step="4"><div class="ps-dot" id="dot4">4</div><div class="ps-lbl" id="lbl4">Co-Founder</div></div>
      <div class="ps" data-step="5"><div class="ps-dot" id="dot5">5</div><div class="ps-lbl" id="lbl5">Declare</div></div>
    </div>
  </div>

  <form id="regForm" enctype="multipart/form-data" method="POST">
    <input type="hidden" name="_token" value="${v("_token")}"/>
    <input type="hidden" name="_ref"   value="${v("_ref", ref || "")}"/>

    ${error ? `<div class="error-box"><span>⚠</span><div>${error}</div></div>` : ""}

    <!-- ═══════════════ SECTION 1: PERSONAL INFO ═══════════════ -->
    <div class="section active" id="sec1">
      <div class="card">
        <div class="card-title">👤 Personal Information</div>
        <div class="row">
          <div class="field">
            <label>Full Legal Name <span class="required-star">*</span></label>
            <input type="text" name="applicant_name" value="${v("applicant_name")}" placeholder="As on your passport" required autocomplete="name"/>
          </div>
          <div class="field">
            <label>Email Address <span class="required-star">*</span></label>
            <input type="email" name="applicant_email" value="${v("applicant_email")}" placeholder="your@email.com" required autocomplete="email"/>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Phone Number <span class="required-star">*</span></label>
            <input type="tel" name="phone_number" value="${v("phone_number")}" placeholder="+44 7700 000000" required autocomplete="tel"/>
          </div>
          <div class="field">
            <label>Date of Birth <span class="required-star">*</span></label>
            <input type="date" name="date_of_birth" value="${v("date_of_birth")}" required max="${new Date().toISOString().split("T")[0]}"/>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Nationality <span class="required-star">*</span></label>
            <input type="text" name="nationality" value="${v("nationality")}" placeholder="e.g. Nigerian, British" required/>
          </div>
          <div class="field">
            <label>Country of Residence <span class="required-star">*</span></label>
            <input type="text" name="country_of_residence" value="${v("country_of_residence")}" placeholder="e.g. United Kingdom" required/>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Application Role <span class="required-star">*</span></label>
            <select name="applicant_role" required>
              <option value="">Select role…</option>
              <option value="Founder"${sel("applicant_role","Founder")}>Founder</option>
              <option value="Co-Founder"${sel("applicant_role","Co-Founder")}>Co-Founder</option>
              <option value="Managing Director"${sel("applicant_role","Managing Director")}>Managing Director</option>
              <option value="CEO"${sel("applicant_role","CEO")}>CEO</option>
              <option value="Director"${sel("applicant_role","Director")}>Director</option>
            </select>
          </div>
          <div class="field">
            <label>LinkedIn Profile <span class="label-hint">(optional)</span></label>
            <input type="text" name="linkedin_url" value="${v("linkedin_url")}" placeholder="https://linkedin.com/in/your-name" autocomplete="off"/>
          </div>
        </div>
      </div>
      <div class="nav-row"><button type="button" class="btn-next" onclick="goNext(1)">Continue to Venture Details →</button></div>
    </div>

    <!-- ═══════════════ SECTION 2: VENTURE DETAILS ═══════════════ -->
    <div class="section" id="sec2">
      <div class="card">
        <div class="card-title">🚀 Venture Details</div>
        <div class="row">
          <div class="field">
            <label>Company / Venture Name <span class="required-star">*</span></label>
            <input type="text" name="venture_name" value="${v("venture_name")}" placeholder="Your company name" required/>
          </div>
          <div class="field">
            <label>Company Website <span class="label-hint">(optional)</span></label>
            <input type="text" name="website_url" value="${v("website_url")}" placeholder="https://yourcompany.com" autocomplete="off"/>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Industry Sector <span class="required-star">*</span></label>
            <select name="venture_sector" required>
              <option value="">Select sector…</option>
              ${["FinTech","HealthTech","EdTech","CleanTech","AgriTech","PropTech","LegalTech","AI & Machine Learning","Blockchain & Web3","E-Commerce","SaaS","DeepTech","Social Impact","Media & Entertainment","Manufacturing","Consumer Goods","Investment & Finance","Professional Services","Other"].map(s=>`<option value="${s}"${sel("venture_sector",s)}>${s}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Development Stage <span class="required-star">*</span></label>
            <select name="venture_stage" required>
              <option value="">Select stage…</option>
              ${["Idea / Pre-Product","Pre-Seed","Seed","Series A","Series B","Series C+","Growth","Mature / Established"].map(s=>`<option value="${s}"${sel("venture_stage",s)}>${s}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Country of Incorporation <span class="required-star">*</span></label>
            <input type="text" name="incorporation_country" value="${v("incorporation_country")}" placeholder="e.g. United Kingdom" required/>
          </div>
          <div class="field">
            <label>Year Founded <span class="required-star">*</span></label>
            <input type="number" name="founded_year" value="${v("founded_year")}" placeholder="${new Date().getFullYear()}" min="1900" max="${new Date().getFullYear()}" required/>
          </div>
        </div>
        <div class="row single">
          <div class="field">
            <label>Venture Description <span class="required-star">*</span><span class="label-hint">(min 150 characters)</span></label>
            <textarea name="venture_description" id="ventureDesc" placeholder="Describe your venture: the problem you solve, your solution, current traction, market size, and global growth potential. Be specific and compelling." required>${v("venture_description")}</textarea>
            <div class="char-count" id="descCount">0 / 150 minimum</div>
          </div>
        </div>
        <div class="row single">
          <div class="field">
            <label>Key Achievements &amp; Traction <span class="label-hint">(optional)</span></label>
            <textarea name="key_achievements" placeholder="Revenue, users, partnerships, awards, press coverage, funding raised, notable milestones…" style="min-height:70px">${v("key_achievements")}</textarea>
          </div>
        </div>
      </div>
      <div class="nav-row">
        <button type="button" class="btn-prev" onclick="goTo(1)">← Back</button>
        <button type="button" class="btn-next" onclick="goNext(2)">Continue to Documents →</button>
      </div>
    </div>

    <!-- ═══════════════ SECTION 3: SUPPORTING DOCUMENTS ═══════════════ -->
    <div class="section" id="sec3">
      <div class="card">
        <div class="card-title">📎 Supporting Documents</div>
        <div class="info-box">
          📌 &nbsp;Upload your supporting documents below. <strong style="color:#94a3b8">Passport</strong> and <strong style="color:#94a3b8">Proof of Address</strong> are required. All other documents are strongly recommended for a successful application. Accepted formats: PDF, JPG, PNG, DOCX. Max 10MB per file.
        </div>

        <div class="doc-grid">

          <!-- Passport -->
          <div class="doc-item">
            <div class="doc-title">🪪 Passport / National ID <span style="color:#ef4444;font-size:10px">*Required</span></div>
            <div class="doc-desc">Valid passport bio-data page or government-issued national identity document.</div>
            <div class="upload-zone" id="zone_passport" ondragover="dragOver(event,'passport')" ondragleave="dragLeave('passport')" ondrop="dropFile(event,'passport')">
              <input type="file" name="doc_passport" id="file_passport" accept=".pdf,.jpg,.jpeg,.png" onchange="fileChosen('passport',this)"/>
              <div class="upload-icon">📄</div>
              <div class="upload-lbl">Drop file here or <strong>browse</strong></div>
              <div class="upload-status" id="status_passport"></div>
            </div>
          </div>

          <!-- Proof of Address -->
          <div class="doc-item">
            <div class="doc-title">🏠 Proof of Address <span style="color:#ef4444;font-size:10px">*Required</span></div>
            <div class="doc-desc">Recent utility bill, bank statement, or council tax letter (within last 3 months).</div>
            <div class="upload-zone" id="zone_address" ondragover="dragOver(event,'address')" ondragleave="dragLeave('address')" ondrop="dropFile(event,'address')">
              <input type="file" name="doc_address" id="file_address" accept=".pdf,.jpg,.jpeg,.png" onchange="fileChosen('address',this)"/>
              <div class="upload-icon">📄</div>
              <div class="upload-lbl">Drop file here or <strong>browse</strong></div>
              <div class="upload-status" id="status_address"></div>
            </div>
          </div>

          <!-- Business Registration -->
          <div class="doc-item">
            <div class="doc-title">🏢 Business Registration <span class="opt-badge">Recommended</span></div>
            <div class="doc-desc">Certificate of incorporation, company registration document, or equivalent official registration.</div>
            <div class="upload-zone" id="zone_bizreg" ondragover="dragOver(event,'bizreg')" ondragleave="dragLeave('bizreg')" ondrop="dropFile(event,'bizreg')">
              <input type="file" name="doc_bizreg" id="file_bizreg" accept=".pdf,.jpg,.jpeg,.png,.docx" onchange="fileChosen('bizreg',this)"/>
              <div class="upload-icon">📄</div>
              <div class="upload-lbl">Drop file here or <strong>browse</strong></div>
              <div class="upload-status" id="status_bizreg"></div>
            </div>
          </div>

          <!-- Business Plan -->
          <div class="doc-item">
            <div class="doc-title">📋 Business Plan <span class="opt-badge">Recommended</span></div>
            <div class="doc-desc">Detailed business plan outlining your venture strategy, market analysis, and growth roadmap.</div>
            <div class="upload-zone" id="zone_bizplan" ondragover="dragOver(event,'bizplan')" ondragleave="dragLeave('bizplan')" ondrop="dropFile(event,'bizplan')">
              <input type="file" name="doc_bizplan" id="file_bizplan" accept=".pdf,.docx" onchange="fileChosen('bizplan',this)"/>
              <div class="upload-icon">📄</div>
              <div class="upload-lbl">Drop file here or <strong>browse</strong></div>
              <div class="upload-status" id="status_bizplan"></div>
            </div>
          </div>

          <!-- Financial Projections -->
          <div class="doc-item">
            <div class="doc-title">📊 Financial Projections <span class="opt-badge">Optional</span></div>
            <div class="doc-desc">3-year financial projections, revenue forecast, or investor deck with financials.</div>
            <div class="upload-zone" id="zone_financials" ondragover="dragOver(event,'financials')" ondragleave="dragLeave('financials')" ondrop="dropFile(event,'financials')">
              <input type="file" name="doc_financials" id="file_financials" accept=".pdf,.xlsx,.docx" onchange="fileChosen('financials',this)"/>
              <div class="upload-icon">📄</div>
              <div class="upload-lbl">Drop file here or <strong>browse</strong></div>
              <div class="upload-status" id="status_financials"></div>
            </div>
          </div>

          <!-- Pitch Deck -->
          <div class="doc-item">
            <div class="doc-title">🎯 Pitch Deck <span class="opt-badge">Optional</span></div>
            <div class="doc-desc">Investor pitch presentation outlining your vision, product, team, and traction.</div>
            <div class="upload-zone" id="zone_pitch" ondragover="dragOver(event,'pitch')" ondragleave="dragLeave('pitch')" ondrop="dropFile(event,'pitch')">
              <input type="file" name="doc_pitch" id="file_pitch" accept=".pdf,.pptx" onchange="fileChosen('pitch',this)"/>
              <div class="upload-icon">📄</div>
              <div class="upload-lbl">Drop file here or <strong>browse</strong></div>
              <div class="upload-status" id="status_pitch"></div>
            </div>
          </div>

        </div>
      </div>
      <div class="nav-row">
        <button type="button" class="btn-prev" onclick="goTo(2)">← Back</button>
        <button type="button" class="btn-next" onclick="goNext(3)">Continue to Co-Founder →</button>
      </div>
    </div>

    <!-- ═══════════════ SECTION 4: CO-FOUNDER ═══════════════ -->
    <div class="section" id="sec4">
      <div class="card">
        <div class="card-title">👥 Co-Founder Details <span class="opt-badge">Optional</span></div>
        <div class="info-box">If your venture has a co-founder applying alongside you, enter their details below. Leave blank if not applicable.</div>
        <div class="row">
          <div class="field">
            <label>Co-Founder Full Name</label>
            <input type="text" name="co_founder_name" value="${v("co_founder_name")}" placeholder="Full legal name" autocomplete="off"/>
          </div>
          <div class="field">
            <label>Co-Founder Email</label>
            <input type="email" name="co_founder_email" value="${v("co_founder_email")}" placeholder="cofounder@example.com" autocomplete="off"/>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Co-Founder Role</label>
            <select name="co_founder_role">
              <option value="">Select role…</option>
              <option value="Co-Founder"${sel("co_founder_role","Co-Founder")}>Co-Founder</option>
              <option value="CTO"${sel("co_founder_role","CTO")}>CTO</option>
              <option value="COO"${sel("co_founder_role","COO")}>COO</option>
              <option value="CFO"${sel("co_founder_role","CFO")}>CFO</option>
              <option value="Director"${sel("co_founder_role","Director")}>Director</option>
            </select>
          </div>
          <div class="field">
            <label>Co-Founder Nationality</label>
            <input type="text" name="co_founder_nationality" value="${v("co_founder_nationality")}" placeholder="e.g. British" autocomplete="off"/>
          </div>
        </div>
      </div>
      <div class="nav-row">
        <button type="button" class="btn-prev" onclick="goTo(3)">← Back</button>
        <button type="button" class="btn-next" onclick="goNext(4)">Continue to Declaration →</button>
      </div>
    </div>

    <!-- ═══════════════ SECTION 5: DECLARATION ═══════════════ -->
    <div class="section" id="sec5">
      <div class="card">
        <div class="card-title">✍️ Declaration &amp; Submission</div>

        <div class="fee-box">
          <div class="fee-lbl">Application Processing Fee</div>
          <div class="fee-amt">£1,200.00</div>
          <div class="fee-breakdown">£1,000.00 + £200.00 VAT · Payable after submission</div>
        </div>

        <div style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">Applicant Declaration</div>
        <div class="decl-box">
          <p>I, the undersigned applicant, hereby declare that:</p>
          <p>1. All information provided in this application and supporting documentation is true, accurate, complete, and not misleading in any respect.</p>
          <p>2. I am the legitimate founder, co-founder, or authorised representative of the venture stated in this application.</p>
          <p>3. I understand that submission of this application and payment of the application fee does not constitute, guarantee, or imply any endorsement approval, visa decision, or immigration outcome.</p>
          <p>4. I acknowledge that all applications are subject to full eligibility assessment, compliance verification, innovation evaluation, and programme requirements as determined by Prime Endorsement Authority.</p>
          <p>5. I consent to Prime Endorsement Authority processing my personal data and submitted documentation for the purposes of application assessment, compliance checks, and programme administration, in accordance with applicable data protection legislation.</p>
          <p>6. I confirm that all submitted documents are authentic, unaltered, and issued by the relevant authorities, and I accept full legal responsibility for the accuracy and authenticity of all submitted materials.</p>
          <p>7. I understand that any deliberate misrepresentation, provision of false information, or submission of fraudulent documentation will result in immediate disqualification and may be reported to relevant authorities.</p>
        </div>

        <div class="checkbox-row">
          <input type="checkbox" id="chk_declaration" name="declaration_agreed" value="true" required/>
          <label for="chk_declaration">I have read, understood, and agree to the <strong>Applicant Declaration</strong> above. I confirm that all information and documents submitted are true, accurate, and authentic.</label>
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="chk_terms" name="terms_agreed" value="true" required/>
          <label for="chk_terms">I agree to the <strong>Prime Endorsement Authority Terms &amp; Conditions</strong> and <strong>Privacy Policy</strong>, and I consent to the processing of my personal data for application assessment purposes.</label>
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="chk_payment" name="payment_agreed" value="true" required/>
          <label for="chk_payment">I acknowledge that the <strong>application processing fee of £1,200.00</strong> (inclusive of VAT) is payable immediately after submission and is required to activate my application for formal review.</label>
        </div>

      </div>

      <button type="submit" class="submit-btn" id="submitBtn">Submit Application &amp; Proceed to Payment →</button>
      <div class="loading" id="loadingMsg">⏳ &nbsp;Submitting your application and preparing payment gateway…</div>
      <p style="color:#334155;font-size:11px;text-align:center;margin-top:14px;line-height:1.7">🔒 &nbsp;Your data is encrypted and handled securely. Payment is processed through Stripe's PCI-compliant gateway.</p>

      <div class="nav-row" style="margin-top:12px">
        <button type="button" class="btn-prev" onclick="goTo(4)" style="flex:none;width:120px">← Back</button>
      </div>
    </div>

  </form>
</div>

<script>
var currentStep = 1;
var totalSteps  = 5;
var uploadedFiles = {};

// ── Navigation ──────────────────────────────────────────────────────────────
function goTo(step) {
  document.getElementById('sec' + currentStep).classList.remove('active');
  document.getElementById('sec' + step).classList.add('active');
  currentStep = step;
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goNext(fromStep) {
  if (!validateStep(fromStep)) return;
  goTo(fromStep + 1);
}

function updateProgress() {
  var lineWidths = ['0%','25%','50%','75%','100%'];
  document.getElementById('progressLine').style.width = lineWidths[currentStep - 1] || '0%';
  for (var i = 1; i <= totalSteps; i++) {
    var dot = document.getElementById('dot' + i);
    var lbl = document.getElementById('lbl' + i);
    dot.className = 'ps-dot' + (i < currentStep ? ' done' : i === currentStep ? ' active' : '');
    dot.textContent = i < currentStep ? '✓' : String(i);
    lbl.className = 'ps-lbl' + (i < currentStep ? ' done' : i === currentStep ? ' active' : '');
  }
}

// ── Step Validation ─────────────────────────────────────────────────────────
function validateStep(step) {
  var section = document.getElementById('sec' + step);
  var required = section.querySelectorAll('[required]');
  var ok = true;
  for (var i = 0; i < required.length; i++) {
    var el = required[i];
    if (el.type === 'checkbox') {
      if (!el.checked) { el.closest('.checkbox-row').style.borderColor = '#ef4444'; ok = false; }
      else { el.closest('.checkbox-row').style.borderColor = '#1e293b'; }
    } else if (!el.value.trim()) {
      el.style.borderColor = '#ef4444';
      el.addEventListener('input', function(){ this.style.borderColor = '#1e293b'; }, { once: true });
      if (ok) el.focus();
      ok = false;
    }
  }
  if (!ok) { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  // Documents step — check required uploads
  if (step === 3) {
    var passportOk = uploadedFiles['passport'] ? true : false;
    var addressOk  = uploadedFiles['address']  ? true : false;
    if (!passportOk) {
      document.getElementById('zone_passport').style.borderColor = '#ef4444';
      document.getElementById('status_passport').textContent = 'Passport document is required';
      document.getElementById('status_passport').className = 'upload-status err';
      ok = false;
    }
    if (!addressOk) {
      document.getElementById('zone_address').style.borderColor = '#ef4444';
      document.getElementById('status_address').textContent = 'Proof of address is required';
      document.getElementById('status_address').className = 'upload-status err';
      ok = false;
    }
  }
  return ok;
}

// ── Venture description counter ─────────────────────────────────────────────
var descEl = document.getElementById('ventureDesc');
var countEl = document.getElementById('descCount');
if (descEl) {
  descEl.addEventListener('input', function() {
    var n = this.value.length;
    countEl.textContent = n + ' / 150 minimum';
    countEl.className = 'char-count' + (n >= 150 ? ' ok' : n > 80 ? ' warn' : '');
  });
}

// ── File Upload ─────────────────────────────────────────────────────────────
function fileChosen(key, input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var maxBytes = 10 * 1024 * 1024;
  var statusEl = document.getElementById('status_' + key);
  var zoneEl   = document.getElementById('zone_' + key);
  if (file.size > maxBytes) {
    statusEl.textContent = 'File too large (max 10MB)';
    statusEl.className = 'upload-status err';
    zoneEl.classList.remove('uploaded');
    delete uploadedFiles[key];
    return;
  }
  uploadedFiles[key] = file.name;
  statusEl.textContent = '✓ ' + file.name + ' (' + (file.size/1024).toFixed(0) + ' KB)';
  statusEl.className = 'upload-status';
  zoneEl.classList.add('uploaded');
  zoneEl.style.borderColor = '#22c55e';
}

function dragOver(e, key) {
  e.preventDefault();
  document.getElementById('zone_' + key).classList.add('drag');
}
function dragLeave(key) {
  document.getElementById('zone_' + key).classList.remove('drag');
}
function dropFile(e, key) {
  e.preventDefault();
  dragLeave(key);
  var input = document.getElementById('file_' + key);
  if (e.dataTransfer.files.length) {
    var dt = new DataTransfer();
    dt.items.add(e.dataTransfer.files[0]);
    input.files = dt.files;
    fileChosen(key, input);
  }
}

// ── Submit ───────────────────────────────────────────────────────────────────
document.getElementById('regForm').addEventListener('submit', function(e) {
  e.preventDefault();
  if (!validateStep(5)) return;

  var btn     = document.getElementById('submitBtn');
  var loading = document.getElementById('loadingMsg');

  // Build FormData (captures files + fields)
  var fd = new FormData(this);

  btn.disabled = true;
  btn.textContent = 'Submitting…';
  loading.style.display = 'block';

  fetch(window.location.href, {
    method: 'POST',
    body: fd
  })
  .then(function(resp) {
    if (resp.redirected) { window.location.href = resp.url; return; }
    return resp.json().then(function(data) {
      if (data.success && data.redirect) {
        window.location.href = data.redirect;
      } else if (data.success && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.error) {
        btn.disabled = false;
        btn.textContent = 'Submit Application & Proceed to Payment →';
        loading.style.display = 'none';
        var errBox = document.querySelector('.error-box');
        if (!errBox) {
          errBox = document.createElement('div');
          errBox.className = 'error-box';
          document.getElementById('sec5').prepend(errBox);
        }
        errBox.innerHTML = '<span>⚠</span><div>' + data.error + '</div>';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  })
  .catch(function(err) {
    btn.disabled = false;
    btn.textContent = 'Submit Application & Proceed to Payment →';
    loading.style.display = 'none';
    alert('Submission failed. Please try again or contact admin@primeendorsement.com');
  });
});

// Init
updateProgress();
</script>
</body></html>`;
}

// ── Upload document to Base44 public storage ──────────────────────────────────

async function uploadDocument(file: File, serviceToken: string, appId: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("file", file, file.name);
    const r = await fetch(`https://app.base44.com/api/apps/${appId}/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${serviceToken}` },
      body: formData,
    });
    if (!r.ok) {
      const txt = await r.text();
      console.warn(`[register] Upload failed ${fieldName}: ${r.status} ${txt}`);
      return null;
    }
    const d = await r.json();
    return d.url || d.file_url || d.public_url || null;
  } catch (e: any) {
    console.warn(`[register] Upload error ${fieldName}:`, e.message);
    return null;
  }
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  try {
    const url          = new URL(req.url);
    const tokenParam   = url.searchParams.get("token") || "";
    const refParam     = url.searchParams.get("ref")   || "";
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const stripeKey    = Deno.env.get("STRIPE_SECRET_KEY")    || "";
    const resendKey    = Deno.env.get("RESEND_API_KEY")       || "";
    const openaiKey    = Deno.env.get("OPENAI_API_KEY")       || "";

    // ── GET: Serve registration form ─────────────────────────────────────────
    if (req.method === "GET") {
      if (tokenParam) {
        const allApps = await dbList(BUILDER_APP, "Application", serviceToken);
        const app = allApps.find((a: any) => a.session_token === tokenParam || a.invitation_token === tokenParam);
        if (!app) {
          return new Response(lockedScreen("This invitation link is invalid or has expired. Please contact admin@primeendorsement.com to request a new invitation."), { headers: HTML_HEADERS });
        }
        const expires = app.token_expires_at;
        if (expires && new Date(expires) < new Date()) {
          return new Response(lockedScreen("This invitation link has expired. Please contact admin@primeendorsement.com to request a fresh link."), { headers: HTML_HEADERS });
        }
        return new Response(buildForm({
          ref: app.reference_code || refParam,
          prefill: {
            applicant_email: app.applicant_email || "",
            applicant_name:  app.applicant_name  || "",
            applicant_role:  app.applicant_role  || "Founder",
            _token: tokenParam,
            _ref:   app.reference_code || refParam,
          },
        }), { headers: HTML_HEADERS });
      }
      return new Response(buildForm({ ref: refParam }), { headers: HTML_HEADERS });
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    }

    // ── POST: Process submission ──────────────────────────────────────────────
    if (req.method === "POST") {
      const ct = req.headers.get("content-type") || "";
      let body: Record<string, any> = {};
      let files: Record<string, File> = {};

      if (ct.includes("multipart/form-data")) {
        const fd = await req.formData();
        for (const [k, v] of fd.entries()) {
          if (v instanceof File && v.size > 0) {
            files[k] = v;
          } else {
            body[k] = String(v).trim();
          }
        }
      } else if (ct.includes("application/json")) {
        body = await req.json().catch(() => ({}));
      } else {
        const text = await req.text();
        for (const pair of text.split("&")) {
          const [k, val] = pair.split("=").map(s => decodeURIComponent(s || "").replace(/\+/g, " "));
          if (k) body[k] = (val || "").trim();
        }
      }

      // Validate required fields
      const required = [
        "applicant_name", "applicant_email", "phone_number", "date_of_birth",
        "nationality", "country_of_residence", "applicant_role",
        "venture_name", "venture_description", "venture_stage", "venture_sector",
        "incorporation_country", "founded_year",
      ];
      const missing = required.filter(f => !body[f]?.toString().trim());
      if (missing.length > 0) {
        return new Response(JSON.stringify({ success: false, error: `Please complete all required fields: ${missing.map(f => f.replace(/_/g, " ")).join(", ")}` }), { status: 400, headers: JSON_HEADERS });
      }

      if ((body.venture_description || "").length < 100) {
        return new Response(JSON.stringify({ success: false, error: "Venture description must be at least 100 characters. Please provide more detail." }), { status: 400, headers: JSON_HEADERS });
      }

      if (!body.declaration_agreed) {
        return new Response(JSON.stringify({ success: false, error: "Please agree to all declaration statements before submitting." }), { status: 400, headers: JSON_HEADERS });
      }

      const email = body.applicant_email.trim().toLowerCase();

      // Deduplication
      const allApps = await dbList(BUILDER_APP, "Application", serviceToken);
      const existing = allApps.find((a: any) =>
        a.applicant_email?.toLowerCase() === email &&
        !["withdrawn", "closed", "rejected", "expired"].includes(a.status || "")
      );

      if (existing) {
        if (existing.payment_status === "paid") {
          const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(existing.reference_code)}`;
          return new Response(JSON.stringify({ success: true, existing: true, redirect: statusUrl }), { headers: JSON_HEADERS });
        }
        // Re-generate Stripe session for unpaid existing
        if (stripeKey) {
          const venture = existing.venture_name || body.venture_name || "Your Venture";
          const checkout = await createStripeCheckout({ email, name: existing.applicant_name, venture, ref: existing.reference_code, appId: existing.id, stripeKey });
          if (checkout) {
            await dbUpdate(BUILDER_APP, "Application", existing.id, serviceToken, { payment_reference: checkout.sessionId });
            const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(existing.reference_code)}`;
            return new Response(duplicateScreen(existing.reference_code, statusUrl), { headers: HTML_HEADERS });
          }
        }
        const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(existing.reference_code)}`;
        return new Response(duplicateScreen(existing.reference_code, statusUrl), { headers: HTML_HEADERS });
      }

      // Generate unique reference code
      let ref = genRef();
      for (let i = 0; i < 5; i++) {
        if (!allApps.find((a: any) => a.reference_code === ref)) break;
        ref = genRef();
      }

      // AI scoring
      let aiScore = 0, aiSummary = "";
      if (openaiKey) {
        const ai = await scoreWithAI(body, openaiKey);
        aiScore   = ai.score;
        aiSummary = ai.summary;
        console.log(`[register] AI score for ${ref}: ${aiScore}`);
      }

      const now = new Date().toISOString();

      // Create Application record
      const appRecord = await dbCreate(BUILDER_APP, "Application", serviceToken, {
        reference_code:   ref,
        status:           "submitted",
        payment_status:   "pending",
        application_type: (body.applicant_role || "Founder").toLowerCase().replace(/\s+/g, "_"),
        application_fee:  1200.00,
        currency:         "GBP",
        applicant_name:   body.applicant_name,
        applicant_email:  email,
        submitted_at:     now,
        session_token:    body._token || null,
        ai_score:         aiScore  || null,
        founder: {
          full_name:            body.applicant_name,
          role:                 body.applicant_role || "Founder",
          nationality:          body.nationality,
          country_of_residence: body.country_of_residence,
          phone:                body.phone_number || "",
          date_of_birth:        body.date_of_birth || null,
          linkedin:             body.linkedin_url  || "",
        },
        venture: {
          company_name:  body.venture_name,
          stage:         body.venture_stage,
          sector:        body.venture_sector,
          one_liner:     (body.venture_description || "").slice(0, 160),
          website:       body.website_url || "",
          headquarters:  body.country_of_residence,
          founded_year:  body.founded_year ? parseInt(body.founded_year) : null,
        },
      });

      console.log(`[register] Created ${ref} id=${appRecord.id}`);

      // Upload documents
      // Document field mapping:
      // formField        → builder field (nested in compliance{})  → agent flat field
      const docFormFields: Array<[string, string]> = [
        ["doc_passport",   "doc_passport_url"],
        ["doc_address",    "doc_proof_address_url"],
        ["doc_bizreg",     "doc_business_registration_url"],
        ["doc_bizplan",    "doc_business_plan_url"],
        ["doc_financials", "doc_financial_projections_url"],
        ["doc_pitch",      "doc_pitch_deck_url"],
      ];

      const agentDocUpdates: Record<string, string> = {};
      let docsUploaded = 0;

      for (const [formField, agentField] of docFormFields) {
        const file = files[formField];
        if (file) {
          const uploadedUrl = await uploadDocument(file, serviceToken, AGENT_APP);
          if (uploadedUrl) {
            agentDocUpdates[agentField] = uploadedUrl;
            docsUploaded++;
          }
        }
      }

      // Mirror to agent app — direct REST write (bypasses builder isolate)
      try {
        const agentPayload = {
          reference_code:                ref,
          status:                        "submitted",
          payment_status:                "pending",
          applicant_name:                body.applicant_name,
          applicant_email:               email,
          applicant_role:                body.applicant_role || "Founder",
          date_of_birth:                 body.date_of_birth  || null,
          phone_number:                  body.phone_number   || "",
          nationality:                   body.nationality,
          country_of_residence:          body.country_of_residence,
          linkedin_url:                  body.linkedin_url   || "",
          website_url:                   body.website_url    || "",
          venture_name:                  body.venture_name,
          venture_stage:                 body.venture_stage,
          venture_sector:                body.venture_sector,
          venture_description:           body.venture_description,
          co_founder_name:               body.co_founder_name  || "",
          co_founder_email:              body.co_founder_email || "",
          declaration_agreed:            body.declaration_agreed === "true",
          documents_submitted:           docsUploaded > 0,
          ai_score:                      aiScore   || null,
          ai_summary:                    aiSummary || null,
          submitted_at:                  now,
          invitation_token:              body._token || null,
          stripe_session_id:             null,
          ...agentDocUpdates,
        };
        const agentR = await fetch(`https://app.base44.com/api/apps/${AGENT_APP}/entities/Application`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${serviceToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(agentPayload),
        });
        if (agentR.ok) {
          const agentRec = await agentR.json();
          console.log(`[register] Agent record created: ${ref} (${agentRec.id})`);
        } else {
          console.warn(`[register] Agent write failed: ${agentR.status} ${await agentR.text()}`);
        }
      } catch (e: any) { console.warn("[register] Agent mirror error:", e.message); }

      // Stripe checkout
      let checkoutUrl  = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
      let stripeSession = "";
      if (stripeKey) {
        const checkout = await createStripeCheckout({ email, name: body.applicant_name, venture: body.venture_name, ref, appId: appRecord.id, stripeKey });
        if (checkout) {
          checkoutUrl   = checkout.url;
          stripeSession = checkout.sessionId;
          // Builder uses payment_reference; agent app uses stripe_session_id
          await dbUpdate(BUILDER_APP, "Application", appRecord.id, serviceToken, { payment_reference: stripeSession });
          // Sync stripe_session_id to agent app via direct REST
          try {
            const agListR = await fetch(`https://app.base44.com/api/apps/${AGENT_APP}/entities/Application`, {
              headers: { "Authorization": `Bearer ${serviceToken}` },
            });
            if (agListR.ok) {
              const agList   = await agListR.json();
              const agentRec = agList.find((a: any) => a.reference_code === ref);
              if (agentRec) {
                await fetch(`https://app.base44.com/api/apps/${AGENT_APP}/entities/Application/${agentRec.id}`, {
                  method: "PUT",
                  headers: { "Authorization": `Bearer ${serviceToken}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ stripe_session_id: stripeSession }),
                });
                console.log(`[register] Agent stripe_session_id synced for ${ref}`);
              }
            }
          } catch (e: any) { console.warn("[register] Agent stripe sync:", e.message); }
        }
      }

      const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;

      // Send applicant confirmation email (official payment letter)
      if (resendKey) {
        const firstName = body.applicant_name.split(" ")[0];
        const year = new Date().getFullYear();
        try {
          await sendEmail(resendKey, email,
            `🏛️ Registration Confirmed — ${ref} | Prime Endorsement Authority`,
            `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #22c55e;padding:28px;text-align:center">
    <div style="font-size:36px">✅</div>
    <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-top:8px">Prime Endorsement Authority</div>
    <div style="color:#22c55e;font-size:13px;margin-top:6px;font-weight:600">Registration Successfully Received</div>
  </div>
  <div style="padding:28px">
    <p style="color:#e2e8f0;font-size:15px;font-weight:600;margin:0 0 10px">Dear ${firstName},</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 18px">Your application for the <strong style="color:#e2e8f0">Innovator Founder Visa Endorsement Programme</strong> has been successfully received and registered on the Prime Endorsement Authority platform.</p>
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:8px;padding:14px;text-align:center;margin-bottom:18px">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Your Application Reference</div>
      <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:4px">${ref}</div>
      <div style="color:#94a3b8;font-size:12px;margin-top:4px">${body.venture_name}</div>
    </div>
    ${docsUploaded > 0 ? `<div style="background:#0a1a0a;border:1px solid #166534;border-radius:6px;padding:12px;margin-bottom:18px;color:#4ade80;font-size:12px">✅ ${docsUploaded} supporting document(s) received and securely stored.</div>` : ""}
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 18px">To formally activate your application for expert review and endorsement processing, please complete the application fee payment of <strong style="color:#C9A84C">£1,200.00</strong> via the secure payment portal below.</p>
    <div style="text-align:center;margin:18px 0">
      <a href="${checkoutUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;display:inline-block">Complete Payment — £1,200.00 →</a>
    </div>
    <div style="text-align:center;margin-top:10px">
      <a href="${statusUrl}" style="color:#C9A84C;font-size:12px;text-decoration:none">Track your application status →</a>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:14px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority · primeendorsement.com</p>
  </div>
</div></body></html>`
          );
        } catch(e: any) { console.warn("[register] Applicant email failed:", e.message); }

        // Admin notification
        try {
          await sendEmail(resendKey, ADMIN_EMAIL,
            `🆕 New Application — ${ref}${aiScore > 0 ? ` | AI: ${aiScore}/100` : ""} | PEA`,
            `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:580px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:20px;text-align:center">
    <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#22c55e;font-size:12px;margin-top:4px">🆕 New Application — ${ref}</div>
  </div>
  <div style="padding:24px;font-size:13px">
    <div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:6px;padding:14px;margin-bottom:14px">
      <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Applicant Details</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;color:#e2e8f0">
        <div><span style="color:#64748b">Name:</span><br/>${body.applicant_name}</div>
        <div><span style="color:#64748b">Email:</span><br/>${email}</div>
        <div><span style="color:#64748b">Venture:</span><br/>${body.venture_name}</div>
        <div><span style="color:#64748b">Sector:</span><br/>${body.venture_sector}</div>
        <div><span style="color:#64748b">Stage:</span><br/>${body.venture_stage}</div>
        <div><span style="color:#64748b">Nationality:</span><br/>${body.nationality}</div>
        ${aiScore > 0 ? `<div><span style="color:#64748b">AI Score:</span><br/><span style="color:${aiScore>=70?"#22c55e":aiScore>=50?"#f59e0b":"#ef4444"};font-weight:700">${aiScore}/100</span></div>` : ""}
        <div><span style="color:#64748b">Documents:</span><br/><span style="color:${docsUploaded>0?"#22c55e":"#f59e0b"}">${docsUploaded} uploaded</span></div>
      </div>
    </div>
    <div style="text-align:center">
      <a href="https://app.base44.com/apps/${BUILDER_APP}/editor/preview" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase">Open Admin Panel →</a>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:12px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${new Date().getFullYear()} Prime Endorsement Authority</p>
  </div>
</div></body></html>`
          );
        } catch(e: any) { console.warn("[register] Admin email failed:", e.message); }
      }

      console.log(`[register] ✅ ${ref} complete — docs:${docsUploaded} stripe:${stripeSession ? "yes" : "no"} ai:${aiScore}`);

      // Return success — client JS will redirect to checkout
      return new Response(JSON.stringify({
        success:        true,
        reference_code: ref,
        checkout_url:   checkoutUrl,
        status_url:     statusUrl,
        docs_uploaded:  docsUploaded,
        ai_score:       aiScore,
      }), { status: 200, headers: JSON_HEADERS });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HEADERS });

  } catch (err: any) {
    console.error("[register] Fatal:", err.message, err.stack?.substring(0, 300));
    return new Response(JSON.stringify({ success: false, error: "An unexpected error occurred. Please try again or contact admin@primeendorsement.com" }), { status: 500, headers: JSON_HEADERS });
  }
}
