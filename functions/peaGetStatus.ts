/**
 * peaGetStatus — v3 REBUILT 2026-05-29
 *
 * PUBLIC endpoint — returns safe status fields for a given reference code.
 * FIXED: Zero SDK imports — pure REST API
 * FIXED: Correct nested field access (venture?.company_name, founder?.role)
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function extract(app: Record<string, any>) {
  const venture: Record<string, any> = app.venture || {};
  const founder: Record<string, any> = app.founder || {};

  const venture_name = venture.company_name || venture.name || app.applicant_name || "";
  const applicant_role_raw = app.application_type || founder.role || app.applicant_role || "Founder";
  const applicant_role = applicant_role_raw.charAt(0).toUpperCase() + applicant_role_raw.slice(1);

  const ps = (app.payment_status || "pending");
  const payment_status = ps === "unpaid" ? "pending" : ps;

  const raw_name = (app.applicant_name || "").trim();
  const parts = raw_name.split(" ").filter(Boolean);
  const masked = parts.length > 1
    ? parts[0] + " " + parts.slice(1).map((p: string) => p[0] + ".").join(" ")
    : raw_name;

  return {
    reference_code: app.reference_code || "",
    applicant_name: masked,
    venture_name,
    applicant_role,
    venture_sector: venture.sector || "",
    venture_stage:  venture.stage  || "",
    status:         app.status     || "submitted",
    payment_status,
    submitted_at:   app.submitted_at  || app.created_date || null,
    day_90_start:   app.day_90_start  || null,
    kyc_status:     app.kyc_status    || "not_started",
    ai_score:       app.ai_score      || null,
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") || "").trim().toUpperCase();

  if (!ref) {
    return new Response(JSON.stringify({ success: false, message: "Reference code required." }), { status: 400, headers: CORS });
  }

  try {
    const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
    const r = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application`, {
      headers: { "Authorization": `Bearer ${serviceToken}` },
    });
    if (!r.ok) throw new Error(`DB fetch failed: ${r.status}`);
    const all = await r.json();
    const matches = (all || []).filter((a: any) => a.reference_code === ref);

    if (!matches.length) {
      return new Response(JSON.stringify({ success: false, message: "No application found with this reference code. Please check and try again." }), { status: 404, headers: CORS });
    }

    // Pick most recently updated
    const sorted = [...matches].sort((a: any, b: any) =>
      new Date(b.updated_date || 0).getTime() - new Date(a.updated_date || 0).getTime()
    );

    return new Response(JSON.stringify({ success: true, application: extract(sorted[0]) }), { headers: CORS });

  } catch (err: any) {
    console.error("[getstatus] Error:", err.message);
    return new Response(JSON.stringify({ success: false, message: "Error loading status. Please try again." }), { status: 500, headers: CORS });
  }
}
