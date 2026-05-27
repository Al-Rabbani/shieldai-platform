/**
 * peaGetStatus — PUBLIC endpoint
 * Returns safe, public-facing application status fields.
 * Reads from the BUILDER app entity space (app_id: 69e2e852c48630e3502f13b1).
 *
 * The builder Application schema uses NESTED objects:
 *   app.venture  = { name, sector, stage, description, website, ... }
 *   app.founder  = { full_name, role, nationality, country_of_residence, phone, linkedin, ... }
 *
 * Also handles older flat-field records for backwards compatibility.
 */
import { createClient } from "npm:@base44/sdk@0.8.25";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function extract(app: Record<string, any>) {
  // Nested objects from builder schema
  const venture: Record<string, any> = app.venture || {};
  const founder: Record<string, any> = app.founder || {};

  // Venture name — try nested first, fall back to flat fields
  const venture_name =
    venture.company_name ||
    venture.name ||
    venture.venture_name ||
    app.venture_name ||
    app.company_name ||
    "";

  // Applicant role — application_type is the canonical field in builder schema
  const raw_role = app.applicant_role || app.application_type || founder.role || "Founder";
  const applicant_role = raw_role.charAt(0).toUpperCase() + raw_role.slice(1);

  // 90-day start — set when payment confirmed
  const day_90_start = app.day_90_start || null;

  // Normalise payment_status — builder uses "pending" and "unpaid" interchangeably
  const ps = app.payment_status || "unpaid";
  const payment_status = (ps === "pending") ? "unpaid" : ps;

  // Mask name for privacy: "Sidique Jeleel" → "Sidique J."
  const raw_name = (app.applicant_name || "").trim();
  const parts = raw_name.split(" ").filter(Boolean);
  const masked =
    parts.length > 1
      ? parts[0] + " " + parts.slice(1).map((p: string) => p[0] + ".").join(" ")
      : raw_name;

  return {
    reference_code: app.reference_code || "",
    applicant_name: masked,
    venture_name,
    applicant_role,
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

    // If duplicates exist, pick the most recently updated record
    const sorted = [...results].sort(
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
