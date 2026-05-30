const BUILDER_APP  = "69e2e852c48630e3502f13b1";
const AGENT_APP    = "6a14246111a4fa5e22999619";
const DOMAIN       = "https://primeendorsement.com";
const RESEND_API   = "https://api.resend.com/emails";
const FROM_EMAIL   = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL  = "admin@primeendorsement.com";
const JSON_HEADERS: Record<string, string> = { "Content-Type": "application/json" };

async function dbList(appId: string, entity: string, token: string): Promise<any[]> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    headers: { "Authorization": `Bearer ${token}`, "User-Agent": "PEA-Webhook/1.0" },
  });
  if (!r.ok) throw new Error(`dbList ${entity}: ${r.status}`);
  return r.json();
}

async function dbUpdate(appId: string, entity: string, id: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}/${id}`, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`dbUpdate: ${r.status}`);
  return r.json();
}

async function dbCreate(appId: string, entity: string, token: string, data: object): Promise<any> {
  const r = await fetch(`https://app.base44.com/api/apps/${appId}/entities/${entity}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`dbCreate: ${r.status}`);
  return r.json();
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const r = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!r.ok) console.error("[stripeWebhook] Email error:", r.status, await r.text());
}

function applicantEmail(firstName: string, ref: string, statusUrl: string): string {
  const year = new Date().getFullYear();
  return [
    '<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>',
    '<body style="background:#0A0E1A;font-family:Arial,sans-serif;margin:0;padding:20px">',
    '<div style="max-width:580px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">',
    '<div style="background:#0d1a0d;border-bottom:3px solid #22c55e;padding:28px;text-align:center">',
    '<div style="font-size:40px">&#10003;</div>',
    '<div style="color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:4px;margin-top:8px">PRIME ENDORSEMENT AUTHORITY</div>',
    '<div style="color:#22c55e;font-size:12px;margin-top:6px">Payment Confirmed - Your 90-Day Review Has Begun</div>',
    '</div>',
    '<div style="padding:28px">',
    '<p style="color:#C9A84C;font-size:15px;font-weight:600;margin-bottom:8px">Dear ' + firstName + ',</p>',
    '<p style="color:#94a3b8;font-size:13px;line-height:1.7;margin-bottom:16px">',
    'Your endorsement fee of <strong style="color:#e2e8f0">&#163;1,200.00</strong> has been received. Your application is now under active review.</p>',
    '<div style="background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:14px;text-align:center;margin:18px 0">',
    '<div style="color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase">Your Reference</div>',
    '<div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px;margin-top:4px">' + ref + '</div>',
    '</div>',
    '<div style="text-align:center;margin:20px 0">',
    '<a href="' + statusUrl + '" style="background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:12px 36px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase">Track Your Application</a>',
    '</div>',
    '<p style="text-align:center;color:#475569;font-size:11px">Questions? <a href="mailto:' + ADMIN_EMAIL + '" style="color:#C9A84C">' + ADMIN_EMAIL + '</a></p>',
    '</div>',
    '<div style="background:#0d1220;padding:14px;text-align:center;border-top:1px solid #1e293b">',
    '<p style="color:#475569;font-size:11px">&#169; ' + year + ' Prime Endorsement Authority</p>',
    '</div></div></body></html>',
  ].join("");
}

function adminEmail(ref: string, name: string, email: string, sessionId: string): string {
  return [
    '<div style="font-family:Arial,sans-serif;padding:24px;max-width:520px;background:#111827;color:#e2e8f0">',
    '<h2 style="color:#C9A84C;margin-bottom:16px">Payment Received</h2>',
    '<p><strong>Reference:</strong> ' + ref + '</p>',
    '<p><strong>Applicant:</strong> ' + name + '</p>',
    '<p><strong>Email:</strong> ' + email + '</p>',
    '<p><strong>Amount:</strong> &#163;1,200.00 GBP</p>',
    '<p><strong>Status:</strong> Under Review</p>',
    '<p style="font-size:11px;color:#94a3b8"><strong>Session:</strong> ' + sessionId + '</p>',
    '</div>',
  ].join("");
}

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  try {
    const parts  = sigHeader.split(",");
    const tsPart = parts.find(p => p.startsWith("t="));
    const v1Part = parts.find(p => p.startsWith("v1="));
    if (!tsPart || !v1Part) return false;
    const signed = tsPart.slice(2) + "." + payload;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return computed === v1Part.slice(3);
  } catch { return false; }
}

