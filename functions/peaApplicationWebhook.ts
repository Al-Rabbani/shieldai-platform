/**
 * peaApplicationWebhook — v6 REBUILT 2026-05-29
 *
 * Handles ALL new application submissions from the public registration form.
 * Full lifecycle:
 *   POST → validate → dedup → AI score → create builder record → Stripe checkout → emails
 *
 * SCHEMA: uses correct builder field names (founder{}, venture{}, application_type, session_token, payment_reference)
 * SECURITY: zero hardcoded keys — all via Deno.env
 * AI: scores applicant on submission using OpenAI
 */

const BUILDER_APP  = "69e2e852c48630e3502f13b1";
const AGENT_APP    = "6a14246111a4fa5e22999619";
const DOMAIN       = "https://primeendorsement.com";
const RESEND_API   = "https://api.resend.com/emails";
const FROM_EMAIL   = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL  = "admin@primeendorsement.com";
const FEE_AMOUNT   = 120000; // £1,200.00 in pence
const FEE_DISPLAY  = "£1,200.00";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function refCode(): string {
  const year = new Date().getFullYear();
  const num  = String(Math.floor(100000 + Math.random() * 900000));
  return `PEA-${year}-${num}`;
}

async function dbGet(appId: string, entity: string, token: string): Promise<any[]> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`DB GET ${entity} failed: ${r.status}`);
  return r.json();
}

async function dbCreate(appId: string, entity: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`DB CREATE ${entity} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function dbUpdate(appId: string, entity: string, id: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`DB UPDATE ${entity} failed: ${r.status}`);
  return r.json();
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const r = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!r.ok) console.error("[webhook] Email error:", r.status, await r.text());
}

// ── AI Scoring ────────────────────────────────────────────────────────────────

async function scoreApplication(b: Record<string, any>, openaiKey: string): Promise<{ score: number; summary: string; analysis: object }> {
  const prompt = `You are a senior expert reviewer for Prime Endorsement Authority, a global digital authority certifying exceptional founder ventures.

Score this application from 0-100 and provide a concise analysis.

APPLICANT: ${b.applicant_name}
ROLE: ${b.applicant_role || "Founder"}
NATIONALITY: ${b.nationality}
COUNTRY: ${b.country_of_residence}
VENTURE: ${b.venture_name}
STAGE: ${b.venture_stage}
SECTOR: ${b.venture_sector}
DESCRIPTION: ${b.venture_description}

Evaluate across these dimensions:
1. Founder credibility and background (0-20)
2. Venture innovation and differentiation (0-20)  
3. Market opportunity and timing (0-20)
4. Stage-appropriate traction (0-20)
5. Global potential and scalability (0-20)

Respond in this exact JSON format:
{
  "score": <0-100>,
  "summary": "<2-3 sentence executive summary for admin review>",
  "founder_credibility": <0-20>,
  "venture_innovation": <0-20>,
  "market_opportunity": <0-20>,
  "traction": <0-20>,
  "global_potential": <0-20>,
  "recommendation": "<Recommend / Consider / Decline>",
  "key_strengths": ["<strength1>", "<strength2>"],
  "key_concerns": ["<concern1>"]
}`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return {
      score:    Math.min(100, Math.max(0, parsed.score || 0)),
      summary:  parsed.summary || "AI analysis completed.",
      analysis: parsed,
    };
  } catch (e: any) {
    console.error("[webhook] AI scoring failed:", e.message);
    return { score: 0, summary: "AI analysis pending.", analysis: {} };
  }
}

// ── Email Templates ───────────────────────────────────────────────────────────

function applicantConfirmationEmail(firstName: string, ref: string, ventureName: string): string {
  const year = new Date().getFullYear();
  const statusUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0d1220 0%,#111827 100%);border-bottom:3px solid #C9A84C;padding:32px;text-align:center">
    <div style="font-size:40px;margin-bottom:8px">🏛️</div>
    <div style="color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#94a3b8;font-size:12px;margin-top:6px;letter-spacing:1px">Global Digital Authority for Founder Ventures</div>
  </div>
  <div style="padding:32px">
    <p style="color:#C9A84C;font-size:16px;font-weight:600;margin:0 0 10px">Application Received, ${firstName} 🎉</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 24px">Your application for <strong style="color:#e2e8f0">${ventureName}</strong> has been received and is now queued for our expert review panel. Complete your payment to begin your 90-day assessment.</p>
    <div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:8px;padding:18px;text-align:center;margin-bottom:20px">
      <div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Your Reference Code</div>
      <div style="color:#C9A84C;font-size:26px;font-weight:700;letter-spacing:4px">${ref}</div>
    </div>
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:20px">
      <div style="color:#94a3b8;font-size:12px;margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Next Steps</div>
      <div style="color:#94a3b8;font-size:13px;line-height:2">
        <div>✅ <strong style="color:#e2e8f0">Step 1:</strong> Application submitted</div>
        <div>💳 <strong style="color:#e2e8f0">Step 2:</strong> Complete payment (${FEE_DISPLAY})</div>
        <div>🔍 <strong style="color:#e2e8f0">Step 3:</strong> 90-day expert review begins</div>
        <div>🏛️ <strong style="color:#e2e8f0">Step 4:</strong> Official endorsement decision</div>
      </div>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${statusUrl}" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">Track Your Application →</a>
    </div>
    <p style="text-align:center;color:#475569;font-size:12px">Questions? <a href="mailto:${ADMIN_EMAIL}" style="color:#C9A84C">${ADMIN_EMAIL}</a></p>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:16px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority · All rights reserved · <a href="${DOMAIN}" style="color:#C9A84C">primeendorsement.com</a></p>
  </div>
</div></body></html>`;
}

