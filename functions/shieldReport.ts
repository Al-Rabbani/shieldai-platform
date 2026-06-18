// ShieldAI — Security Report Generator v1 (SDK client)
// Stage 19: Shareable reports, PDF-ready JSON, audit evidence packs, compliance exports
// Generates: Executive Summary, CISO Report, Compliance Audit Evidence, Pentest Report

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action = "executive_summary", framework, include_evidence = true, date_range_days = 30 } = body;

    const cutoff = new Date(Date.now() - date_range_days * 86400000).toISOString();

    // Load all data in parallel
    const [triaged, cloudF, dastF, containerF, vmF, pentestF, compF, policyV, orgS, scores, ciemF, dspmF, darkWeb, attackS, threatIntel] = await Promise.all([
      base44.entities.TriagedFinding.list().catch(() => []),
      base44.entities.CloudFinding.list().catch(() => []),
      base44.entities.DASTFinding.list().catch(() => []),
      base44.entities.ContainerFinding.list().catch(() => []),
      base44.entities.VMFinding.list().catch(() => []),
      base44.entities.PentestFinding.list().catch(() => []),
      base44.entities.ComplianceFramework.list().catch(() => []),
      base44.entities.PolicyViolation.list().catch(() => []),
      base44.entities.OrgSettings.list().catch(() => []),
      base44.entities.GlobalRiskScore.list().catch(() => []),
      base44.entities.CIEMFinding.list().catch(() => []),
      base44.entities.DSPMFinding.list().catch(() => []),
      base44.entities.DarkWebAlert.list().catch(() => []),
      base44.entities.AttackSurface.list().catch(() => []),
      base44.entities.ThreatIntelFeed.list().catch(() => []),
    ]);

    scores.sort((a: any, b: any) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime());
    const latestScore = scores[0];
    const org = orgS[0] || { org_name: "ShieldAI Platform" };
    const now = new Date().toISOString();
    const allFindings = [...triaged, ...cloudF, ...dastF, ...containerF, ...vmF, ...pentestF];
    const openFindings = allFindings.filter((f: any) => !["fixed", "resolved", "false_positive"].includes(f.status));
    const criticals = openFindings.filter((f: any) => (f.severity || f.normalized_severity) === "critical");
    const highs = openFindings.filter((f: any) => (f.severity || f.normalized_severity) === "high");
    const slaBreached = triaged.filter((f: any) => f.sla_breached);
    const kevFindings = triaged.filter((f: any) => f.exploited_in_wild);

    // ── EXECUTIVE SUMMARY (C-suite, non-technical)
    if (action === "executive_summary") {
      const compAvg = compF.length ? Math.round(compF.reduce((s: number, f: any) => s + (f.score || 0), 0) / compF.length) : 0;
      return new Response(JSON.stringify({
        report_type: "Executive Security Summary",
        generated_at: now, generated_for: org.org_name, period: `Last ${date_range_days} days`,
        overall_posture: { score: latestScore?.overall_score || 0, grade: latestScore?.grade || "N/A", trend: latestScore?.trend || "unknown", summary: latestScore?.overall_score >= 80 ? "Strong security posture with minor improvements needed" : latestScore?.overall_score >= 60 ? "Moderate security posture — several areas require attention" : latestScore?.overall_score >= 40 ? "Security posture needs significant improvement" : "Critical security gaps require immediate executive action" },
        key_numbers: { total_assets_protected: latestScore?.assets_protected || 0, open_vulnerabilities: openFindings.length, critical_requiring_immediate_action: criticals.length, actively_exploited_in_wild: kevFindings.length, sla_violations: slaBreached.length, compliance_score: compAvg },
        top_risks: criticals.slice(0, 5).map((f: any) => ({ risk: f.title, impact: "High business impact if exploited", cve: f.cve_id, remediation: f.remediation || "Immediate patching required" })),
        compliance_status: compF.map((c: any) => ({ framework: c.name, score: c.score, status: c.status, next_audit: c.next_audit })),
        dark_web: { alerts: darkWeb.length, critical_alerts: darkWeb.filter((a: any) => a.severity === "critical").length, ransomware_mentions: darkWeb.filter((a: any) => a.alert_type === "ransomware_mention").length },
        recommended_actions: [
          kevFindings.length > 0 ? `URGENT: Patch ${kevFindings.length} actively-exploited vulnerability/ies immediately` : null,
          slaBreached.length > 0 ? `${slaBreached.length} findings are past SLA deadline — assign remediation owners` : null,
          compF.some((c: any) => c.status === "non_compliant") ? `${compF.filter((c: any) => c.status === "non_compliant").length} compliance framework(s) non-compliant` : null,
          criticals.length > 0 ? `${criticals.length} critical findings require immediate remediation` : null,
        ].filter(Boolean),
      }), { headers: CORS });
    }

    // ── CISO TECHNICAL REPORT
    if (action === "ciso_report") {
      return new Response(JSON.stringify({
        report_type: "CISO Technical Security Report",
        generated_at: now, generated_for: org.org_name,
        risk_score: { overall: latestScore?.overall_score, grade: latestScore?.grade, trend: latestScore?.trend, delta: latestScore?.score_delta, pillars: { code: latestScore?.code_score, cloud: latestScore?.cloud_score, attack: latestScore?.attack_score, runtime: latestScore?.runtime_score, supply_chain: latestScore?.supply_chain_score, governance: latestScore?.governance_score, identity: latestScore?.identity_score, data: latestScore?.data_score } },
        findings_breakdown: {
          total_open: openFindings.length,
          by_severity: { critical: criticals.length, high: highs.length, medium: openFindings.filter((f: any) => (f.severity || f.normalized_severity) === "medium").length, low: openFindings.filter((f: any) => (f.severity || f.normalized_severity) === "low").length },
          by_pillar: { code: triaged.filter((f: any) => f.source_scanners?.includes("sast")).length, cloud: cloudF.filter((f: any) => f.status === "open").length, dast: dastF.filter((f: any) => f.status === "open").length, container: containerF.filter((f: any) => f.status === "open").length, vm: vmF.filter((f: any) => f.status === "open").length, pentest: pentestF.filter((f: any) => f.status === "open").length },
          kev_unpatched: kevFindings.length,
          sla_breached: slaBreached.length,
          autofix_available: triaged.filter((f: any) => f.autofix_available).length,
        },
        threat_intelligence: { active_threats: threatIntel.filter((t: any) => t.affects_you).length, dark_web_alerts: darkWeb.length, attack_surface_assets: attackS.length, critical_surface: attackS.filter((a: any) => a.risk_level === "critical").length },
        identity_posture: { ciem_findings: ciemF.length, admin_access_violations: ciemF.filter((f: any) => f.finding_type === "admin_access").length, mfa_violations: ciemF.filter((f: any) => f.finding_type === "mfa_not_enforced").length },
        data_posture: { dspm_findings: dspmF.length, pii_exposed: dspmF.filter((f: any) => f.finding_type === "pii_exposed").length, credentials_in_data: dspmF.filter((f: any) => f.finding_type === "credentials_in_data").length },
        top_critical_findings: criticals.slice(0, 10).map((f: any) => ({ title: f.title, cve: f.cve_id, cvss: f.cvss_score, kev: f.exploited_in_wild, asset: f.asset_name, sla_breached: f.sla_breached, remediation: f.remediation })),
      }), { headers: CORS });
    }

    // ── COMPLIANCE AUDIT EVIDENCE PACK
    if (action === "audit_evidence") {
      const fw = framework ? compF.find((c: any) => c.name === framework) : compF[0];
      if (!fw) return new Response(JSON.stringify({ error: `Framework ${framework} not found. Available: ${compF.map((c: any) => c.name).join(", ")}` }), { status: 404, headers: CORS });
      const violations = policyV.filter((v: any) => v.framework === fw.name);
      return new Response(JSON.stringify({
        report_type: `Compliance Audit Evidence Pack — ${fw.name}`,
        generated_at: now, framework: fw.name, version: fw.version, assessment_date: fw.last_assessed,
        summary: { score: fw.score, status: fw.status, total_controls: fw.total_controls, passing: fw.passing, failing: fw.failing, not_tested: fw.not_tested },
        evidence: {
          passing_controls: fw.passing,
          failing_controls: violations.length,
          violations: violations.map((v: any) => ({ control: v.control_id, policy: v.policy_name, resource: v.resource, severity: v.severity, status: v.status, description: v.description, remediation: v.remediation })),
          supporting_scans: { cloud_findings: cloudF.length, dast_scans: dastF.length, vm_scans: vmF.length, container_scans: containerF.length },
        },
        attestation: { platform: "ShieldAI Security Platform", generated_by: "Automated Assessment Engine", methodology: "Continuous automated control testing mapped to framework requirements", disclaimer: "This evidence pack is auto-generated. Human review required for final audit submission." },
      }), { headers: CORS });
    }

    // ── SHAREABLE TRUST REPORT (public-facing)
    if (action === "trust_report") {
      const score = latestScore?.overall_score || 0;
      return new Response(JSON.stringify({
        report_type: "Security Trust Report",
        generated_at: now, org: org.org_name,
        public_summary: { security_grade: latestScore?.grade || "N/A", compliance_frameworks: compF.filter((c: any) => c.status === "compliant" || c.status === "partial").map((c: any) => c.name), assets_monitored: latestScore?.assets_protected || 0, continuous_monitoring: true, last_scan: now },
        badges: [
          score >= 80 ? { label: "ShieldAI Verified", description: "Continuous security monitoring active", color: "green" } : null,
          compF.some((c: any) => c.name === "SOC2" && c.status === "compliant") ? { label: "SOC2 Monitored", color: "blue" } : null,
          compF.some((c: any) => c.name === "ISO27001" && c.status === "compliant") ? { label: "ISO27001 Assessed", color: "blue" } : null,
        ].filter(Boolean),
        share_url: `https://app.base44.com/apps/6a22a773bb173a975d8337f9/trust`,
      }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "Unknown action: executive_summary|ciso_report|audit_evidence|trust_report" }), { status: 400, headers: CORS });
  } catch (err: any) { return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS }); }
});
