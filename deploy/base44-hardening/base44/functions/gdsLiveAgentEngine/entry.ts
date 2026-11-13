import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

const ts = () => new Date().toISOString();
const safe = (s: any) => String(s || "").slice(0, 300);
const rel = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  return `${Math.round(diff / 3600000)}h ago`;
};

const AGENTS = [
  { id: "gds-gasci-orchestrator",   name: "GASCI Orchestrator",        tier: "sovereign",   domain: "ai orchestration",   health_score: null, executions_total: null, success_rate: null, capabilities: ["orchestrate_agents","consensus_reasoning","multi_llm_routing","safety_enforcement","goal_planning"], description: "Master AI orchestrator. Routes all commands across the 35-agent fleet using consensus reasoning and multi-LLM arbitration." },
  { id: "gds-chief-ciso",           name: "Chief CISO",                tier: "sovereign",   domain: "executive security", health_score: null, executions_total: null,  success_rate: null, capabilities: ["board_reporting","risk_prioritization","executive_brief","security_posture_score","strategic_advisory"], description: "AI Chief Information Security Officer. Produces board-level reports and strategic risk assessments." },
  { id: "gds-risk-director",        name: "Risk Director",             tier: "sovereign",   domain: "risk intelligence",  health_score: null, executions_total: null,  success_rate: null, capabilities: ["risk_assessment","fair_modelling","threat_correlation","risk_scoring","financial_exposure"], description: "Calculates enterprise risk scores using FAIR methodology and live threat data." },
  { id: "gds-soc-director",         name: "SOC Director",              tier: "sovereign",   domain: "soc operations",     health_score: null, executions_total: null, success_rate: null, capabilities: ["soc_summary","alert_triage","incident_prioritisation","queue_management","playbook_execution"], description: "AI Security Operations Center Director. Manages real-time alert triage and incident prioritisation." },
  { id: "gds-cloud-director",       name: "Cloud Security Director",   tier: "command",     domain: "cloud security",     health_score: null, executions_total: null, success_rate: null, capabilities: ["cloud_review","cspm_scan","misconfiguration_fix","cloud_risk_scoring","aws_azure_gcp"], description: "Scans and remediates cloud misconfigurations across AWS, Azure, and GCP in real time." },
  { id: "gds-ciem-director",        name: "CIEM Director",             tier: "command",     domain: "identity entitlements", health_score: null, executions_total: null, success_rate: null, capabilities: ["identity_analysis","privilege_escalation_detection","toxic_combo_detection","jit_access","iam_review"], description: "Cloud Identity Entitlement Management. Detects over-privileged identities and toxic permission combinations." },
  { id: "gds-vuln-director",        name: "Vulnerability Director",    tier: "command",     domain: "vulnerability management", health_score: null, executions_total: null, success_rate: null, capabilities: ["vulnerability_scan","cve_enrichment","kev_tracking","epss_scoring","patch_prioritisation"], description: "Manages the full vulnerability lifecycle from discovery through patch verification." },
  { id: "gds-remediation-director", name: "Remediation Director",      tier: "command",     domain: "auto remediation",   health_score: null, executions_total: null,  success_rate: null, capabilities: ["remediation_plan","auto_patch","pr_generation","rollback","verify_remediation"], description: "Autonomous remediation engine. Creates and executes fix plans across code, cloud, and infrastructure." },
  { id: "gds-threat-hunter",        name: "Threat Hunter",             tier: "command",     domain: "threat hunting",     health_score: null, executions_total: null,  success_rate: null, capabilities: ["threat_hunt","ioc_correlation","ttp_mapping","proactive_detection","mitre_coverage"], description: "Proactive threat hunting using IOC correlation and MITRE ATT&CK TTP mapping." },
  { id: "gds-incident-commander",   name: "Incident Commander",        tier: "command",     domain: "incident response",  health_score: null, executions_total: null,  success_rate: null, capabilities: ["investigate_incident","containment","eradication","recovery","timeline_analysis"], description: "Autonomous incident response. Coordinates containment, eradication, and recovery operations." },
  { id: "gds-compliance-director",  name: "Compliance Director",       tier: "command",     domain: "compliance",         health_score: null, executions_total: null, success_rate: null, capabilities: ["compliance_check","framework_mapping","evidence_collection","gap_analysis","report_generation"], description: "Automated compliance across SOC2, ISO27001, NIST, PCI-DSS, HIPAA, and GDPR." },
  { id: "gds-exec-advisor",         name: "Executive Advisor",         tier: "command",     domain: "executive intelligence", health_score: null, executions_total: null, success_rate: null, capabilities: ["executive_brief","board_report","kpi_dashboard","trend_analysis","investor_narrative"], description: "Generates board-ready security intelligence narratives and KPI dashboards." },
  { id: "gds-ir-director",          name: "IR Director",               tier: "command",     domain: "incident response",  health_score: null, executions_total: null,  success_rate: null, capabilities: ["dfir_analysis","forensic_collection","root_cause","regulatory_notification","post_incident_review"], description: "Digital Forensics and Incident Response. Manages the full IR lifecycle including regulatory notifications." },
  { id: "gds-dark-web-monitor",     name: "Dark Web Monitor",          tier: "specialist",  domain: "dark web intelligence", health_score: null, executions_total: null, success_rate: null, capabilities: ["dark_web_scan","credential_leak_detection","ransomware_tracking","threat_actor_profiling","data_breach_detection"], description: "Monitors dark web markets, forums, and ransomware sites for credential leaks and breach data." },
  { id: "gds-devsecops-director",   name: "DevSecOps Director",        tier: "specialist",  domain: "devsecops",          health_score: null, executions_total: null,  success_rate: null, capabilities: ["sast_scan","sca_scan","secret_detection","iac_security","cicd_security"], description: "Shifts security left. Scans code, dependencies, IaC, and CI/CD pipelines autonomously." },
  { id: "gds-ai-red-team",          name: "AI Red Team Agent",         tier: "restricted",  domain: "offensive security", health_score: null, executions_total: null,  success_rate: null, capabilities: ["pentest_authorized","attack_simulation","prompt_injection_test","adversarial_ml_test","zero_day_watch"], description: "Authorized AI penetration testing and adversarial ML security evaluation." },
  { id: "gds-identity-director",    name: "Identity Security Director",tier: "specialist",  domain: "identity security",  health_score: null, executions_total: null,  success_rate: null, capabilities: ["identity_analysis","ad_explorer","privilege_analysis","attack_path_mapping","credential_exposure"], description: "Analyzes Active Directory, IAM, and federated identity systems for attack paths." },
  { id: "gds-predictive-risk",      name: "Predictive Risk Director",  tier: "specialist",  domain: "predictive analytics", health_score: null, executions_total: null, success_rate: null, capabilities: ["risk_forecast","ml_anomaly_detection","sla_breach_predict","trend_analysis","what_if_modelling"], description: "ML-powered predictive risk engine. Forecasts breach probability and SLA breach likelihood." },
  { id: "gds-asm-director",         name: "ASM Director",              tier: "specialist",  domain: "attack surface",     health_score: null, executions_total: null,  success_rate: null, capabilities: ["asset_discovery","subdomain_enumeration","exposure_analysis","shadow_it_detection","certificate_monitoring"], description: "Continuous attack surface management. Discovers and monitors all external-facing assets." },
  { id: "gds-soar-director",        name: "SOAR Director",             tier: "specialist",  domain: "security automation", health_score: null, executions_total: null, success_rate: null, capabilities: ["workflow_automation","playbook_execution","alert_enrichment","case_management","orchestration"], description: "Security Orchestration, Automation and Response. Executes playbooks and automates response workflows." },
  { id: "gds-mssp-director",        name: "MSSP Director",             tier: "command",     domain: "managed services",   health_score: null, executions_total: null,  success_rate: null, capabilities: ["customer_health_check","sla_monitoring","revenue_analysis","tenant_isolation","multi_tenant_soc"], description: "Manages multi-tenant MSSP operations including customer health scoring and SLA compliance." },
  { id: "gds-sbom-director",        name: "SBOM Intelligence Director",tier: "specialist",  domain: "supply chain",       health_score: null, executions_total: null,  success_rate: null, capabilities: ["sbom_generation","license_compliance","dependency_risk","supply_chain_attack_detection","vex_management"], description: "Software Bill of Materials intelligence. Tracks dependency risks across the full supply chain." },
  { id: "gds-zero-trust-director",  name: "Zero Trust Director",       tier: "specialist",  domain: "zero trust",         health_score: null, executions_total: null,  success_rate: null, capabilities: ["zero_trust_evaluation","jit_access_grant","conditional_access","device_trust","policy_enforcement"], description: "Enforces continuous Zero Trust verification across users, devices, and services." },
  { id: "gds-runtime-protection",   name: "Runtime Protection Director",tier: "specialist", domain: "runtime security",   health_score: null, executions_total: null,  success_rate: null, capabilities: ["runtime_monitoring","ebpf_detection","container_runtime","anomaly_detection","threat_blocking"], description: "eBPF-powered runtime protection. Detects and blocks threats in running containers and VMs." },
  { id: "gds-data-security",        name: "Data Security Director",    tier: "specialist",  domain: "data security",      health_score: null, executions_total: null,  success_rate: null, capabilities: ["dspm_scan","data_classification","dlp_enforcement","encryption_audit","pii_detection"], description: "Data Security Posture Management. Classifies and protects sensitive data across all environments." },
  { id: "gds-national-cyber",       name: "National Cyber Director",   tier: "sovereign",   domain: "national security",  health_score: null, executions_total: null,  success_rate: null, capabilities: ["national_threat_assessment","critical_infrastructure_monitoring","government_agency_coordination","national_directive_enforcement","sector_risk_scoring"], description: "National-level cybersecurity operations. Coordinates government agencies and critical infrastructure protection." },
  { id: "gds-ai-spm-director",      name: "AI SPM Director",           tier: "specialist",  domain: "ai security",        health_score: null, executions_total: null,  success_rate: null, capabilities: ["ai_security_scan","llm_security","prompt_injection_detection","model_inventory","ai_risk_scoring"], description: "AI Security Posture Management. Secures AI/ML systems, LLM deployments, and model supply chains." },
  { id: "gds-quantum-director",     name: "Quantum-Safe Director",     tier: "specialist",  domain: "quantum security",   health_score: null, executions_total: null,   success_rate: null, capabilities: ["pqc_assessment","crypto_inventory","tls_audit","quantum_readiness_score","migration_planning"], description: "Post-quantum cryptography readiness. Inventories and migrates vulnerable cryptographic assets." },
  { id: "gds-purple-team",          name: "Purple Team Director",       tier: "specialist", domain: "purple team",        health_score: null, executions_total: null,  success_rate: null, capabilities: ["attack_simulation","detection_validation","mitre_coverage","control_testing","detection_gap_analysis"], description: "Continuous purple team operations. Validates detections against simulated attacks." },
  { id: "gds-knowledge-director",   name: "Knowledge Director",        tier: "specialist",  domain: "knowledge management", health_score: null, executions_total: null, success_rate: null, capabilities: ["rag_retrieval","knowledge_graph_query","semantic_search","memory_retrieval","context_injection"], description: "RAG-powered knowledge retrieval. Provides contextual security intelligence from the knowledge graph." },
  { id: "gds-financial-sec",        name: "Financial Security Director",tier: "command",    domain: "financial security", health_score: null, executions_total: null,  success_rate: null, capabilities: ["fraud_detection","aml_analysis","kyc_verification","sanctions_screening","transaction_monitoring"], description: "FinSOC operations. Detects fraud, AML violations, and sanctions breaches in real time." },
  { id: "gds-healthcare-sec",       name: "Healthcare Security Director",tier: "command",   domain: "healthcare security",health_score: null, executions_total: null,  success_rate: null, capabilities: ["medical_device_scan","phi_protection","hipaa_compliance","clinical_network_monitoring","ransomware_response"], description: "Clinical security operations. Protects medical devices, PHI, and clinical networks." },
  { id: "gds-telecom-sec",          name: "Telecom Security Director", tier: "command",     domain: "telecom security",   health_score: null, executions_total: null,  success_rate: null, capabilities: ["network_scan","5g_security","fraud_detection","subscriber_protection","core_network_monitoring"], description: "5G/6G telecom security operations. Monitors core network functions and subscriber infrastructure." },
  { id: "gds-workflow-director",    name: "Workflow Intelligence Director", tier: "specialist", domain: "workflow automation", health_score: null, executions_total: null, success_rate: null, capabilities: ["workflow_execution","playbook_trigger","soar_orchestration","approval_routing","automation_monitoring"], description: "Manages intelligent security workflow execution, SOAR playbooks, and approval routing." },
  { id: "gds-industrial-sec",       name: "Industrial Security Director", tier: "command",  domain: "ot ics security",    health_score: null, executions_total: null,  success_rate: null, capabilities: ["ot_asset_monitoring","plc_security","scada_protection","industrial_incident_response","ics_vulnerability_scan"], description: "OT/ICS/SCADA security. Monitors industrial control systems and operational technology assets." },
];

