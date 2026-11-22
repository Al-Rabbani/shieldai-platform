import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const { AttackAgent, SASTFinding, RuntimeThreat, SLATracker, AIScoreCard, PentestCampaign, Notification } = base44.entities;

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

export default function AgentSimulatorEngine() {
  const runningRef = useRef(false);

  useEffect(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const runCycle = async () => {
      try {
        // 1. CYCLE AGENT STATUSES — update 15 random agents
        const agents = await AttackAgent.list({ limit: 500 });
        const statusTransitions = {
          attacking: ["attacking","attacking","attacking","cooldown","online"],
          cooldown: ["online","online","attacking"],
          online: ["attacking","attacking","online"],
          offline: ["online"],
          idle: ["online","attacking"],
        };
        const sample = agents.sort(() => Math.random() - 0.5).slice(0, 15);
        for (const agent of sample) {
          const transitions = statusTransitions[agent.status] || ["online"];
          const newStatus = rand(transitions);
          await AttackAgent.update(agent.id, {
            status: newStatus,
            tasks_completed: (agent.tasks_completed || 0) + (newStatus === "attacking" ? randInt(1, 20) : 0),
            last_action: newStatus === "attacking"
              ? `Executed ${rand(["port scan","payload injection","fuzzing","credential spray","recon sweep"])} on ${rand(SERVICES)}`
              : agent.last_action,
          });
        }

        // 2. CREATE 1-2 NEW SAST FINDINGS
        const numFindings = randInt(1, 2);
        for (let i = 0; i < numFindings; i++) {
          const sev = rand(["critical","high","high","medium","medium","low"]);
          await SASTFinding.create({
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
        }

        // 3. SPAWN RUNTIME THREAT (40% chance)
        if (randBool(0.4)) {
          const sev = rand(["critical","high","high","medium"]);
          await RuntimeThreat.create({
            service_name: rand(SERVICES),
            threat_type: rand(THREAT_TYPES),
            severity: sev,
            status: "active",
            source_ip: rand(SOURCE_IPS),
            target_resource: `${rand(SERVICES)}:${randInt(3000, 9999)}`,
            agent_name: rand(AGENT_NAMES),
            confidence_score: randInt(72, 99),
            event_count: randInt(1, 50),
            first_seen: now(),
            last_seen: now(),
            kill_switch_triggered: false,
            mitre_tactic: rand(MITRE_TACTICS),
            mitre_technique: rand(MITRE_TECHNIQUES),
            description: `${sev.toUpperCase()} threat: suspicious activity on ${rand(SERVICES)} from ${rand(SOURCE_IPS)}`,
            raw_evidence: JSON.stringify({ packets: randInt(100, 5000), bytes: randInt(1024, 1048576) }),
          });
        }

        // 4. RESOLVE EXCESS THREATS (keep max 8 active)
        const allThreats = await RuntimeThreat.list({ limit: 50 });
        const activeThreats = allThreats.filter(t => t.status === "active");
        if (activeThreats.length > 8 && randBool(0.6)) {
          await RuntimeThreat.update(activeThreats[0].id, { status: rand(["contained","investigating"]), last_seen: now() });
        }

        // 5. TICK SLA TIMERS
        const slaItems = await SLATracker.list({ limit: 50 });
        for (const item of slaItems.filter(s => s.status !== "resolved")) {
          if (randBool(0.3)) {
            const hr = Math.max(-96, (item.hours_remaining || 0) - randInt(0, 2));
            const status = hr <= 0 ? "breached" : hr < (item.sla_hours || 24) * 0.2 ? "at_risk" : "on_track";
            await SLATracker.update(item.id, {
              hours_remaining: hr,
              status,
              escalated: (hr <= 0 && item.severity === "critical") || item.escalated || false,
            });
          }
        }

        // 6. ADVANCE CAMPAIGN COVERAGE
        const campaigns = await PentestCampaign.list({ limit: 20 });
        for (const c of campaigns.filter(c => c.status === "active")) {
          if (randBool(0.6)) {
            await PentestCampaign.update(c.id, {
              coverage_percent: Math.min(100, (c.coverage_percent || 0) + randInt(0, 2)),
              findings_count: (c.findings_count || 0) + (randBool(0.3) ? 1 : 0),
            });
          }
        }

        // 7. AI SCORE A FINDING
        if (randBool(0.5)) {
          const rawSev = rand(SEVERITIES);
          const ps = randInt(20, 99);
          const aiSev = ps > 85 && rawSev !== "critical" ? "critical" : rawSev;
          await AIScoreCard.create({
            finding_type: rand(["sast","sca","cloud_misconfiguration","runtime_threat","dast"]),
            finding_title: rand(SAST_TITLES),
            raw_severity: rawSev,
            ai_severity: aiSev,
            ai_priority_score: ps,
            exploitability_score: randInt(40, 99),
            business_impact_score: randInt(30, 99),
            reachability_score: randInt(20, 99),
            confidence: randInt(75, 99),
            triage_time_seconds: randInt(1, 8),
            model_version: "ShieldAI-Triage-v2.1",
            recommended_action: rand(["fix_immediately","fix_within_24h","fix_within_week","monitor"]),
            ai_reasoning: `Score ${ps}/100. ${aiSev !== rawSev ? `Severity elevated — ${rand(["public-facing endpoint","PII in scope","active exploit in wild","payment service"])}.` : "Severity confirmed by context."}`,
            auto_assigned_to: rand(AGENT_NAMES),
            scored_at: now(),
          });
        }

        // 8. PUSH LIVE NOTIFICATION
        if (randBool(0.4)) {
          const type = rand(["critical_threat","sla_breach","ai_insight"]);
          await Notification.create({
            title: rand([
              "🔴 New critical threat on payment-api",
              "⏱️ SLA breach imminent — 45 min remaining",
              "🧠 AI upgraded 3 findings to CRITICAL",
              "📡 Anomalous data egress from ml-inference",
              "⚡ Zero-day signature matched in auth-service",
              "🤖 Agent battalion reporting high activity",
            ]),
            message: `Automated detection ${new Date().toLocaleTimeString()} UTC`,
            type,
            severity: type === "critical_threat" ? "critical" : "high",
            source_entity: "RuntimeThreat",
            read: false,
            actioned: false,
            action_url: "/runtime",
            delivered_channels: JSON.stringify(["in_app"]),
            created_at: now(),
          });
        }

      } catch (err) {
        console.error("[AgentSimulator] Cycle error:", err);
      }
    };

    // Run immediately on mount, then every 90 seconds
    runCycle();
    const interval = setInterval(runCycle, 90000);
    return () => clearInterval(interval);
  }, []);

  return null;
}