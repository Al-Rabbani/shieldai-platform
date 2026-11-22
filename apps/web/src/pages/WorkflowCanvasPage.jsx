import React, { useState, useCallback } from "react";
import { Shield, ChevronRight, Plus, Play, Pause, Copy, Trash2, Edit3, CheckCircle, X, Clock, Zap, Mail, MessageSquare, Bell, Lock, Tag, FileText, RotateCcw, Bot, Webhook, Calendar, Cloud, Target, User, Search, Filter, ChevronDown } from "lucide-react";

const GOLD = "#C9A84C";

const TEMPLATES = [
  { id: 1, icon: "🚨", title: "Critical Finding → Jira + Slack", desc: "Auto-create Jira ticket and send Slack alert on any critical finding", category: "Response", trigger: "Finding Created", actions: 2 },
  { id: 2, icon: "🔒", title: "SLA Breach → PagerDuty Escalation", desc: "Escalate to PagerDuty and email manager when SLA deadline passes", category: "SLA", trigger: "SLA Breached", actions: 2 },
  { id: 3, icon: "🦠", title: "New Ransomware IOC → Block + Alert", desc: "Automatically block IP/domain and alert SOC team on new ransomware IOC", category: "Threat Intel", trigger: "IOC Detected", actions: 2 },
  { id: 4, icon: "📦", title: "Container Vuln → Pause Deployment", desc: "Pause CI/CD deployment pipeline on critical container vulnerability", category: "CI/CD", trigger: "Container Scan", actions: 3 },
  { id: 5, icon: "☁️", title: "Public S3 → Auto-Remediate", desc: "Automatically restrict public S3 bucket ACL and create audit log", category: "Cloud", trigger: "Cloud Event", actions: 2 },
  { id: 6, icon: "🔑", title: "Leaked Secret → Revoke + Ticket", desc: "Revoke exposed API key or credential and create remediation ticket", category: "Secrets", trigger: "Secret Found", actions: 2 },
  { id: 7, icon: "👤", title: "Over-Privileged IAM → Right-Size", desc: "Right-size IAM permissions and notify cloud team via Slack", category: "CIEM", trigger: "Identity Alert", actions: 2 },
  { id: 8, icon: "🎯", title: "New Critical CVE → Scan All Repos", desc: "Trigger full repository scan on all codebases for a newly published CVE", category: "Intelligence", trigger: "CVE Published", actions: 3 },
  { id: 9, icon: "📋", title: "Weekly → Compliance Report + Email", desc: "Generate compliance report every Monday and email CISO automatically", category: "Compliance", trigger: "Schedule (Weekly)", actions: 2 },
  { id: 10, icon: "🏴‍☠️", title: "Threat Actor Targets Sector → Alert", desc: "Alert security team when a known threat actor targets your industry sector", category: "Threat Intel", trigger: "Threat Actor", actions: 2 },
  { id: 11, icon: "🤖", title: "AI Prompt Injection → Block + Investigate", desc: "Block model access, investigate incident, and generate report on prompt injection", category: "AI-SPM", trigger: "AI Threat", actions: 3 },
  { id: 12, icon: "🔄", title: "Pentest Complete → PDF Report + Email", desc: "Auto-generate PDF pentest report and email all stakeholders on completion", category: "Pentesting", trigger: "Pentest Complete", actions: 2 },
];

const WORKFLOWS = [
  { id: 1, name: "Critical Finding Auto-Response", desc: "Creates Jira ticket + Slack alert for all critical findings", status: "active", trigger: "Finding Created", lastRun: "3m ago", lastResult: "success", runs: 847 },
  { id: 2, name: "Nightly Compliance Check", desc: "Runs compliance checks and emails CISO summary every night", status: "active", trigger: "Schedule", lastRun: "8h ago", lastResult: "success", runs: 142 },
  { id: 3, name: "SLA Breach Escalator", desc: "PagerDuty escalation on any SLA breach", status: "active", trigger: "SLA Breached", lastRun: "2h ago", lastResult: "success", runs: 23 },
  { id: 4, name: "Dev Pipeline Gate", desc: "Blocks deploys with critical vulns in CI/CD", status: "paused", trigger: "CI/CD Event", lastRun: "1d ago", lastResult: "failed", runs: 512 },
  { id: 5, name: "AI Threat Response", desc: "Auto-response to prompt injection and jailbreak attempts", status: "draft", trigger: "AI Event", lastRun: "never", lastResult: null, runs: 0 },
];

