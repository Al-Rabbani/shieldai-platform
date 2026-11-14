import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// EDP-003 Agent Runtime Platform Gateway
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;
    if (user.role !== 'admin') return Response.json({ success: false, error: 'Admin role required' }, { status: 403 });
    if (['start', 'register', 'heartbeat', 'message', 'cancel_job'].includes(action)) {
      return Response.json({ success: false, code: 'VERIFIED_RUNTIME_REQUIRED',
        error: 'This action requires the authenticated runtime connector', execution_mode: 'not_executed' }, { status: 503 });
    }
    const measuredHealth = (agent) => {
      const stamp = agent.last_heartbeat ? Date.parse(agent.last_heartbeat) : NaN;
      const age = Number.isFinite(stamp) ? (Date.now() - stamp) / 1000 : null;
      const fresh = age !== null && age >= 0 && age <= 300;
      return { ...agent, declared_status: agent.status || null,
        status: fresh ? (['error', 'degraded', 'offline'].includes(agent.status) ? 'degraded' : 'alive') : age !== null && age >= 0 ? 'offline' : 'unknown',
        last_heartbeat_seconds: age !== null && age >= 0 ? Math.floor(age) : null,
        health_score: null, verification_status: fresh ? 'heartbeat_observed' : 'unverified',
        tool_execution_verified: false };
    };

    // Catalog of 13 built-in agents
    const CATALOG = [
      { agent_id: "vuln_scanner", name: "Vulnerability Scanner", agent_type: "scanner", runtime_class: "ScannerAgent", priority: "high", function_name: "gdsCloudNativeScanner", capabilities: ["cve_scan", "misconfig_detection", "compliance_check"], tools_allowed: ["aws", "gcp", "azure"], max_concurrency: 10, timeout_seconds: 300 },
      { agent_id: "triage_ai", name: "AI Triage Agent", agent_type: "triager", runtime_class: "TriageAgent", priority: "critical", function_name: "gdsAutoTriage", capabilities: ["deduplication", "scoring", "noise_reduction"], tools_allowed: ["llm", "vector_db"], max_concurrency: 20, timeout_seconds: 120 },
      { agent_id: "threat_hunter", name: "Threat Hunter", agent_type: "hunter", runtime_class: "HunterAgent", priority: "high", function_name: "gdsThreatHunterProactive", capabilities: ["ioc_search", "behavior_analysis", "threat_correlation"], tools_allowed: ["siem", "eddr", "intel_feeds"], max_concurrency: 5, timeout_seconds: 600 },
      { agent_id: "incident_responder", name: "Incident Responder", agent_type: "responder", runtime_class: "ResponderAgent", priority: "critical", function_name: "gdsAutonomousIR", capabilities: ["containment", "remediation", "forensics"], tools_allowed: ["soar", "ticketing", "notifications"], max_concurrency: 3, timeout_seconds: 900 },
      { agent_id: "soar_orchestrator", name: "SOAR Orchestrator", agent_type: "soar", runtime_class: "SOARAgent", priority: "high", function_name: "gdsSOAROrchestrator", capabilities: ["workflow_execution", "playbook_runner", "integration_hub"], tools_allowed: ["all"], max_concurrency: 15, timeout_seconds: 1800 },
      { agent_id: "compliance_auditor", name: "Compliance Auditor", agent_type: "compliance", runtime_class: "ComplianceAgent", priority: "medium", function_name: "gdsComplianceAutomation", capabilities: ["framework_mapping", "evidence_collection", "gap_analysis"], tools_allowed: ["governance_db", "reports"], max_concurrency: 8, timeout_seconds: 600 },
      { agent_id: "devsecops_agent", name: "DevSecOps Agent", agent_type: "devsecops", runtime_class: "DevSecOpsAgent", priority: "high", function_name: "gdsDevSecOpsPipeline", capabilities: ["sast", "sca", "iac_scan", "container_scan"], tools_allowed: ["cicd", "repos", "registries"], max_concurrency: 12, timeout_seconds: 300 },
      { agent_id: "supply_chain_monitor", name: "Supply Chain Monitor", agent_type: "supply_chain", runtime_class: "SupplyChainAgent", priority: "medium", function_name: "gdsSecurityDataMesh", capabilities: ["sbom_analysis", "dependency_tracking", "vendor_risk"], tools_allowed: ["sbom_db", "intel_feeds"], max_concurrency: 6, timeout_seconds: 450 },
      { agent_id: "kernel_executor", name: "Kernel Executor", agent_type: "kernel", runtime_class: "KernelAgent", priority: "critical", function_name: "gdsKernelGateway", capabilities: ["session_management", "approval_workflow", "tool_orchestration"], tools_allowed: ["all"], max_concurrency: 10, timeout_seconds: 3600 },
      { agent_id: "governance_analyst", name: "Governance Analyst", agent_type: "governance", runtime_class: "GovernanceAgent", priority: "low", function_name: "gdsExecutiveSummaryEngine", capabilities: ["reporting", "risk_scoring", "board_prep"], tools_allowed: ["reports", "dashboards"], max_concurrency: 4, timeout_seconds: 300 },
      { agent_id: "pentest_agent", name: "AI Pentest Agent", agent_type: "scanner", runtime_class: "PentestAgent", priority: "high", function_name: "gdsAIPentest", capabilities: ["exploit_simulation", "vuln_validation", "attack_chaining"], tools_allowed: ["scanners", "exploits"], max_concurrency: 3, timeout_seconds: 1200 },
      { agent_id: "zero_trust_verifier", name: "Zero Trust Verifier", agent_type: "compliance", runtime_class: "ZTAgent", priority: "medium", function_name: "gdsZeroTrustEngine", capabilities: ["policy_verification", "identity_audit", "segmentation_check"], tools_allowed: ["iam", "network"], max_concurrency: 6, timeout_seconds: 400 },
      { agent_id: "fair_risk_calculator", name: "FAIR Risk Calculator", agent_type: "triager", runtime_class: "FAIRAgent", priority: "low", function_name: "gdsFAIRRisk", capabilities: ["quantitative_risk", "financial_modeling", "scenario_analysis"], tools_allowed: ["risk_db", "finance"], max_concurrency: 5, timeout_seconds: 300 },
    ];

    const getRegistered = async () => await base44.entities.Agent.list();
    const getSessions = async () => await base44.entities.AgentSession.list('-created_date', 100);

    switch (action) {
      case 'status': {
        const registered = await getRegistered();
        const sessions = await getSessions();
        const running = sessions.filter(s => s.status === 'running' || s.status === 'executing');
        const queued = sessions.filter(s => s.status === 'queued' || s.status === 'pending');
        const failed = sessions.filter(s => s.status === 'failed');
        
        return Response.json({
          total_agents: CATALOG.length + registered.length,
          catalog_count: CATALOG.length,
          registered_count: registered.length,
          running_sessions: running.length,
          queued_jobs: queued.length,
          healthy_agents: registered.map(measuredHealth).filter(a => a.status === 'alive').length,
          failed_sessions: failed.length,
          agents: [
            ...CATALOG.map(a => ({ ...a, source: 'catalog', status: 'declared_unverified', health_score: null })),
            ...registered.map(a => ({ ...measuredHealth(a), source: 'registered' }))
          ],
          recent_sessions: sessions.slice(0, 20),
        });
      }

      case 'list': {
        const registered = await getRegistered();
        const includeCatalog = body.include_catalog === true;
        return Response.json({
          catalog: includeCatalog ? CATALOG : [],
          registered,
          total: includeCatalog ? CATALOG.length + registered.length : registered.length,
        });
      }

      case 'health_check': {
        const registered = await getRegistered();
        const registeredHealth = registered.map(measuredHealth);
        return Response.json({
          overall_status: registeredHealth.length && registeredHealth.every(a => a.status === 'alive') ? 'HEARTBEATS_FRESH' : 'UNKNOWN_OR_DEGRADED',
          catalog_health: CATALOG.map(a => ({ agent_id: a.agent_id, name: a.name, status: 'declared_unverified', health_score: null, last_heartbeat_seconds: null })),
          registered_health: registeredHealth, tool_execution_verified: false,
          recovering: registeredHealth.filter(a => a.recovering),
        });
      }

      case 'telemetry': {
        const sessions = await getSessions();
        const completed = sessions.filter(s => s.status === 'completed');
        const failed = sessions.filter(s => s.status === 'failed');
        const avgDuration = completed.length > 0 
          ? Math.round(completed.reduce((a, b) => a + (b.duration_ms || 0), 0) / completed.length) 
          : 0;
        return Response.json({
          total_sessions: sessions.length,
          completed: completed.length,
          failed: failed.length,
          avg_duration_ms: avgDuration,
          sessions,
          queued_jobs: sessions.filter(s => s.status === 'queued' || s.status === 'pending').map(s => ({
            queue_id: s.session_id,
            agent_id: s.agent_id,
            task_name: s.intent?.slice(0, 30),
            priority: 'medium',
            status: s.status,
            scheduled_at: s.created_date,
            attempts: s.retry_count || 0,
            max_attempts: 3,
          })),
        });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ success: false, error: 'Runtime telemetry unavailable', overall_status: 'UNKNOWN' }, { status: 503 });
  }
});