const TASK_RESULTS: Record<string, (db: any, input: string) => Promise<any>> = {
  cloud_review: async (db) => {
    const [f, c] = await Promise.all([db.CloudFinding.list(), db.CloudAccount.list()]);
    const open = f.filter((x:any)=>x.status==="open");
    const crit = open.filter((x:any)=>x.severity==="critical");
    return { summary: `Reviewed ${c.length} cloud accounts. Found ${open.length} open findings (${crit.length} critical). Top issue: ${crit[0]?.title||"none"}.`, status: crit.length > 5 ? "CRITICAL" : crit.length > 0 ? "HIGH" : "NORMAL", top_findings: crit.slice(0,3).map((x:any)=>({title:x.title,service:x.service,fix:x.remediation})) };
  },
  vulnerability_scan: async (db) => {
    const f = await db.TriagedFinding.list();
    const open = f.filter((x:any)=>x.status==="open");
    const crit = open.filter((x:any)=>x.normalized_severity==="critical");
    const exploited = open.filter((x:any)=>x.exploited_in_wild);
    return { summary: `Scanned vulnerabilities. ${open.length} open findings, ${crit.length} critical, ${exploited.length} exploited in wild.`, status: exploited.length > 0 ? "CRITICAL" : crit.length > 0 ? "HIGH" : "NORMAL", top_findings: crit.slice(0,3).map((x:any)=>({title:x.cve_id||x.title,service:"CVE",fix:x.fixed_version||"pending"})) };
  },
  soc_summary: async (db) => {
    const [inc, f] = await Promise.all([db.Incident.list(), db.TriagedFinding.list()]);
    const open_inc = inc.filter((x:any)=>["open","investigating","active"].includes(x.status?.toLowerCase()));
    const crit = f.filter((x:any)=>x.status==="open"&&x.normalized_severity==="critical");
    return { summary: `SOC status: ${open_inc.length} active incidents, ${crit.length} critical findings. All playbooks operational.`, status: open_inc.length > 5 ? "CRITICAL" : open_inc.length > 0 ? "HIGH" : "NORMAL" };
  },
  board_report: async (db) => {
    const [grs, comp] = await Promise.all([db.GlobalRiskScore.list(), db.ComplianceFramework.list()]);
    const g = grs[0]||{};
    const avg = comp.length > 0 ? Math.round(comp.reduce((s:number,c:any)=>s+(c.score||0),0)/comp.length) : 0;
    return { summary: `Board report generated. Risk: ${g.overall_score??'N/A'}/100 Grade ${g.grade??'?'}. Compliance avg: ${avg}%. ${comp.length} frameworks tracked.`, status: (g.overall_score??100) < 50 ? "CRITICAL" : (g.overall_score??100) < 70 ? "HIGH" : "NORMAL", frameworks: comp.slice(0,3).map((c:any)=>({title:`${c.name}: ${c.score??0}%`,service:"compliance",fix:`${c.passing??0}/${c.total_controls??0} controls`})) };
  },
};

