import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};
const ts = () => new Date().toISOString();
const safe = (s: any) => String(s || "").slice(0, 300);
const rel = (d: string) => {
  if (!d) return "just now";
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  return `${Math.round(diff / 3600000)}h ago`;
};

// ── Agent definitions ────────────────────────────────────────────────────────
const AGENTS: Record<string, any> = {
  soc:        { id: "soc",        name: "AI SOC Director",           branch: "defensive", task: "soc_summary" },
  cloud:      { id: "cloud",      name: "AI Cloud Security Director", branch: "defensive", task: "cloud_review" },
  vuln:       { id: "vuln",       name: "AI Vulnerability Director",  branch: "defensive", task: "vulnerability_scan" },
  identity:   { id: "identity",   name: "AI Identity Director",       branch: "defensive", task: "identity_analysis" },
  compliance: { id: "compliance", name: "AI Compliance Director",     branch: "defensive", task: "compliance_check" },
  intel:      { id: "intel",      name: "AI Threat Intel Director",   branch: "defensive", task: "threat_intel" },
  "ai-security":{ id:"ai-security",name:"AI Security Posture Director",branch:"defensive",task:"ai_security_scan" },
  ir:         { id: "ir",         name: "AI Incident Commander",      branch: "defensive", task: "incident_response" },
  risk:       { id: "risk",       name: "AI Risk Director",           branch: "defensive", task: "risk_assessment" },
  "red-team": { id: "red-team",   name: "AI Red Team Director",       branch: "offensive", task: "red_team_ops" },
  hunter:     { id: "hunter",     name: "AI Threat Hunter",           branch: "offensive", task: "threat_hunt" },
  "dark-web": { id: "dark-web",   name: "AI Dark Web Monitor",        branch: "offensive", task: "dark_web_scan" },
  pentest:    { id: "pentest",    name: "AI Pentest Engine",          branch: "offensive", task: "pentest_authorized" },
  simulation: { id: "simulation", name: "AI Attack Simulation",       branch: "offensive", task: "attack_simulation" },
  exploit:    { id: "exploit",    name: "AI Exploit Intelligence",    branch: "offensive", task: "exploit_analysis" },
  osint:      { id: "osint",      name: "AI OSINT Recon",             branch: "offensive", task: "osint_recon" },
};

// ── Task handlers ─────────────────────────────────────────────────────────────
async function taskSOC(db: any) {
  const [incidents, findings, cloudF, grs] = await Promise.all([
    db.Incident.list().catch(() => []),
    db.TriagedFinding.list().catch(() => []),
    db.CloudFinding.list().catch(() => []),
    db.GlobalRiskScore.list().catch(() => []),
  ]);
  const g = grs[0] || {};
  const openInc = incidents.filter((i: any) => ["open", "investigating", "active"].includes(i.status?.toLowerCase()));
  const openF = findings.filter((f: any) => f.status === "open");
  const critV = openF.filter((f: any) => f.normalized_severity === "critical");
  const critC = cloudF.filter((f: any) => f.status === "open" && f.severity === "critical");
  const exploited = openF.filter((f: any) => f.exploited_in_wild);
  const st = openInc.length > 5 || exploited.length > 0 ? "CRITICAL" : openInc.length > 0 || critV.length > 5 ? "HIGH" : "NORMAL";
  return {
    status: st,
    entities_read: ["Incident", "TriagedFinding", "CloudFinding", "GlobalRiskScore"],
    data: {
      headline: `Risk ${g.overall_score ?? "N/A"}/100 — ${openInc.length} active incidents`,
      risk_score: g.overall_score ?? 0, grade: g.grade ?? "?", trend: g.trend ?? "stable",
      active_incidents: openInc.length,
      critical_vulns: critV.length, critical_cloud: critC.length,
      exploited_in_wild: exploited.length,
      top_alerts: [...critC.slice(0, 3).map((f: any) => ({ sev: "critical", title: f.title, action: f.remediation || "Review required" })),
        ...critV.slice(0, 2).map((f: any) => ({ sev: "critical", title: f.cve_id || f.title, action: f.fixed_version || "Patch required" }))],
    },
  };
}

async function taskCloud(db: any) {
  const [cloudF, accounts, ciemF] = await Promise.all([
    db.CloudFinding.list().catch(() => []),
    db.CloudAccount.list().catch(() => []),
    db.CIEMFinding.list().catch(() => []),
  ]);
  const open = cloudF.filter((f: any) => f.status === "open");
  const bySev: any = { critical: 0, high: 0, medium: 0, low: 0 };
  const byService: any = {};
  for (const f of open) {
    const s = f.severity?.toLowerCase() || "low";
    if (bySev[s] !== undefined) bySev[s]++;
    const svc = f.service || f.resource_type || "Unknown";
    byService[svc] = (byService[svc] || 0) + 1;
  }
  const crit = open.filter((f: any) => f.severity === "critical");
  const st = bySev.critical > 5 ? "CRITICAL" : bySev.critical > 0 ? "HIGH" : "NORMAL";
  return {
    status: st,
    entities_read: ["CloudFinding", "CloudAccount", "CIEMFinding"],
    data: {
      headline: `${open.length} open cloud findings across ${accounts.length} accounts`,
      critical: bySev.critical, high: bySev.high, medium: bySev.medium,
      accounts: accounts.length,
      by_service: Object.entries(byService).map(([name, count]) => ({ name, count })),
      critical_findings: crit.slice(0, 6).map((f: any) => ({ title: f.title, service: f.service || "AWS", fix: f.remediation || "Review required" })),
      open_ciem: ciemF.filter((f: any) => f.status === "open").length,
    },
  };
}

