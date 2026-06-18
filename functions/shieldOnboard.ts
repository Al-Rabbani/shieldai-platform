// ShieldAI — Onboarding Engine v2 (SDK client)
// Guided onboarding: connect GitHub → connect Cloud → first scan → show findings
// Also seeds OrgSettings, triggers initial Global Risk Score

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action = "status", org_name, org_domain, industry = "technology", plan = "trial", github_token, repos = [] } = body;

    const token = github_token || Deno.env.get("GITHUB_TOKEN") || "";

    // ── STATUS: check onboarding completion
    if (action === "status") {
      const [orgSettings, cloudAccounts, codeRepos, triaged, globalScore] = await Promise.all([
        base44.entities.OrgSettings.list().catch(() => []),
        base44.entities.CloudAccount.list().catch(() => []),
        base44.entities.CodeRepository.list().catch(() => []),
        base44.entities.TriagedFinding.list().catch(() => []),
        base44.entities.GlobalRiskScore.list().catch(() => []),
      ]);
      const steps = [
        { id: "org_setup", name: "Organisation Setup", complete: orgSettings.length > 0, description: "Configure org name, domain, and plan" },
        { id: "github_connect", name: "Connect GitHub", complete: !!token || codeRepos.length > 0, description: "Connect GitHub to scan code repositories" },
        { id: "first_scan", name: "First Code Scan", complete: triaged.length > 0, description: "Run your first SAST/SCA scan" },
        { id: "cloud_connect", name: "Connect Cloud", complete: cloudAccounts.length > 0, description: "Connect AWS/GCP/Azure for cloud scanning" },
        { id: "risk_score", name: "Risk Score Calculated", complete: globalScore.length > 0, description: "View your platform security score" },
      ];
      const completed = steps.filter(s => s.complete).length;
      return new Response(JSON.stringify({ success: true, completion_pct: Math.round(completed / steps.length * 100), steps, org_configured: orgSettings.length > 0, findings_count: triaged.length, assets_count: cloudAccounts.length + codeRepos.length }), { headers: CORS });
    }

    // ── SETUP ORG
    if (action === "setup_org") {
      const existing = await base44.entities.OrgSettings.list().catch(() => []);
      const orgData = { org_name: org_name || "My Organisation", org_domain: org_domain || "", plan, industry, sla_critical_hours: 24, sla_high_hours: 72, sla_medium_hours: 168, auto_triage_enabled: true, auto_fix_enabled: true, ci_gate_enabled: true, ci_gate_block_severity: "critical", created_at: new Date().toISOString() };
      if (existing.length > 0) {
        await base44.entities.OrgSettings.update(existing[0].id, orgData);
      } else {
        await base44.entities.OrgSettings.create(orgData);
      }
      return new Response(JSON.stringify({ success: true, action: "setup_org", org: orgData }), { headers: CORS });
    }

    // ── LIST REPOS from GitHub
    if (action === "list_repos") {
      if (!token) return new Response(JSON.stringify({ error: "github_token required" }), { status: 400, headers: CORS });
      try {
        const [userRepos, orgs] = await Promise.all([
          fetch("https://api.github.com/user/repos?per_page=30&sort=updated&type=owner", { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "ShieldAI" } }).then(r => r.json()),
          fetch("https://api.github.com/user/orgs", { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "ShieldAI" } }).then(r => r.json()),
        ]);
        return new Response(JSON.stringify({ success: true, repos: (Array.isArray(userRepos) ? userRepos : []).slice(0, 30).map((r: any) => ({ full_name: r.full_name, name: r.name, language: r.language, private: r.private, default_branch: r.default_branch, updated_at: r.updated_at, stars: r.stargazers_count })), orgs: (Array.isArray(orgs) ? orgs : []).map((o: any) => o.login) }), { headers: CORS });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS }); }
    }

    // ── TRIGGER FIRST SCAN for selected repos
    if (action === "trigger_scan") {
      if (!repos.length) return new Response(JSON.stringify({ error: "repos array required" }), { status: 400, headers: CORS });
      const results = [];
      for (const repo of repos.slice(0, 5)) {
        try {
          await base44.entities.CodeRepository.create({ name: repo.split("/")[1] || repo, full_name: repo, provider: "github", url: `https://github.com/${repo}`, status: "scanning", last_scanned: new Date().toISOString() });
          await base44.entities.ScanJob.create({ job_type: "sca", target: repo, status: "pending", triggered_by: "onboarding", trigger_type: "manual", started_at: new Date().toISOString() });
          results.push({ repo, status: "scan_queued" });
        } catch (e: any) { results.push({ repo, status: "error", error: e.message }); }
      }
      return new Response(JSON.stringify({ success: true, scans_queued: results.filter(r => r.status === "scan_queued").length, results }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: status | setup_org | list_repos | trigger_scan" }), { status: 400, headers: CORS });
  } catch (err: any) { return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS }); }
});