async function genericTaskResult(db: any, capability: string, input: string) {
  const [grs, findings] = await Promise.all([db.GlobalRiskScore.list(), db.TriagedFinding.list()]);
  const g = grs[0]||{};
  const open = findings.filter((f:any)=>f.status==="open");
  const crit = open.filter((f:any)=>f.normalized_severity==="critical");
  return {
    summary: `Executed ${capability.replace(/_/g," ")}. Live context: Risk ${g.overall_score??'N/A'}/100, ${crit.length} critical findings, ${open.length} total open. Context: "${safe(input.slice(0,100))}"`,
    status: crit.length > 10 ? "CRITICAL" : crit.length > 0 ? "HIGH" : "NORMAL",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const t0 = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: CORS });
    if (user.role !== 'admin') return new Response(JSON.stringify({ success: false, error: 'Admin role required' }), { status: 403, headers: CORS });
    const db = base44.entities;
    const body = await req.json().catch(() => ({}));
    const { action = "get_agents" } = body;
    if (action === 'launch_mission' || action === 'assign_task') return new Response(JSON.stringify({
      success: false, code: 'VERIFIED_RUNTIME_REQUIRED', execution_mode: 'not_executed', tool_calls: 0,
      error: 'Use the authenticated governed runtime to execute a mission',
    }), { status: 503, headers: CORS });

    // ── GET AGENTS ──────────────────────────────────────────────────────────
    if (action === "get_agents") {
      const agents = AGENTS.map(a => ({ ...a, status: 'declared_unverified', current_task: null,
        verification_status: 'declared_unverified', capabilities_verified: false }));

      const online = agents.filter(a => a.status === "online").length;
      const working = agents.filter(a => a.status === "working").length;
      const idle = agents.filter(a => a.status === "idle").length;

      return new Response(JSON.stringify({ success: true, agents, online, working, idle, total: agents.length, timestamp: ts() }), { headers: CORS });
    }

    // ── PLATFORM INTEL ──────────────────────────────────────────────────────
    if (action === "platform_intel") {
      const [cloudF, findings, incidents, compliance, grs] = await Promise.all([
        db.CloudFinding.list(),
        db.TriagedFinding.list(),
        db.Incident.list(),
        db.ComplianceFramework.list(),
        db.GlobalRiskScore.list(),
      ]);
      const g = grs[0] || {};
      const openCloud = cloudF.filter((f: any) => f.status === "open");
      const openF = findings.filter((f: any) => f.status === "open");
      const openInc = incidents.filter((i: any) => ["open", "investigating", "active"].includes(i.status?.toLowerCase()));
      const avgComp = compliance.length > 0 ? Math.round(compliance.reduce((s: number, c: any) => s + (c.score || 0), 0) / compliance.length) : 0;
      return new Response(JSON.stringify({
        success: true,
        execution_mode: "stored_record_summary", risk: { score: g.overall_score ?? null, grade: g.grade ?? "unknown", trend: g.trend ?? "unknown", code_score: g.code_score, cloud_score: g.cloud_score, identity_score: g.identity_score },
        security: {
          cloud_findings: openCloud.length,
          cloud_critical: openCloud.filter((f: any) => f.severity === "critical").length,
          vuln_total: openF.length,
          vuln_critical: openF.filter((f: any) => f.normalized_severity === "critical").length,
          active_incidents: openInc.length,
        },
        compliance: { avg_score: avgComp, frameworks: compliance.length },
        timestamp: ts(),
      }), { headers: CORS });
    }

    // ── ASSIGN TASK ─────────────────────────────────────────────────────────
    if (action === "assign_task") {
      const { agent_id, task, input = "" } = body;
      const agent = AGENTS.find(a => a.id === agent_id);
      if (!agent) return new Response(JSON.stringify({ success: false, error: "Agent not found" }), { status: 404, headers: CORS });

      // Map task to a result function
      const key = Object.keys(TASK_RESULTS).find(k => task?.includes(k) || k.includes(task?.split("_")[0] || ""));
      const resultFn = key ? TASK_RESULTS[key] : null;
      const result = resultFn ? await resultFn(db, input) : await genericTaskResult(db, task || "general_task", input);

      // Log to CopilotSession
      await db.CopilotSession.create({
        session_id: `TASK-${Date.now()}`,
        user_role: "analyst",
        session_type: "interactive" as any,
        initiated_by: "agent_command_center",
        context_summary: safe(`${agent.name}: ${task}`),
        agents_used: [agent.id],
        commands_count: 1,
        reports_generated: 1,
        risk_level: "low" as any,
        started_at: ts(),
        status: "completed",
      }).catch(() => {});

      return new Response(JSON.stringify({
        success: true,
        agent_id,
        agent_name: agent.name,
        task,
        result,
        duration_ms: Date.now() - t0,
        timestamp: ts(),
      }), { headers: CORS });
    }

    // ── LAUNCH MISSION ──────────────────────────────────────────────────────
    if (action === "launch_mission") {
      const { mission, agent_ids = [] } = body;
      const involved = AGENTS.filter(a => agent_ids.includes(a.id));

      // Run relevant task based on mission type
      let combined_status = "NORMAL";
      let summary = "";

      if (mission?.includes("Threat Hunt") || mission?.includes("threat")) {
        const r = await (TASK_RESULTS["soc_summary"]?.(db, mission) || genericTaskResult(db, "threat_hunt", mission));
        combined_status = r.status;
        summary = r.summary;
      } else if (mission?.includes("Cloud") || mission?.includes("cloud")) {
        const r = await (TASK_RESULTS["cloud_review"]?.(db, mission) || genericTaskResult(db, "cloud_review", mission));
        combined_status = r.status;
        summary = r.summary;
      } else if (mission?.includes("Compliance") || mission?.includes("compliance")) {
        const r = await (TASK_RESULTS["board_report"]?.(db, mission) || genericTaskResult(db, "compliance_check", mission));
        combined_status = r.status;
        summary = r.summary;
      } else if (mission?.includes("Incident") || mission?.includes("incident")) {
        const r = await (TASK_RESULTS["soc_summary"]?.(db, mission) || genericTaskResult(db, "investigate_incident", mission));
        combined_status = r.status;
        summary = r.summary;
      } else {
        const r = await genericTaskResult(db, mission || "mission", mission || "");
        combined_status = r.status;
        summary = r.summary;
      }

      return new Response(JSON.stringify({
        success: true,
        mission,
        agents_deployed: involved.map(a => a.name),
        combined_status,
        summary,
        duration_ms: Date.now() - t0,
        timestamp: ts(),
      }), { headers: CORS });
    }

    // ── LIVE FEED ───────────────────────────────────────────────────────────
    if (action === "live_feed") {
      const [sessions, approvals] = await Promise.all([
        db.CopilotSession.list("-created_date", 20),
        db.CopilotApproval.filter({ status: "pending" }),
      ]);

      const feed = sessions.slice(0, 15).map((s: any) => ({
        id: s.id,
        type: "agent_session",
        agent_name: AGENTS.find(a => a.id === s.agents_used?.[0])?.name || "GDS Agent",
        action: s.context_summary || "Executed security operation",
        status: s.status === "completed" ? "completed" : "running",
        time: rel(s.created_date || s.started_at || ts()),
      }));

      // Add pending approvals to feed
      for (const a of approvals.slice(0, 3)) {
        feed.unshift({
          id: a.id,
          type: "approval_required",
          agent_name: a.requested_by || "AI Agent",
          action: a.action_title || "Action requires approval",
          status: "pending",
          time: rel(a.requested_at || a.created_date || ts()),
        });
      }

      return new Response(JSON.stringify({
        success: true,
        feed,
        pending_approvals: approvals.length,
        timestamp: ts(),
      }), { headers: CORS });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action", valid: ["get_agents", "platform_intel", "assign_task", "launch_mission", "live_feed"] }), { status: 400, headers: CORS });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: "Agent data unavailable" }), { status: 500, headers: CORS });
  }
});