async function fulfillPayment(session: Record<string, any>, token: string, resendKey: string): Promise<void> {
  const sessionId  = session.id || "";
  const meta       = session.metadata || {};
  const refCode    = meta.reference_code || "";
  const appId      = meta.application_id || "";
  const custEmail  = session.customer_details?.email || session.customer_email || "";
  const now        = new Date().toISOString();

  console.log("[stripeWebhook] Fulfilling: ref=" + refCode + " session=" + sessionId);

  let builderApp: Record<string, any> | null = null;
  try {
    const all = await dbList(BUILDER_APP, "Application", token);
    builderApp = all.find(a => a.id === appId) || all.find(a => a.reference_code === refCode) || all.find(a => a.payment_reference === sessionId) || null;
  } catch (e: any) { console.error("[stripeWebhook] Builder lookup:", e.message); }

  const finalRef  = refCode || builderApp?.reference_code || "N/A";
  const finalName = builderApp?.applicant_name || "Applicant";
  const appEmail  = builderApp?.applicant_email || custEmail;

  if (builderApp?.payment_status === "paid") {
    console.log("[stripeWebhook] Already fulfilled: " + finalRef);
    return;
  }

  if (builderApp) {
    try {
      await dbUpdate(BUILDER_APP, "Application", builderApp.id, token, {
        payment_status: "paid", status: "under_review",
        payment_reference: sessionId,
        day_90_start: builderApp.day_90_start || now,
        submitted_at: builderApp.submitted_at || now,
      });
      console.log("[stripeWebhook] Builder updated: " + finalRef);
    } catch (e: any) { console.error("[stripeWebhook] Builder update:", e.message); }
  }

  try {
    const agentAll = await dbList(AGENT_APP, "Application", token);
    const agentApp = agentAll.find(a => a.reference_code === finalRef) || agentAll.find(a => a.stripe_session_id === sessionId) || null;
    if (agentApp) {
      await dbUpdate(AGENT_APP, "Application", agentApp.id, token, {
        payment_status: "paid", status: "under_review",
        stripe_session_id: sessionId, payment_date: now,
        day_90_start: builderApp?.day_90_start || now,
      });
      console.log("[stripeWebhook] Agent updated: " + finalRef);
    }
  } catch (e: any) { console.error("[stripeWebhook] Agent update:", e.message); }

  try {
    const txns = await dbList(AGENT_APP, "PaymentTransaction", token);
    if (!txns.find(t => t.stripe_session_id === sessionId)) {
      await dbCreate(AGENT_APP, "PaymentTransaction", token, {
        application_id: builderApp?.id || appId,
        reference_code: finalRef, stripe_session_id: sessionId,
        stripe_payment_intent: session.payment_intent || "",
        amount: 1000, vat: 200, total: 1200, currency: "GBP", status: "paid",
        applicant_email: appEmail, applicant_name: finalName, paid_at: now,
      });
      console.log("[stripeWebhook] PaymentTransaction created: " + finalRef);
    }
  } catch (e: any) { console.error("[stripeWebhook] PaymentTransaction:", e.message); }

  if (!resendKey) return;
  const statusUrl = DOMAIN + "/api/functions/peaStatusPage?ref=" + encodeURIComponent(finalRef);
  const firstName = finalName.split(" ")[0];

  if (appEmail) {
    try {
      await sendEmail(resendKey, appEmail, "Payment Confirmed - " + finalRef + " | Prime Endorsement Authority", applicantEmail(firstName, finalRef, statusUrl));
    } catch (e: any) { console.error("[stripeWebhook] Applicant email:", e.message); }
  }
  try {
    await sendEmail(resendKey, ADMIN_EMAIL, "Payment Received - " + finalRef + " | GBP 1200 | " + finalName, adminEmail(finalRef, finalName, appEmail, sessionId));
  } catch (e: any) { console.error("[stripeWebhook] Admin email:", e.message); }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", endpoint: "stripeWebhook", version: "1.1" }), { headers: JSON_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HEADERS });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  const serviceToken  = Deno.env.get("BASE44_SERVICE_TOKEN")   || "";
  const resendKey     = Deno.env.get("RESEND_API_KEY")         || "";
  const rawBody       = await req.text();

  if (webhookSecret) {
    const valid = await verifyStripeSignature(rawBody, req.headers.get("stripe-signature") || "", webhookSecret);
    if (!valid) {
      console.error("[stripeWebhook] Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: JSON_HEADERS });
    }
  }

  let event: Record<string, any>;
  try { event = JSON.parse(rawBody); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: JSON_HEADERS });
  }

  const eventType = event.type || "";
  console.log("[stripeWebhook] Event: " + eventType + " id=" + event.id);

  try {
    if (eventType === "checkout.session.completed") {
      const session = event.data?.object || {};
      if (session.payment_status === "paid") {
        await fulfillPayment(session, serviceToken, resendKey);
      }
    } else if (eventType === "payment_intent.succeeded") {
      const pi = event.data?.object || {};
      const all = await dbList(BUILDER_APP, "Application", serviceToken);
      const app = all.find(a => a.stripe_payment_intent === pi.id);
      if (app && app.payment_status !== "paid") {
        await dbUpdate(BUILDER_APP, "Application", app.id, serviceToken, { payment_status: "paid", status: "under_review" });
      }
    }
  } catch (e: any) {
    console.error("[stripeWebhook] Error:", e.message);
    return new Response(JSON.stringify({ received: true, error: e.message }), { headers: JSON_HEADERS });
  }

  return new Response(JSON.stringify({ received: true, event: eventType }), { headers: JSON_HEADERS });
}
