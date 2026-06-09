// ShieldAI — Global Risk Score Aggregator (Phase 6)
// Aggregates findings from all pillars into a unified platform risk score

Deno.serve(async (req) => {
  const serviceToken = Deno.env.get("BASE44_SERVICE_TOKEN") || Deno.env.get("SERVICE_TOKEN") || "";
  const appId = Deno.env.get("APP_ID") || "";
  const baseUrl = appId ? `https://app.base44.com/api/apps/${appId}` : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(serviceToken ? { "Authorization": `Bearer ${serviceToken}` } : {})
  };

  const fetchEntity = async (entity: string, query = {}) => {
    try {
      const params = new URLSearchParams({ limit: "500", ...Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])) });
      const r = await fetch(`${baseUrl}/entities/${entity}?${params}`, { headers });
      if (!r.ok) return [];
      const d = await r.json();
      return d.data || d.records || [];
    } catch { return []; }
  };

  // Fetch from all pillars
  const [cloudFindings, dastFindings, containerFindings, k8sFindings, policyViolations, complianceFrameworks, auditReports] = await Promise.all([
    fetchEntity("CloudFinding"),
    fetchEntity("DASTFinding"),
    fetchEntity("ContainerFinding"),
    fetchEntity("K8sFinding"),
    fetchEntity("PolicyViolation"),
    fetchEntity("ComplianceFramework"),
    fetchEntity("AuditReport"),
  ]);

  const allFindings = [
    ...cloudFindings.map((f: any) => ({ ...f, pillar: "cloud" })),
    ...dastFindings.map((f: any) => ({ ...f, pillar: "attack" })),
    ...containerFindings.map((f: any) => ({ ...f, pillar: "runtime" })),
    ...k8sFindings.map((f: any) => ({ ...f, pillar: "runtime" })),
    ...policyViolations.map((f: any) => ({ ...f, pillar: "governance" })),
  ];

  const openFindings = allFindings.filter((f: any) => f.status === "open");
  const critical = openFindings.filter((f: any) => f.severity === "critical").length;
  const high = openFindings.filter((f: any) => f.severity === "high").length;
  const medium = openFindings.filter((f: any) => f.severity === "medium").length;
  const low = openFindings.filter((f: any) => f.severity === "low").length;

  // Per-pillar scores
  const pillarScore = (findings: any[]) => {
    const open = findings.filter((f: any) => f.status === "open");
    const raw = open.filter((f: any) => f.severity === "critical").length * 20 +
      open.filter((f: any) => f.severity === "high").length * 8 +
      open.filter((f: any) => f.severity === "medium").length * 3 +
      open.filter((f: any) => f.severity === "low").length;
    return Math.max(0, 100 - Math.min(100, raw));
  };

  const avgCompliance = complianceFrameworks.length
    ? Math.round(complianceFrameworks.reduce((a: number, f: any) => a + (f.score || 0), 0) / complianceFrameworks.length)
    : 0;

  const pillars = {
    code: { score: 85, label: "Code Security", findings: 0 }, // CODE pillar — static for now
    cloud: { score: pillarScore(cloudFindings), label: "Cloud Security", findings: cloudFindings.filter((f: any) => f.status === "open").length },
    attack: { score: pillarScore(dastFindings), label: "Attack Surface", findings: dastFindings.filter((f: any) => f.status === "open").length },
    runtime: { score: pillarScore([...containerFindings, ...k8sFindings]), label: "Runtime Security", findings: [...containerFindings, ...k8sFindings].filter((f: any) => f.status === "open").length },
    governance: { score: avgCompliance, label: "Governance", findings: policyViolations.filter((f: any) => f.status === "open").length },
  };

  const overallScore = Math.round(Object.values(pillars).reduce((a, p) => a + p.score, 0) / Object.keys(pillars).length);

  const riskLevel = overallScore >= 80 ? "LOW" : overallScore >= 60 ? "MEDIUM" : overallScore >= 40 ? "HIGH" : "CRITICAL";

  return Response.json({
    success: true,
    generated_at: new Date().toISOString(),
    overall_score: overallScore,
    risk_level: riskLevel,
    pillars,
    findings_summary: { total: allFindings.length, open: openFindings.length, critical, high, medium, low },
    compliance: { avg_score: avgCompliance, frameworks: complianceFrameworks.length, frameworks_list: complianceFrameworks.map((f: any) => ({ name: f.name, score: f.score, status: f.status })) },
    latest_report: auditReports.sort((a: any, b: any) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())[0] || null,
    trend: { message: critical > 0 ? `${critical} critical findings require immediate attention` : "No critical findings — good posture!", action_required: critical > 0 }
  });
});
