/**
 * peaAgentSync — v1.0 2026-05-29
 *
 * Called by peaRegister (builder) immediately after a new application is created.
 * Writes the complete flat-field record into the Superagent app's Application entity.
 *
 * This decouples the agent-app write from the builder runtime, ensuring it always executes.
 *
 * POST body (JSON):
 *   All flat Application fields + stripe_session_id
 */

const AGENT_APP   = "6a14246111a4fa5e22999619";
const JSON_HEADERS = { "Content-Type": "application/json" };

async function dbList(appId: string, entity: string, token: string): Promise<any[]> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`dbList ${entity}: ${r.status}`);
  return r.json();
}

async function dbCreate(appId: string, entity: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`dbCreate ${entity}: ${r.status} — ${await r.text()}`);
  return r.json();
}

async function dbUpdate(appId: string, entity: string, id: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`dbUpdate ${entity}/${id}: ${r.status}`);
  return r.json();
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" } });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: JSON_HEADERS });
  }

  try {
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    if (!serviceToken) throw new Error("No service token configured");

    const body = await req.json().catch(() => ({}));
    const ref  = body.reference_code || "";
    if (!ref) return new Response(JSON.stringify({ success: false, error: "reference_code required" }), { status: 400, headers: JSON_HEADERS });

    // Check if record already exists (dedup)
    const existing = await dbList(AGENT_APP, "Application", serviceToken);
    const dup = existing.find((a: any) => a.reference_code === ref);
    if (dup) {
      // Update it with any new fields (e.g. stripe_session_id)
      await dbUpdate(AGENT_APP, "Application", dup.id, serviceToken, {
        stripe_session_id: body.stripe_session_id || dup.stripe_session_id || null,
        payment_status:    body.payment_status    || dup.payment_status,
        status:            body.status            || dup.status,
      });
      console.log(`[agentSync] Updated existing agent record: ${ref} (${dup.id})`);
      return new Response(JSON.stringify({ success: true, action: "updated", id: dup.id }), { headers: JSON_HEADERS });
    }

    // Create new flat record in agent app
    const record = await dbCreate(AGENT_APP, "Application", serviceToken, {
      reference_code:        ref,
      status:                body.status                || "submitted",
      payment_status:        body.payment_status        || "pending",
      applicant_name:        body.applicant_name        || "",
      applicant_email:       body.applicant_email       || "",
      applicant_role:        body.applicant_role        || "Founder",
      date_of_birth:         body.date_of_birth         || null,
      phone_number:          body.phone_number          || "",
      nationality:           body.nationality           || "",
      country_of_residence:  body.country_of_residence  || "",
      linkedin_url:          body.linkedin_url          || "",
      website_url:           body.website_url           || "",
      venture_name:          body.venture_name          || "",
      venture_stage:         body.venture_stage         || "",
      venture_sector:        body.venture_sector        || "",
      venture_description:   body.venture_description   || "",
      co_founder_name:       body.co_founder_name       || "",
      co_founder_email:      body.co_founder_email      || "",
      declaration_agreed:    body.declaration_agreed    === true || body.declaration_agreed === "true",
      documents_submitted:   body.documents_submitted   === true || body.documents_submitted === "true",
      ai_score:              body.ai_score              || null,
      ai_summary:            body.ai_summary            || null,
      submitted_at:          body.submitted_at          || new Date().toISOString(),
      invitation_token:      body.invitation_token      || null,
      stripe_session_id:     body.stripe_session_id     || null,
      // Document URLs — written if provided
      doc_passport_url:              body.doc_passport_url              || null,
      doc_proof_address_url:         body.doc_proof_address_url         || null,
      doc_business_registration_url: body.doc_business_registration_url || null,
      doc_business_plan_url:         body.doc_business_plan_url         || null,
      doc_financial_projections_url: body.doc_financial_projections_url || null,
      doc_pitch_deck_url:            body.doc_pitch_deck_url            || null,
    });

    console.log(`[agentSync] ✅ Created agent record: ${ref} (${record.id})`);
    return new Response(JSON.stringify({ success: true, action: "created", id: record.id, reference_code: ref }), { headers: JSON_HEADERS });

  } catch (err: any) {
    console.error("[agentSync] Error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}
