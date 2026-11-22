import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Shield, Bot, Eye, CheckCircle, GitBranch, Radio, ClipboardCheck, Wrench, Play, FileText, X, Loader2, Cpu, Zap } from "lucide-react";
import { toast } from "sonner";

const GOLD = "#C9A84C";

const AGENTS = [
  {
    id: "triage", name: "Triage Agent", icon: GitBranch, color: "#6366f1",
    desc: "Continuously deduplicates and prioritizes findings across all scanners using AI scoring",
    status: "running", last_run: "2 min ago", actions_today: 847,
    fn: "shieldAutoTriage", logs: [
      "Deduplicated 23 findings from SAST+SCA overlap",
      "Escalated CVE-2024-3094 to CRITICAL priority",
      "Assigned 12 findings to Platform team",
      "Calculated EPSS scores for 89 CVEs",
    ]
  },
  {
    id: "pentest", name: "Pentest Agent", icon: Shield, color: "#ef4444",
    desc: "Runs continuous penetration tests and reports new attack paths and exploitable chains",
    status: "idle", last_run: "1h ago", actions_today: 12,
    fn: "shieldAIPentest", logs: [
      "Discovered SSRF chain in /api/webhook endpoint",
      "Validated IDOR in user profile API",
      "Ran 400 SQLi payloads against auth endpoints",
    ]
  },
  {
    id: "darkweb", name: "Dark Web Agent", icon: Eye, color: "#8b5cf6",
    desc: "Monitors dark web forums and marketplaces for org exposure 24/7",
    status: "running", last_run: "8 min ago", actions_today: 34,
    fn: "shieldDarkWebMonitor", logs: [
      "New credential dump found on BreachForums",
      "Monitoring 3 Telegram channels for mentions",
      "Enriched 5 exposed email addresses",
    ]
  },
  {
    id: "compliance", name: "Compliance Agent", icon: ClipboardCheck, color: "#22c55e",
    desc: "Maps findings to SOC2, ISO27001, and NIST controls automatically",
    status: "idle", last_run: "3h ago", actions_today: 156,
    fn: "shieldAutoTriage", logs: [
      "Mapped 34 findings to SOC2 CC6.1 control",
      "ISO27001 A.12.6 — 8 open vulnerabilities",
      "NIST CSF DE.CM-8 compliance gap identified",
    ]
  },
  {
    id: "autofix", name: "AutoFix Agent", icon: Wrench, color: GOLD,
    desc: "Generates GitHub PRs for critical code vulnerabilities automatically",
    status: "running", last_run: "15 min ago", actions_today: 7,
    fn: "shieldAutoFix", logs: [
      "PR #441 opened: Fix XSS in search component",
      "PR #440 opened: Bump lodash to 4.17.21",
      "PR #439 merged: Patch SQL injection in auth",
    ]
  },
  {
    id: "threatintel", name: "Threat Intel Agent", icon: Radio, color: "#f97316",
    desc: "Enriches all IOCs and tracks threat actor activity matching org's sector",
    status: "running", last_run: "5 min ago", actions_today: 291,
    fn: "shieldThreatIntel", logs: [
      "Enriched IOC 185.220.101.47 — Malicious (VirusTotal)",
      "APT28 new campaign targeting FinTech orgs",
      "CISA KEV updated: 3 new exploited CVEs",
    ]
  },
];

const UNIFIED_LOG = [
  { agent: "Triage Agent", action: "FINDING_ESCALATED", result: "CVE-2024-3094 → CRITICAL", time: "2m ago", color: "#6366f1" },
  { agent: "Threat Intel", action: "IOC_ENRICHED", result: "185.220.101.47 flagged malicious", time: "5m ago", color: "#f97316" },
  { agent: "AutoFix Agent", action: "PR_OPENED", result: "PR #441 — XSS remediation", time: "15m ago", color: GOLD },
  { agent: "Dark Web Agent", action: "BREACH_DETECTED", result: "3 credentials found on BreachForums", time: "8m ago", color: "#8b5cf6" },
  { agent: "Triage Agent", action: "DEDUP_COMPLETE", result: "23 duplicate findings merged", time: "32m ago", color: "#6366f1" },
  { agent: "Compliance Agent", action: "CONTROL_MAPPED", result: "SOC2 CC6.1 — 34 findings mapped", time: "3h ago", color: "#22c55e" },
  { agent: "AutoFix Agent", action: "PR_MERGED", result: "PR #439 — SQL injection patched", time: "4h ago", color: GOLD },
];

