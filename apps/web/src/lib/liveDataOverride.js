import { base44 } from "@/api/base44Client";

// Shared live-data snapshot builder — used by every page before calling gdsCopilotV10
// so the AI always has real, current platform context.
export async function buildLiveDataOverride() {
  const [grsList, findings, cloud, incidents, compliance, darkweb, ciem] = await Promise.all([
    base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
    base44.entities.TriagedFinding.list("-detected_at", 200).catch(() => []),
    base44.entities.CloudFinding.list("-detected_at", 200).catch(() => []),
    base44.entities.Incident.list("-opened_at", 10).catch(() => []),
    base44.entities.ComplianceFramework.list("-created_date", 20).catch(() => []),
    base44.entities.DarkWebAlert.list("-detected_at", 10).catch(() => []),
    base44.entities.CIEMFinding.list("-detected_at", 30).catch(() => []),
  ]);

  const g = grsList[0] || {};
  const critF = findings.filter(f => f.normalized_severity === "critical" || f.severity === "critical");
  const highF = findings.filter(f => f.normalized_severity === "high" || f.severity === "high");
  const expF = findings.filter(f => f.exploited_in_wild === true);
  const critC = cloud.filter(f => f.severity === "critical");
  const openInc = incidents.filter(i => ["open", "investigating"].includes(i.status));

  const compMap = {};
  compliance.forEach(f => { const k = (f.name || "").toLowerCase().replace(/[^a-z0-9]/g, ""); if (!compMap[k]) compMap[k] = f; });
  const uComp = Object.values(compMap);
  const compAvg = Math.round(uComp.reduce((s, f) => s + (f.score || 0), 0) / Math.max(uComp.length, 1));

  const liveDataOverride =
    `risk=${g.overall_score}/${g.grade}(${g.trend}) code=${g.code_score} cloud_score=${g.cloud_score} identity=${g.identity_score} supplychain=${g.supply_chain_score} kev_unpatched=${g.kev_unpatched} sla_breached=${g.sla_breached} compliance_avg=${compAvg}%` +
    ` | vulns=${findings.length} critical=${critF.length} high=${highF.length} exploited=${expF.length}` +
    ` | top_cves=${critF.slice(0, 4).map(f => `${f.cve_id}(${f.asset_name},cvss=${f.cvss_score},epss=${f.epss_score},fix=${f.fixed_version})`).join(";")}` +
    ` | exploited_now=${expF.slice(0, 2).map(f => `${f.cve_id}@${f.asset_name}`).join(",")}` +
    ` | cloud=${cloud.length} critical=${critC.length}` +
    ` | top_cloud=${critC.slice(0, 4).map(f => `[AWS/${f.service}]${f.title}(cis=${f.cis_control},res=${f.resource || "N/A"})`).join(";")}` +
    ` | ciem=${ciem.length}` +
    ` | incidents=${incidents.length} open=${openInc.length} list=${openInc.slice(0, 2).map(i => `${i.title}(${i.severity},$${i.financial_impact_usd})`).join(",")}` +
    ` | dark_web=${darkweb.length}` +
    ` | compliance=${uComp.map(f => `${f.name}=${f.score}%`).join(",")}`;

  return {
    liveDataOverride,
    raw: { grs: g, findings, cloud, incidents, compliance: uComp, darkweb, ciem, critF, highF, expF, critC, openInc, compAvg },
  };
}