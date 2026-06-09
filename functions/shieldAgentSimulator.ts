import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const THREAT_TYPES = ["anomalous_api_call","privilege_escalation","data_exfiltration","lateral_movement","brute_force","zero_day_exploit","insider_threat","supply_chain_attack","credential_stuffing","cryptojacking"];
const SERVICES = ["payment-api","auth-service","ml-inference","admin-portal","data-pipeline","user-service","api-gateway","billing-service"];
const MITRE_TACTICS = ["TA0001","TA0004","TA0006","TA0008","TA0009","TA0011","TA0040"];
const MITRE_TECHNIQUES = ["T1110","T1567","T1068","T1195","T1496","T1110.004","T1567.002"];
const SOURCE_IPS = ["185.220.101.47","185.220.102.253","103.21.244.0","198.54.117.200","45.142.212.100","194.165.16.11","179.43.128.10","91.108.4.0"];
const AGENT_NAMES = ["WEB-003","NET-015","CLD-008","RED-002","LLM-012","API-044","MOB-007","STL-019"];
const SEVERITIES = ["critical","high","medium","low"];
const SAST_TITLES = ["SQL Injection in user input handler","Insecure deserialization — Java ObjectInputStream","Path traversal in file upload endpoint","Hardcoded credentials in database config","Command injection via unsanitised shell exec","XXE injection in XML parser","Open redirect in login callback","Prototype pollution in merge utility","SSRF via user-supplied URL parameter","Timing attack in HMAC comparison"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randBool(prob = 0.5) { return Math.random() < prob; }
function now() { return new Date().toISOString(); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const results = { agents_updated: 0, findings_created: 0, threats_created: 0, campaigns_updated: 0, sla_updated: 0, notifications_created: 0 };

    // 1. UPDATE AGENT STATUSES (80 per run)
    const agents = await db.entities.AttackAgent.list({ limit: 500 });
    const statusTransitions = {
      attacking: ["attacking","attacking","attacking","cooldown","online"],
      cooldown: ["online","online","attacking"],
      online: ["attacking","attacking","online"],
      offline: ["online"],
      idle: ["online","attacking"],
    };
    const agentsToUpdate = agents.slice(0, 80);
    for (const agent of agentsToUpdate) {
      const transitions = statusTransitions[agent.status] || ["online"];
      const newStatus = rand(transitions);
      const taskIncrement = newStatus === "attacking" ? randInt(1, 25) : 0;
      await db.entities.AttackAgent.update(agent.id, {
        status: newStatus,
        tasks_completed: (agent.tasks_completed || 0) + taskIncrement,
        last_action: newStatus === "attacking"
          ? `Executed ${rand(["port scan","payload injection","fuzzing","credential spray","recon sweep","exploit attempt"])} on ${rand(SERVICES)}`
          : agent.last_action,
      });
      results.agents_updated++;
    }

    // 2. GENERATE NEW SAST FINDINGS (1-4 per run)
    const numFindings = randInt(1, 4);
    for (let i = 0; i < numFindings; i++) {
      const sev = rand(["critical","high","high","medium","medium","medium","low"]);
      await db.entities.SASTFinding.create({
        title: rand(SAST_TITLES),
        severity: sev,
        status: "open",
        repo_name: rand(["api-gateway-service","payment-processor","auth-microservice","ml-inference-engine"]),
        file_path: `src/${rand(["controllers","utils","middleware","services","api"])}/${rand(["auth","payment","user","data","config"])}.${rand(["ts","js","py","java"])}`,
        line_number: randInt(10, 800),
        cwe_id: `CWE-${rand([89,22,78,79,502,611,601,1321])}`,
        autofix_available: randBool(0.7),
        confidence: randInt(70, 99),
        detected_at: now(),
        agent_name: rand(AGENT_NAMES),
      });
      results.findings_created++;
    }

    // 3. SPAWN NEW RUNTIME THREAT (45% chance per run)
    if (randBool(0.45)) {
      const sev = rand(["critical","high","high","medium"]);
      await db.entities.RuntimeThreat.create({
        service_name: rand(SERVICES),
        threat_type: rand(THREAT_TYPES),
        severity: sev,
        status: "active",
        source_ip: rand(SOURCE_IPS),
        target_resource: `${rand(SERVICES)}:${randInt(3000,9999)}`,
        agent_name: rand(AGENT_NAMES),
        confidence_score: randInt(72, 99),
        event_count: randInt(1, 50),
        first_seen: now(),
        last_seen: now(),
        kill_switch_triggered: false,
        mitre_tactic: rand(MITRE_TACTICS),
        mitre_technique: rand(MITRE_TECHNIQUES),
        description: `${sev.toUpperCase()} threat: suspicious activity on ${rand(SERVICES)} from ${rand(SOURCE_IPS)}`,
        raw_evidence: JSON.stringify({ packets: randInt(100,5000), bytes: randInt(1024,1048576) }),
      });
      results.threats_created++;
    }

    // 4. AUTO-RESOLVE OLD THREATS (keep list max 8 active)
    const allThreats = await db.entities.RuntimeThreat.list({ limit: 50 });
    const activeThreats = allThreats.filter(t => t.status === "active");
    if (activeThreats.length > 8 && randBool(0.6)) {
      const toResolve = rand(activeThreats);
      await db.entities.RuntimeThreat.update(toResolve.id, {
        status: rand(["contained","investigating"]),
        last_seen: now(),
      });
    }

    // 5. UPDATE CAMPAIGN COVERAGE
    const campaigns = await db.entities.PentestCampaign.list({ limit: 20 });
    for (const campaign of campaigns) {
      if (campaign.status === "active" && randBool(0.7)) {
        await db.entities.PentestCampaign.update(campaign.id, {
          coverage_percent: Math.min(100, (campaign.coverage_percent || 0) + randInt(0, 3)),
          findings_count: (campaign.findings_count || 0) + (randBool(0.4) ? randInt(1,3) : 0),
        });
        results.campaigns_updated++;
      }
    }

    // 6. TICK SLA TIMERS DOWN
    const slaItems = await db.entities.SLATracker.list({ limit: 50 });
    for (const item of slaItems.filter(s => s.status !== "resolved")) {
      if (randBool(0.35)) {
        const hoursRemaining = Math.max(-96, (item.hours_remaining || 0) - randInt(0, 3));
        let status = "on_track";
        if (hoursRemaining <= 0) status = "breached";
        else if (hoursRemaining < (item.sla_hours || 24) * 0.2) status = "at_risk";
        await db.entities.SLATracker.update(item.id, {
          hours_remaining: hoursRemaining,
          status,
          escalated: (hoursRemaining <= 0 && item.severity === "critical") || item.escalated || false,
        });
        results.sla_updated++;
      }
    }

    // 7. AI AUTO-SCORE A NEW FINDING
    if (randBool(0.5)) {
      const rawSev = rand(SEVERITIES);
      const priorityScore = randInt(20, 99);
      const aiSev = priorityScore > 85 && rawSev !== "critical" ? "critical" : rawSev;
      await db.entities.AIScoreCard.create({
        finding_type: rand(["sast","sca","cloud_misconfiguration","runtime_threat","dast"]),
        finding_title: rand(SAST_TITLES),
        raw_severity: rawSev,
        ai_severity: aiSev,
        ai_priority_score: priorityScore,
        exploitability_score: randInt(40, 99),
        business_impact_score: randInt(30, 99),
        reachability_score: randInt(20, 99),
        confidence: randInt(75, 99),
        triage_time_seconds: randInt(1, 8),
        model_version: "ShieldAI-Triage-v2.1",
        recommended_action: rand(["fix_immediately","fix_within_24h","fix_within_week","monitor"]),
        ai_reasoning: `Score ${priorityScore}/100. ${aiSev !== rawSev ? `Severity ${rawSev === "low" || rawSev === "medium" ? "elevated" : "reduced"} — ${rand(["public-facing endpoint","PII data in scope","active exploit in wild","unreachable code path","test environment only"])}.` : "Severity confirmed by context analysis."}`,
        auto_assigned_to: rand(AGENT_NAMES),
        scored_at: now(),
      });
      results.findings_created++;
    }

    // 8. PUSH LIVE NOTIFICATION
    if (results.threats_created > 0 || randBool(0.3)) {
      const type = rand(["critical_threat","sla_breach","ai_insight","integration_error"]);
      const sevMap = { critical_threat:"critical", sla_breach:"high", ai_insight:"high", integration_error:"medium" };
      await db.entities.Notification.create({
        title: rand([
          "🔴 New critical threat detected on payment-api",
          "⏱️ SLA breach imminent — 45 minutes remaining",
          "🧠 AI upgraded 3 findings to CRITICAL severity",
          "📡 Anomalous data egress from ml-inference (3.2GB)",
          "⚡ Zero-day signature matched in auth-service",
          "🤖 Agent battalion CRY reporting high activity",
          "🔐 Credential stuffing surge — 340% above baseline",
        ]),
        message: `Automated detection ${new Date().toLocaleTimeString()} UTC — review immediately`,
        type,
        severity: sevMap[type] || "medium",
        source_entity: "RuntimeThreat",
        read: false,
        actioned: false,
        action_url: "/runtime",
        delivered_channels: JSON.stringify(["in_app"]),
        created_at: now(),
      });
      results.notifications_created++;
    }

    return Response.json({ success: true, timestamp: now(), run: "option_a_simulator", ...results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