async function taskVuln(db: any) {
  const [triaged, vmF, containerF] = await Promise.all([
    db.TriagedFinding.list().catch(() => []),
    db.VMFinding.list().catch(() => []),
    db.ContainerFinding.list().catch(() => []),
  ]);
  const open = triaged.filter((f: any) => f.status === "open");
  const crit = open.filter((f: any) => f.normalized_severity === "critical");
  const exploited = open.filter((f: any) => f.exploited_in_wild);
  const patchable = open.filter((f: any) => f.fixed_version);
  const st = exploited.length > 0 ? "CRITICAL" : crit.length > 5 ? "HIGH" : "NORMAL";
  return {
    status: st,
    entities_read: ["TriagedFinding", "VMFinding", "ContainerFinding"],
    data: {
      headline: `${open.length} vulnerabilities open — ${exploited.length} exploited in wild`,
      total: open.length, critical: crit.length,
      exploited_in_wild: exploited.length, patchable: patchable.length,
      exploited_cves: exploited.slice(0, 5).map((f: any) => ({ cve: f.cve_id || f.title, asset: f.asset_name || "N/A", epss: f.epss_score || 0 })),
      critical_cves: crit.filter((f: any) => !f.exploited_in_wild).slice(0, 5).map((f: any) => ({ cve: f.cve_id || f.title, asset: f.asset_name || "N/A", fix: f.fixed_version || "no patch" })),
    },
  };
}

async function taskIdentity(db: any) {
  const [ciemF, idF] = await Promise.all([
    db.CIEMFinding.list().catch(() => []),
    db.IdentityFinding.list().catch(() => []),
  ]);
  const openCIEM = ciemF.filter((f: any) => f.status === "open");
  const critCIEM = openCIEM.filter((f: any) => f.severity === "critical");
  const st = critCIEM.length > 3 ? "CRITICAL" : critCIEM.length > 0 ? "HIGH" : "NORMAL";
  return {
    status: st,
    entities_read: ["CIEMFinding", "IdentityFinding"],
    data: {
      headline: `${openCIEM.length} identity risk findings — ${critCIEM.length} critical`,
      ciem_open: openCIEM.length, ciem_critical: critCIEM.length,
      identity_threats: idF.filter((f: any) => f.status === "open").length,
      active_sessions: 0,
      top_ciem: critCIEM.slice(0, 4).map((f: any) => ({ identity: f.identity_name || "unknown", title: f.title, remediation: f.remediation || "Review access" })),
      active_threats: idF.slice(0, 3).map((f: any) => ({ country: "N/A", trust_score: 0, title: f.title })),
    },
  };
}

async function taskCompliance(db: any) {
  const [fw, ev] = await Promise.all([
    db.ComplianceFramework.list().catch(() => []),
    db.ComplianceEvidence.list().catch(() => []),
  ]);
  const avg = fw.length > 0 ? Math.round(fw.reduce((s: number, c: any) => s + (c.score || 0), 0) / fw.length) : 0;
  const failing = fw.filter((f: any) => (f.score || 0) < 80);
  const st = avg < 50 ? "CRITICAL" : avg < 75 ? "HIGH" : "NORMAL";
  return {
    status: st,
    entities_read: ["ComplianceFramework", "ComplianceEvidence"],
    data: {
      headline: `${avg}% avg compliance across ${fw.length} frameworks`,
      frameworks: fw.map((f: any) => ({
        name: f.name, score: f.score || 0,
        passing: f.passing || 0, total: f.total_controls || 0,
        status: (f.score || 0) >= 80 ? "compliant" : (f.score || 0) >= 60 ? "partial" : "failing",
      })),
      top_failing: failing.slice(0, 3).map((f: any) => ({ name: f.name, score: f.score || 0, gap: 80 - (f.score || 0) })),
      avg_score: avg,
    },
  };
}

async function taskIntel(db: any) {
  const [feeds, dw, sc] = await Promise.all([
    db.ThreatIntelFeed.list().catch(() => []),
    db.DarkWebAlert.list().catch(() => []),
    db.SupplyChainEvent.list().catch(() => []),
  ]);
  const active = feeds.filter((f: any) => f.status === "active");
  const dwActive = dw.filter((d: any) => d.status === "active");
  const critThreats = active.filter((f: any) => f.severity === "critical");
  const st = critThreats.length > 3 ? "CRITICAL" : critThreats.length > 0 ? "HIGH" : "NORMAL";
  return {
    status: st,
    entities_read: ["ThreatIntelFeed", "DarkWebAlert", "SupplyChainEvent"],
    data: {
      headline: `${active.length} active feeds — ${critThreats.length} critical threats`,
      active_feeds: active.length, dark_web_alerts: dwActive.length,
      supply_chain_events: sc.length, critical_threats: critThreats.length,
      threat_feeds: critThreats.slice(0, 5).map((f: any) => ({ title: f.title || f.name, severity: f.severity, action_required: f.recommended_action || "Monitor" })),
      dark_web_alerts: dwActive.slice(0, 4).map((d: any) => ({ type: d.alert_type || "unknown", target: d.target_org || "N/A" })),
    },
  };
}

async function taskAISecurity(db: any) {
  const [llm, aspm] = await Promise.all([
    db.LLMUsageEvent.list().catch(() => []),
    db.ASPMAsset.list().catch(() => []),
  ]);
  const attacks = llm.filter((e: any) => e.event_type === "attack" || e.is_attack);
  const succeeded = attacks.filter((e: any) => e.succeeded || e.attack_succeeded);
  const halluc = llm.filter((e: any) => e.event_type === "hallucination");
  const highRisk = aspm.filter((a: any) => a.risk_score > 70);
  const st = succeeded.length > 0 ? "CRITICAL" : attacks.length > 5 ? "HIGH" : "NORMAL";
  return {
    status: st,
    entities_read: ["LLMUsageEvent", "ASPMAsset"],
    data: {
      headline: `${attacks.length} AI attacks detected — ${succeeded.length} succeeded`,
      total_attacks: attacks.length, succeeded: succeeded.length,
      high_risk_models: highRisk.length, hallucinations: halluc.length,
      top_attacks: attacks.slice(0, 5).map((e: any) => ({ type: e.attack_type || e.event_type || "unknown", target: e.model_name || "LLM", succeeded: !!e.succeeded })),
      attack_types: (() => {
        const m: any = {};
        for (const e of attacks) { const t = e.attack_type || "unknown"; m[t] = (m[t] || 0) + 1; }
        return Object.entries(m).map(([type, count]) => ({ type, count }));
      })(),
    },
  };
}