const EXECUTIONS = [
  { ts: "2026-06-16 14:32:01", trigger: "Critical finding: CVE-2026-1234", steps: 3, result: "success", duration: "1.2s" },
  { ts: "2026-06-16 14:18:44", trigger: "Critical finding: SQL Injection in API", steps: 3, result: "success", duration: "0.9s" },
  { ts: "2026-06-16 13:55:12", trigger: "High finding: Exposed credentials", steps: 2, result: "success", duration: "0.7s" },
  { ts: "2026-06-16 12:41:08", trigger: "Critical finding: RCE in container", steps: 3, result: "failed", duration: "2.1s" },
  { ts: "2026-06-16 11:29:55", trigger: "SLA breached: CVE-2025-9876", steps: 2, result: "success", duration: "0.5s" },
  { ts: "2026-06-16 10:15:33", trigger: "Critical finding: XSS in web app", steps: 3, result: "success", duration: "1.0s" },
];

// Canvas nodes for builder
const PALETTE_TRIGGERS = [
  { id: "t-finding", label: "Finding Created", icon: Zap, color: "#22c55e" },
  { id: "t-schedule", label: "Schedule", icon: Calendar, color: "#22c55e" },
  { id: "t-webhook", label: "Webhook", icon: Webhook, color: "#22c55e" },
  { id: "t-cloud", label: "Cloud Event", icon: Cloud, color: "#22c55e" },
  { id: "t-threat", label: "Threat Intel", icon: Target, color: "#22c55e" },
  { id: "t-identity", label: "Identity Anomaly", icon: User, color: "#22c55e" },
];
const PALETTE_CONDITIONS = [
  { id: "c-severity", label: "If severity equals", icon: Filter, color: "#eab308" },
  { id: "c-risk", label: "If risk score > N", icon: ChevronDown, color: "#eab308" },
  { id: "c-tag", label: "If asset tag contains", icon: Tag, color: "#eab308" },
  { id: "c-sla", label: "If SLA breached", icon: Clock, color: "#eab308" },
];
const PALETTE_ACTIONS = [
  { id: "a-email", label: "Send Email", icon: Mail, color: "#3b82f6" },
  { id: "a-slack", label: "Slack Message", icon: MessageSquare, color: "#3b82f6" },
  { id: "a-jira", label: "Create Jira Ticket", icon: FileText, color: "#3b82f6" },
  { id: "a-pd", label: "PagerDuty Alert", icon: Bell, color: "#3b82f6" },
  { id: "a-block", label: "Block IP/Domain", icon: Lock, color: "#3b82f6" },
  { id: "a-revoke", label: "Revoke Credentials", icon: X, color: "#3b82f6" },
  { id: "a-tag", label: "Tag Asset", icon: Tag, color: "#3b82f6" },
  { id: "a-note", label: "Add Note", icon: Edit3, color: "#3b82f6" },
  { id: "a-scan", label: "Run Scan", icon: RotateCcw, color: "#3b82f6" },
  { id: "a-report", label: "Generate Report", icon: FileText, color: "#3b82f6" },
  { id: "a-agent", label: "Run AI Agent", icon: Bot, color: "#3b82f6" },
  { id: "a-webhook", label: "Custom Webhook", icon: Webhook, color: "#3b82f6" },
];

const CANVAS_WORKFLOW = [
  { id: "n1", type: "trigger", label: "Finding Created", sub: "severity = critical", x: 60, y: 160, color: "#22c55e", icon: Zap },
  { id: "n2", type: "condition", label: "If Risk Score > 70", sub: "asset.risk_score", x: 260, y: 160, color: "#eab308", icon: Filter },
  { id: "n3", type: "action", label: "Create Jira Ticket", sub: "project: SEC-{{finding.id}}", x: 460, y: 80, color: "#3b82f6", icon: FileText },
  { id: "n4", type: "action", label: "Send Slack Alert", sub: "#security-alerts", x: 460, y: 240, color: "#3b82f6", icon: MessageSquare },
  { id: "n5", type: "action", label: "Tag Asset", sub: "tag: critical-exposure", x: 660, y: 80, color: "#3b82f6", icon: Tag },
];

const CANVAS_EDGES = [
  { from: "n1", to: "n2" }, { from: "n2", to: "n3", label: "YES" }, { from: "n2", to: "n4", label: "YES" }, { from: "n3", to: "n5" },
];

