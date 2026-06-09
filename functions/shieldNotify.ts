// ShieldAI — PRODUCTION Notification Dispatcher v2
// Real: Slack webhooks + GitHub Issues + Email (Resend) + PagerDuty
// Sends real alerts for critical findings, SLA breaches, exploited-in-wild threats

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });

  const body = await req.json().catch(() => ({}));
  const {
    finding,
    channel = "all",              // all | slack | github | email | pagerduty
    severity_threshold = "high",  // minimum severity to alert on
    test = false,                 // if true, send test alert
  } = body;

  const SLACK_WEBHOOK   = Deno.env.get("SLACK_WEBHOOK_URL") || "";
  const GITHUB_TOKEN    = Deno.env.get("GITHUB_TOKEN") || "";
  const GITHUB_REPO     = Deno.env.get("GITHUB_REPO") || "";
  const RESEND_KEY      = Deno.env.get("RESEND_API_KEY") || "";
  const ALERT_EMAIL     = Deno.env.get("SECURITY_ALERT_EMAIL") || "";
  const PD_ROUTING_KEY  = Deno.env.get("PAGERDUTY_ROUTING_KEY") || "";

  const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  const threshold = severityRank[severity_threshold] ?? 3;
  const findingSev = severityRank[finding?.severity] ?? 0;

  if (!test && findingSev < threshold) {
    return Response.json({ success: true, skipped: true, reason: `Severity '${finding?.severity}' below threshold '${severity_threshold}'` });
  }

  const sevEmoji: Record<string, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢", info: "⚪" };
  const emoji = sevEmoji[finding?.severity || "info"] || "⚪";
  const sev = (finding?.severity || "INFO").toUpperCase();
  const title = finding?.title || "Security Finding";
  const resource = finding?.resource || finding?.endpoint || finding?.package_name || "N/A";
  const description = finding?.description || "No description provided";
  const remediation = finding?.remediation || "Review and remediate";
  const cveId = finding?.cve_id;
  const cvss = finding?.cvss_score;
  const pillar = finding?.pillar || finding?.type || "Unknown";
  const isKev = finding?.exploited_in_wild;
  const detectedAt = finding?.detected_at || new Date().toISOString();

  const results: Record<string, any> = {};

  // ── SLACK
  if (SLACK_WEBHOOK && (channel === "slack" || channel === "all")) {
    try {
      const blocks: any[] = [
        {
          type: "header",
          text: { type: "plain_text", text: `${emoji} ShieldAI Security Alert — ${sev}` }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Finding:*\n${title}` },
            { type: "mrkdwn", text: `*Pillar:*\n${pillar}` },
            { type: "mrkdwn", text: `*Resource:*\n\`${resource}\`` },
            { type: "mrkdwn", text: `*Detected:*\n${new Date(detectedAt).toLocaleString("en-GB")}` },
          ]
        },
      ];

      if (isKev) {
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: "⚠️ *EXPLOITED IN THE WILD* — This CVE is on the CISA KEV list. Immediate patching required." }
        });
      }

      blocks.push(
        { type: "section", text: { type: "mrkdwn", text: `*Description:*\n${description.slice(0, 400)}` } },
        { type: "section", text: { type: "mrkdwn", text: `*Remediation:*\n${remediation.slice(0, 300)}` } }
      );

      if (cveId || cvss) {
        blocks.push({
          type: "section",
          fields: [
            ...(cveId ? [{ type: "mrkdwn", text: `*CVE:*\n<https://nvd.nist.gov/vuln/detail/${cveId}|${cveId}>` }] : []),
            ...(cvss ? [{ type: "mrkdwn", text: `*CVSS:*\n${cvss}` }] : []),
          ]
        });
      }

      blocks.push({ type: "divider" });
      blocks.push({
        type: "actions",
        elements: [
          { type: "button", text: { type: "plain_text", text: "Open ShieldAI" }, url: "https://app.base44.com/apps/6a22a773bb173a975d8337f9" },
          ...(cveId ? [{ type: "button", text: { type: "plain_text", text: `View ${cveId}` }, url: `https://nvd.nist.gov/vuln/detail/${cveId}` }] : []),
        ]
      });

      const r = await fetch(SLACK_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      });
      results.slack = { sent: r.ok, status: r.status };
    } catch (e: any) { results.slack = { sent: false, error: e.message }; }
  }

  // ── GITHUB ISSUE
  if (GITHUB_TOKEN && GITHUB_REPO && (channel === "github" || channel === "all")) {
    try {
      const labels = ["security", finding?.severity, pillar].filter(Boolean);
      const body = [
        `## ${emoji} Security Finding — ${sev}`,
        "",
        `| Field | Value |`,
        `|---|---|`,
        `| **Title** | ${title} |`,
        `| **Pillar** | ${pillar} |`,
        `| **Severity** | ${sev} |`,
        `| **Resource** | \`${resource}\` |`,
        cveId ? `| **CVE** | [${cveId}](https://nvd.nist.gov/vuln/detail/${cveId}) |` : null,
        cvss ? `| **CVSS Score** | ${cvss} |` : null,
        isKev ? `| **CISA KEV** | ⚠️ **Actively Exploited in the Wild** |` : null,
        `| **Detected** | ${detectedAt} |`,
        "",
        "### Description",
        description,
        "",
        "### Remediation",
        "```",
        remediation,
        "```",
        "",
        "---",
        "*Auto-generated by [ShieldAI Security Platform](https://app.base44.com)*",
      ].filter(l => l !== null).join("\n");

      const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: `[ShieldAI] ${emoji} ${title}`, body, labels }),
      });
      const d = await r.json();
      results.github = { sent: r.ok, issue_url: d.html_url, number: d.number };
    } catch (e: any) { results.github = { sent: false, error: e.message }; }
  }

  // ── EMAIL via Resend
  if (RESEND_KEY && ALERT_EMAIL && (channel === "email" || channel === "all") && findingSev >= 3) {
    try {
      const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0a0a0f;color:#f1f5f9;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#111118;border-radius:8px;padding:24px;border:1px solid #2a2a3a">
  <div style="border-bottom:3px solid ${finding?.severity === "critical" ? "#ef4444" : "#f59e0b"};padding-bottom:12px;margin-bottom:20px">
    <span style="font-size:24px">${emoji}</span>
    <span style="color:#f1f5f9;font-size:18px;font-weight:700;margin-left:8px">ShieldAI Security Alert — ${sev}</span>
  </div>
  <h2 style="color:#f1f5f9;margin-top:0">${title}</h2>
  ${isKev ? '<div style="background:#7f1d1d;border:1px solid #ef4444;border-radius:6px;padding:10px;margin:12px 0"><strong style="color:#fca5a5">⚠️ ACTIVELY EXPLOITED IN THE WILD (CISA KEV)</strong> — Immediate patching required</div>' : ""}
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="color:#94a3b8;padding:6px 0;width:120px">Pillar</td><td style="color:#f1f5f9">${pillar}</td></tr>
    <tr><td style="color:#94a3b8;padding:6px 0">Resource</td><td style="color:#f1f5f9;font-family:monospace">${resource}</td></tr>
    ${cveId ? `<tr><td style="color:#94a3b8;padding:6px 0">CVE</td><td><a href="https://nvd.nist.gov/vuln/detail/${cveId}" style="color:#3b82f6">${cveId}</a></td></tr>` : ""}
    ${cvss ? `<tr><td style="color:#94a3b8;padding:6px 0">CVSS</td><td style="color:#f1f5f9">${cvss}</td></tr>` : ""}
  </table>
  <h3 style="color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:1px">Description</h3>
  <p style="color:#cbd5e1">${description}</p>
  <h3 style="color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:1px">Remediation</h3>
  <pre style="background:#0a0a0f;padding:12px;border-radius:6px;color:#86efac;font-size:12px;overflow:auto">${remediation}</pre>
  <div style="margin-top:24px;text-align:center">
    <a href="https://app.base44.com/apps/6a22a773bb173a975d8337f9" style="background:#3b82f6;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:700">Open ShieldAI Dashboard</a>
  </div>
</div></body></html>`;

      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "ShieldAI Alerts <alerts@shieldai.dev>",
          to: [ALERT_EMAIL],
          subject: `${emoji} [ShieldAI] ${sev}: ${title}`,
          html,
        }),
      });
      const d = await r.json();
      results.email = { sent: r.ok, id: d.id };
    } catch (e: any) { results.email = { sent: false, error: e.message }; }
  }

  // ── PAGERDUTY (critical only)
  if (PD_ROUTING_KEY && (channel === "pagerduty" || channel === "all") && finding?.severity === "critical") {
    try {
      const r = await fetch("https://events.pagerduty.com/v2/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routing_key: PD_ROUTING_KEY,
          event_action: "trigger",
          payload: {
            summary: `[ShieldAI] CRITICAL: ${title}`,
            severity: "critical",
            source: `ShieldAI — ${pillar}`,
            custom_details: { resource, description: description.slice(0, 500), cve_id: cveId, cvss, remediation: remediation.slice(0, 300) },
          },
          links: [{ href: "https://app.base44.com/apps/6a22a773bb173a975d8337f9", text: "Open ShieldAI" }],
        }),
      });
      const d = await r.json();
      results.pagerduty = { sent: r.ok, dedupe_key: d.dedup_key };
    } catch (e: any) { results.pagerduty = { sent: false, error: e.message }; }
  }

  const channelsSent = Object.entries(results).filter(([, v]) => v.sent).map(([k]) => k);

  return Response.json({
    success: true,
    finding_title: title,
    severity: finding?.severity,
    channels_sent: channelsSent,
    channels_failed: Object.entries(results).filter(([, v]) => !v.sent).map(([k]) => k),
    results,
  });
});