async function taskIR(db: any) {
  const [incidents, findings] = await Promise.all([
    db.Incident.list().catch(() => []),
    db.TriagedFinding.list().catch(() => []),
  ]);
  const open = incidents.filter((i: any) => ["open", "investigating", "active"].includes(i.status?.toLowerCase()));
  const crit = open.filter((i: any) => i.severity === "critical");
  const exploited = findings.filter((f: any) => f.exploited_in_wild && f.status === "open");
  const st = crit.length > 0 || exploited.length > 3 ? "CRITICAL" : open.length > 0 ? "HIGH" : "NORMAL";
  return {
    status: st,
    entities_read: ["Incident", "TriagedFinding"],
    data: {
      headline: `${open.length} active incidents — ${crit.length} critical`,
      active_incidents: open.length, total: incidents.length,
      critical: crit.length, exploited_in_wild: exploited.length,
      active_list: open.slice(0, 5).map((i: any) => ({ title: i.title, severity: i.severity, type: i.incident_type || "unknown" })),
      exploited_cves: exploited.slice(0, 4).map((f: any) => ({ cve: f.cve_id || f.title, asset: f.asset_name || "N/A" })),
    },
  };
}

async function taskRisk(db: any) {
  const [grs, triaged, cloudF] = await Promise.all([
    db.GlobalRiskScore.list().catch(() => []),
    db.TriagedFinding.list().catch(() => []),
    db.CloudFinding.list().catch(() => []),
  ]);
  const g = grs[0] || {};
  const open = triaged.filter((f: any) => f.status === "open");
  const slaB = open.filter((f: any) => f.sla_breached);
  const kev = open.filter((f: any) => f.exploited_in_wild);
  const st = (g.overall_score || 100) < 50 ? "CRITICAL" : (g.overall_score || 100) < 70 ? "HIGH" : "NORMAL";
  return {
    status: st,
    entities_read: ["GlobalRiskScore", "TriagedFinding", "CloudFinding"],
    data: {
      headline: `Risk Score ${g.overall_score ?? "N/A"}/100 Grade ${g.grade ?? "?"}`,
      score: g.overall_score ?? 0, grade: g.grade ?? "?", trend: g.trend ?? "stable",
      sla_breaches: slaB.length, kev_unpatched: kev.length,
      domains: [
        { name: "Code",         score: g.code_score ?? 0 },
        { name: "Cloud",        score: g.cloud_score ?? 0 },
        { name: "Identity",     score: g.identity_score ?? 0 },
        { name: "Supply Chain", score: g.supply_chain_score ?? 0 },
        { name: "Runtime",      score: g.runtime_score ?? 0 },
        { name: "Governance",   score: g.governance_score ?? 0 },
      ],
    },
  };
}

async function taskRedTeam(db: any) {
  const [paths, sims] = await Promise.all([
    db.CloudAttackPath.list().catch(() => []),
    db.AttackSimulation.list().catch(() => []),
  ]);
  const active = paths.filter((p: any) => p.status === "active");
  const critical = active.filter((p: any) => p.risk_score > 80);
  const [triaged] = await Promise.all([db.TriagedFinding.list().catch(() => [])]);
  const exploited = triaged.filter((f: any) => f.exploited_in_wild && f.status === "open");
  return {
    status: critical.length > 0 ? "CRITICAL" : active.length > 0 ? "HIGH" : "NORMAL",
    entities_read: ["CloudAttackPath", "AttackSimulation", "TriagedFinding"],
    data: {
      headline: `${sims.length} simulations — ${critical.length} critical attack paths`,
      simulations_run: sims.length, critical_attack_paths: critical.length,
      exploitable_findings: active.length, exploited_in_wild: exploited.length,
      attack_paths: active.slice(0, 5).map((p: any) => ({ name: p.name || p.title, entry_point: p.entry_point || "Internet", target: p.target || "Crown Jewel", risk_score: p.risk_score || 0 })),
      recent_simulations: sims.slice(0, 4).map((s: any) => ({ name: s.name, type: s.simulation_type || "adversarial", score: s.risk_score || 0, grade: (s.risk_score || 0) > 80 ? "F" : (s.risk_score || 0) > 60 ? "D" : "B" })),
    },
  };
}

async function taskHunter(db: any) {
  const [iocs, feeds, sc, dw] = await Promise.all([
    db.IOCRecord.filter({ status: "active" }).catch(() => []),
    db.ThreatIntelFeed.filter({ status: "active" }).catch(() => []),
    db.SupplyChainEvent.list().catch(() => []),
    db.DarkWebAlert.filter({ status: "active" }).catch(() => []),
  ]);
  const crit = feeds.filter((f: any) => f.severity === "critical");
  return {
    status: iocs.length > 20 ? "CRITICAL" : iocs.length > 5 ? "HIGH" : "NORMAL",
    entities_read: ["IOCRecord", "ThreatIntelFeed", "SupplyChainEvent", "DarkWebAlert"],
    data: {
      headline: `${iocs.length} active IOCs — ${crit.length} critical feeds`,
      active_iocs: iocs.length, critical_feeds: crit.length,
      supply_chain_events: sc.length, dark_web_active: dw.length,
      top_iocs: iocs.slice(0, 5).map((i: any) => ({ type: i.ioc_type || "unknown", value: (i.value || "").slice(0, 40), threat_type: i.threat_type || "N/A", confidence: i.confidence || 0 })),
      critical_feed_items: crit.slice(0, 3).map((f: any) => ({ title: f.title || f.name, action: f.recommended_action || "Investigate" })),
      ioc_types: (() => {
        const m: any = {};
        for (const i of iocs) { const t = i.ioc_type || "unknown"; m[t] = (m[t] || 0) + 1; }
        return Object.entries(m).map(([type, count]) => ({ type, count }));
      })(),
    },
  };
}

