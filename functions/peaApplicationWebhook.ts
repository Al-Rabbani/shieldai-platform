/**
 * peaApplicationWebhook
 * Called by the builder app after successful submission/payment.
 * Mirrors records into the Superagent entity space to trigger automations.
 * Shared secret: X-PEA-Key header must match PEA_WEBHOOK_SECRET env var.
 */
import { createClient } from "npm:@base44/sdk@0.8.25";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-PEA-Key",
  "Content-Type": "application/json",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  }

  try {
    const key = req.headers.get("X-PEA-Key") || "";
    const expected = Deno.env.get("PEA_WEBHOOK_SECRET") || "pea-webhook-2026";
    if (key !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    const body = await req.json();
    const base44 = createClient({ appId: "6a14246111a4fa5e22999619" });
    const type = body._type || "application";

    if (type === "payment") {
      let existing: any[] = [];
      try {
        existing = await base44.asServiceRole.entities.PaymentTransaction.filter({
          stripe_session_id: body.stripe_session_id,
        });
      } catch (_) {}

      if (existing.length > 0) {
        return new Response(
          JSON.stringify({ success: true, id: existing[0].id, type: "payment", duplicate: true }),
          { headers: CORS }
        );
      }

      const pt = await base44.asServiceRole.entities.PaymentTransaction.create({
        application_id: body.application_id || "",
        reference_code: body.reference_code || "",
        stripe_session_id: body.stripe_session_id || "",
        stripe_payment_intent: body.stripe_payment_intent || "",
        amount: body.amount || 1000,
        vat: body.vat || 200,
        total: body.total || 1200,
        currency: "GBP",
        status: "paid",
        applicant_email: body.applicant_email || "",
        applicant_name: body.applicant_name || "",
        paid_at: body.paid_at || new Date().toISOString(),
        receipt_url: body.receipt_url || "",
      });

      console.log("PaymentTransaction mirrored:", pt.id, body.reference_code);
      return new Response(
        JSON.stringify({ success: true, id: pt.id, type: "payment" }),
        { headers: CORS }
      );
    }

    // Mirror Application — upsert by reference_code
    let existing: any[] = [];
    try {
      existing = await base44.asServiceRole.entities.Application.filter({
        reference_code: body.reference_code,
      });
    } catch (_) {}

    const data = {
      reference_code: body.reference_code || "",
      applicant_name: body.applicant_name || "",
      applicant_email: body.applicant_email || "",
      applicant_role: body.applicant_role || "Founder",
      venture_name: body.venture_name || "",
      venture_sector: body.venture_sector || "",
      venture_stage: body.venture_stage || "",
      venture_description: body.venture_description || "",
      nationality: body.nationality || "",
      country_of_residence: body.country_of_residence || "",
      phone_number: body.phone_number || "",
      linkedin_url: body.linkedin_url || "",
      website_url: body.website_url || "",
      co_founder_name: body.co_founder_name || "",
      co_founder_email: body.co_founder_email || "",
      status: body.status || "submitted",
      payment_status: body.payment_status === "pending" ? "unpaid" : (body.payment_status || "unpaid"),
      ai_score: body.ai_score || null,
      ai_summary: body.ai_summary || "",
      submitted_at: body.submitted_at || new Date().toISOString(),
    };

    let record: any;
    if (existing.length > 0) {
      record = await base44.asServiceRole.entities.Application.update(existing[0].id, data);
      console.log("Application mirrored (update):", existing[0].id, body.reference_code);
    } else {
      record = await base44.asServiceRole.entities.Application.create(data);
      console.log("Application mirrored (create):", record?.id, body.reference_code);
    }

    return new Response(
      JSON.stringify({ success: true, id: record?.id, reference_code: body.reference_code }),
      { headers: CORS }
    );

  } catch (err: any) {
    console.error("peaApplicationWebhook error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: CORS }
    );
  }
}
