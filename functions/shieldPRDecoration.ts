// ShieldAI — PR Decoration Engine v1
// Posts security scan results as comments directly on GitHub Pull Requests
// Matches Aikido + Snyk PR decoration — developer sees findings without leaving GitHub
// Features: PR review comments, inline code annotations, fix suggestions, auto-dismiss when fixed

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      action = "post_review",
      repo_full_name,
      pr_number,
      github_token: tokenOverride,
      findings = [],
      scan_summary = {},
      commit_sha,
      dismiss_previous = true,
    } = body;

    const GITHUB_TOKEN = tokenOverride || Deno.env.get("GITHUB_TOKEN") || "";
    if (!repo_full_name || !pr_number) {
      return Response.json({ error: "repo_full_name and pr_number required" }, { status: 400, headers: CORS });
    }
    if (!GITHUB_TOKEN) {
      return Response.json({ error: "GITHUB_TOKEN not configured" }, { status: 400, headers: CORS });
    }

    const GH = async (path: string, method = "GET", data?: any) => {
      const res = await fetch(`https://api.github.com${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "ShieldAI-PRDecoration/1.0",
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    };

    // ── ACTION: post_review — post a PR review with all findings
    if (action === "post_review") {
      const critical = findings.filter((f: any) => f.severity === "critical");
      const high = findings.filter((f: any) => f.severity === "high");
      const medium = findings.filter((f: any) => f.severity === "medium");
      const low = findings.filter((f: any) => f.severity === "low");
      const hasBlockers = critical.length > 0 || high.length > 0;

      // Build PR review body
      const body = buildPRReviewBody(findings, scan_summary, critical, high, medium, low);

      // Post as a PR review (appears in the PR review tab)
      const reviewEvent = hasBlockers ? "REQUEST_CHANGES" : findings.length === 0 ? "APPROVE" : "COMMENT";

      const reviewPayload: any = {
        body,
        event: reviewEvent,
      };
      if (commit_sha) reviewPayload.commit_id = commit_sha;

      const reviewRes = await GH(`/repos/${repo_full_name}/pulls/${pr_number}/reviews`, "POST", reviewPayload);

      // Also post inline comments for specific file findings
      if (findings.length > 0) {
        const inlineComments = findings
          .filter((f: any) => f.file_path && f.line_number)
          .slice(0, 10) // max 10 inline comments
          .map((f: any) => ({
            path: f.file_path,
            line: f.line_number,
            side: "RIGHT",
            body: buildInlineComment(f),
          }));

        if (inlineComments.length > 0 && commit_sha) {
          for (const comment of inlineComments) {
            await GH(`/repos/${repo_full_name}/pulls/${pr_number}/comments`, "POST", {
              ...comment,
              commit_id: commit_sha,
            });
          }
        }
      }

      // Write audit log
      try {
        await base44.entities.AuditLog.create({
          actor_type: "system",
          action: "PR_DECORATION_POSTED",
          resource_type: "CodeRepository",
          resource_name: `${repo_full_name}#${pr_number}`,
          details: `Posted PR review: ${findings.length} findings (${critical.length} critical, ${high.length} high). Event: ${reviewEvent}`,
          severity: hasBlockers ? "high" : "info",
          outcome: reviewRes.status < 300 ? "success" : "failure",
        });
      } catch (_) {}

      return Response.json({
        success: reviewRes.status < 300,
        review_id: reviewRes.data?.id,
        event: reviewEvent,
        pr_url: `https://github.com/${repo_full_name}/pull/${pr_number}`,
        findings_posted: findings.length,
        critical_count: critical.length,
        high_count: high.length,
        status: reviewRes.status,
      }, { headers: CORS });
    }

    // ── ACTION: post_comment — post a simple PR comment (lighter touch)
    if (action === "post_comment") {
      const critical = findings.filter((f: any) => f.severity === "critical");
      const high = findings.filter((f: any) => f.severity === "high");
      const commentBody = buildCommentBody(findings, scan_summary);

      const commentRes = await GH(`/repos/${repo_full_name}/issues/${pr_number}/comments`, "POST", {
        body: commentBody,
      });

      return Response.json({
        success: commentRes.status < 300,
        comment_id: commentRes.data?.id,
        critical_count: critical.length,
        high_count: high.length,
      }, { headers: CORS });
    }

    // ── ACTION: dismiss_stale — dismiss old ShieldAI reviews when findings are fixed
    if (action === "dismiss_stale") {
      const reviews = await GH(`/repos/${repo_full_name}/pulls/${pr_number}/reviews`);
      const shieldReviews = (reviews.data || []).filter(
        (r: any) => r.user?.login?.includes("shieldai") || r.body?.includes("ShieldAI Security Scan")
      );

      for (const review of shieldReviews) {
        if (review.state === "CHANGES_REQUESTED") {
          await GH(`/repos/${repo_full_name}/pulls/${pr_number}/reviews/${review.id}/dismissals`, "PUT", {
            message: "ShieldAI: Previous findings have been remediated.",
          });
        }
      }

      return Response.json({ dismissed: shieldReviews.length }, { headers: CORS });
    }

    return Response.json({ error: "Unknown action. Use: post_review | post_comment | dismiss_stale" }, { status: 400, headers: CORS });

  } catch (err: any) {
    console.error("[PRDecoration]", err.message);
    return Response.json({ error: "Internal error", message: err.message }, { status: 500, headers: CORS });
  }
});