async function taskDarkWeb(db: any) {
  const [alerts, ransomware, creds] = await Promise.all([
    db.DarkWebAlert.list().catch(() => []),
    db.RansomwareGroup.list().catch(() => []),
    db.CredentialLeak.list().catch(() => []),
  ]);
  const active = alerts.filter((a: any) => a.status === "active");
  const critA = active.filter((a: any) => a.severity === "critical");
  return {
    status: critA.length > 0 ? "CRITICAL" : active.length > 0 ? "HIGH" : "NORMAL",
    entities_read: ["DarkWebAlert", "RansomwareGroup", "CredentialLeak"],
    data: {
      headline: `${active.length} active dark web alerts — ${creds.length} credential leaks`,
      active_alerts: active.length, critical: critA.length,
      credential_leaks: creds.length, ransomware_groups: ransomware.length,
      top_alerts: active.slice(0, 5).map((a: any) => ({ title: a.title, type: a.alert_type || "unknown", severity: a.severity, target: a.target_org || "N/A" })),
      ransomware_groups: ransomware.slice(0, 3).map((r: any) => ({ name: r.name, victims_month: r.victims_this_month || 0, sectors: (r.target_sectors || []).join(", ") })),
      credential_leaks: creds.slice(0, 4).map((c: any) => ({ email: (c.email || "").slice(0, 30), breach: c.breach_name || "unknown", severity: c.severity || "medium" })),
    },
  };
}

async function taskPentest(db: any) {
  const [campaigns, paths, triaged] = await Promise.all([
    db.PentestCampaign.list().catch(() => []),
    db.CloudAttackPath.list().catch(() => []),
    db.TriagedFinding.list().catch(() => []),
  ]);
  const active = campaigns.filter((c: any) => c.status === "active" || c.status === "running");
  const critPaths = paths.filter((p: any) => p.risk_score > 80);
  const exploitable = triaged.filter((f: any) => f.status === "open" && f.exploited_in_wild);
  return {
    status: critPaths.length > 0 ? "CRITICAL" : active.length > 0 ? "HIGH" : "NORMAL",
    entities_read: ["PentestCampaign", "CloudAttackPath", "TriagedFinding"],
    data: {
      headline: `${campaigns.length} pentest campaigns — ${critPaths.length} critical paths`,
      simulations_run: campaigns.length, critical_attack_paths: critPaths.length,
      exploitable_findings: exploitable.length, exploited_in_wild: exploitable.length,
      attack_paths: critPaths.slice(0, 5).map((p: any) => ({ name: p.name || p.title, entry_point: p.entry_point || "Internet", target: p.target || "Crown Jewel", risk_score: p.risk_score || 0 })),
      recent_simulations: campaigns.slice(0, 4).map((c: any) => ({ name: c.name, type: c.methodology || "black-box", score: c.risk_score || 0, grade: (c.risk_score || 0) > 80 ? "F" : "B" })),
    },
  };
}

async function taskSimulation(db: any) {
  const [sims, paths, triaged] = await Promise.all([
    db.AttackSimulation.list().catch(() => []),
    db.CloudAttackPath.list().catch(() => []),
    db.TriagedFinding.list().catch(() => []),
  ]);
  const critPaths = paths.filter((p: any) => p.risk_score > 80);
  const exploited = triaged.filter((f: any) => f.exploited_in_wild);
  const crit = sims.filter((s: any) => (s.risk_score || 0) > 80);
  return {
    status: crit.length > 0 ? "CRITICAL" : sims.length > 0 ? "HIGH" : "NORMAL",
    entities_read: ["AttackSimulation", "CloudAttackPath", "TriagedFinding"],
    data: {
      headline: `${sims.length} simulations run — ${crit.length} critical outcomes`,
      simulations_run: sims.length, critical_attack_paths: critPaths.length,
      exploitable_findings: critPaths.length, exploited_in_wild: exploited.length,
      recent_simulations: sims.slice(0, 5).map((s: any) => ({ name: s.name, type: s.simulation_type || "adversarial", score: s.risk_score || 0, grade: (s.risk_score || 0) > 80 ? "F" : "B" })),
      critical_paths: critPaths.slice(0, 4).map((p: any) => ({ name: p.name || p.title, entry_point: p.entry_point || "Internet", target: p.target || "Asset", risk_score: p.risk_score })),
    },
  };
}

async function taskExploit(db: any) {
  const [triaged, paths] = await Promise.all([
    db.TriagedFinding.list().catch(() => []),
    db.CloudAttackPath.list().catch(() => []),
  ]);
  const open = triaged.filter((f: any) => f.status === "open");
  const exploited = open.filter((f: any) => f.exploited_in_wild);
  const highEPSS = open.filter((f: any) => (f.epss_score || 0) > 0.5);
  const kev = open.filter((f: any) => f.in_kev || f.kev_listed);
  const critPaths = paths.filter((p: any) => p.risk_score > 80);
  return {
    status: exploited.length > 0 ? "CRITICAL" : highEPSS.length > 5 ? "HIGH" : "NORMAL",
    entities_read: ["TriagedFinding", "CloudAttackPath"],
    data: {
      headline: `${exploited.length} actively exploited — ${highEPSS.length} high EPSS`,
      active_exploits: exploited.length, high_epss: highEPSS.length,
      kev_listed: kev.length, critical_paths: critPaths.length,
      exploited_cves: exploited.slice(0, 5).map((f: any) => ({ cve: f.cve_id || f.title, asset: f.asset_name || "N/A", epss: f.epss_score || 0 })),
      high_epss_list: highEPSS.slice(0, 5).map((f: any) => ({ cve: f.cve_id || f.title, score: f.epss_score || 0, asset: f.asset_name || "N/A" })),
    },
  };
}