function adminNotificationEmail(b: Record<string, any>, ref: string, aiScore: number, aiSummary: string, checkoutUrl: string): string {
  const year = new Date().getFullYear();
  const scoreColor = aiScore >= 70 ? "#22c55e" : aiScore >= 50 ? "#f59e0b" : "#ef4444";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
  <div style="background:#0d1220;border-bottom:3px solid #C9A84C;padding:24px;text-align:center">
    <div style="color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:4px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#22c55e;font-size:12px;margin-top:6px">🆕 New Application Received</div>
  </div>
  <div style="padding:28px">
    <div style="display:flex;justify-content:space-between;margin-bottom:20px">
      <div>
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase">Reference</div>
        <div style="color:#C9A84C;font-size:18px;font-weight:700;letter-spacing:2px">${ref}</div>
      </div>
      <div style="text-align:right">
        <div style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase">AI Score</div>
        <div style="color:${scoreColor};font-size:24px;font-weight:700">${aiScore}/100</div>
      </div>
    </div>
    <div style="background:#0A0E1A;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
        <div><span style="color:#64748b">Applicant:</span> <span style="color:#e2e8f0">${b.applicant_name}</span></div>
        <div><span style="color:#64748b">Email:</span> <span style="color:#e2e8f0">${b.applicant_email}</span></div>
        <div><span style="color:#64748b">Venture:</span> <span style="color:#e2e8f0">${b.venture_name}</span></div>
        <div><span style="color:#64748b">Sector:</span> <span style="color:#e2e8f0">${b.venture_sector || "N/A"}</span></div>
        <div><span style="color:#64748b">Stage:</span> <span style="color:#e2e8f0">${b.venture_stage || "N/A"}</span></div>
        <div><span style="color:#64748b">Nationality:</span> <span style="color:#e2e8f0">${b.nationality}</span></div>
      </div>
    </div>
    ${aiSummary ? `<div style="background:#0a1a0a;border:1px solid #166534;border-radius:8px;padding:14px;margin-bottom:16px">
      <div style="color:#22c55e;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">AI Analysis Summary</div>
      <div style="color:#94a3b8;font-size:13px;line-height:1.7">${aiSummary}</div>
    </div>` : ""}
    <div style="text-align:center;margin-top:20px">
      <a href="${checkoutUrl}" style="background:#22c55e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-right:10px">View Checkout →</a>
      <a href="https://app.base44.com/apps/${BUILDER_APP}/editor/preview" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">Admin Panel →</a>
    </div>
  </div>
  <div style="background:#0d1220;border-top:1px solid #1e293b;padding:14px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">© ${year} Prime Endorsement Authority</p>
  </div>
</div></body></html>`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: CORS });
    }

    const body = await req.json().catch(() => ({}));
    const b    = body as Record<string, any>;

    // ── Validate required fields ──────────────────────────────────────────
    const required = ["applicant_name", "applicant_email", "venture_name", "venture_description", "nationality", "country_of_residence"];
    const missing  = required.filter(f => !b[f]?.toString().trim());
    if (missing.length > 0) {
      return new Response(JSON.stringify({ success: false, error: `Missing required fields: ${missing.join(", ")}` }), { status: 400, headers: CORS });
    }

    const email = b.applicant_email.trim().toLowerCase();
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const resendKey    = Deno.env.get("RESEND_API_KEY") || "";
    const stripeKey    = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const openaiKey    = Deno.env.get("OPENAI_API_KEY") || "";

    // ── Deduplication ─────────────────────────────────────────────────────
    const allApps = await dbGet(BUILDER_APP, "Application", serviceToken);
    const existing = allApps.find((a: any) =>
      a.applicant_email?.toLowerCase() === email &&
      !["withdrawn", "closed", "rejected"].includes(a.status || "")
    );

    if (existing) {
      // Return existing checkout if they already have one
      if (existing.payment_status === "paid") {
        return new Response(JSON.stringify({
          success: false,
          error:   "duplicate",
          message: "An active application already exists for this email address.",
          reference_code: existing.reference_code,
        }), { status: 409, headers: CORS });
      }
      // Regenerate checkout for unpaid existing
      if (stripeKey && existing.reference_code) {
        try {
          const sc = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              "payment_method_types[0]": "card",
              "line_items[0][price_data][currency]": "gbp",
              "line_items[0][price_data][product_data][name]": "Prime Endorsement Authority — Endorsement Fee",
              "line_items[0][price_data][product_data][description]": `${b.venture_name} · Ref: ${existing.reference_code}`,
              "line_items[0][price_data][unit_amount]": String(FEE_AMOUNT),
              "line_items[0][quantity]": "1",
              "mode": "payment",
              "success_url": `${DOMAIN}/api/functions/peaPaymentSuccess?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(existing.reference_code)}`,
              "cancel_url":  `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(existing.reference_code)}`,
              "customer_email": email,
              "metadata[reference_code]":  existing.reference_code,
              "metadata[application_id]":  existing.id,
            }),
          });
          if (sc.ok) {
            const sess = await sc.json();
            await dbUpdate(BUILDER_APP, "Application", existing.id, serviceToken, { payment_reference: sess.id });
            return new Response(JSON.stringify({ success: true, reference_code: existing.reference_code, checkout_url: sess.url, existing: true }), { headers: CORS });
          }
        } catch (_) {}
      }
      return new Response(JSON.stringify({ success: true, reference_code: existing.reference_code, existing: true }), { headers: CORS });
    }

    // ── Generate reference code ───────────────────────────────────────────
    let ref = refCode();
    // Ensure unique
    for (let i = 0; i < 5; i++) {
      const clash = allApps.find((a: any) => a.reference_code === ref);
      if (!clash) break;
      ref = refCode();
    }

    // ── AI Scoring ────────────────────────────────────────────────────────
    let aiScore   = 0;
    let aiSummary = "";
    let aiAnalysis: object = {};
    if (openaiKey) {
      ({ score: aiScore, summary: aiSummary, analysis: aiAnalysis } = await scoreApplication(b, openaiKey));
      console.log(`[webhook] AI score for ${ref}: ${aiScore}`);
    } else {
      console.warn("[webhook] OPENAI_API_KEY not set — skipping AI scoring");
    }

    // ── Create Application record in builder DB ───────────────────────────
    const now = new Date().toISOString();
    const appRecord = await dbCreate(BUILDER_APP, "Application", serviceToken, {
      reference_code:   ref,
      status:           "submitted",
      payment_status:   "pending",
      application_type: (b.applicant_role || "founder").toLowerCase(),
      application_fee:  1200.00,
      currency:         "GBP",
      applicant_name:   String(b.applicant_name || "").trim(),
      applicant_email:  email,
      submitted_at:     now,
      current_step:     1,
      founder_application_complete: true,
      auth_status:      "not_started",
      kyc_status:       "not_started",
      ai_score:         aiScore || null,
      ai_analysis:      Object.keys(aiAnalysis).length ? aiAnalysis : null,
      founder: {
        full_name:          String(b.applicant_name || "").trim(),
        role:               b.applicant_role || "Founder",
        nationality:        b.nationality || "",
        country_of_residence: b.country_of_residence || "",
        phone:              String(b.phone_number || b.phone || "").trim(),
        date_of_birth:      b.date_of_birth || null,
        linkedin:           b.linkedin_url || b.linkedin || "",
      },
      venture: {
        company_name:  String(b.venture_name || "").trim(),
        stage:         b.venture_stage || "Pre-Seed",
        sector:        b.venture_sector || "Other",
        description:   String(b.venture_description || "").trim(),
        one_liner:     String(b.venture_description || "").slice(0, 300).trim() || null,
        website:       b.website_url || b.website || "",
        headquarters:  b.country_of_residence || "",
        team_size:     b.team_size || null,
      },
    });

    console.log(`[webhook] Created application ${ref} (id: ${appRecord.id})`);

    // Mirror to agent app
    try {
      await dbCreate(AGENT_APP, "Application", serviceToken, {
        reference_code:   ref,
        status:           "submitted",
        payment_status:   "pending",
        applicant_name:   String(b.applicant_name || "").trim(),
        applicant_email:  email,
        applicant_role:   b.applicant_role || "Founder",
        venture_name:     String(b.venture_name || "").trim(),
        venture_stage:    b.venture_stage || "",
        venture_sector:   b.venture_sector || "",
        venture_description: String(b.venture_description || "").trim(),
        nationality:      b.nationality || "",
        country_of_residence: b.country_of_residence || "",
        phone_number:     String(b.phone_number || "").trim(),
        linkedin_url:     b.linkedin_url || "",
        website_url:      b.website_url || "",
        ai_score:         aiScore || null,
        ai_summary:       aiSummary || null,
        submitted_at:     now,
      });
    } catch (e: any) {
      console.warn("[webhook] Agent app mirror failed:", e.message);
    }

    // ── Stripe Checkout ───────────────────────────────────────────────────
    let checkoutUrl = `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`;
    let stripeSessionId = "";

    if (stripeKey) {
      try {
        const sc = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            "payment_method_types[0]": "card",
            "line_items[0][price_data][currency]": "gbp",
            "line_items[0][price_data][product_data][name]": "Prime Endorsement Authority — Endorsement Fee",
            "line_items[0][price_data][product_data][description]": `${b.venture_name} · Ref: ${ref}`,
            "line_items[0][quantity]": "1",
            "line_items[0][price_data][unit_amount]": String(FEE_AMOUNT),
            "mode": "payment",
            "success_url": `${DOMAIN}/api/functions/peaPaymentSuccess?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(ref)}`,
            "cancel_url":  `${DOMAIN}/api/functions/peaStatusPage?ref=${encodeURIComponent(ref)}`,
            "customer_email": email,
            "metadata[reference_code]":  ref,
            "metadata[application_id]":  appRecord.id,
            "payment_intent_data[description]": `PEA Endorsement Fee — ${ref}`,
            "payment_intent_data[statement_descriptor]": "PRIME ENDORSEMENT",
          }),
        });
        if (sc.ok) {
          const sess    = await sc.json();
          checkoutUrl   = sess.url;
          stripeSessionId = sess.id;
          await dbUpdate(BUILDER_APP, "Application", appRecord.id, serviceToken, { payment_reference: sess.id });
          console.log(`[webhook] Stripe session created: ${sess.id}`);
        } else {
          console.error("[webhook] Stripe error:", await sc.text());
        }
      } catch (e: any) {
        console.error("[webhook] Stripe checkout failed:", e.message);
      }
    }

    // ── Send emails ───────────────────────────────────────────────────────
    if (resendKey) {
      const firstName = String(b.applicant_name || "Applicant").trim().split(" ")[0];
      try {
        await sendEmail(resendKey, email,
          `🏛️ Application Received — ${ref} | Prime Endorsement Authority`,
          applicantConfirmationEmail(firstName, ref, String(b.venture_name || "").trim())
        );
      } catch (e: any) {
        console.warn("[webhook] Applicant email failed:", e.message);
      }
      try {
        await sendEmail(resendKey, ADMIN_EMAIL,
          `🆕 New Application — ${ref} | AI Score: ${aiScore}/100`,
          adminNotificationEmail(b, ref, aiScore, aiSummary, checkoutUrl)
        );
      } catch (e: any) {
        console.warn("[webhook] Admin email failed:", e.message);
      }
    }

    return new Response(JSON.stringify({
      success:        true,
      reference_code: ref,
      checkout_url:   checkoutUrl,
      stripe_session: stripeSessionId || null,
      ai_score:       aiScore,
      ai_summary:     aiSummary,
    }), { headers: CORS });

  } catch (err: any) {
    console.error("[webhook] Fatal:", err.message, err.stack);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
