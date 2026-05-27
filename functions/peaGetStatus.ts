/**
 * peaGetStatus — PUBLIC endpoint
 * Returns safe, public-facing application status fields.
 * Reads from the BUILDER app entity space (app_id: 69e2e852c48630e3502f13b1).
 * Handles both flat fields AND the nested venture/founder objects the builder schema uses.
 */
import { createClient } from "npm:@base44/sdk@0.8.25";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function extract(app: Record<string, any>) {
  // Builder stores data in nested objects: app.venture, app.founder, etc.
  // But also may have flat fields depending on how submission function wrote them.
  const venture = app.venture || {};
  const founder = app.founder || {};

  const venture_name =
    app.venture_name || venture.name || venture.venture_name || "";
  const applicant_role =
    app.applicant_role || app.application_type || "Founder";
  const day_90_start =
    app.day_90_start || app.payment_date || null;
  const payment_status =
    app.payment_status === "pending" ? "unpaid" : (app.payment_status || "unpaid");

  // Mask applicant name: "James Whitfield" → "James W."
  const raw = (app.applicant_name || "").trim();
  const parts = raw.split(" ").filter(Boolean);
  const masked =
    parts.length > 1
      ? parts[0] + " " + parts.slice(1).map((p: string) => p[0] + ".").join(" ")
      : raw;

  return {
    reference_code: app.reference_code || "",
    applicant_name: masked,
    venture_name,
    applicant_role: applicant_role.charAt(0).toUpperCase() + applicant_role.slice(1),
    status: app.status || "submitted",
    payment_status,
    submitted_at: app.submitted_at || app.created_date || null,
    day_90_start,
    ai_score: app.ai_score || null,
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") || "").trim().toUpperCase();

  if (!ref) {
    return new Response(
      JSON.stringify({ success: false, message: "Reference code required." }),
      { status: 400, headers: CORS }
    );
  }

  try {
    // Read from builder app entity space
    const builderClient = createClient({ appId: "69e2e852c48630e3502f13b1" });
    let results: any[] = [];
    try {
      results = await builderClient.asServiceRole.entities.Application.filter({
        reference_code: ref,
      });
    } catch (e: any) {
      console.error("Builder app query failed:", e.message);
    }

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No application found with this reference code. Please check and try again.",
        }),
        { status: 404, headers: CORS }
      );
    }

    // Use the most recently updated record if duplicates exist
    const sorted = results.sort(
      (a: any, b: any) =>
        new Date(b.updated_date || 0).getTime() - new Date(a.updated_date || 0).getTime()
    );

    return new Response(
      JSON.stringify({ success: true, application: extract(sorted[0]) }),
      { headers: CORS }
    );
  } catch (err: any) {
    console.error("peaGetStatus error:", err.message);
    return new Response(
      JSON.stringify({ success: false, message: "Error loading status. Please try again." }),
      { status: 500, headers: CORS }
    );
  }
}
