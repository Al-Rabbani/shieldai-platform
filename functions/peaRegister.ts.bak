/**
 * peaRegister — v4 FULL REBUILD 2026-05-29
 *
 * Self-contained registration system.
 * GET  → serves the beautiful registration form (HTML)
 * POST → processes submission → Stripe checkout → redirect
 *
 * FIXED: Zero SDK imports — pure REST + Fetch only
 * FIXED: Uses session_token (not invitation_token) for builder schema
 * FIXED: Uses application_type + nested founder{}/venture{} objects
 * FIXED: success_url → peaPaymentSuccess (not /payment-success SPA)
 * FIXED: Correct dedup using applicant_email
 * ENHANCED: AI scoring integrated on submission
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const AGENT_APP   = "6a14246111a4fa5e22999619";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM_EMAIL  = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";
const FEE_PENCE   = 120000; // £1,200.00

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8", "X-Frame-Options": "DENY" };
const JSON_HEADERS = { "Content-Type": "application/json" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function genRef(): string {
  const year = new Date().getFullYear();
  return `PEA-${year}-${String(Math.floor(100000 + Math.random() * 900000))}`;
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
      "line_items[0][price_data][product_data][name]": "Prime Endorsement Authority — Expert Endorsement Programme",
      "line_items[0][price_data][product_data][description]": `${params.venture} · Reference: ${params.ref}`,
      "line_items[0][price_data][unit_amount]": String(FEE_PENCE),
      "line_items[0][quantity]": "1",
      "mode": "payment",
      "customer_email": params.email,
      "metadata[reference_code]": params.ref,
      "metadata[application_id]":  params.appId,
      "payment_intent_data[description]": `PEA Endorsement Fee — ${params.ref}`,
      "payment_intent_data[statement_descriptor]": "PRIME ENDORSEMENT",
      "success_url": `${DOMAIN}/api/functions/peaPaymentSuccess?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(params.ref)}`,
      "cancel_url":  `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(params.ref)}`,
    }),
  });
  if (!r.ok) {
    console.error("[register] Stripe error:", await r.text());
    return null;
  }
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
        messages: [{
          role: "user",
          content: `You are a senior reviewer for Prime Endorsement Authority, a global digital authority certifying exceptional founder ventures. Score this application 0-100.

APPLICANT: ${b.applicant_name}
VENTURE: ${b.venture_name}
SECTOR: ${b.venture_sector || "N/A"}
STAGE: ${b.venture_stage || "N/A"}
NATIONALITY: ${b.nationality}
DESCRIPTION: ${b.venture_description}

Return JSON exactly:
{"score":0-100,"summary":"2-3 sentence executive summary","founder_credibility":0-20,"venture_innovation":0-20,"market_opportunity":0-20,"traction":0-20,"global_potential":0-20,"recommendation":"Recommend|Consider|Decline","key_strengths":["s1"],"key_concerns":["c1"]}`,
        }],
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

// ── HTML Form ─────────────────────────────────────────────────────────────────

function buildForm(opts: { locked?: boolean; lockReason?: string; prefill?: Record<string, string>; error?: string; ref?: string } = {}): string {
  const { locked, lockReason, prefill = {}, error, ref } = opts;
  const v = (k: string, def = "") => (prefill[k] || def).replace(/"/g, "&quot;");

  if (locked) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Link Invalid — Prime Endorsement Authority</title>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="max-width:440px;text-align:center;padding:40px">
  <div style="font-size:48px;margin-bottom:16px">🔒</div>
  <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">Prime Endorsement Authority</div>
  <div style="color:#e2e8f0;font-size:16px;font-weight:600;margin-bottom:12px">Link Invalid or Expired</div>
  <div style="color:#94a3b8;font-size:13px;line-height:1.7;margin-bottom:24px">${lockReason || "This link is invalid or has expired."}</div>
  <a href="mailto:admin@primeendorsement.com" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">Contact Admin →</a>
</div></body></html>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Application — Prime Endorsement Authority</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0A0E1A;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;padding:32px 16px}
    .page{max-width:680px;margin:0 auto}
    .hdr{text-align:center;margin-bottom:36px}
    .hdr-icon{font-size:48px;margin-bottom:12px}
    .hdr-brand{color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:5px;text-transform:uppercase}
    .hdr-sub{color:#475569;font-size:12px;margin-top:6px}
    .card{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:28px;margin-bottom:20px}
    .card-title{color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #1e293b}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
    .row.single{grid-template-columns:1fr}
    .field{display:flex;flex-direction:column;gap:6px}
    label{color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase}
    input,select,textarea{background:#0A0E1A;border:1px solid #1e293b;color:#e2e8f0;font-size:13px;padding:10px 14px;border-radius:6px;outline:none;transition:border .2s;width:100%}
    input:focus,select:focus,textarea:focus{border-color:#C9A84C}
    select option{background:#111827}
    textarea{resize:vertical;min-height:100px}
    .required-star{color:#ef4444}
    .error-box{background:#1a0000;border:1px solid #ef4444;border-radius:6px;padding:14px;color:#f87171;font-size:13px;margin-bottom:20px}
    .fee-box{background:#0a0e1a;border:1px solid #C9A84C;border-radius:8px;padding:18px;text-align:center;margin:24px 0}
    .fee-lbl{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px}
    .fee-amt{color:#C9A84C;font-size:26px;font-weight:700}
    .fee-sub{color:#475569;font-size:11px;margin-top:4px}
    .submit-btn{width:100%;background:#C9A84C;color:#0A0E1A;border:none;padding:16px;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;transition:opacity .2s}
    .submit-btn:hover{opacity:.9}
    .submit-btn:disabled{opacity:.6;cursor:not-allowed}
    .loading{display:none;text-align:center;padding:16px;color:#C9A84C;font-size:13px}
    .terms{color:#475569;font-size:11px;text-align:center;margin-top:12px;line-height:1.6}
    @media(max-width:600px){.row{grid-template-columns:1fr}}
  </style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div class="hdr-icon">🏛️</div>
    <div class="hdr-brand">Prime Endorsement Authority</div>
    <div class="hdr-sub">Global Digital Authority for Founder Ventures</div>
    ${ref ? `<div style="margin-top:12px;display:inline-block;background:rgba(201,168,76,.1);border:1px solid #C9A84C;color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:6px 18px;border-radius:20px">Invitation: ${ref}</div>` : ""}
  </div>

  ${error ? `<div class="error-box">⚠ ${error}</div>` : ""}

  <form id="regForm" method="POST">
    ${ref ? `<input type="hidden" name="_token" value="${v("_token")}"/>` : ""}
    ${ref ? `<input type="hidden" name="_ref" value="${ref}"/>` : ""}

    <!-- Personal Details -->
    <div class="card">
      <div class="card-title">👤 Personal Details</div>
      <div class="row">
        <div class="field">
          <label>Full Name <span class="required-star">*</span></label>
          <input type="text" name="applicant_name" value="${v("applicant_name")}" placeholder="Your full legal name" required/>
        </div>
        <div class="field">
          <label>Email Address <span class="required-star">*</span></label>
          <input type="email" name="applicant_email" value="${v("applicant_email")}" placeholder="you@example.com" required/>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Phone Number</label>
          <input type="tel" name="phone_number" value="${v("phone_number")}" placeholder="+44 7700 000000"/>
        </div>
        <div class="field">
          <label>Application Role <span class="required-star">*</span></label>
          <select name="applicant_role" required>
            <option value="">Select role…</option>
            <option value="Founder" ${v("applicant_role") === "Founder" ? "selected" : ""}>Founder</option>
            <option value="Co-Founder" ${v("applicant_role") === "Co-Founder" ? "selected" : ""}>Co-Founder</option>
            <option value="Managing Director" ${v("applicant_role") === "Managing Director" ? "selected" : ""}>Managing Director</option>
            <option value="CEO" ${v("applicant_role") === "CEO" ? "selected" : ""}>CEO</option>
          </select>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Nationality <span class="required-star">*</span></label>
          <input type="text" name="nationality" value="${v("nationality")}" placeholder="e.g. British" required/>
        </div>
        <div class="field">
          <label>Country of Residence <span class="required-star">*</span></label>
          <input type="text" name="country_of_residence" value="${v("country_of_residence")}" placeholder="e.g. United Kingdom" required/>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>LinkedIn Profile</label>
          <input type="url" name="linkedin_url" value="${v("linkedin_url")}" placeholder="https://linkedin.com/in/…"/>
        </div>
        <div class="field">
          <label>Date of Birth</label>
          <input type="date" name="date_of_birth" value="${v("date_of_birth")}"/>
        </div>
      </div>
    </div>

    <!-- Venture Details -->
    <div class="card">
      <div class="card-title">🚀 Venture Details</div>
      <div class="row">
        <div class="field">
          <label>Company / Venture Name <span class="required-star">*</span></label>
          <input type="text" name="venture_name" value="${v("venture_name")}" placeholder="Your company name" required/>
        </div>
        <div class="field">
          <label>Website</label>
          <input type="url" name="website_url" value="${v("website_url")}" placeholder="https://yourcompany.com"/>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Sector <span class="required-star">*</span></label>
          <select name="venture_sector" required>
            <option value="">Select sector…</option>
            ${["FinTech","HealthTech","EdTech","CleanTech","AgriTech","PropTech","LegalTech","AI & Machine Learning","Blockchain & Web3","E-Commerce","SaaS","DeepTech","Social Impact","Media & Entertainment","Manufacturing","Consumer Goods","Investment & Finance","Other"].map(s => `<option value="${s}" ${v("venture_sector") === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Development Stage <span class="required-star">*</span></label>
          <select name="venture_stage" required>
            <option value="">Select stage…</option>
            ${["Idea / Pre-Product","Pre-Seed","Seed","Series A","Series B","Series C+","Growth","Mature / Established"].map(s => `<option value="${s}" ${v("venture_stage") === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="row single">
        <div class="field">
          <label>Venture Description <span class="required-star">*</span></label>
          <textarea name="venture_description" placeholder="Describe your venture — what problem you solve, your solution, traction, and global potential (min 100 characters)" required>${v("venture_description")}</textarea>
        </div>
      </div>
    </div>

    <!-- Co-Founder (optional) -->
    <div class="card">
      <div class="card-title">👥 Co-Founder Details <span style="color:#475569;font-size:10px;font-weight:400;text-transform:none;letter-spacing:0">(Optional)</span></div>
      <div class="row">
        <div class="field">
          <label>Co-Founder Name</label>
          <input type="text" name="co_founder_name" value="${v("co_founder_name")}" placeholder="Full name"/>
        </div>
        <div class="field">
          <label>Co-Founder Email</label>
          <input type="email" name="co_founder_email" value="${v("co_founder_email")}" placeholder="cofounder@example.com"/>
        </div>
      </div>
    </div>

    <!-- Fee & Submit -->
    <div class="fee-box">
      <div class="fee-lbl">Endorsement Programme Fee</div>
      <div class="fee-amt">£1,200.00 GBP</div>
      <div class="fee-sub">£1,000.00 + £200.00 VAT · Secure card payment via Stripe</div>
    </div>

    <button type="submit" class="submit-btn" id="submitBtn">Submit Application & Proceed to Payment →</button>
    <div class="loading" id="loadingMsg">⏳ Submitting your application and preparing payment…</div>
    <p class="terms">By submitting, you agree to the Prime Endorsement Authority terms and conditions. Your data is handled securely in accordance with our privacy policy.</p>
  </form>
</div>

<script>
document.getElementById('regForm').addEventListener('submit', function(e) {
  const btn = document.getElementById('submitBtn');
  const loading = document.getElementById('loadingMsg');
  btn.disabled = true;
  btn.style.display = 'none';
  loading.style.display = 'block';
});

// Validate description length
document.querySelector('[name=venture_description]').addEventListener('input', function() {
  if (this.value.length > 0 && this.value.length < 100) {
    this.style.borderColor = '#f59e0b';
  } else {
    this.style.borderColor = '#1e293b';
  }
});
</script>
</body></html>`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  try {
    const url          = new URL(req.url);
    const token        = url.searchParams.get("token") || "";
    const refParam     = url.searchParams.get("ref")   || "";
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const stripeKey    = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const resendKey    = Deno.env.get("RESEND_API_KEY") || "";
    const openaiKey    = Deno.env.get("OPENAI_API_KEY") || "";

    // ── GET: Serve registration form ─────────────────────────────────────────
    if (req.method === "GET") {
      // Token-protected invite?
      if (token) {
        const allApps = await dbList(BUILDER_APP, "Application", serviceToken);
        const app = allApps.find((a: any) => a.session_token === token);

        if (!app) {
          return new Response(buildForm({ locked: true, lockReason: "This invitation link is invalid or has expired. Please contact admin@primeendorsement.com to request a new link." }), { headers: HTML_HEADERS });
        }

        // Pre-fill from existing record
        return new Response(buildForm({
          ref: app.reference_code || refParam,
          prefill: {
            applicant_email:  app.applicant_email || "",
            applicant_name:   app.applicant_name  || app.founder?.full_name || "",
            applicant_role:   app.application_type?.charAt(0).toUpperCase() + (app.application_type || "founder").slice(1) || "Founder",
            _token:           token,
          },
        }), { headers: HTML_HEADERS });
      }

      // Open registration form
      return new Response(buildForm({ ref: refParam }), { headers: HTML_HEADERS });
    }

    // ── OPTIONS ──────────────────────────────────────────────────────────────
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    }

    // ── POST: Process submission ──────────────────────────────────────────────
    if (req.method === "POST") {
      let body: Record<string, any> = {};
      const ct = req.headers.get("content-type") || "";

      if (ct.includes("application/json")) {
        body = await req.json().catch(() => ({}));
      } else {
        // Form submission
        const text = await req.text();
        for (const pair of text.split("&")) {
          const [k, v] = pair.split("=").map(decodeURIComponent);
          if (k) body[k.replace(/\+/g, " ")] = (v || "").replace(/\+/g, " ");
        }
      }

      // Validate required fields
      const required = ["applicant_name", "applicant_email", "nationality", "country_of_residence", "applicant_role", "venture_name", "venture_description", "venture_stage", "venture_sector"];
      const missing  = required.filter(f => !body[f]?.toString().trim());
      if (missing.length > 0) {
        const errorMsg = `Please fill in all required fields: ${missing.map(f => f.replace(/_/g, " ")).join(", ")}`;
        if (ct.includes("application/json")) {
          return new Response(JSON.stringify({ success: false, error: errorMsg }), { status: 400, headers: JSON_HEADERS });
        }
        return new Response(buildForm({ error: errorMsg, prefill: body }), { headers: HTML_HEADERS });
      }

      const email = body.applicant_email.trim().toLowerCase();

      // Deduplication
      const allApps = await dbList(BUILDER_APP, "Application", serviceToken);
      const existing = allApps.find((a: any) =>
        a.applicant_email?.toLowerCase() === email &&
        !["withdrawn", "closed", "rejected"].includes(a.status || "")
      );

      if (existing) {
        if (existing.payment_status === "paid") {
          const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(existing.reference_code)}`;
          if (ct.includes("application/json")) {
            return new Response(JSON.stringify({ success: true, existing: true, reference_code: existing.reference_code, redirect: statusUrl }), { headers: JSON_HEADERS });
          }
          return Response.redirect(statusUrl, 303);
        }

        // Regenerate Stripe checkout for existing unpaid record
        if (stripeKey) {
          const venture = existing.venture?.company_name || body.venture_name || "Your Venture";
          const checkout = await createStripeCheckout({
            email, name: existing.applicant_name, venture,
            ref: existing.reference_code, appId: existing.id, stripeKey,
          });
          if (checkout) {
            await dbUpdate(BUILDER_APP, "Application", existing.id, serviceToken, { payment_reference: checkout.sessionId });
            if (ct.includes("application/json")) {
              return new Response(JSON.stringify({ success: true, existing: true, reference_code: existing.reference_code, checkout_url: checkout.url }), { headers: JSON_HEADERS });
            }
            return Response.redirect(checkout.url, 303);
          }
        }
        const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(existing.reference_code)}`;
        return Response.redirect(statusUrl, 303);
      }

      // Generate unique reference code
      let ref = genRef();
      for (let i = 0; i < 5; i++) {
        if (!allApps.find((a: any) => a.reference_code === ref)) break;
        ref = genRef();
      }

      // AI scoring
      let aiScore = 0, aiSummary = "", aiAnalysis: object = {};
      if (openaiKey) {
        ({ score: aiScore, summary: aiSummary, analysis: aiAnalysis } = await scoreWithAI(body, openaiKey));
        console.log(`[register] AI score for ${ref}: ${aiScore}`);
      }

      const now = new Date().toISOString();

      // Create Application in builder DB
      const appRecord = await dbCreate(BUILDER_APP, "Application", serviceToken, {
        reference_code:   ref,
        status:           "submitted",
        payment_status:   "pending",
        application_type: (body.applicant_role || "founder").toLowerCase().replace(/\s+/g, "_"),
        application_fee:  1200.00,
        currency:         "GBP",
        applicant_name:   body.applicant_name.trim(),
        applicant_email:  email,
        submitted_at:     now,
        current_step:     1,
        founder_application_complete: true,
        auth_status:      "not_started",
        kyc_status:       "not_started",
        ai_score:         aiScore || null,
        ai_analysis:      Object.keys(aiAnalysis).length ? aiAnalysis : null,
        session_token:    body._token || null,
        founder: {
          full_name:            body.applicant_name.trim(),
          role:                 body.applicant_role || "Founder",
          nationality:          body.nationality.trim(),
          country_of_residence: body.country_of_residence.trim(),
          phone:                (body.phone_number || "").trim(),
          date_of_birth:        body.date_of_birth || null,
          linkedin:             (body.linkedin_url || "").trim(),
        },
        venture: {
          company_name:  body.venture_name.trim(),
          stage:         body.venture_stage || "Pre-Seed",
          sector:        body.venture_sector || "Other",
          one_liner:     body.venture_description.slice(0, 160).trim(),
          website:       (body.website_url || "").trim(),
          headquarters:  body.country_of_residence.trim(),
          team_size:     null,
          founded_year:  null,
        },
      });

      console.log(`[register] Created ${ref} (id: ${appRecord.id})`);

      // Mirror to agent app
      try {
        await dbCreate(AGENT_APP, "Application", serviceToken, {
          reference_code:   ref,
          status:           "submitted",
          payment_status:   "pending",
          applicant_name:   body.applicant_name.trim(),
          applicant_email:  email,
          applicant_role:   body.applicant_role || "Founder",
          venture_name:     body.venture_name.trim(),
          venture_stage:    body.venture_stage || "",
          venture_sector:   body.venture_sector || "",
          venture_description: body.venture_description.trim(),
          nationality:      body.nationality.trim(),
          country_of_residence: body.country_of_residence.trim(),
          phone_number:     (body.phone_number || "").trim(),
          linkedin_url:     (body.linkedin_url || "").trim(),
          website_url:      (body.website_url  || "").trim(),
          ai_score:         aiScore || null,
          ai_summary:       aiSummary || null,
          submitted_at:     now,
        });
      } catch (e: any) { console.warn("[register] Agent mirror failed:", e.message); }

      // Stripe checkout
      let checkoutUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
      let stripeSessionId = "";

      if (stripeKey) {
        const checkout = await createStripeCheckout({
          email, name: body.applicant_name.trim(),
          venture: body.venture_name.trim(),
          ref, appId: appRecord.id, stripeKey,
        });
        if (checkout) {
          checkoutUrl    = checkout.url;
          stripeSessionId = checkout.sessionId;
          await dbUpdate(BUILDER_APP, "Application", appRecord.id, serviceToken, { payment_reference: stripeSessionId });
          console.log(`[register] Stripe session: ${stripeSessionId}`);
        }
      }

      // Emails
      if (resendKey) {
        const firstName = body.applicant_name.trim().split(" ")[0];
        const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
        const year      = new Date().getFullYear();

        try {
          await sendEmail(resendKey, email,
            `🏛️ Application Received — ${ref} | Prime Endorsement Authority`,
            `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:28px;text-align:center">
    <div style="font-size:36px">🏛️</div>
    <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-top:8px">Prime Endorsement Authority</div>
  </div>
  <div style="padding:28px">
    <p style="color:#C9A84C;font-size:15px;font-weight:600;margin:0 0 10px">Application Received, ${firstName} 🎉</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 18px">Your application for <strong style="color:#e2e8f0">${body.venture_name}</strong> has been received. Complete payment below to begin your 90-day expert review.</p>
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:8px;padding:14px;text-align:center;margin-bottom:18px">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Reference Code</div>
      <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:4px">${ref}</div>
    </div>
    ${checkoutUrl !== statusUrl ? `<div style="text-align:center;margin:18px 0"><a href="${checkoutUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">Complete Payment — £1,200.00 →</a></div>` : ""}
    <div style="text-align:center;margin-top:12px"><a href="${statusUrl}" style="color:#C9A84C;font-size:12px;text-decoration:none">Track Application Status →</a></div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:14px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority · primeendorsement.com</p>
  </div>
</div></body></html>`
          );
        } catch (_) {}

        // Admin notification
        try {
          const scoreColor = aiScore >= 70 ? "#22c55e" : aiScore >= 50 ? "#f59e0b" : "#ef4444";
          await sendEmail(resendKey, ADMIN_EMAIL,
            `🆕 New Application — ${ref}${aiScore > 0 ? ` | AI: ${aiScore}/100` : ""} | PEA`,
            `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:580px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:20px;text-align:center">
    <div style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#22c55e;font-size:12px;margin-top:4px">🆕 New Application Received</div>
  </div>
  <div style="padding:24px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div><div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase">Reference</div><div style="color:#C9A84C;font-size:18px;font-weight:700">${ref}</div></div>
      ${aiScore > 0 ? `<div style="text-align:center;background:#0A0E1A;border:1px solid ${scoreColor};border-radius:6px;padding:8px 14px"><div style="color:#64748b;font-size:9px;letter-spacing:2px;text-transform:uppercase">AI Score</div><div style="color:${scoreColor};font-size:22px;font-weight:700">${aiScore}/100</div></div>` : ""}
    </div>
    <div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:6px;padding:14px;margin-bottom:14px;font-size:12px">
      <div style="margin-bottom:6px"><span style="color:#64748b">Applicant:</span> <span style="color:#e2e8f0;font-weight:600">${body.applicant_name}</span></div>
      <div style="margin-bottom:6px"><span style="color:#64748b">Email:</span> <span style="color:#e2e8f0">${email}</span></div>
      <div style="margin-bottom:6px"><span style="color:#64748b">Venture:</span> <span style="color:#e2e8f0">${body.venture_name} (${body.venture_sector} · ${body.venture_stage})</span></div>
      <div><span style="color:#64748b">Nationality:</span> <span style="color:#e2e8f0">${body.nationality}</span></div>
    </div>
    ${aiSummary ? `<div style="background:#0a1a0a;border:1px solid #166534;border-radius:6px;padding:12px;margin-bottom:14px"><div style="color:#22c55e;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">AI Summary</div><div style="color:#94a3b8;font-size:12px;line-height:1.7">${aiSummary}</div></div>` : ""}
    <div style="text-align:center"><a href="https://app.base44.com/apps/${BUILDER_APP}/editor/preview" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:10px 22px;border-radius:6px;font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase">Open Admin Panel →</a></div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:12px;text-align:center"><p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority</p></div>
</div></body></html>`
          );
        } catch (_) {}
      }

      // Respond
      if (ct.includes("application/json")) {
        return new Response(JSON.stringify({
          success:        true,
          reference_code: ref,
          checkout_url:   checkoutUrl,
          stripe_session: stripeSessionId || null,
          ai_score:       aiScore,
        }), { headers: JSON_HEADERS });
      }

      // Form submission — redirect to Stripe checkout
      return Response.redirect(checkoutUrl, 303);
    }

    return new Response("Method not allowed", { status: 405, headers: JSON_HEADERS });

  } catch (err: any) {
    console.error("[register] Fatal:", err.message, err.stack);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}