function AgentCard({ agent }) {
  const [running, setRunning] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const Icon = agent.icon;
  const isRunning = agent.status === "running";

  const handleRun = async () => {
    setRunning(true);
    try {
      await base44.functions.invoke(agent.fn, { agent_id: agent.id });
      toast.success(`${agent.name} triggered successfully`);
    } catch { toast.error("Run failed"); }
    finally { setRunning(false); }
  };

  return (
    <>
      <div className="rounded-xl border p-5 transition-all hover:scale-[1.01]"
        style={{ background: "#111827", borderColor: isRunning ? agent.color + "44" : "#1F2937" }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: agent.color + "1A", border: `1px solid ${agent.color}33` }}>
            <Icon className="w-5 h-5" style={{ color: agent.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-white">{agent.name}</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? "animate-pulse" : ""}`}
                  style={{ background: isRunning ? "#22c55e" : agent.status === "paused" ? "#eab308" : "#6B7280" }} />
                <span className="text-[10px] font-semibold capitalize"
                  style={{ color: isRunning ? "#22c55e" : "#6B7280" }}>{agent.status}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-snug">{agent.desc}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="p-2.5 rounded-lg text-center" style={{ background: "#1F2937" }}>
            <div className="font-black text-white">{agent.actions_today}</div>
            <div className="text-slate-500 text-[10px]">Actions Today</div>
          </div>
          <div className="p-2.5 rounded-lg text-center" style={{ background: "#1F2937" }}>
            <div className="font-semibold text-slate-300">{agent.last_run}</div>
            <div className="text-slate-500 text-[10px]">Last Run</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRun} disabled={running}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-50 text-black"
            style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run Now
          </button>
          <button onClick={() => setShowLogs(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border"
            style={{ color: "#9CA3AF", borderColor: "#374151", background: "#1F2937" }}>
            <FileText className="w-3.5 h-3.5" /> Logs
          </button>
        </div>
      </div>

      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl border overflow-hidden" style={{ background: "#111827", borderColor: "#374151" }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#1F2937" }}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color: agent.color }} />
                <h3 className="font-bold text-white text-sm">{agent.name} — Recent Logs</h3>
              </div>
              <button onClick={() => setShowLogs(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-2">
              {agent.logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-xs" style={{ background: "#1F2937" }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: agent.color }} />
                  <span className="text-slate-300">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AIAgentConsolePage() {
  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}
        @keyframes particle{0%{transform:translate(0,0) scale(1);opacity:0.6}100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0}}
        .particle{animation:particle 3s ease-out infinite}
      `}</style>

      <div className="fu">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Shield className="w-3.5 h-3.5" /><span>AI & Automation</span><span>/</span>
          <span style={{ color: GOLD }}>AI Agent Console</span>
        </div>
        <div className="rounded-2xl p-8 border relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0d1220,#111827)", borderColor: "#1F2937" }}>
          {/* Animated particle bg */}
          {Array.from({length:12}).map((_, i) => (
            <div key={i} className="particle absolute w-1 h-1 rounded-full opacity-40"
              style={{ background: GOLD, left: `${Math.random()*100}%`, top: `${Math.random()*100}%`,
                '--tx': `${(Math.random()-0.5)*80}px`, '--ty': `${(Math.random()-0.5)*80}px`,
                animationDelay: `${Math.random()*3}s`, animationDuration: `${2+Math.random()*3}s` }} />
          ))}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <Cpu className="w-7 h-7" style={{ color: GOLD }} />
              <h1 className="text-2xl font-black text-white">AI Security Agents</h1>
              <span className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: "rgba(201,168,76,0.15)", color: GOLD, border: `1px solid ${GOLD}33` }}>AUTONOMOUS</span>
            </div>
            <p className="text-slate-400 max-w-xl">Sovereign AI agents that investigate, triage, and respond to threats autonomously — 24/7, without human intervention.</p>
            <div className="flex items-center gap-6 mt-4 text-sm">
              <div><span className="font-black text-white">6</span> <span className="text-slate-500">Active Agents</span></div>
              <div><span className="font-black" style={{ color: "#22c55e" }}>4</span> <span className="text-slate-500">Running</span></div>
              <div><span className="font-black" style={{ color: GOLD }}>1,347</span> <span className="text-slate-500">Actions Today</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="fu grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={{ animationDelay: "80ms" }}>
        {AGENTS.map((agent, i) => (
          <div key={agent.id} style={{ animationDelay: `${i * 50}ms` }} className="fu">
            <AgentCard agent={agent} />
          </div>
        ))}
      </div>

      {/* Unified Log */}
      <div className="fu rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "200ms" }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#1F2937" }}>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: GOLD }} /> Unified Agent Activity Log
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h3>
        </div>
        <div className="divide-y" style={{ divideColor: "#1F2937" }}>
          {UNIFIED_LOG.map((entry, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
              <span className="text-xs font-bold w-32 flex-shrink-0" style={{ color: entry.color }}>{entry.agent}</span>
              <span className="text-xs font-mono text-slate-400 w-36 flex-shrink-0">{entry.action}</span>
              <span className="text-xs text-slate-300 flex-1">{entry.result}</span>
              <span className="text-[10px] text-slate-600 flex-shrink-0">{entry.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div className="fu rounded-xl border p-6 text-center" style={{ background: "rgba(201,168,76,0.04)", borderColor: `${GOLD}33`, animationDelay: "250ms" }}>
        <Bot className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
        <h3 className="font-bold text-white mb-1">Deploy Custom Agent</h3>
        <p className="text-sm text-slate-400 mb-3">Build your own AI security agent with custom tools, data sources, and response playbooks</p>
        <span className="text-xs px-4 py-2 rounded-xl font-bold" style={{ background: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}33` }}>Coming Soon</span>
      </div>
    </div>
  );
}