async function taskOSINT(db: any) {
  const [asm, shadow, certs] = await Promise.all([
    db.ASMAsset.list().catch(() => []),
    db.ASMExposureRecord.list().catch(() => []),
    db.ASMCertificate.list().catch(() => []),
  ]);
  const internetFacing = asm.filter((a: any) => a.is_internet_facing || a.exposure === "public");
  const expiring = certs.filter((c: any) => { try { return (new Date(c.expiry_date).getTime() - Date.now()) < 30 * 86400000; } catch { return false; } });
  return {
    status: expiring.length > 0 ? "HIGH" : "NORMAL",
    entities_read: ["ASMAsset", "ASMExposureRecord", "ASMCertificate"],
    data: {
      headline: `${asm.length} assets discovered — ${internetFacing.length} internet-facing`,
      total_assets: asm.length, internet_facing: internetFacing.length,
      shadow_it: shadow.length, expiring_certs: expiring.length,
      internet_facing_list: internetFacing.slice(0, 5).map((a: any) => ({ name: a.name || a.hostname, type: a.asset_type || "unknown", risk_score: a.risk_score || 0 })),
      shadow_it_list: shadow.slice(0, 4).map((s: any) => ({ name: s.asset_name || s.name, type: s.exposure_type || "unknown", discovered: s.discovered_at || s.created_date })),
    },
  };
}

async function platformIntel(db: any) {
  const [cloudF, findings, grs, compliance] = await Promise.all([
    db.CloudFinding.list().catch(() => []),
    db.TriagedFinding.list().catch(() => []),
    db.GlobalRiskScore.list().catch(() => []),
    db.ComplianceFramework.list().catch(() => []),
  ]);
  const g = grs[0] || {};
  const openCloud = cloudF.filter((f: any) => f.status === "open");
  const openF = findings.filter((f: any) => f.status === "open");
  return {
    score: g.overall_score ?? 0,
    grade: g.grade ?? "?",
    trend: g.trend ?? "stable",
    cloud_open: openCloud.length,
    cloud_critical: openCloud.filter((f: any) => f.severity === "critical").length,
    vuln_total: openF.length,
    vuln_critical: openF.filter((f: any) => f.normalized_severity === "critical").length,
    compliance_avg: compliance.length > 0 ? Math.round(compliance.reduce((s: number, c: any) => s + (c.score || 0), 0) / compliance.length) : 0,
  };
}

async function liveFeed(db: any) {
  const [sessions, approvals] = await Promise.all([
    db.CopilotSession.list("-created_date", 15).catch(() => []),
    db.CopilotApproval.filter({ status: "pending" }).catch(() => []),
  ]);
  const feed = sessions.map((s: any) => ({
    id: s.id, agent: s.context_summary?.split(":")[0] || "GDS Agent",
    action: s.context_summary || "Security operation executed",
    status: s.status, time: rel(s.created_date || ts()),
  }));
  return { feed, pending_approvals: approvals.length };
}

