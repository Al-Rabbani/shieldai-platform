// ShieldAI — Multi-Tenancy / MSSP Engine v1 (SDK client)
// Manages multiple customer tenants, MSSP views, white-label config
// Each tenant has: org settings, isolated findings, risk scores, report access
// MSSP mode: aggregated view across all managed clients

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action = "list_tenants", tenant_id, org_name, org_domain, plan = "starter", industry, contact_email, mssp_provider_id, white_label_name, white_label_logo_url } = body;

    // ── LIST ALL TENANTS (MSSP overview)
    if (action === "list_tenants" || action === "mssp_overview") {
      const orgs = await base44.entities.OrgSettings.list().catch(() => []);
      const scores = await base44.entities.GlobalRiskScore.list().catch(() => []);
      const latestScore = scores.sort((a: any, b: any) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime())[0];

      const tenants = orgs.map((org: any) => ({
        tenant_id: org.tenant_id || org.id,
        org_name: org.org_name,
        org_domain: org.org_domain,
        plan: org.plan,
        industry: org.industry,
        mssp_managed: org.mssp_managed,
        risk_score: latestScore?.overall_score || null,
        grade: latestScore?.grade || null,
        critical_findings: latestScore?.critical_findings || 0,
        sla_breached: latestScore?.sla_breached || 0,
      }));

      return new Response(JSON.stringify({ success: true, total_tenants: tenants.length, tenants, mssp_summary: { total_critical: tenants.reduce((s: number, t: any) => s + (t.critical_findings || 0), 0), tenants_with_breaches: tenants.filter((t: any) => t.sla_breached > 0).length, avg_score: tenants.length ? Math.round(tenants.reduce((s: number, t: any) => s + (t.risk_score || 0), 0) / tenants.length) : 0 } }), { headers: CORS });
    }

    // ── CREATE TENANT
    if (action === "create_tenant") {
      const newTenantId = crypto.randomUUID();
      const orgData = { org_name: org_name || "New Client", org_domain: org_domain || "", plan, industry: industry || "technology", tenant_id: newTenantId, mssp_managed: true, mssp_provider_id: mssp_provider_id || "", sla_critical_hours: 24, sla_high_hours: 72, sla_medium_hours: 168, auto_triage_enabled: true, auto_fix_enabled: false, ci_gate_enabled: false, ci_gate_block_severity: "critical" };
      const created = await base44.entities.OrgSettings.create(orgData);
      return new Response(JSON.stringify({ success: true, tenant_id: newTenantId, tenant: created, next_steps: ["Add GITHUB_TOKEN for code scanning", "Add AWS credentials for cloud scanning", "Run first scan: POST /api/shieldOnboard {action:'trigger_scan'}"] }), { headers: CORS });
    }

    // ── UPDATE TENANT (white-label, plan change, settings)
    if (action === "update_tenant") {
      if (!tenant_id) return new Response(JSON.stringify({ error: "tenant_id required" }), { status: 400, headers: CORS });
      const orgs = await base44.entities.OrgSettings.list().catch(() => []);
      const org = orgs.find((o: any) => o.tenant_id === tenant_id || o.id === tenant_id);
      if (!org) return new Response(JSON.stringify({ error: `Tenant ${tenant_id} not found` }), { status: 404, headers: CORS });
      const updates: any = {};
      if (org_name) updates.org_name = org_name;
      if (plan) updates.plan = plan;
      if (white_label_name) updates.org_name = white_label_name;
      await base44.entities.OrgSettings.update(org.id, updates);
      return new Response(JSON.stringify({ success: true, tenant_id, updates_applied: updates }), { headers: CORS });
    }

    // ── TENANT RISK REPORT (per-client summary)
    if (action === "tenant_report") {
      const [triaged, cloudF, compF, scores] = await Promise.all([
        base44.entities.TriagedFinding.list().catch(() => []),
        base44.entities.CloudFinding.list().catch(() => []),
        base44.entities.ComplianceFramework.list().catch(() => []),
        base44.entities.GlobalRiskScore.list().catch(() => []),
      ]);
      scores.sort((a: any, b: any) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime());
      const latest = scores[0];
      const open = triaged.filter((f: any) => f.status === "open");
      return new Response(JSON.stringify({ success: true, tenant_id: tenant_id || "default", report_date: new Date().toISOString(), risk_score: latest?.overall_score, grade: latest?.grade, trend: latest?.trend, open_findings: open.length, critical: open.filter((f: any) => f.normalized_severity === "critical").length, sla_breached: open.filter((f: any) => f.sla_breached).length, compliance: compF.map((c: any) => ({ name: c.name, score: c.score, status: c.status })), top_risks: open.filter((f: any) => f.normalized_severity === "critical").slice(0, 10).map((f: any) => ({ title: f.title, cve: f.cve_id, asset: f.asset_name })) }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "Unknown action: list_tenants|create_tenant|update_tenant|tenant_report|mssp_overview" }), { status: 400, headers: CORS });
  } catch (err: any) { return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS }); }
});
