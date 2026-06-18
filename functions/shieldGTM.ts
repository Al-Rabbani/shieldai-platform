// ShieldAI — GTM / Onboarding Wizard + Demo Mode v1
// Stage 20: Trial limits, demo seed data, onboarding UX, upgrade prompts
// Demo mode: seeds realistic data for new users to explore the platform
// Trial: enforces feature gates, tracks usage, shows upgrade CTAs

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };

// Demo data templates — realistic, production-like sample data
const DEMO_FINDINGS = [
  { title: "CVE-2024-3094 — XZ Utils Backdoor (Supply Chain)", normalized_severity: "critical", status: "open", source_scanners: "sca,supply_chain", cve_id: "CVE-2024-3094", cvss_score: 10.0, epss_score: 0.94, exploited_in_wild: true, sla_breached: true, asset_name: "xz-utils", asset_type: "package", owner_team: "Platform", first_detected: new Date(Date.now() - 7 * 86400000).toISOString() },
  { title: "Log4Shell Remote Code Execution", normalized_severity: "critical", status: "open", source_scanners: "sca,dast", cve_id: "CVE-2021-44228", cvss_score: 10.0, epss_score: 0.97, exploited_in_wild: true, sla_breached: true, asset_name: "log4j-core", asset_type: "package", owner_team: "Backend", first_detected: new Date(Date.now() - 14 * 86400000).toISOString() },
  { title: "Hardcoded AWS Access Key in Source Code", normalized_severity: "critical", status: "open", source_scanners: "sast,secrets", sla_breached: true, asset_name: "src/config.js", asset_type: "file", owner_team: "Backend", first_detected: new Date(Date.now() - 3 * 86400000).toISOString() },
  { title: "SQL Injection in /api/users endpoint", normalized_severity: "high", status: "open", source_scanners: "dast,pentest", cve_id: null, cvss_score: 8.8, asset_name: "/api/users", asset_type: "endpoint", owner_team: "API Team", first_detected: new Date(Date.now() - 5 * 86400000).toISOString() },
  { title: "S3 Bucket Publicly Accessible — customer-data", normalized_severity: "critical", status: "open", source_scanners: "cloud", sla_breached: true, asset_name: "s3://customer-data-prod", asset_type: "cloud_resource", owner_team: "DevOps", first_detected: new Date(Date.now() - 2 * 86400000).toISOString() },
  { title: "Container Running as Root — api-server", normalized_severity: "high", status: "open", source_scanners: "container,k8s", asset_name: "api-server:latest", asset_type: "container", owner_team: "Platform", first_detected: new Date(Date.now() - 10 * 86400000).toISOString() },
  { title: "Admin IAM User Without MFA — john.doe@company.com", normalized_severity: "high", status: "open", source_scanners: "cloud,ciem", asset_name: "john.doe@company.com", asset_type: "iam_user", owner_team: "Security", first_detected: new Date(Date.now() - 1 * 86400000).toISOString() },
  { title: "OpenSSL Buffer Overflow — CVE-2024-5535", normalized_severity: "critical", status: "open", source_scanners: "container,vm", cve_id: "CVE-2024-5535", cvss_score: 9.1, epss_score: 0.71, asset_name: "openssl", asset_type: "package", fixed_version: "3.0.14", owner_team: "Platform", autofix_available: true, first_detected: new Date(Date.now() - 6 * 86400000).toISOString() },
  { title: "Cross-Site Scripting in /search?q= parameter", normalized_severity: "high", status: "open", source_scanners: "dast", cve_id: null, cvss_score: 7.4, asset_name: "/search", asset_type: "endpoint", owner_team: "Frontend", first_detected: new Date(Date.now() - 8 * 86400000).toISOString() },
  { title: "Kubernetes RBAC: cluster-admin bound to default ServiceAccount", normalized_severity: "critical", status: "open", source_scanners: "k8s", sla_breached: true, asset_name: "default:default", asset_type: "k8s_serviceaccount", owner_team: "Platform", first_detected: new Date(Date.now() - 4 * 86400000).toISOString() },
];

const DEMO_ATTACK_SURFACE = [
  { asset: "admin.demo-company.com", asset_type: "admin_panel", url: "https://admin.demo-company.com", ip: "192.168.1.100", port: 443, protocol: "HTTPS", status: "active", risk_level: "critical", is_internet_facing: true, technologies: "WordPress, PHP, Nginx", finding_count: 3, notes: "Ports: 80, 443 | Title: Admin Panel | Server: nginx/1.18.0" },
  { asset: "api.demo-company.com", asset_type: "api_endpoint", url: "https://api.demo-company.com", ip: "192.168.1.101", port: 443, protocol: "HTTPS", status: "active", risk_level: "high", is_internet_facing: true, technologies: "Node.js, Express, AWS", finding_count: 2, notes: "GraphQL endpoint exposed | CSP ✓ | HSTS ✓" },
  { asset: "staging.demo-company.com", asset_type: "exposed_service", url: "https://staging.demo-company.com", ip: "192.168.1.102", port: 443, protocol: "HTTPS", status: "active", risk_level: "high", is_internet_facing: true, technologies: "React, Next.js, Cloudflare", finding_count: 1, notes: "Staging environment publicly accessible | No auth gate detected" },
  { asset: "demo-company.com/.env", asset_type: "legacy_endpoint", url: "https://demo-company.com/.env", ip: "192.168.1.100", port: 443, protocol: "HTTPS", status: "active", risk_level: "critical", is_internet_facing: true, technologies: "", finding_count: 1, notes: "Sensitive path exposed. HTTP 200. Potential env file exposure" },
];