const TASK_MAP: Record<string, (db: any) => Promise<any>> = {
  soc_summary: taskSOC, cloud_review: taskCloud, vulnerability_scan: taskVuln,
  identity_analysis: taskIdentity, compliance_check: taskCompliance, threat_intel: taskIntel,
  ai_security_scan: taskAISecurity, incident_response: taskIR, risk_assessment: taskRisk,
  red_team_ops: taskRedTeam, threat_hunt: taskHunter, dark_web_scan: taskDarkWeb,
  pentest_authorized: taskPentest, attack_simulation: taskSimulation,
  exploit_analysis: taskExploit, osint_recon: taskOSINT,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const t0 = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const db = base44.entities;
    const body = await req.json().catch(() => ({}));
    if (['bootstrap_data', 'execute', 'workflow'].includes(body.action)) return Response.json({
      success: false, status: 'unavailable', code: 'GOVERNED_RUNTIME_REQUIRED',
      error: 'Legacy orchestration and synthetic seeding are disabled. Use the governed runtime.',
      persisted: false, real_execution: false,
    }, { status: 503 });
    const { action = "platform_intel" } = body;

    if (action === "platform_intel") {
      const [oc, of2, grs, compliance, incidents, dw, acts, cust] = await Promise.all([
        db.CloudFinding.filter({ status: "open" }).catch(() => []),
        db.TriagedFinding.filter({ status: "open" }).catch(() => []),
        db.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
        db.ComplianceFramework.list().catch(() => []),
        db.Incident.list().catch(() => []),
        db.DarkWebAlert.list().catch(() => []),
        db.CopilotSession.list("-created_date", 50).catch(() => []),
        db.CustomerTenant.list().catch(() => []),
      ]);
      const g0 = grs[0] || {};
      const avg = compliance.length > 0 ? Math.round(compliance.reduce((s: number, c: any) => s + (c.score || 0), 0) / compliance.length) : 0;
      const V = "9.2.0";
      return new Response(JSON.stringify({
        success: true,
        version: V,
        risk: { score: g0.overall_score, grade: g0.grade, trend: g0.trend, code: g0.code_score, cloud: g0.cloud_score, identity: g0.identity_score },
        defensive: { cloud_open: oc.length, cloud_critical: oc.filter((x: any) => x.severity === "critical").length, vuln_total: of2.length, vuln_critical: of2.filter((x: any) => x.normalized_severity === "critical").length, exploited_in_wild: of2.filter((x: any) => x.exploited_in_wild).length, active_incidents: incidents.filter((x: any) => ["open", "investigating", "active"].includes(x.status?.toLowerCase())).length, compliance_avg: avg },
        offensive: { dark_web_alerts: dw.filter((x: any) => x.status === "active" || x.status === "open").length, active_hunts: acts.filter((x: any) => AGENTS[x.agent_id]?.branch === "offensive").length },
        mssp: { active_customers: cust.filter((x: any) => x.status === "active").length },
        agents: { total: Object.keys(AGENTS).length, active_sessions: acts.length },
        timestamp: ts()
      }), { headers: CORS });
    }

    if (action === "execute") {
      const { agent_id, task } = body;
      const agent = AGENTS[agent_id];
      if (!agent) return new Response(JSON.stringify({ success: false, error: "Unknown agent" }), { status: 400, headers: CORS });
      const fn = TASK_MAP[task || agent.task];
      if (!fn) return new Response(JSON.stringify({ success: false, error: "Unknown task" }), { status: 400, headers: CORS });
      const result = await fn(db);
      result.duration_ms = Date.now() - t0;
      // Log session
      await db.CopilotSession.create({ session_id: `MSTR-${Date.now()}`, user_role: "analyst", session_type: "interactive" as any, initiated_by: "master_orchestrator", context_summary: safe(`${agent.name}: ${task}`), agents_used: [agent_id], commands_count: 1, reports_generated: 1, risk_level: "low" as any, started_at: ts(), status: "completed" }).catch(() => {});
      return new Response(JSON.stringify({ success: true, session_id: `MSTR-${Date.now()}`, agent, result, timestamp: ts() }), { headers: CORS });
    }

    if (action === "workflow") {
      const { agents = [], mission = "" } = body;
      const results: any[] = [];
      let critical_count = 0;
      for (const aid of agents) {
        const agent = AGENTS[aid];
        if (!agent) continue;
        const fn = TASK_MAP[agent.task];
        if (!fn) continue;
        const r = await fn(db);
        r.duration_ms = Date.now() - t0;
        if (r.status === "CRITICAL") critical_count++;
        results.push({ agent, result: r });
      }
      const overall = critical_count > 0 ? "CRITICAL" : results.some(r => r.result.status === "HIGH") ? "HIGH" : "COMPLETED";
      return new Response(JSON.stringify({ success: true, results, overall_status: overall, critical_count, mission, timestamp: ts() }), { headers: CORS });
    }

    if (action === "live_feed") {
      const data = await liveFeed(db);
      return new Response(JSON.stringify({ success: true, ...data, timestamp: ts() }), { headers: CORS });
    }

    if (action === "list_agents") {
      const { branch } = body;
      const list = Object.values(AGENTS).filter((a: any) => !branch || a.branch === branch);
      return new Response(JSON.stringify({ success: true, agents: list }), { headers: CORS });
    }

    if (action === "bootstrap_data") {
      const results: any = { cloud_findings: 0, vuln_findings: 0, compliance: 0, grs: 0, ciem: 0 };
      try { await db.GlobalRiskScore.create({ overall_score: 88, grade: "A", trend: "improving", score_delta: 3, code_score: 100, cloud_score: 72, attack_score: 65, runtime_score: 88, supply_chain_score: 45, governance_score: 71, identity_score: 100, data_score: 80, total_open_findings: 76, critical_findings: 19, high_findings: 30, kev_unpatched: 1, sla_breached: 0, assets_protected: 47, compliance_avg_score: 28, calculated_at: ts() }); results.grs++; } catch (_) {}
      const cloudFindings = [
        { title: "RDS Instance Publicly Accessible", severity: "critical", service: "rds", provider: "aws", remediation: "Disable public accessibility on RDS", status: "open" },
        { title: "CloudTrail Not Enabled in All Regions", severity: "critical", service: "cloudtrail", provider: "aws", remediation: "Enable multi-region CloudTrail trail", status: "open" },
        { title: "Security Group Allows Unrestricted RDP", severity: "critical", service: "ec2", provider: "aws", remediation: "Restrict RDP access to VPN/known IPs only", status: "open" },
        { title: "Security Group Allows Unrestricted SSH", severity: "critical", service: "ec2", provider: "aws", remediation: "Restrict SSH to known IPs only", status: "open" },
        { title: "Root Account MFA Not Enabled", severity: "critical", service: "iam", provider: "aws", remediation: "Enable MFA on root account immediately", status: "open" },
        { title: "S3 Bucket Publicly Accessible", severity: "critical", service: "s3", provider: "aws", remediation: "Enable S3 Block Public Access at account level", status: "open" },
        { title: "GuardDuty Not Enabled", severity: "critical", service: "guardduty", provider: "aws", remediation: "Enable GuardDuty: aws guardduty create-detector --enable", status: "open" },
        { title: "Lambda Execution Role with Wildcard Permissions", severity: "critical", service: "lambda", provider: "aws", remediation: "Apply least-privilege execution roles", status: "open" },
        { title: "Lambda Environment Variables Contain Secrets", severity: "critical", service: "lambda", provider: "aws", remediation: "Migrate secrets to AWS Secrets Manager", status: "open" },
        { title: "ECS Task Definition Privileged Container", severity: "critical", service: "ecs", provider: "aws", remediation: "Set privileged=false in all task definitions", status: "open" },
        { title: "No CloudTrail Audit Logging", severity: "critical", service: "cloudtrail", provider: "aws", remediation: "Create multi-region CloudTrail trail immediately", status: "open" },
        { title: "RDS Instance Publicly Accessible (duplicate check)", severity: "critical", service: "rds", provider: "aws", remediation: "Set PubliclyAccessible=false and restrict via security groups", status: "open" },
        { title: "Security Group Allows All Inbound Traffic", severity: "critical", service: "ec2", provider: "aws", remediation: "Remove 0.0.0.0/0 inbound rules from all security groups", status: "open" },
        { title: "VPC Flow Logs Disabled", severity: "high", service: "vpc", provider: "aws", remediation: "Enable VPC Flow Logs for all VPCs", status: "open" },
        { title: "IAM Access Keys Not Rotated >90 Days", severity: "high", service: "iam", provider: "aws", remediation: "Rotate all access keys older than 90 days", status: "open" },
        { title: "S3 Bucket Server-Side Encryption Disabled", severity: "high", service: "s3", provider: "aws", remediation: "Enable default SSE-S3 encryption", status: "open" },
        { title: "API Gateway Access Logging Disabled", severity: "high", service: "api-gateway", provider: "aws", remediation: "Enable access logging for all API Gateway stages", status: "open" },
        { title: "RDS Automated Backups Disabled", severity: "high", service: "rds", provider: "aws", remediation: "Enable automated backups with 7-day retention", status: "open" },
        { title: "IAM User gds-security-scanner Has No MFA", severity: "high", service: "iam", provider: "aws", remediation: "Enable MFA for IAM user gds-security-scanner", status: "open" },
        { title: "IAM User GDS Has No MFA", severity: "high", service: "iam", provider: "aws", remediation: "Enable MFA for IAM user GDS", status: "open" },
        { title: "API Gateway No WAF Association", severity: "high", service: "api-gateway", provider: "aws", remediation: "Associate AWS WAF with all public API Gateway stages", status: "open" },
        { title: "RDS Encryption at Rest Disabled", severity: "high", service: "rds", provider: "aws", remediation: "Enable storage encryption using AWS KMS", status: "open" },
        { title: "Password Policy Does Not Meet CIS Standards", severity: "high", service: "iam", provider: "aws", remediation: "Update password policy to minimum 14 chars with complexity", status: "open" },
        { title: "ECS No Read-Only Root Filesystem", severity: "high", service: "ecs", provider: "aws", remediation: "Enable readonlyRootFilesystem=true in container definitions", status: "open" },
        { title: "ECS Task IAM Role Overly Broad Permissions", severity: "high", service: "ecs", provider: "aws", remediation: "Scope task role to minimum required permissions", status: "open" },
        { title: "KMS Key Rotation Disabled", severity: "medium", service: "kms", provider: "aws", remediation: "Enable automatic KMS key rotation", status: "open" },
        { title: "S3 Bucket Versioning Disabled", severity: "medium", service: "s3", provider: "aws", remediation: "Enable versioning on critical S3 buckets", status: "open" },
        { title: "IAM Password Policy Too Weak", severity: "medium", service: "iam", provider: "aws", remediation: "Set strong IAM password policy", status: "open" },
        { title: "IAM Access Key Never Used", severity: "medium", service: "iam", provider: "aws", remediation: "Delete unused IAM access keys", status: "open" },
        { title: "No IAM Password Policy Set", severity: "high", service: "iam", provider: "aws", remediation: "Configure strong password policy in IAM", status: "open" },
        { title: "IAM User shieldAI Has No MFA", severity: "high", service: "iam", provider: "aws", remediation: "Enable MFA for IAM user shieldAI immediately", status: "open" },
        { title: "Lambda No Function-Level Resource Policy", severity: "high", service: "lambda", provider: "aws", remediation: "Add explicit resource-based policies limiting invocation", status: "open" },
        { title: "ECS Task Role with Admin Permissions", severity: "medium", service: "ecs", provider: "aws", remediation: "Apply least privilege to ECS task execution roles", status: "open" },
      ];
      for (const f of cloudFindings) { try { await db.CloudFinding.create({ ...f, cloud_account_id: "696616821372", region: "eu-west-1", detected_at: ts() }); results.cloud_findings++; } catch (_) {} }
      const vulns = [
        { title: "axios SSRF via NO_PROXY Bypass — CVE-2025-62718", cve_id: "CVE-2025-62718", normalized_severity: "critical", asset_name: "gds-os", fixed_version: "1.15.0", exploited_in_wild: false, epss_score: 0.89, status: "open" },
        { title: "lodash Prototype Pollution — CVE-2021-23337", cve_id: "CVE-2021-23337", normalized_severity: "critical", asset_name: "gds-os", fixed_version: "4.17.21", exploited_in_wild: true, epss_score: 0.71, status: "open" },
        { title: "axios SSRF — CVE-2023-45857", cve_id: "CVE-2023-45857", normalized_severity: "critical", asset_name: "axios", fixed_version: "1.6.0", exploited_in_wild: false, epss_score: 0.11, status: "open" },
        { title: "jsonwebtoken Algorithm Confusion — CVE-2022-23529", cve_id: "CVE-2022-23529", normalized_severity: "critical", asset_name: "jsonwebtoken", fixed_version: "9.0.0", exploited_in_wild: false, epss_score: 0.089, status: "open" },
        { title: "Prompt Injection — LLM System Prompt Extraction", cve_id: null, normalized_severity: "critical", asset_name: "AI Chat Service", fixed_version: null, exploited_in_wild: false, epss_score: 0.71, status: "open" },
        { title: "Security Group Unrestricted Ingress 0.0.0.0/0", cve_id: null, normalized_severity: "critical", asset_name: "gds-os", fixed_version: null, exploited_in_wild: false, epss_score: null, status: "open" },
        { title: "axios MITM via Prototype Pollution — CVE-2026-44494", cve_id: "CVE-2026-44494", normalized_severity: "high", asset_name: "gds-os", fixed_version: "1.16.0", exploited_in_wild: false, epss_score: 0.06, status: "open" },
        { title: "axios Proxy-Auth Credential Leak — CVE-2026-44487", cve_id: "CVE-2026-44487", normalized_severity: "high", asset_name: "gds-os", fixed_version: "1.16.0", exploited_in_wild: false, epss_score: 0.04, status: "open" },
        { title: "axios Header Injection via Prototype Pollution — CVE-2026-42035", cve_id: "CVE-2026-42035", normalized_severity: "high", asset_name: "gds-os", fixed_version: "1.15.1", exploited_in_wild: false, epss_score: 0.03, status: "open" },
        { title: "axios DoS via __proto__ in mergeConfig — CVE-2026-25639", cve_id: "CVE-2026-25639", normalized_severity: "high", asset_name: "gds-os", fixed_version: "1.13.5", exploited_in_wild: false, epss_score: 0.02, status: "open" },
        { title: "ws Memory Exhaustion DoS — CVE-2026-48779", cve_id: "CVE-2026-48779", normalized_severity: "high", asset_name: "gds-os", fixed_version: "5.2.5", exploited_in_wild: false, epss_score: 0.03, status: "open" },
        { title: "lodash Code Injection via _.template — CVE-2026-4800", cve_id: "CVE-2026-4800", normalized_severity: "high", asset_name: "gds-os", fixed_version: "4.18.0", exploited_in_wild: false, epss_score: 0.04, status: "open" },
        { title: "Python 3.8 EOL Runtime", cve_id: null, normalized_severity: "high", asset_name: "ml-inference-service", fixed_version: null, exploited_in_wild: false, epss_score: 0.0, status: "open" },
        { title: "SQL Injection in database.ts", cve_id: null, normalized_severity: "high", asset_name: "gds-os", fixed_version: null, exploited_in_wild: false, epss_score: null, status: "open" },
        { title: "Request Smuggling in axios@0.21.1", cve_id: null, normalized_severity: "high", asset_name: "gds-os", fixed_version: "0.27.2", exploited_in_wild: false, epss_score: null, status: "open" },
        { title: "lodash Prototype Pollution via array path — CVE-2026-2950", cve_id: "CVE-2026-2950", normalized_severity: "medium", asset_name: "gds-os", fixed_version: "4.18.0", exploited_in_wild: false, epss_score: null, status: "open" },
        { title: "axios XSRF Token Cross-Origin Leakage — CVE-2026-42042", cve_id: "CVE-2026-42042", normalized_severity: "medium", asset_name: "gds-os", fixed_version: "1.15.1", exploited_in_wild: false, epss_score: null, status: "open" },
        { title: "Path Traversal in fileUpload.ts", cve_id: null, normalized_severity: "medium", asset_name: "gds-os", fixed_version: null, exploited_in_wild: false, epss_score: null, status: "open" },
        { title: "axios Streamed Responses Bypass maxContentLength — CVE-2026-42036", cve_id: "CVE-2026-42036", normalized_severity: "medium", asset_name: "gds-os", fixed_version: "1.15.1", exploited_in_wild: false, epss_score: null, status: "open" },
        { title: "ws Uninitialized Memory Disclosure — CVE-2026-45736", cve_id: "CVE-2026-45736", normalized_severity: "medium", asset_name: "gds-os", fixed_version: "8.20.1", exploited_in_wild: false, epss_score: null, status: "open" },
      ];
      for (const v of vulns) { try { await db.TriagedFinding.create({ ...v, severity: v.normalized_severity, source_scanners: "gds-scanner", first_detected: ts(), last_seen: ts() }); results.vuln_findings++; } catch (_) {} }
      const frameworks = [
        { name: "SOC2", version: "Type II", total_controls: 10, passing: 0, failing: 10, not_tested: 0, score: 0, status: "non_compliant", owner: "AI Compliance Director" },
        { name: "PCI-DSS", version: "v4.0", total_controls: 12, passing: 2, failing: 10, not_tested: 0, score: 18, status: "non_compliant", owner: "AI Compliance Director" },
        { name: "ISO27001", version: "2022", total_controls: 12, passing: 3, failing: 9, not_tested: 0, score: 24, status: "non_compliant", owner: "AI Compliance Director" },
        { name: "HIPAA", version: "2023", total_controls: 12, passing: 4, failing: 8, not_tested: 0, score: 35, status: "non_compliant", owner: "AI Compliance Director" },
        { name: "GDPR", version: "2018", total_controls: 12, passing: 5, failing: 7, not_tested: 0, score: 41, status: "partial", owner: "AI Compliance Director" },
        { name: "NIST_CSF", version: "2.0", total_controls: 12, passing: 6, failing: 6, not_tested: 0, score: 48, status: "partial", owner: "AI Compliance Director" },
      ];
      for (const f of frameworks) { try { await db.ComplianceFramework.create({ ...f, last_assessed: ts() }); results.compliance++; } catch (_) {} }
      const ciemFindings = [
        { title: "IAM User gds-security-scanner Has No MFA", identity_type: "iam_user", identity_name: "gds-security-scanner", finding_type: "mfa_not_enabled", severity: "critical", status: "open", provider: "aws", account_id: "696616821372", remediation: "Enable MFA immediately", days_inactive: 999 },
        { title: "IAM User GDS Has Unused Access Key", identity_type: "iam_user", identity_name: "GDS", finding_type: "unused_access_key", severity: "high", status: "open", provider: "aws", account_id: "696616821372", remediation: "Delete unused access key J76JJZPB", days_inactive: 45 },
        { title: "Root Account Has No MFA", identity_type: "root_account", identity_name: "root", finding_type: "mfa_not_enabled", severity: "critical", status: "open", provider: "aws", account_id: "696616821372", remediation: "Enable MFA on AWS root account immediately", days_inactive: 0 },
        { title: "IAM User shieldAI Has No MFA", identity_type: "iam_user", identity_name: "shieldAI", finding_type: "mfa_not_enabled", severity: "critical", status: "open", provider: "aws", account_id: "696616821372", remediation: "Enable MFA for shieldAI user", days_inactive: 120 },
      ];
      for (const c of ciemFindings) { try { await db.CIEMFinding.create({ ...c, detected_at: ts() }); results.ciem++; } catch (_) {} }
      return new Response(JSON.stringify({ success: true, message: "Database bootstrapped with full security data", results, timestamp: ts() }), { headers: CORS });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), { status: 400, headers: CORS });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
});