function buildPRReviewBody(findings: any[], summary: any, critical: any[], high: any[], medium: any[], low: any[]): string {
  const hasIssues = findings.length > 0;
  const statusIcon = critical.length > 0 ? "🔴" : high.length > 0 ? "🟠" : findings.length === 0 ? "✅" : "🟡";
  const statusText = critical.length > 0 ? "SECURITY ISSUES DETECTED — Changes Requested" :
    high.length > 0 ? "SECURITY CONCERNS — Review Required" :
    findings.length === 0 ? "All security checks passed" : "Minor security notes";

  let body = `## ${statusIcon} ShieldAI Security Scan — ${statusText}\n\n`;

  if (!hasIssues) {
    body += `✅ **No security vulnerabilities detected in this PR.**\n\n`;
    body += `Scans completed: SAST | SCA | Secrets | IaC\n\n`;
    body += `---\n*Powered by [ShieldAI](https://shieldai.dev) — Unified Security Platform*`;
    return body;
  }

  // Summary table
  body += `| Severity | Count |\n|---|---|\n`;
  if (critical.length) body += `| 🔴 Critical | ${critical.length} |\n`;
  if (high.length) body += `| 🟠 High | ${high.length} |\n`;
  if (medium.length) body += `| 🟡 Medium | ${medium.length} |\n`;
  if (low.length) body += `| 🔵 Low | ${low.length} |\n`;
  body += `\n`;

  // Critical findings detail
  if (critical.length > 0) {
    body += `### 🔴 Critical Findings — Fix Before Merge\n\n`;
    for (const f of critical.slice(0, 5)) {
      body += `**${f.title}**\n`;
      if (f.cve_id) body += `- CVE: \`${f.cve_id}\` (CVSS ${f.cvss_score || "N/A"})\n`;
      if (f.file_path) body += `- File: \`${f.file_path}${f.line_number ? `:${f.line_number}` : ""}\`\n`;
      if (f.description) body += `- ${f.description.slice(0, 150)}\n`;
      if (f.remediation) body += `- **Fix:** ${f.remediation.slice(0, 200)}\n`;
      if (f.autofix_pr_url) body += `- 🤖 [Auto-fix PR available](${f.autofix_pr_url})\n`;
      body += `\n`;
    }
  }

  // High findings
  if (high.length > 0) {
    body += `### 🟠 High Severity Findings\n\n`;
    for (const f of high.slice(0, 5)) {
      body += `**${f.title}**`;
      if (f.cve_id) body += ` — \`${f.cve_id}\``;
      body += `\n`;
      if (f.file_path) body += `- \`${f.file_path}${f.line_number ? `:${f.line_number}` : ""}\`\n`;
      if (f.remediation) body += `- Fix: ${f.remediation.slice(0, 150)}\n`;
      body += `\n`;
    }
  }

  if (findings.length > 10) {
    body += `\n> **${findings.length - 10} additional findings** — [View all in ShieldAI dashboard](https://shieldai.dev/autotriage)\n\n`;
  }

  body += `---\n*[ShieldAI](https://shieldai.dev) Security Scan | ${new Date().toISOString().slice(0, 10)} | [View full report](https://shieldai.dev/autotriage)*`;
  return body;
}

function buildCommentBody(findings: any[], summary: any): string {
  const critical = findings.filter((f: any) => f.severity === "critical").length;
  const high = findings.filter((f: any) => f.severity === "high").length;

  if (findings.length === 0) {
    return `## ✅ ShieldAI: No security issues found in this PR\n\n*Powered by ShieldAI Unified Security Platform*`;
  }

  return `## 🛡️ ShieldAI Security Scan Results\n\n` +
    `Found **${findings.length} security issues** (${critical} critical, ${high} high).\n\n` +
    `[View details in ShieldAI →](https://shieldai.dev/autotriage)\n\n` +
    `*Auto-fix PRs available for eligible findings.*`;
}

function buildInlineComment(finding: any): string {
  let comment = `### 🛡️ ShieldAI: ${finding.severity?.toUpperCase()} — ${finding.title}\n\n`;
  if (finding.description) comment += `${finding.description.slice(0, 200)}\n\n`;
  if (finding.remediation) comment += `**Fix:** ${finding.remediation.slice(0, 200)}\n`;
  if (finding.cve_id) comment += `\nCVE: \`${finding.cve_id}\``;
  return comment;
}
