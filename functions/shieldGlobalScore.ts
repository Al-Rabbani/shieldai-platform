// ShieldAI — PRODUCTION Global Risk Score Aggregator v2
// Aggregates LIVE findings from all pillars via real entity reads
// Returns unified platform score, pillar breakdown, SLA status, trend data

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });

  const SERVICE_TOKEN = Deno.env.get("BASE44_SERVICE_TOKEN") || Deno.env.get("SERVICE_TOKEN") || "";
  const APP_ID = Deno.env.get("APP_ID") || "";

  if (!APP_ID || !SERVICE_TOKEN) {
    return Response.json({ error: "APP_ID and BASE44_SERVICE_TOKEN required in environment" }, { status: 500 });
  }

  const BASE = `https://app.base44.com/api/apps/${APP_ID}`;
  const H = { Authorization: `Bearer ${SERVICE_TOKEN}`, "Content-Type": "application/json" };

  const fetchAll = async (entity: string, query: Record<string, string> = {}) => {
    const records: any[] = [];
    let skip = 0;
    while (true) {
      const qs = new URLSearchParams({ limit: "500", skip: String(skip), ...query });
      try {
        const r = await fetch(`${BASE}/entities/${entity}?${qs}`, { headers: H });
        if (!r.ok) break;
        const d = await r.json();
        const batch = d.data || d.records || [];
        records.push(...batch);
        if (!d.has_more || batch.length === 0) break;
        skip += 500;
      } catch { break; }
    }
    return records;
  };

  // Fetch all finding entities in parallel
  const [
    codeFindings, cloudFindings, dastFindings, containerFindings,
    k8sFindings, vmFindings, pentestFindings, policyViolations,
    complianceFrameworks, zenFirewalls, runtimeThreats, threatIntelFeeds,
    triagedFindings, aspmAssets, supplyChainEvents,
  ] = await Promise.all([
    fetchAll("LicenseRisk", { status: "open" }),
    fetchAll("CloudFinding", { status: "open" }),
    fetchAll("DASTFinding", { status: "open" }),
    fetchAll("ContainerFinding", { status: "open" }),
    fetchAll("K8sFinding", { status: "open" }),
    fetchAll("VMFinding", { status: "open" }),
    fetchAll("PentestFinding", { status: "open" }),
    fetchAll("PolicyViolation", { status: "open" }),
    fetchAll("ComplianceFramework"),
    fetchAll("ZenFirewall"),
    fetchAll("RuntimeThreat", { status: "active" }),
    fetchAll("ThreatIntelFeed", { affects_you: "true" }),
    fetchAll("TriagedFinding", { status: "open" }),
    fetchAll("ASPMAsset"),
    fetchAll("SupplyChainEvent", { status: "active" }),
  ]);

  // Scoring formula: higher score = safer (like Aikido)
  const calcScore = (findings: any[], weights = { critical: 20, high: 8, medium: 3, low: 1 }) => {
    const open = findings.filter(f => f.status !== "resolved" && f.status !== "fixed");
    const penalty =
      open.filter(f => f.severity === "critical").length * weights.critical +
      open.filter(f => f.severity === "high").length * weights.high +
      open.filter(f => f.severity === "medium").length * weights.medium +
      open.filter(f => f.severity === "low").length * weights.low;
    return Math.max(0, 100 - Math.min(100, penalty));
  };

  // CODE pillar
  const codeScore = calcScore(codeFindings);

  // CLOUD pillar
  const cloudScore = calcScore(cloudFindings);

  // ATTACK pillar (DAST + Pentest)
  const attackScore = calcScore([...dastFindings, ...pentestFindings]);

  // RUNTIME / PROTECT pillar
  const runtimeScore = calcScore([...containerFindings, ...k8sFindings, ...vmFindings]);

  // GOVERNANCE pillar
  const avgComplianceScore = complianceFrameworks.length
    ? Math.round(complianceFrameworks.reduce((a: number, f: any) => a + (f.score || 0), 0) / complianceFrameworks.length)
    : 75;

  // SUPPLY CHAIN pillar
  const supplyScore = calcScore(supplyChainEvents.map((e: any) => ({ ...e, severity: e.severity || "high" })));

  // Overall weighted score
  const pillarScores = [codeScore, cloudScore, attackScore, runtimeScore, avgComplianceScore, supplyScore];
  const overallScore = Math.round(pillarScores.reduce((a, b) => a + b, 0) / pillarScores.length);
  const riskLevel = overallScore >= 85 ? "LOW" : overallScore >= 65 ? "MEDIUM" : overallScore >= 40 ? "HIGH" : "CRITICAL";

  // Aggregate all open findings
  const allOpen = [
    ...cloudFindings, ...dastFindings, ...containerFindings,
    ...k8sFindings, ...vmFindings, ...pentestFindings,
    ...policyViolations, ...codeFindings,
  ].filter(f => f.status !== "resolved" && f.status !== "fixed");

  const criticalCount = allOpen.filter(f => f.severity === "critical").length;
  const highCount = allOpen.filter(f => f.severity === "high").length;
  const mediumCount = allOpen.filter(f => f.severity === "medium").length;
  const lowCount = allOpen.filter(f => f.severity === "low").length;

  // SLA breached
  const slaBreach = triagedFindings.filter((f: any) => f.sla_breached).length;

  // Attacks blocked today across all Zen firewalls
  const attacksBlockedToday = zenFirewalls.reduce((a: number, z: any) => a + (z.attacks_blocked_today || 0), 0);
  const attacksBlockedTotal = zenFirewalls.reduce((a: number, z: any) => a + (z.attacks_blocked_total || 0), 0);

  // Internet-facing critical assets
  const criticalFacingAssets = aspmAssets.filter((a: any) => a.is_internet_facing && a.critical_count > 0).length;

  // Active threat intel that affects you
  const affectsYouCount = threatIntelFeeds.filter((t: any) => t.affects_you).length;
  const exploitedInWild = threatIntelFeeds.filter((t: any) => t.feed_type === "exploited_in_wild" && t.affects_you).length;

  return Response.json({
    success: true,
    generated_at: new Date().toISOString(),
    overall_score: overallScore,
    risk_level: riskLevel,
    grade: overallScore >= 90 ? "A" : overallScore >= 80 ? "B" : overallScore >= 65 ? "C" : overallScore >= 50 ? "D" : "F",

    pillars: {
      code:        { score: codeScore,        label: "Code Security",    findings: codeFindings.length,        icon: "code" },
      cloud:       { score: cloudScore,       label: "Cloud Security",   findings: cloudFindings.length,       icon: "cloud" },
      attack:      { score: attackScore,      label: "Attack Surface",   findings: dastFindings.length + pentestFindings.length, icon: "target" },
      runtime:     { score: runtimeScore,     label: "Runtime & Infra",  findings: containerFindings.length + k8sFindings.length + vmFindings.length, icon: "shield" },
      governance:  { score: avgComplianceScore, label: "Governance",     findings: policyViolations.length,    icon: "check-circle" },
      supply_chain:{ score: supplyScore,      label: "Supply Chain",     findings: supplyChainEvents.length,   icon: "package" },
    },

    findings_summary: {
      total_open: allOpen.length,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      sla_breached: slaBreach,
      autofix_available: allOpen.filter(f => f.autofix_available).length,
      exploited_in_wild: allOpen.filter(f => f.exploited_in_wild).length,
    },

    live_protection: {
      attacks_blocked_today: attacksBlockedToday,
      attacks_blocked_total: attacksBlockedTotal,
      active_threats: runtimeThreats.length,
      zen_apps_protected: zenFirewalls.filter((z: any) => z.install_status === "active").length,
    },

    threat_intel: {
      affects_you: affectsYouCount,
      exploited_in_wild: exploitedInWild,
      total_in_feed: threatIntelFeeds.length,
    },

    assets: {
      total: aspmAssets.length,
      internet_facing: aspmAssets.filter((a: any) => a.is_internet_facing).length,
      critical_facing: criticalFacingAssets,
    },

    compliance: {
      avg_score: avgComplianceScore,
      frameworks: complianceFrameworks.length,
      passing: complianceFrameworks.filter((f: any) => f.status === "passing").length,
      frameworks_list: complianceFrameworks.map((f: any) => ({
        name: f.name,
        score: f.score,
        status: f.status,
        next_audit: f.next_audit,
      })),
    },

    trend: {
      message: criticalCount > 0
        ? `🔴 ${criticalCount} critical finding${criticalCount > 1 ? "s" : ""} require immediate attention`
        : exploitedInWild > 0
        ? `⚠️ ${exploitedInWild} threat${exploitedInWild > 1 ? "s" : ""} exploited in the wild affect your stack`
        : slaBreach > 0
        ? `🟡 ${slaBreach} finding${slaBreach > 1 ? "s" : ""} breached SLA — remediation overdue`
        : "✅ No critical issues — good security posture",
      action_required: criticalCount > 0 || exploitedInWild > 0,
    },
  });
});
