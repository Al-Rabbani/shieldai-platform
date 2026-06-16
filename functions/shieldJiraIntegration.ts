// ShieldAI — Jira + Linear Ticket Integration v1
// Stage 8: Auto-create tickets for critical/high findings
// Supports: Jira Cloud, Linear, GitHub Issues (fallback)
// Writes jira_ticket URL back to TriagedFinding entity after creation
// Closes the full workflow loop: finding → triage → ticket → dev → fix → close

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── JIRA Cloud API helper
async function createJiraTicket(params: {
  jira_url: string;
  jira_email: string;
  jira_token: string;
  project_key: string;
  finding: any;
}): Promise<{ success: boolean; ticket_url?: string; ticket_id?: string; error?: string }> {
  const { jira_url, jira_email, jira_token, project_key, finding } = params;
  const base = jira_url.replace(/\/$/, "");
  const auth = btoa(`${jira_email}:${jira_token}`);

  // Map severity to Jira priority
  const priorityMap: Record<string, string> = {
    critical: "Highest",
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  // Build description in Jira Markdown
  const description = {
    version: 1,
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "ShieldAI Security Finding" }] },
      { type: "paragraph", content: [{ type: "text", text: finding.description || finding.title || "Security vulnerability detected." }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Details" }] },
      { type: "bulletList", content: [
        ...(finding.cve_id ? [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `CVE: ${finding.cve_id}` }] }] }] : []),
        ...(finding.cvss_score ? [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `CVSS Score: ${finding.cvss_score}` }] }] }] : []),
        ...(finding.epss_score ? [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `EPSS: ${(finding.epss_score * 100).toFixed(1)}% exploitation probability` }] }] }] : []),
        ...(finding.exploited_in_wild ? [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "⚠️ CISA KEV: Confirmed exploited in the wild" }] }] }] : []),
        ...(finding.asset_name ? [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `Asset: ${finding.asset_name}` }] }] }] : []),
        ...(finding.file_path ? [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `File: ${finding.file_path}${finding.line_number ? `:${finding.line_number}` : ""}` }] }] }] : []),
      ]},
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Remediation" }] },
      { type: "paragraph", content: [{ type: "text", text: finding.remediation || "Review and apply security patch." }] },
      ...(finding.autofix_pr_url ? [
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Auto-Fix Available" }] },
        { type: "paragraph", content: [{ type: "text", text: "ShieldAI has generated an automated fix PR: " }, { type: "text", text: finding.autofix_pr_url, marks: [{ type: "link", attrs: { href: finding.autofix_pr_url } }] }] },
      ] : []),
      { type: "paragraph", content: [{ type: "text", text: `— Reported by ShieldAI on ${new Date().toISOString().slice(0, 10)}` }] },
    ],
  };

  try {
    const res = await fetch(`${base}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        fields: {
          project: { key: project_key },
          summary: `[ShieldAI] ${(finding.normalized_severity || finding.severity || "high").toUpperCase()}: ${finding.title}`,
          description,
          issuetype: { name: "Bug" },
          priority: { name: priorityMap[finding.normalized_severity || finding.severity || "high"] || "High" },
          labels: ["security", "shieldai", finding.normalized_severity || finding.severity || "security"],
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `Jira API ${res.status}: ${err.slice(0, 200)}` };
    }

    const data = await res.json();
    return {
      success: true,
      ticket_id: data.key,
      ticket_url: `${base}/browse/${data.key}`,
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Linear API helper
async function createLinearTicket(params: {
  linear_token: string;
  team_id: string;
  finding: any;
}): Promise<{ success: boolean; ticket_url?: string; ticket_id?: string; error?: string }> {
  const { linear_token, team_id, finding } = params;

  const priorityMap: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
  const priority = priorityMap[finding.normalized_severity || finding.severity || "high"] || 2;

  const description = [
    `## ShieldAI Security Finding`,
    "",
    finding.description || finding.title,
    "",
    "### Details",
    ...(finding.cve_id ? [`- **CVE:** ${finding.cve_id}`] : []),
    ...(finding.cvss_score ? [`- **CVSS:** ${finding.cvss_score}`] : []),
    ...(finding.epss_score ? [`- **EPSS:** ${(finding.epss_score * 100).toFixed(1)}% exploit probability`] : []),
    ...(finding.exploited_in_wild ? [`- ⚠️ **CISA KEV:** Confirmed exploited in wild`] : []),
    ...(finding.asset_name ? [`- **Asset:** ${finding.asset_name}`] : []),
    "",
    "### Remediation",
    finding.remediation || "Apply security patch.",
    ...(finding.autofix_pr_url ? ["", `### Auto-Fix PR`, finding.autofix_pr_url] : []),
    "",
    `*Reported by ShieldAI — ${new Date().toISOString().slice(0, 10)}*`,
  ].join("\n");

  const mutation = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url }
      }
    }
  `;

  try {
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: linear_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            teamId: team_id,
            title: `[ShieldAI] ${(finding.normalized_severity || finding.severity || "HIGH").toUpperCase()}: ${finding.title}`,
            description,
            priority,
            labelIds: [],
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    if (data.errors) return { success: false, error: data.errors[0]?.message };
    const issue = data.data?.issueCreate?.issue;
    return { success: true, ticket_id: issue?.identifier, ticket_url: issue?.url };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── GitHub Issues fallback
async function createGitHubIssue(params: {
  github_token: string;
  repo_full_name: string;
  finding: any;
}): Promise<{ success: boolean; ticket_url?: string; ticket_id?: string; error?: string }> {
  const { github_token, repo_full_name, finding } = params;

  const labelMap: Record<string, string> = { critical: "critical", high: "high", medium: "medium", low: "low" };
  const sev = finding.normalized_severity || finding.severity || "high";

  const body = [
    `## 🛡️ ShieldAI Security Finding — ${sev.toUpperCase()}`,
    "",
    finding.description || finding.title,
    "",
    "| Field | Value |",
    "|---|---|",
    ...(finding.cve_id ? [`| CVE | \`${finding.cve_id}\` |`] : []),
    ...(finding.cvss_score ? [`| CVSS | ${finding.cvss_score} |`] : []),
    ...(finding.epss_score ? [`| EPSS | ${(finding.epss_score * 100).toFixed(1)}% |`] : []),
    ...(finding.exploited_in_wild ? [`| CISA KEV | ⚠️ Exploited in wild |`] : []),
    ...(finding.asset_name ? [`| Asset | ${finding.asset_name} |`] : []),
    ...(finding.file_path ? [`| File | \`${finding.file_path}${finding.line_number ? `:${finding.line_number}` : ""}\` |`] : []),
    "",
    "### Remediation",
    finding.remediation || "Apply security patch.",
    ...(finding.autofix_pr_url ? ["", `### 🤖 Auto-Fix PR`, finding.autofix_pr_url] : []),
    "",
    `*Reported by [ShieldAI](https://shieldai.dev) — ${new Date().toISOString().slice(0, 10)}*`,
  ].join("\n");

  try {
    const res = await fetch(`https://api.github.com/repos/${repo_full_name}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${github_token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "ShieldAI/1.0",
      },
      body: JSON.stringify({
        title: `[ShieldAI] ${sev.toUpperCase()}: ${finding.title}`,
        body,
        labels: ["security", labelMap[sev] || "high"],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `GitHub Issues ${res.status}: ${err.slice(0, 200)}` };
    }

    const data = await res.json();
    return { success: true, ticket_id: `#${data.number}`, ticket_url: data.html_url };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
    const body   = await req.json().catch(() => ({}));

    const {
      action = "create_for_findings",
      findings = [],
      finding,                   // single finding
      repo_full_name,
      scan_type,
      // Jira config (can also come from OrgSettings)
      jira_url,
      jira_email,
      jira_token,
      project_key,
      // Linear config
      linear_token,
      team_id,
      // Auto-detect from env
    } = body;

    // Load integration config from env (set in Builder secrets panel)
    const JIRA_URL      = jira_url      || Deno.env.get("JIRA_URL") || "";
    const JIRA_EMAIL    = jira_email    || Deno.env.get("JIRA_EMAIL") || "";
    const JIRA_TOKEN    = jira_token    || Deno.env.get("JIRA_API_TOKEN") || "";
    const PROJECT_KEY   = project_key   || Deno.env.get("JIRA_PROJECT_KEY") || "SEC";
    const LINEAR_TOKEN  = linear_token  || Deno.env.get("LINEAR_API_KEY") || "";
    const LINEAR_TEAM   = team_id       || Deno.env.get("LINEAR_TEAM_ID") || "";
    const GITHUB_TOKEN  = Deno.env.get("GITHUB_TOKEN") || "";
    const GH_REPO       = repo_full_name || Deno.env.get("GITHUB_REPO") || "";

    // Determine which system to use (priority: Jira → Linear → GitHub Issues)
    const useJira   = !!(JIRA_URL && JIRA_EMAIL && JIRA_TOKEN);
    const useLinear = !!(LINEAR_TOKEN && LINEAR_TEAM);
    const useGitHub = !!(GITHUB_TOKEN && GH_REPO);
    const system    = useJira ? "jira" : useLinear ? "linear" : useGitHub ? "github" : "none";

    console.log(`[JiraIntegration] action=${action} system=${system} findings=${findings.length}`);

    if (system === "none") {
      return new Response(JSON.stringify({
        success: false,
        error: "No ticket system configured",
        help: "Set JIRA_URL + JIRA_EMAIL + JIRA_API_TOKEN, or LINEAR_API_KEY + LINEAR_TEAM_ID, or GITHUB_TOKEN + GITHUB_REPO in Builder secrets",
        using_github_issues_by_default: false,
      }), { status: 200, headers: CORS });
    }

    // ── ACTION: create_for_findings — batch create tickets for multiple findings
    if (action === "create_for_findings" || action === "batch") {
      const toProcess = findings.length > 0 ? findings : (finding ? [finding] : []);
      if (!toProcess.length) {
        return new Response(JSON.stringify({ success: false, error: "No findings provided" }), { status: 400, headers: CORS });
      }

      const results = [];
      let created = 0, skipped = 0, errors = 0;

      for (const f of toProcess.slice(0, 20)) {
        // Skip if ticket already exists
        if (f.jira_ticket) { skipped++; continue; }

        let result: { success: boolean; ticket_url?: string; ticket_id?: string; error?: string };

        if (system === "jira") {
          result = await createJiraTicket({ jira_url: JIRA_URL, jira_email: JIRA_EMAIL, jira_token: JIRA_TOKEN, project_key: PROJECT_KEY, finding: f });
        } else if (system === "linear") {
          result = await createLinearTicket({ linear_token: LINEAR_TOKEN, team_id: LINEAR_TEAM, finding: f });
        } else {
          result = await createGitHubIssue({ github_token: GITHUB_TOKEN, repo_full_name: GH_REPO, finding: f });
        }

        results.push({ finding_title: f.title, ...result });

        if (result.success) {
          created++;
          // Write ticket URL back to TriagedFinding entity
          if (f.id || f.deduplication_key) {
            try {
              const existing = f.id
                ? [await base44.entities.TriagedFinding.get(f.id).catch(() => null)]
                : await base44.entities.TriagedFinding.filter({ deduplication_key: f.deduplication_key });
              if (existing[0]?.id) {
                await base44.entities.TriagedFinding.update(existing[0].id, {
                  jira_ticket: result.ticket_url,
                  notes: (existing[0].notes || "") + ` | Ticket: ${result.ticket_id}`,
                });
              }
            } catch (_) {}
          }
          // Create notification
          try {
            await base44.entities.Notification.create({
              type: "ticket_created",
              title: `🎫 Ticket created: ${result.ticket_id}`,
              message: `${system.toUpperCase()} ticket created for: ${f.title}`,
              severity: f.normalized_severity || f.severity || "high",
              resource_type: "TriagedFinding",
              action_url: result.ticket_url || "#",
              is_read: false,
              is_dismissed: false,
              channel: "in_app",
            });
          } catch (_) {}
        } else {
          errors++;
          console.warn(`[JiraIntegration] Failed for "${f.title}": ${result.error}`);
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 300));
      }

      // Audit log
      try {
        await base44.entities.AuditLog.create({
          actor_type: "system",
          action: "TICKETS_CREATED",
          resource_type: "TriagedFinding",
          resource_id: "batch",
          resource_name: `${system} integration`,
          details: `system=${system} created=${created} skipped=${skipped} errors=${errors}`,
          severity: errors > 0 ? "high" : "info",
          outcome: errors === toProcess.length ? "failure" : "success",
        });
      } catch (_) {}

      return new Response(JSON.stringify({
        success: created > 0,
        system,
        created, skipped, errors,
        results: results.slice(0, 10),
        message: `Created ${created} tickets in ${system.toUpperCase()}`,
      }), { status: 200, headers: CORS });
    }

    // ── ACTION: test_connection — verify credentials work
    if (action === "test_connection") {
      if (useJira) {
        try {
          const res = await fetch(`${JIRA_URL.replace(/\/$/, "")}/rest/api/3/myself`, {
            headers: { Authorization: `Basic ${btoa(`${JIRA_EMAIL}:${JIRA_TOKEN}`)}`, Accept: "application/json" },
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          return new Response(JSON.stringify({ success: res.ok, system: "jira", user: data.displayName, accountId: data.accountId, jira_url: JIRA_URL }), { headers: CORS });
        } catch (e: any) {
          return new Response(JSON.stringify({ success: false, system: "jira", error: e.message }), { headers: CORS });
        }
      }
      if (useLinear) {
        try {
          const res = await fetch("https://api.linear.app/graphql", {
            method: "POST",
            headers: { Authorization: LINEAR_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify({ query: "{ viewer { id name email } }" }),
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          return new Response(JSON.stringify({ success: !data.errors, system: "linear", user: data.data?.viewer?.name }), { headers: CORS });
        } catch (e: any) {
          return new Response(JSON.stringify({ success: false, system: "linear", error: e.message }), { headers: CORS });
        }
      }
      if (useGitHub) {
        try {
          const res = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "ShieldAI/1.0" }, signal: AbortSignal.timeout(8000) });
          const data = await res.json();
          return new Response(JSON.stringify({ success: res.ok, system: "github_issues", user: data.login, repo: GH_REPO }), { headers: CORS });
        } catch (e: any) {
          return new Response(JSON.stringify({ success: false, system: "github_issues", error: e.message }), { headers: CORS });
        }
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: create_for_findings | test_connection" }), { status: 400, headers: CORS });

  } catch (err: any) {
    console.error("[JiraIntegration] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
});