function CanvasNode({ node, selected, onClick }) {
  const IconComp = node.icon;
  const isCondition = node.type === "condition";
  return (
    <g transform={`translate(${node.x},${node.y})`} style={{ cursor: "pointer" }} onClick={() => onClick(node.id)}>
      {isCondition ? (
        <polygon points={`0,-30 70,0 0,30 -70,0`}
          fill={node.color + "20"} stroke={selected ? "#fff" : node.color} strokeWidth={selected ? 2 : 1.5} />
      ) : (
        <rect x={-75} y={-26} width={150} height={52} rx={8}
          fill={node.color + "20"} stroke={selected ? "#fff" : node.color} strokeWidth={selected ? 2 : 1.5} />
      )}
      <text y={-6} textAnchor="middle" fill="#f1f5f9" fontSize={11} fontWeight="700" fontFamily="Inter">{node.label}</text>
      <text y={10} textAnchor="middle" fill="#6B7280" fontSize={9} fontFamily="Inter">{node.sub}</text>
      <text y={-18} x={-55} fill={node.color} fontSize={10}>{node.type === "trigger" ? "⚡" : node.type === "condition" ? "?" : "▶"}</text>
    </g>
  );
}

function CanvasEdge({ edge, nodes }) {
  const from = nodes.find(n => n.id === edge.from);
  const to = nodes.find(n => n.id === edge.to);
  if (!from || !to) return null;
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / len, ny = dy / len;
  const x1 = from.x + nx * 76, y1 = from.y + ny * 30;
  const x2 = to.x - nx * 76, y2 = to.y - ny * 30;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return (
    <g>
      <defs>
        <marker id={`arr-${edge.from}-${edge.to}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#374151" />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#374151" strokeWidth={1.5} markerEnd={`url(#arr-${edge.from}-${edge.to})`} />
      {edge.label && <text x={mx} y={my - 5} textAnchor="middle" fill="#22c55e" fontSize={9} fontFamily="Inter">{edge.label}</text>}
    </g>
  );
}

export default function WorkflowCanvasPage() {
  const [view, setView] = useState("library"); // library | builder
  const [libTab, setLibTab] = useState("workflows");
  const [selectedCanvasNode, setSelectedCanvasNode] = useState(null);
  const [wfName, setWfName] = useState("Critical Finding Auto-Response");
  const [wfStatus, setWfStatus] = useState("active");
  const [showExecLog, setShowExecLog] = useState(true);
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const handleTestRun = () => {
    setTestRunning(true);
    setTimeout(() => {
      setTestResults([
        { node: "Finding Created", status: "success", out: "Event: critical finding CVE-2026-1234" },
        { node: "If Risk Score > 70", status: "success", out: "Risk: 88 → condition MET" },
        { node: "Create Jira Ticket", status: "success", out: "Ticket SEC-1247 created" },
        { node: "Send Slack Alert", status: "success", out: "Sent to #security-alerts" },
        { node: "Tag Asset", status: "success", out: "Tagged: critical-exposure" },
      ]);
      setTestRunning(false);
    }, 2200);
  };

  const selectedNodeData = CANVAS_WORKFLOW.find(n => n.id === selectedCanvasNode);

  if (view === "builder") {
    return (
      <div className="h-screen flex flex-col" style={{ background: "#0A0E1A" }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* Top Bar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b flex-shrink-0" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <button onClick={() => setView("library")} className="text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back
          </button>
          <div className="h-4 border-l" style={{ borderColor: "#374151" }} />
          <input value={wfName} onChange={e => setWfName(e.target.value)}
            className="bg-transparent text-white font-bold text-sm outline-none border-b border-transparent hover:border-slate-600 focus:border-gold transition-colors"
            style={{ minWidth: 240 }} />
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setWfStatus(s => s === "active" ? "draft" : "active")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: wfStatus === "active" ? "#22c55e20" : "#1F2937", color: wfStatus === "active" ? "#22c55e" : "#6B7280" }}>
              <div className={`w-1.5 h-1.5 rounded-full ${wfStatus === "active" ? "bg-emerald-400" : "bg-slate-600"}`} />
              {wfStatus === "active" ? "Active" : "Draft"}
            </button>
            <button onClick={handleTestRun} disabled={testRunning}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: "#1F2937", color: testRunning ? "#6B7280" : "#e2e8f0" }}>
              {testRunning ? <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-white rounded-full" style={{ animation: "spin 0.8s linear infinite" }} /> : <Play className="w-3.5 h-3.5" />}
              Test Run
            </button>
            <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>
              Save
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Node Palette */}
          <div className="w-52 flex-shrink-0 border-r overflow-y-auto p-3 space-y-4" style={{ background: "#0d1220", borderColor: "#1F2937" }}>
            {[
              { label: "TRIGGERS", nodes: PALETTE_TRIGGERS, color: "#22c55e" },
              { label: "CONDITIONS", nodes: PALETTE_CONDITIONS, color: "#eab308" },
              { label: "ACTIONS", nodes: PALETTE_ACTIONS, color: "#3b82f6" },
            ].map(section => (
              <div key={section.label}>
                <div className="text-[9px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: section.color + "99" }}>{section.label}</div>
                <div className="space-y-1">
                  {section.nodes.map(node => {
                    const IconComp = node.icon;
                    return (
                      <div key={node.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab hover:bg-white/5 transition-colors"
                        draggable>
                        <IconComp className="w-3 h-3 flex-shrink-0" style={{ color: section.color }} />
                        <span className="text-[10px] text-slate-300">{node.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 800 400">
              <defs>
                <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx={12} cy={12} r={0.8} fill="#1F2937" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
              {CANVAS_EDGES.map(e => <CanvasEdge key={`${e.from}-${e.to}`} edge={e} nodes={CANVAS_WORKFLOW} />)}
              {CANVAS_WORKFLOW.map(n => (
                <CanvasNode key={n.id} node={n} selected={selectedCanvasNode === n.id} onClick={setSelectedCanvasNode} />
              ))}
            </svg>
            <div className="absolute bottom-4 left-4 text-[10px] text-slate-600">Click nodes to configure · Drag from palette to add</div>
          </div>

          {/* Right Config Panel */}
          <div className="w-64 flex-shrink-0 border-l overflow-y-auto" style={{ background: "#111827", borderColor: "#1F2937" }}>
            {selectedNodeData ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: selectedNodeData.color }}>{selectedNodeData.type}</div>
                  <button onClick={() => setSelectedCanvasNode(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="font-bold text-white text-sm">{selectedNodeData.label}</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Configuration</label>
                    <textarea rows={3} defaultValue={selectedNodeData.sub} className="w-full px-2 py-1.5 rounded-lg text-xs text-white font-mono placeholder-slate-500 outline-none resize-none" style={{ background: "#0d1220", border: "1px solid #374151" }} />
                  </div>
                  {selectedNodeData.type === "action" && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Message Template</label>
                      <textarea rows={4} placeholder="{{finding.title}} — {{finding.severity}} in {{asset.name}}" className="w-full px-2 py-1.5 rounded-lg text-xs text-white font-mono placeholder-slate-600 outline-none resize-none" style={{ background: "#0d1220", border: "1px solid #374151" }} />
                      <div className="text-[9px] text-slate-600 mt-1">Variables: {"{{finding.title}}"} {"{{finding.severity}}"} {"{{asset.name}}"}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <Edit3 className="w-8 h-8 text-slate-700 mb-3" />
                <p className="text-xs text-slate-500">Select a node to configure it</p>
              </div>
            )}
          </div>
        </div>

        {/* Test Results / Execution Log */}
        {showExecLog && (
          <div className="border-t flex-shrink-0" style={{ background: "#0d1220", borderColor: "#1F2937", maxHeight: 200 }}>
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "#1F2937" }}>
              <span className="text-xs font-bold text-white">Execution Trace</span>
              <button onClick={() => setShowExecLog(false)} className="text-slate-500 hover:text-white"><ChevronDown className="w-4 h-4" /></button>
            </div>
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 150 }}>
              {testRunning && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-white rounded-full" style={{ animation: "spin 0.8s linear infinite" }} />
                  Running test with sample data...
                </div>
              )}
              {testResults && (
                <div className="space-y-2">
                  {testResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="font-bold text-white w-40 flex-shrink-0">{r.node}</span>
                      <span className="text-slate-400">{r.out}</span>
                    </div>
                  ))}
                </div>
              )}
              {!testRunning && !testResults && (
                <span className="text-xs text-slate-600">Click "Test Run" to simulate workflow execution</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Library View
  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      <div className="fu flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Shield className="w-3.5 h-3.5" /><span>AI & Automation</span><ChevronRight className="w-3 h-3" />
            <span style={{ color: GOLD }}>Workflow Automation</span>
          </div>
          <h1 className="text-2xl font-black text-white">Workflow Automation Canvas</h1>
          <p className="text-slate-400 text-sm mt-0.5">Build no-code automated security response workflows — the SOAR brain of ShieldAI</p>
        </div>
        <button onClick={() => setView("builder")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:scale-105"
          style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
          <Plus className="w-4 h-4" /> Create Workflow
        </button>
      </div>

      {/* Summary stats */}
      <div className="fu grid grid-cols-2 md:grid-cols-4 gap-4" style={{ animationDelay: "60ms" }}>
        <div className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: "#22c55e33" }}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Active Workflows</div>
          <div className="text-3xl font-black text-emerald-400">{WORKFLOWS.filter(w => w.status === "active").length}</div>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: GOLD + "33" }}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Executions</div>
          <div className="text-3xl font-black" style={{ color: GOLD }}>{WORKFLOWS.reduce((s, w) => s + w.runs, 0).toLocaleString()}</div>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: "#3b82f633" }}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Templates Available</div>
          <div className="text-3xl font-black text-blue-400">{TEMPLATES.length}</div>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: "#ef444433" }}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Failed Runs (7d)</div>
          <div className="text-3xl font-black text-red-400">1</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fu rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "100ms" }}>
        <div className="flex border-b" style={{ borderColor: "#1F2937" }}>
          <button onClick={() => setLibTab("workflows")} className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: libTab === "workflows" ? GOLD : "#6B7280", borderBottom: libTab === "workflows" ? `2px solid ${GOLD}` : "2px solid transparent" }}>
            My Workflows ({WORKFLOWS.length})
          </button>
          <button onClick={() => setLibTab("templates")} className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: libTab === "templates" ? GOLD : "#6B7280", borderBottom: libTab === "templates" ? `2px solid ${GOLD}` : "2px solid transparent" }}>
            Templates ({TEMPLATES.length})
          </button>
          <button onClick={() => setLibTab("logs")} className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: libTab === "logs" ? GOLD : "#6B7280", borderBottom: libTab === "logs" ? `2px solid ${GOLD}` : "2px solid transparent" }}>
            Execution Log
          </button>
        </div>

        {libTab === "workflows" && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {WORKFLOWS.map((wf, i) => (
              <div key={wf.id} className="rounded-xl p-4 border hover:border-opacity-60 transition-all card-hover" style={{ background: "#0d1220", borderColor: wf.status === "active" ? "#22c55e33" : wf.status === "paused" ? "#eab30833" : "#1F2937", animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-white text-sm">{wf.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{wf.desc}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ml-2 ${wf.status === "active" ? "text-emerald-400 bg-emerald-400/10" : wf.status === "paused" ? "text-yellow-400 bg-yellow-400/10" : "text-slate-400 bg-slate-400/10"}`}>
                    {wf.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-3">
                  <span>⚡ {wf.trigger}</span>
                  <span>Last: {wf.lastRun}</span>
                  {wf.lastResult && <span className={wf.lastResult === "success" ? "text-emerald-400" : "text-red-400"}>
                    {wf.lastResult === "success" ? "✅ Success" : "❌ Failed"}
                  </span>}
                  <span className="ml-auto">{wf.runs.toLocaleString()} runs</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setView("builder")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-black" style={{ background: GOLD }}>
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-300" style={{ background: "#1F2937" }}>
                    <Play className="w-3 h-3" /> Run Now
                  </button>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-300" style={{ background: "#1F2937" }}>
                    <Copy className="w-3 h-3" /> Duplicate
                  </button>
                  <button className="ml-auto p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition-colors" style={{ background: "#1F2937" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {libTab === "templates" && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {TEMPLATES.map((t, i) => (
              <div key={t.id} className="rounded-xl p-4 border hover:border-opacity-80 transition-all card-hover cursor-pointer" style={{ background: "#0d1220", borderColor: "#1F2937", animationDelay: `${i * 30}ms` }}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-xs mb-0.5">{t.title}</div>
                    <div className="text-[10px] text-slate-400 leading-relaxed">{t.desc}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: GOLD + "20", color: GOLD }}>{t.category}</span>
                  <span className="text-[9px] text-slate-500">Trigger: {t.trigger}</span>
                  <span className="text-[9px] text-slate-500">{t.actions} actions</span>
                </div>
                <button onClick={() => setView("builder")} className="w-full py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>
                  Use Template →
                </button>
              </div>
            ))}
          </div>
        )}

        {libTab === "logs" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
                  {["Timestamp", "Trigger Event", "Steps", "Result", "Duration"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EXECUTIONS.map((ex, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors" style={{ borderBottom: "1px solid #1F2937" }}>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{ex.ts}</td>
                    <td className="px-4 py-3 text-slate-300">{ex.trigger}</td>
                    <td className="px-4 py-3 text-slate-400">{ex.steps} steps</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ex.result === "success" ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>
                        {ex.result === "success" ? "✅ Success" : "❌ Failed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{ex.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}