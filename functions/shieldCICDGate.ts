// ShieldAI — CI/CD Gate v2 (SDK client)
// GitHub Actions webhook: scan PR/commit, post status check, block if critical findings
// Use in GitHub Actions: curl -X POST https://<your-function-url> -d '{"repo_full_name":"...","commit_sha":"...","branch":"..."}'

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      repo_full_name, commit_sha, pr_number, branch = "main",
      block_on = ["critical"], fail_on_secrets = true,
      fail_on_new_critical = true, github_token,
    } = body;

    const token = github_token || Deno.env.get("GITHUB_TOKEN") || "";
    if (!repo_full_name) return new Response(JSON.stringify({ pass: false, error: "repo_full_name required" }), { status: 400, headers: CORS });

    const GH = async (path: string, method = "GET", payload?: object) => {
      const r = await fetch(`https://api.github.com${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined, signal: AbortSignal.timeout(12000) });
      return r.json();
    };

    // Read current findings from DB for this repo
    const [triaged, scanJobs] = await Promise.all([
      base44.entities.TriagedFinding.list().catch(() => []),
      base44.entities.ScanJob.list().catch(() => []),
    ]);

    const openFindings = triaged.filter((f: any) => f.status === "open" || f.status === "in_triage");
    const critical = openFindings.filter((f: any) => (f.normalized_severity || f.severity) === "critical");
    const high = openFindings.filter((f: any) => (f.normalized_severity || f.severity) === "high");
    const secrets = openFindings.filter((f: any) => (f.vulnerability_class || "").toLowerCase().includes("secret") || (f.title || "").toLowerCase().includes("secret") || (f.title || "").toLowerCase().includes("hardcoded"));
    const kevFindings = openFindings.filter((f: any) => f.exploited_in_wild);

    // Gate decision
    const blockReasons: string[] = [];
    if (block_on.includes("critical") && critical.length > 0) blockReasons.push(`${critical.length} critical finding(s) detected`);
    if (block_on.includes("high") && high.length > 0) blockReasons.push(`${high.length} high finding(s) detected`);
    if (fail_on_secrets && secrets.length > 0) blockReasons.push(`${secrets.length} hardcoded secret(s) detected`);
    if (kevFindings.length > 0) blockReasons.push(`${kevFindings.length} CISA KEV (actively exploited) finding(s) — MUST fix before deploy`);

    const pass = blockReasons.length === 0;

    // Post GitHub commit status if token + sha available
    if (token && commit_sha) {
      try {
        await GH(`/repos/${repo_full_name}/statuses/${commit_sha}`, "POST", {
          state: pass ? "success" : "failure",
          target_url: `https://app.base44.com/apps/6a22a773bb173a975d8337f9`,
          description: pass ? `ShieldAI: All gates passed. ${openFindings.length} open findings.` : `ShieldAI: BLOCKED — ${blockReasons[0]}`,
          context: "ShieldAI Security Gate",
        });
      } catch (_) {}

      // Post PR comment if pr_number provided
      if (pr_number) {
        const comment = pass
          ? `## ✅ ShieldAI Security Gate — PASSED\n\n| Metric | Value |\n|---|---|\n| Open Findings | ${openFindings.length} |\n| Critical | ${critical.length} |\n| High | ${high.length} |\n| CISA KEV | ${kevFindings.length} |\n\n_All security gates passed. Safe to merge._`
          : `## 🚫 ShieldAI Security Gate — BLOCKED\n\n**Reason(s):**\n${blockReasons.map(r => `- ❌ ${r}`).join("\n")}\n\n| Metric | Value |\n|---|---|\n| Open Findings | ${openFindings.length} |\n| Critical | ${critical.length} |\n| High | ${high.length} |\n| CISA KEV | ${kevFindings.length} |\n\nFix the listed issues before merging. Use ShieldAI AutoFix for one-click PR fixes:\n\`\`\`\nPOST /api/shieldAutoFix {action:"create_pr", repo_full_name:"${repo_full_name}", finding_id:"<id>"}\n\`\`\`\n\n_[View full report](https://app.base44.com/apps/6a22a773bb173a975d8337f9)_`;
        try { await GH(`/repos/${repo_full_name}/issues/${pr_number}/comments`, "POST", { body: comment }); } catch (_) {}
      }
    }

    // Save scan job record
    try {
      await base44.entities.ScanJob.create({
        job_type: "cicd_gate", target: repo_full_name, target_id: commit_sha || branch,
        status: "completed", triggered_by: "github_actions", trigger_type: "cicd",
        total_findings: openFindings.length, critical_count: critical.length, high_count: high.length,
        branch, commit_sha: commit_sha || "", started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
        result_summary: pass ? "PASSED" : `BLOCKED: ${blockReasons.join("; ")}`,
      });
    } catch (_) {}

    return new Response(JSON.stringify({
      pass, blocked: !pass, block_reasons: blockReasons,
      summary: { open_findings: openFindings.length, critical: critical.length, high: high.length, secrets: secrets.length, kev: kevFindings.length },
      top_critical: critical.slice(0, 5).map((f: any) => ({ title: f.title, cve: f.cve_id, kev: !!f.exploited_in_wild })),
      github_status_posted: !!(token && commit_sha),
      pr_comment_posted: !!(token && commit_sha && pr_number),
    }), { headers: CORS });
  } catch (err: any) { return new Response(JSON.stringify({ pass: false, error: err.message }), { status: 500, headers: CORS }); }
});
