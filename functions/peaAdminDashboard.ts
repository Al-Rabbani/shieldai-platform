/**
 * peaAdminDashboard — JSON API only
 * HTML admin UI is served by the Builder SPA at /admin
 * This function handles: GET ?_route=applications, POST ?_route=action
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_API  = "https://api.resend.com/emails";
const FROM        = "Prime Endorsement Authority <admin@primeendorsement.com>";

const _tok    = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
const _resend = Deno.env.get("RESEND_API_KEY")       || "";
const _admin  = Deno.env.get("ADMIN_DASHBOARD_KEY")  || "PEA-ADMIN-2026";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Token,x-admin-key",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

async function db(): Promise<any[]> {
  const r = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application`, {
    headers: { Authorization: `Bearer ${_tok}` },
  });
  if (!r.ok) throw new Error(`DB error ${r.status}`);
  const d = await r.json();
  return Array.isArray(d) ? d : d.records || [];
}

async function dbUpdate(id: string, fields: Record<string,any>): Promise<void> {
  await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${_tok}`, "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
}

async function email(to: string, subject: string, html: string): Promise<void> {
  await fetch(RESEND_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${_resend}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
}

function norm(a: any) {
  const v = a.venture || {};
  const f = a.founder || {};
  return {
    id:           a.id,
    ref:          a.reference_code || "",
    name:         a.applicant_name || f.full_name || f.name || "",
    email:        a.applicant_email || f.email || "",
    phone:        a.phone_number || f.phone || "",
    nationality:  a.nationality || f.nationality || "",
    country:      a.country_of_residence || f.country_of_residence || "",
    role:         a.applicant_role || a.application_type || "",
    venture:      a.venture_name || v.company_name || v.name || "",
    sector:       a.venture_sector || v.sector || "",
    stage:        a.venture_stage || v.stage || "",
    description:  a.venture_description || v.one_liner || "",
    linkedin:     a.linkedin_url || f.linkedin || "",
    website:      a.website_url || v.website || "",
    status:       a.status || "draft",
    payment:      a.payment_status || "unpaid",
    payment_amt:  a.payment_amount || 0,
    payment_date: a.payment_date || "",
    stripe:       a.stripe_session_id || "",
    ai_score:     a.ai_score || null,
    ai_summary:   a.ai_summary || "",
    kyc:          a.kyc_verified || false,
    docs:         a.documents_submitted || false,
    submitted_at: a.submitted_at || a.created_date || "",
    updated_at:   a.updated_date || "",
    notes:        a.notes || "",
    doc_passport: a.doc_passport_url || "",
    doc_address:  a.doc_proof_address_url || "",
    doc_business: a.doc_business_registration_url || "",
    doc_plan:     a.doc_business_plan_url || "",
    doc_fin:      a.doc_financial_projections_url || "",
    doc_pitch:    a.doc_pitch_deck_url || "",
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const url   = new URL(req.url);
  const key   = req.headers.get("X-Admin-Token") || req.headers.get("x-admin-key") || url.searchParams.get("adminKey") || "";
  const route = url.searchParams.get("_route") || "";

  // Auth check for all API routes
  if (route) {
    if (key !== _admin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    // GET ?_route=applications — list all records
    if (req.method === "GET" && route === "applications") {
      try {
        const records = await db();
        return new Response(JSON.stringify({ ok: true, records: records.map(norm), ts: Date.now() }), { headers: CORS });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
      }
    }

    // POST ?_route=action — admin actions
    if (req.method === "POST" && route === "action") {
      try {
        const body = await req.json();
        const { action, id, ref, notes, reason } = body;

        const records = await db();
        const app = records.find((r: any) => r.id === id || r.reference_code === ref);
        if (!app) return new Response(JSON.stringify({ ok: false, error: "Not found" }), { status: 404, headers: CORS });
        const ap = norm(app);

        if (action === "endorse") {
          await dbUpdate(app.id, { status: "approved", day_90_start: new Date().toISOString() });
          await email(ap.email, "Prime Endorsement Authority — Endorsement Decision",
            `<div style="font-family:Inter,sans-serif;background:#0A0E1A;color:#e2e8f0;padding:40px 24px;max-width:600px;margin:auto"><div style="border:1px solid rgba(201,168,76,0.3);border-radius:8px;padding:32px"><div style="text-align:center;margin-bottom:24px"><div style="color:#C9A84C;font-size:11px;letter-spacing:4px;text-transform:uppercase">PRIME ENDORSEMENT AUTHORITY</div><div style="color:#C9A84C;font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-top:8px">OFFICIAL ENDORSEMENT NOTICE</div></div><p style="color:#e2e8f0;margin-bottom:16px">Dear ${ap.name},</p><p style="color:#94a3b8;line-height:1.7;margin-bottom:16px">We are pleased to confirm that your application (<strong style="color:#C9A84C">${ap.ref}</strong>) and your venture <strong>${ap.venture}</strong> has been formally <strong style="color:#4ade80">ENDORSED</strong> by the Prime Endorsement Authority.</p><p style="color:#94a3b8;line-height:1.7;margin-bottom:16px">Your 90-day expert assessment period has commenced. A digitally signed endorsement certificate will be issued within 5 business days.</p><p style="color:#64748b;font-size:12px;margin-top:24px">Prime Endorsement Authority · admin@primeendorsement.com</p></div></div>`
          );
          return new Response(JSON.stringify({ ok: true, message: "Endorsed. Email sent to applicant." }), { headers: CORS });
        }

        if (action === "decline") {
          await dbUpdate(app.id, { status: "rejected", notes: reason || notes || "" });
          await email(ap.email, "Prime Endorsement Authority — Application Outcome",
            `<div style="font-family:Inter,sans-serif;background:#0A0E1A;color:#e2e8f0;padding:40px 24px;max-width:600px;margin:auto"><div style="border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:32px"><div style="text-align:center;margin-bottom:24px"><div style="color:#C9A84C;font-size:11px;letter-spacing:4px;text-transform:uppercase">PRIME ENDORSEMENT AUTHORITY</div><div style="color:#e2e8f0;font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-top:8px">APPLICATION OUTCOME NOTICE</div></div><p style="color:#e2e8f0;margin-bottom:16px">Dear ${ap.name},</p><p style="color:#94a3b8;line-height:1.7;margin-bottom:16px">Following a thorough review of your application (<strong style="color:#C9A84C">${ap.ref}</strong>), we regret to inform you that it has not been successful at this time. A formal decision letter will be sent separately. You may appeal within 28 days.</p><p style="color:#64748b;font-size:12px;margin-top:24px">Prime Endorsement Authority · admin@primeendorsement.com</p></div></div>`
          );
          return new Response(JSON.stringify({ ok: true, message: "Declined. Email sent to applicant." }), { headers: CORS });
        }

        if (action === "request_info") {
          await dbUpdate(app.id, { status: "info_requested" });
          await email(ap.email, "Prime Endorsement Authority — Additional Information Required",
            `<div style="font-family:Inter,sans-serif;background:#0A0E1A;color:#e2e8f0;padding:40px 24px;max-width:600px;margin:auto"><div style="border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:32px"><p style="color:#e2e8f0;margin-bottom:16px">Dear ${ap.name},</p><p style="color:#94a3b8;line-height:1.7;margin-bottom:16px">The review panel for your application (<strong style="color:#C9A84C">${ap.ref}</strong>) requires additional information. Please respond within 14 days by contacting admin@primeendorsement.com.</p><p style="color:#64748b;font-size:12px;margin-top:24px">Prime Endorsement Authority · admin@primeendorsement.com</p></div></div>`
          );
          return new Response(JSON.stringify({ ok: true, message: "Information request sent." }), { headers: CORS });
        }

        if (action === "update_status") {
          const updates: any = { status: body.new_status };
          if (body.new_status === "approved" && !app.day_90_start) updates.day_90_start = new Date().toISOString();
          await dbUpdate(app.id, updates);
          return new Response(JSON.stringify({ ok: true, message: `Status → ${body.new_status}` }), { headers: CORS });
        }

        if (action === "save_notes") {
          await dbUpdate(app.id, { notes: notes || "" });
          return new Response(JSON.stringify({ ok: true, message: "Notes saved." }), { headers: CORS });
        }

        if (action === "verify_kyc") {
          await dbUpdate(app.id, { kyc_verified: true });
          return new Response(JSON.stringify({ ok: true, message: "KYC verified." }), { headers: CORS });
        }

        if (action === "send_payment") {
          const r = await fetch(`${DOMAIN}/api/functions/peaSendPaymentLetter`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference_code: ap.ref }),
          });
          const d = await r.json();
          return new Response(JSON.stringify({ ok: d.success || d.ok, message: d.message || d.error || "Payment letter sent." }), { headers: CORS });
        }

        return new Response(JSON.stringify({ ok: false, error: "Unknown action" }), { status: 400, headers: CORS });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
      }
    }
  }

  // No route param — serve redirect to builder admin
  return new Response(
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${DOMAIN}/admin"/><title>PEA Admin</title></head><body><p style="font-family:Inter,sans-serif;color:#C9A84C;text-align:center;padding:40px">Redirecting to Admin Dashboard...</p></body></html>`,
    { headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } }
  );
}
