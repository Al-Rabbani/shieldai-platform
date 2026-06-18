// ShieldAI — Integrations Hub v1 (SDK client)
// Stage 17: PagerDuty, Microsoft Teams, Slack, Webhook dispatcher, Jira auto-create
// Central hub: routes critical alerts to the right channel based on OrgSettings + IntegrationConfig

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };

// ── PAGERDUTY v2 Events API
async function sendPagerDuty(routingKey: string, finding: any): Promise<{ ok: boolean; dedup_key?: string; error?: string }> {
  if (!routingKey) return { ok: false, error: "No PAGERDUTY_ROUTING_KEY configured" };
  try {
    const r = await fetch("https://events.pagerduty.com/v2/enqueue", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routing_key: routingKey, event_action: "trigger", dedup_key: `shieldai-${finding.id || finding.cve_id || Date.now()}`, payload: { summary: `[ShieldAI] ${(finding.severity || "").toUpperCase()}: ${finding.title}`, severity: finding.severity === "critical" ? "critical" : finding.severity === "high" ? "error" : "warning", source: "ShieldAI Security Platform", timestamp: finding.detected_at || new Date().toISOString(), custom_details: { cve_id: finding.cve_id, cvss_score: finding.cvss_score, asset: finding.asset_name || finding.resource, remediation: finding.remediation, kev: finding.exploited_in_wild ? "YES - Actively Exploited" : "No" } }, links: [{ href: "https://app.base44.com/apps/6a22a773bb173a975d8337f9", text: "View in ShieldAI" }] }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json();
    return { ok: r.ok, dedup_key: data.dedup_key };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// ── MICROSOFT TEAMS webhook
async function sendTeams(webhookUrl: string, finding: any): Promise<{ ok: boolean; error?: string }> {
  if (!webhookUrl) return { ok: false, error: "No TEAMS_WEBHOOK_URL configured" };
  const sevColor = ({ critical: "FF0000", high: "FF8C00", medium: "FFD700", low: "00CC00" } as any)[finding.severity] || "808080";
  try {
    const r = await fetch(webhookUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "@type": "MessageCard", "@context": "http://schema.org/extensions", themeColor: sevColor, summary: `ShieldAI Alert: ${finding.title}`, sections: [{ activityTitle: `🔴 ShieldAI Security Alert`, activitySubtitle: `Severity: ${(finding.severity || "").toUpperCase()}`, facts: [{ name: "Finding", value: finding.title }, { name: "CVE", value: finding.cve_id || "N/A" }, { name: "CVSS", value: finding.cvss_score?.toString() || "N/A" }, { name: "Asset", value: finding.asset_name || finding.resource || "N/A" }, { name: "KEV", value: finding.exploited_in_wild ? "⚠️ Actively Exploited" : "No" }, { name: "Remediation", value: (finding.remediation || "").slice(0, 200) }] }], potentialAction: [{ "@type": "OpenUri", name: "View in ShieldAI", targets: [{ os: "default", uri: "https://app.base44.com/apps/6a22a773bb173a975d8337f9" }] }] }),
      signal: AbortSignal.timeout(10000),
    });
    return { ok: r.ok };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// ── SLACK webhook (enhanced)
async function sendSlack(webhookUrl: string, finding: any): Promise<{ ok: boolean; error?: string }> {
  if (!webhookUrl) return { ok: false, error: "No SLACK_WEBHOOK_URL configured" };
  const sevEmoji = ({ critical: "🔴", high: "🟠", medium: "🟡", low: "🟢" } as any)[finding.severity] || "⚪";
  try {
    const r = await fetch(webhookUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks: [{ type: "header", text: { type: "plain_text", text: `${sevEmoji} ShieldAI: ${(finding.severity || "").toUpperCase()} Finding` } }, { type: "section", text: { type: "mrkdwn", text: `*${finding.title}*\n${finding.cve_id ? `CVE: \`${finding.cve_id}\`` : ""} ${finding.cvss_score ? `CVSS: \`${finding.cvss_score}\`` : ""} ${finding.exploited_in_wild ? "⚠️ *ACTIVELY EXPLOITED (CISA KEV)*" : ""}` } }, { type: "section", fields: [{ type: "mrkdwn", text: `*Asset:*\n${finding.asset_name || finding.resource || "N/A"}` }, { type: "mrkdwn", text: `*Remediation:*\n${(finding.remediation || "Review finding").slice(0, 150)}` }] }, { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "View in ShieldAI" }, url: "https://app.base44.com/apps/6a22a773bb173a975d8337f9", style: "danger" }] }] }),
      signal: AbortSignal.timeout(10000),
    });
    return { ok: r.ok };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// ── GENERIC WEBHOOK (user-defined)
async function sendWebhook(webhookUrl: string, secret: string, payload: any): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!webhookUrl) return { ok: false, error: "No webhook URL" };
  const body = JSON.stringify({ source: "shieldai", event: "security_alert", timestamp: new Date().toISOString(), ...payload });
  const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "ShieldAI-Webhook/1.0" };
  if (secret) {
    // HMAC-SHA256 signature
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    headers["X-ShieldAI-Signature"] = "sha256=" + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  try {
    const r = await fetch(webhookUrl, { method: "POST", headers, body, signal: AbortSignal.timeout(10000) });
    return { ok: r.ok, status: r.status };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action = "dispatch", finding, findings, channel, test = false, webhook_url, webhook_secret } = body;

    // Load org settings for webhook URLs
    const [orgSettings, integrations] = await Promise.all([
      base44.entities.OrgSettings.list().catch(() => []),
      base44.entities.IntegrationConfig.list().catch(() => []),
    ]);
    const org = orgSettings[0] || {};

    const slackWebhook = Deno.env.get("SLACK_WEBHOOK_URL") || org.slack_webhook_url || "";
    const teamsWebhook = Deno.env.get("TEAMS_WEBHOOK_URL") || org.teams_webhook_url || "";
    const pdKey = Deno.env.get("PAGERDUTY_ROUTING_KEY") || org.pagerduty_integration_key || "";

    // ── LIST: what integrations are configured
    if (action === "list") {
      return new Response(JSON.stringify({ success: true, integrations: { slack: { configured: !!slackWebhook, type: "webhook" }, teams: { configured: !!teamsWebhook, type: "webhook" }, pagerduty: { configured: !!pdKey, type: "events_api_v2" }, jira: { configured: !!Deno.env.get("JIRA_API_TOKEN"), type: "rest_api" }, github: { configured: !!Deno.env.get("GITHUB_TOKEN"), type: "oauth" }, custom_webhooks: integrations.filter((i: any) => i.integration_type === "webhook").length }, missing_secrets: [...(!slackWebhook ? ["SLACK_WEBHOOK_URL"] : []), ...(!teamsWebhook ? ["TEAMS_WEBHOOK_URL"] : []), ...(!pdKey ? ["PAGERDUTY_ROUTING_KEY"] : [])] }), { headers: CORS });
    }

    // ── TEST: send test alert to all channels
    if (action === "test" || test) {
      const testFinding = finding || { id: "test-001", title: "ShieldAI Integration Test", severity: "high", cve_id: "CVE-2024-TEST", cvss_score: 8.1, asset_name: "test-app", remediation: "This is a test alert from ShieldAI. Integration is working correctly.", exploited_in_wild: false, detected_at: new Date().toISOString() };
      const results: any = {};
      if (slackWebhook) results.slack = await sendSlack(slackWebhook, testFinding);
      if (teamsWebhook) results.teams = await sendTeams(teamsWebhook, testFinding);
      if (pdKey) results.pagerduty = await sendPagerDuty(pdKey, testFinding);
      if (webhook_url) results.custom_webhook = await sendWebhook(webhook_url, webhook_secret || "", { finding: testFinding });
      return new Response(JSON.stringify({ success: true, test: true, results }), { headers: CORS });
    }

    // ── DISPATCH: route finding to appropriate channels
    if (action === "dispatch") {
      const f = finding;
      if (!f) return new Response(JSON.stringify({ error: "finding required" }), { status: 400, headers: CORS });
      const sev = f.severity || f.normalized_severity;
      const results: any = {};
      // Critical → all channels
      if (sev === "critical") {
        if (slackWebhook) results.slack = await sendSlack(slackWebhook, f);
        if (teamsWebhook) results.teams = await sendTeams(teamsWebhook, f);
        if (pdKey) results.pagerduty = await sendPagerDuty(pdKey, f);
      } else if (sev === "high") {
        // High → Slack + Teams only
        if (slackWebhook) results.slack = await sendSlack(slackWebhook, f);
        if (teamsWebhook) results.teams = await sendTeams(teamsWebhook, f);
      }
      // Custom webhooks from IntegrationConfig
      for (const integ of integrations.filter((i: any) => i.integration_type === "webhook" && i.status === "active")) {
        if (integ.webhook_url) results[`webhook_${integ.id}`] = await sendWebhook(integ.webhook_url, integ.webhook_secret || "", { finding: f });
      }
      // Log delivery
      for (const [channel, result] of Object.entries(results)) {
        try { await base44.entities.WebhookDelivery.create({ webhook_url: channel, event_type: `finding.${sev}`, payload: { finding_id: f.id, title: f.title, severity: sev }, status_code: (result as any).status || 200, success: (result as any).ok, delivered_at: new Date().toISOString(), attempt_number: 1 }); } catch (_) {}
      }
      return new Response(JSON.stringify({ success: true, finding_id: f.id, severity: sev, channels_notified: Object.keys(results).length, results }), { headers: CORS });
    }

    // ── BULK DISPATCH: dispatch all critical open findings
    if (action === "bulk_dispatch") {
      const triaged = await base44.entities.TriagedFinding.list().catch(() => []);
      const criticals = triaged.filter((f: any) => (f.normalized_severity || f.severity) === "critical" && f.status === "open" && f.exploited_in_wild).slice(0, 10);
      const dispatched = [];
      for (const f of criticals) {
        if (slackWebhook) { const r = await sendSlack(slackWebhook, f); dispatched.push({ id: f.id, title: f.title, slack: r.ok }); }
      }
      return new Response(JSON.stringify({ success: true, dispatched: dispatched.length, results: dispatched }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "Unknown action: list|test|dispatch|bulk_dispatch" }), { status: 400, headers: CORS });
  } catch (err: any) { return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS }); }
});