const DEMO_COMPLIANCE = [
  { name: "SOC2", version: "2017", total_controls: 64, passing: 31, failing: 18, not_tested: 15, score: 48, status: "partial", owner: "Security Team", next_audit: new Date(Date.now() + 90 * 86400000).toISOString() },
  { name: "ISO27001", version: "2022", total_controls: 93, passing: 42, failing: 28, not_tested: 23, score: 45, status: "partial", owner: "CISO", next_audit: new Date(Date.now() + 180 * 86400000).toISOString() },
  { name: "GDPR", version: "2018", total_controls: 45, passing: 28, failing: 12, not_tested: 5, score: 62, status: "partial", owner: "DPO", next_audit: new Date(Date.now() + 60 * 86400000).toISOString() },
];

const DEMO_DARK_WEB = [
  { alert_type: "domain_impersonation", severity: "medium", status: "new", target: "demo-company.com", target_type: "domain", title: "3 Lookalike Domains Detected for demo-company.com", description: "Certificate Transparency logs show demo-cornpany.com, demo-company.io, and demo-cornpany.io registered — potential phishing infrastructure.", source: "crt.sh Certificate Transparency", remediation: "Monitor these domains. Set up phishing alerts. Consider registering closest typosquats defensively.", detected_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { alert_type: "ransomware_mention", severity: "high", status: "new", target: "Demo Company", target_type: "organization", title: "Ransomware Group 8base Targeting Similar Companies", description: "8base ransomware group has targeted 3 companies in the same sector in the last 30 days. No direct match found but sector risk is elevated.", source: "ransomware.live", ransomware_group: "8base", remediation: "Ensure backups are isolated and tested. Review incident response plan. Check for IOCs.", detected_at: new Date(Date.now() - 1 * 86400000).toISOString() },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action = "status" } = body;

    // ── DEMO MODE: seed realistic data for new users
    if (action === "seed_demo") {
      const results: any = { seeded: {} };
      // Seed TriagedFindings
      let ff = 0;
      for (const f of DEMO_FINDINGS) {
        try { await base44.entities.TriagedFinding.create({ ...f, deduplication_key: `demo-${f.cve_id || f.title.slice(0, 20).replace(/\s/g, "-")}`, source_count: 1, noise_reduced: false, reachability: "direct", exploitability: f.exploited_in_wild ? "high" : "medium", business_criticality: "high" }); ff++; } catch (_) {}
      }
      results.seeded.findings = ff;
      // Seed AttackSurface
      let as = 0;
      for (const a of DEMO_ATTACK_SURFACE) { try { await base44.entities.AttackSurface.create({ ...a, first_seen: new Date().toISOString(), last_seen: new Date().toISOString() }); as++; } catch (_) {} }
      results.seeded.attack_surface = as;
      // Seed ComplianceFramework
      let cf = 0;
      for (const c of DEMO_COMPLIANCE) { try { await base44.entities.ComplianceFramework.create({ ...c, last_assessed: new Date().toISOString() }); cf++; } catch (_) {} }
      results.seeded.compliance = cf;
      // Seed DarkWebAlerts
      let dw = 0;
      for (const d of DEMO_DARK_WEB) { try { await base44.entities.DarkWebAlert.create(d); dw++; } catch (_) {} }
      results.seeded.dark_web = dw;
      // Setup OrgSettings
      try {
        const existing = await base44.entities.OrgSettings.list().catch(() => []);
        const orgData = { org_name: "Demo Company", org_domain: "demo-company.com", plan: "trial", industry: "technology", sla_critical_hours: 24, sla_high_hours: 72, sla_medium_hours: 168, auto_triage_enabled: true, auto_fix_enabled: true, ci_gate_enabled: true, ci_gate_block_severity: "critical" };
        if (existing.length > 0) { await base44.entities.OrgSettings.update(existing[0].id, orgData); } else { await base44.entities.OrgSettings.create(orgData); }
        results.seeded.org_settings = true;
      } catch (_) {}
      return new Response(JSON.stringify({ success: true, message: "Demo data seeded successfully", results, next_step: "Call POST /api/shieldGlobalScore {action:'calculate'} to compute your first risk score" }), { headers: CORS });
    }

    // ── TRIAL STATUS
    if (action === "trial_status") {
      const [triaged, cloudA, codeR, scans, orgS] = await Promise.all([
        base44.entities.TriagedFinding.list().catch(() => []),
        base44.entities.CloudAccount.list().catch(() => []),
        base44.entities.CodeRepository.list().catch(() => []),
        base44.entities.ScanJob.list().catch(() => []),
        base44.entities.OrgSettings.list().catch(() => []),
      ]);
      const org = orgS[0] || {};
      const plan = org.plan || "trial";
      const LIMITS: Record<string, any> = {
        trial: { repos: 2, cloud_accounts: 1, scans_per_day: 5, findings_shown: 25, report_export: false, mssp: false, autofix: false },
        starter: { repos: 5, cloud_accounts: 2, scans_per_day: 20, findings_shown: 500, report_export: true, mssp: false, autofix: true },
        professional: { repos: 25, cloud_accounts: 10, scans_per_day: 100, findings_shown: 9999, report_export: true, mssp: false, autofix: true },
        enterprise: { repos: 9999, cloud_accounts: 9999, scans_per_day: 9999, findings_shown: 9999, report_export: true, mssp: true, autofix: true },
      };
      const limits = LIMITS[plan] || LIMITS.trial;
      const usage = { repos: codeR.length, cloud_accounts: cloudA.length, total_scans: scans.length, total_findings: triaged.length };
      const upgrade_triggers = [
        codeR.length >= limits.repos ? `Repo limit reached (${codeR.length}/${limits.repos})` : null,
        cloudA.length >= limits.cloud_accounts ? `Cloud account limit reached` : null,
        !limits.autofix && triaged.filter((f: any) => f.autofix_available).length > 0 ? `${triaged.filter((f: any) => f.autofix_available).length} AutoFix PRs available — upgrade to unlock` : null,
        !limits.report_export ? "Report export requires Starter plan or above" : null,
      ].filter(Boolean);
      return new Response(JSON.stringify({ success: true, plan, limits, usage, upgrade_triggers, upgrade_url: "https://app.base44.com/apps/6a22a773bb173a975d8337f9/upgrade", plans: { starter: { price: "$49/mo", features: ["5 repos", "2 cloud accounts", "Report export", "AutoFix PRs"] }, professional: { price: "$199/mo", features: ["25 repos", "10 cloud accounts", "All scan types", "Pentest engine", "Priority support"] }, enterprise: { price: "Custom", features: ["Unlimited", "MSSP mode", "White-label", "Dedicated support", "Custom SLAs"] } } }), { headers: CORS });
    }

    // ── CHANGELOG
    if (action === "changelog") {
      return new Response(JSON.stringify({ success: true, version: "2.0.0", releases: [
        { version: "2.0.0", date: new Date().toISOString().split("T")[0], highlights: ["Global Risk Score dashboard", "Dark Web Monitor with ransomware.live", "LLM Security with prompt injection detection", "SBOM Generator (CycloneDX 1.5 + SPDX 2.3)", "Attack Surface with Shodan", "AI Remediation Copilot", "MSSP Multi-tenancy", "Integrations Hub (Slack, Teams, PagerDuty)", "Security Reports (Executive, CISO, Audit Evidence)"] },
        { version: "1.5.0", date: "2026-06-15", highlights: ["CIEM identity scanning", "DSPM data classification", "Security Graph attack paths", "AutoTriage v4 with EPSS + CISA KEV"] },
        { version: "1.0.0", date: "2026-06-10", highlights: ["SAST/SCA code scanning", "Cloud scanning (AWS/Azure/GCP)", "Container scanning", "DAST web scanning", "Compliance frameworks (SOC2, ISO27001, GDPR, HIPAA, PCI-DSS, NIST CSF)", "AI Pentest engine"] },
      ] }), { headers: CORS });
    }

    // ── STATUS: overall GTM readiness check
    if (action === "status") {
      const [orgS, triaged, cloudA, scores, darkWeb] = await Promise.all([
        base44.entities.OrgSettings.list().catch(() => []),
        base44.entities.TriagedFinding.list().catch(() => []),
        base44.entities.CloudAccount.list().catch(() => []),
        base44.entities.GlobalRiskScore.list().catch(() => []),
        base44.entities.DarkWebAlert.list().catch(() => []),
      ]);
      scores.sort((a: any, b: any) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime());
      const org = orgS[0] || {};
      return new Response(JSON.stringify({ success: true, platform_ready: triaged.length > 0, org_configured: !!org.org_name, plan: org.plan || "trial", total_findings: triaged.length, cloud_accounts: cloudA.length, risk_score: scores[0]?.overall_score || null, grade: scores[0]?.grade || null, dark_web_alerts: darkWeb.length, demo_data_present: triaged.some((f: any) => f.asset_name === "xz-utils") }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "Unknown action: status|seed_demo|trial_status|changelog" }), { status: 400, headers: CORS });
  } catch (err: any) { return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS }); }
});
