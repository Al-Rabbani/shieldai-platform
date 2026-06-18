// ShieldAI — Global Risk Score Engine v3
// Uses SDK client (no raw HTTP — works with all auth contexts)
// Reads ALL finding entities, calculates per-pillar scores, saves to GlobalRiskScore entity
// Score: 0-100 where 100 = perfect (no findings). Grade: A/B/C/D/F
// Trend: compares against most recent previous score in DB

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Weighted penalty per severity (higher weight = more damage to score)
const WEIGHTS = { critical: 20, high: 8, medium: 3, low: 1 };

function calcPillarScore(findings: any[]): number {
  const open = findings.filter((f: any) => !["fixed", "resolved", "false_positive", "suppressed", "accepted"].includes(f.status));
  const penalty =
    open.filter((f: any) => f.severity === "critical" || f.normalized_severity === "critical").length * WEIGHTS.critical +
    open.filter((f: any) => f.severity === "high" || f.normalized_severity === "high").length * WEIGHTS.high +
    open.filter((f: any) => f.severity === "medium" || f.normalized_severity === "medium").length * WEIGHTS.medium +
    open.filter((f: any) => f.severity === "low" || f.normalized_severity === "low").length * WEIGHTS.low;
  return Math.max(0, Math.round(100 - Math.min(100, penalty)));
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      action = "calculate",    // calculate | history | current | trend
      save_to_db = true,
      days_back = 30,
    } = body;

    // ── HISTORY: return last N GlobalRiskScore records
    if (action === "history") {
      const history = await base44.entities.GlobalRiskScore.list().catch(() => []);
      history.sort((a: any, b: any) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime());
      return new Response(JSON.stringify({ success: true, total: history.length, history: history.slice(0, 30) }), { headers: CORS });
    }

    // ── CURRENT: just return latest score without recalculating
    if (action === "current") {
      const history = await base44.entities.GlobalRiskScore.list().catch(() => []);
      history.sort((a: any, b: any) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime());
      if (history.length === 0) return new Response(JSON.stringify({ success: true, score: null, message: "No scores calculated yet. Call with action=calculate." }), { headers: CORS });
      return new Response(JSON.stringify({ success: true, ...history[0] }), { headers: CORS });
    }

    // ── CALCULATE: full live calculation from all entities ──────────────────
    const now = new Date().toISOString();

    // Load all relevant finding entities in parallel
    const [
      triaged, cloudFindings, dastFindings, containerFindings, k8sFindings,
      vmFindings, pentestFindings, licenseRisks, supplyChainEvents, ciemFindings,
      dspmFindings, policyViolations, complianceFrameworks, runtimeThreats,
      threatIntelFeeds, zenFirewalls, attackSurface, cloudAccounts, vmScans,
      containerScans, dastScans, codeRepos, prevScores,
    ] = await Promise.all([
      base44.entities.TriagedFinding.list().catch(() => []),
      base44.entities.CloudFinding.list().catch(() => []),
      base44.entities.DASTFinding.list().catch(() => []),
      base44.entities.ContainerFinding.list().catch(() => []),
      base44.entities.K8sFinding.list().catch(() => []),
      base44.entities.VMFinding.list().catch(() => []),
      base44.entities.PentestFinding.list().catch(() => []),
      base44.entities.LicenseRisk.list().catch(() => []),
      base44.entities.SupplyChainEvent.list().catch(() => []),
      base44.entities.CIEMFinding.list().catch(() => []),
      base44.entities.DSPMFinding.list().catch(() => []),
      base44.entities.PolicyViolation.list().catch(() => []),
      base44.entities.ComplianceFramework.list().catch(() => []),
      base44.entities.RuntimeThreat.list().catch(() => []),
      base44.entities.ThreatIntelFeed.list().catch(() => []),
      base44.entities.ZenFirewall.list().catch(() => []),
      base44.entities.AttackSurface.list().catch(() => []),
      base44.entities.CloudAccount.list().catch(() => []),
      base44.entities.VMScan.list().catch(() => []),
      base44.entities.ContainerScan.list().catch(() => []),
      base44.entities.DASTScan.list().catch(() => []),
      base44.entities.CodeRepository.list().catch(() => []),
      base44.entities.GlobalRiskScore.list().catch(() => []),
    ]);

    // ── PER-PILLAR SCORES ────────────────────────────────────────────────────

    // CODE: SAST/SCA from triaged (source contains sast/sca) + license risks
    const codeFindings = [
      ...triaged.filter((f: any) => (f.source_scanners || "").toLowerCase().match(/sast|sca|code|secret|dependency/)),
      ...licenseRisks.map((r: any) => ({ ...r, severity: r.risk_level === "critical" ? "critical" : r.risk_level === "high" ? "high" : "medium" })),
    ];
    const codeScore = calcPillarScore(codeFindings);

    // CLOUD: cloud findings + k8s
    const cloudAll = [...cloudFindings, ...k8sFindings];
    const cloudScore = calcPillarScore(cloudAll);

    // ATTACK: DAST + pentest + attack surface
    const criticalSurface = attackSurface.filter((a: any) => a.risk_level === "critical").length;
    const attackFindings = [
      ...dastFindings,
      ...pentestFindings,
      // Synthetic findings from attack surface critical assets
      ...Array(criticalSurface).fill(null).map(() => ({ severity: "high", status: "open" })),
    ];
    const attackScore = calcPillarScore(attackFindings);

    // RUNTIME: runtime threats + firewall status
    const runtimeFindings = [
      ...runtimeThreats.filter((t: any) => t.status === "active" || t.status === "new"),
    ];
    const zenIssues = zenFirewalls.filter((z: any) => z.install_status !== "active" || z.mode === "monitor");
    const runtimeScore = Math.max(0, calcPillarScore(runtimeFindings) - zenIssues.length * 5);

    // SUPPLY CHAIN: supply chain events + container findings + SCA from triaged
    const scFindings = [
      ...supplyChainEvents.map((e: any) => ({ ...e, severity: e.severity || "high" })),
      ...containerFindings,
    ];
    const supplyChainScore = calcPillarScore(scFindings);

    // GOVERNANCE: compliance framework scores + policy violations
    const compAvg = complianceFrameworks.length > 0
      ? Math.round(complianceFrameworks.reduce((s: number, f: any) => s + (f.score || 0), 0) / complianceFrameworks.length)
      : 50;
    const govFindings = [...policyViolations.map((v: any) => ({ severity: v.severity, status: v.status }))];
    const govScore = Math.round((calcPillarScore(govFindings) + compAvg) / 2);

    // IDENTITY (CIEM)
    const identityScore = ciemFindings.length === 0 ? 80 : calcPillarScore(ciemFindings.map((f: any) => ({ severity: f.severity, status: f.status })));

    // DATA (DSPM)
    const dataScore = dspmFindings.length === 0 ? 80 : calcPillarScore(dspmFindings.map((f: any) => ({ severity: f.severity, status: f.status })));

    // ── OVERALL SCORE: weighted average of all pillars ───────────────────────
    // Weights reflect business risk importance
    const pillarWeights = {
      code: 0.15,
      cloud: 0.18,
      attack: 0.18,
      runtime: 0.12,
      supply_chain: 0.12,
      governance: 0.10,
      identity: 0.08,
      data: 0.07,
    };
    const overallScore = Math.round(
      codeScore * pillarWeights.code +
      cloudScore * pillarWeights.cloud +
      attackScore * pillarWeights.attack +
      runtimeScore * pillarWeights.runtime +
      supplyChainScore * pillarWeights.supply_chain +
      govScore * pillarWeights.governance +
      identityScore * pillarWeights.identity +
      dataScore * pillarWeights.data
    );

    // ── KEY METRICS ─────────────────────────────────────────────────────────
    const allOpen = [...triaged, ...cloudFindings, ...dastFindings, ...containerFindings, ...vmFindings, ...pentestFindings]
      .filter((f: any) => !["fixed", "resolved", "false_positive"].includes(f.status));
    const criticalCount = allOpen.filter((f: any) => (f.severity || f.normalized_severity) === "critical").length;
    const highCount = allOpen.filter((f: any) => (f.severity || f.normalized_severity) === "high").length;
    const kevUnpatched = triaged.filter((f: any) => f.exploited_in_wild && f.status === "open").length;
    const slaBreached = triaged.filter((f: any) => f.sla_breached).length;
    const assetsProtected = cloudAccounts.length + vmScans.length + containerScans.length + dastScans.length + codeRepos.length;

    // ── TREND: compare with previous score ───────────────────────────────────
    prevScores.sort((a: any, b: any) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime());
    const prevScore = prevScores[0]?.overall_score;
    const scoreDelta = prevScore !== undefined ? overallScore - prevScore : 0;
    const trend = scoreDelta > 2 ? "improving" : scoreDelta < -2 ? "degrading" : "stable";

    const record = {
      overall_score: overallScore,
      grade: scoreToGrade(overallScore),
      trend,
      score_delta: scoreDelta,
      code_score: codeScore,
      cloud_score: cloudScore,
      attack_score: attackScore,
      runtime_score: runtimeScore,
      supply_chain_score: supplyChainScore,
      governance_score: govScore,
      identity_score: identityScore,
      data_score: dataScore,
      total_open_findings: allOpen.length,
      critical_findings: criticalCount,
      high_findings: highCount,
      kev_unpatched: kevUnpatched,
      sla_breached: slaBreached,
      assets_protected: assetsProtected,
      compliance_avg_score: compAvg,
      calculated_at: now,
    };

    // Save to history
    if (save_to_db) {
      try { await base44.entities.GlobalRiskScore.create(record); } catch (e: any) { console.warn("[GlobalScore] DB save:", e.message); }
    }

    return new Response(JSON.stringify({
      success: true,
      action: "calculate",
      ...record,
      pillars: {
        code: { score: codeScore, grade: scoreToGrade(codeScore), findings: codeFindings.filter((f: any) => !["fixed","resolved"].includes(f.status)).length },
        cloud: { score: cloudScore, grade: scoreToGrade(cloudScore), findings: cloudAll.filter((f: any) => f.status === "open").length },
        attack: { score: attackScore, grade: scoreToGrade(attackScore), findings: attackFindings.filter((f: any) => f.status !== "fixed").length },
        runtime: { score: runtimeScore, grade: scoreToGrade(runtimeScore), findings: runtimeFindings.length },
        supply_chain: { score: supplyChainScore, grade: scoreToGrade(supplyChainScore), findings: scFindings.filter((f: any) => f.status !== "fixed").length },
        governance: { score: govScore, grade: scoreToGrade(govScore), findings: govFindings.filter((f: any) => f.status !== "resolved").length },
        identity: { score: identityScore, grade: scoreToGrade(identityScore), findings: ciemFindings.filter((f: any) => f.status === "open").length },
        data: { score: dataScore, grade: scoreToGrade(dataScore), findings: dspmFindings.filter((f: any) => f.status === "open").length },
      },
      context: {
        total_open: allOpen.length,
        critical: criticalCount,
        high: highCount,
        kev_unpatched: kevUnpatched,
        sla_breached: slaBreached,
        assets_protected: assetsProtected,
        compliance_avg: compAvg,
        prev_score: prevScore,
        delta: scoreDelta,
        trend,
      },
    }), { headers: CORS });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
});
