import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Brain, AlertTriangle, CheckCircle, Shield, Eye, Lock, Zap } from "lucide-react";

const GOLD = "#C9A84C";

const MCP_SERVERS = [
  {
    id: 1, name: "filesystem-mcp", version: "1.2.0", owner: "dev-team", status: "active",
    risk: "critical", tools: ["read_file", "write_file", "delete_file", "list_directory"],
    tool_risks: { read_file: "low", write_file: "critical", delete_file: "critical", list_directory: "low" },
    exfiltration_risk: true, policy: "none", agents_using: ["Claude Dev", "Copilot"],
    desc: "Direct filesystem access — can read/write/delete any file on the host."
  },
  {
    id: 2, name: "github-mcp", version: "2.1.3", owner: "platform-team", status: "active",
    risk: "high", tools: ["create_pr", "push_code", "read_repo", "manage_secrets"],
    tool_risks: { create_pr: "medium", push_code: "high", read_repo: "low", manage_secrets: "critical" },
    exfiltration_risk: true, policy: "allowlist", agents_using: ["Claude Dev"],
    desc: "GitHub API access — manage_secrets tool grants full secret read/write."
  },
  {
    id: 3, name: "browser-mcp", version: "0.9.1", owner: "qa-team", status: "active",
    risk: "high", tools: ["navigate", "click", "fill_form", "screenshot", "execute_js"],
    tool_risks: { navigate: "medium", click: "low", fill_form: "high", screenshot: "medium", execute_js: "critical" },
    exfiltration_risk: true, policy: "denylist", agents_using: ["Test Agent"],
    desc: "Browser automation — execute_js enables arbitrary JavaScript execution."
  },
  {
    id: 4, name: "database-mcp", version: "1.0.5", owner: "backend-team", status: "active",
    risk: "critical", tools: ["query", "insert", "update", "delete", "schema"],
    tool_risks: { query: "medium", insert: "high", update: "high", delete: "critical", schema: "low" },
    exfiltration_risk: true, policy: "none", agents_using: ["Claude Dev", "AutoTriage Agent"],
    desc: "Direct database access — no row-level security enforced at MCP layer."
  },
  {
    id: 5, name: "slack-mcp", version: "1.5.2", owner: "comms-team", status: "active",
    risk: "medium", tools: ["send_message", "read_history", "list_channels"],
    tool_risks: { send_message: "medium", read_history: "medium", list_channels: "low" },
    exfiltration_risk: false, policy: "allowlist", agents_using: ["Notification Agent"],
    desc: "Slack integration — read_history can expose sensitive channel conversations."
  },
  {
    id: 6, name: "search-mcp", version: "2.0.0", owner: "platform-team", status: "sandboxed",
    risk: "low", tools: ["web_search", "fetch_url"],
    tool_risks: { web_search: "low", fetch_url: "medium" },
    exfiltration_risk: false, policy: "allowlist", agents_using: ["Research Agent"],
    desc: "Web search and URL fetch. Sandboxed — fetch_url restricted to allowlisted domains."
  },
];

const AGENTS = [
  { name: "Claude Dev", servers: ["filesystem-mcp", "github-mcp", "browser-mcp", "database-mcp"], risk: "critical", events_7d: 1204, blocked_7d: 3 },
  { name: "Copilot", servers: ["filesystem-mcp"], risk: "high", events_7d: 892, blocked_7d: 1 },
  { name: "AutoTriage Agent", servers: ["database-mcp"], risk: "high", events_7d: 341, blocked_7d: 0 },
  { name: "Test Agent", servers: ["browser-mcp"], risk: "medium", events_7d: 128, blocked_7d: 2 },
  { name: "Notification Agent", servers: ["slack-mcp"], risk: "low", events_7d: 88, blocked_7d: 0 },
  { name: "Research Agent", servers: ["search-mcp"], risk: "low", events_7d: 44, blocked_7d: 0 },
];

const ROGUE_EVENTS = [
  { time: "2m ago", agent: "Claude Dev", server: "filesystem-mcp", tool: "delete_file", path: "/etc/hosts", blocked: true, reason: "Critical system file access" },
  { time: "14m ago", agent: "Claude Dev", server: "database-mcp", tool: "delete", table: "users", blocked: true, reason: "Mass deletion without WHERE clause" },
  { time: "3h ago", agent: "Copilot", server: "filesystem-mcp", tool: "read_file", path: "~/.ssh/id_rsa", blocked: true, reason: "SSH key exfiltration attempt" },
  { time: "1d ago", agent: "Test Agent", server: "browser-mcp", tool: "execute_js", blocked: false, reason: "Allowed — test environment" },
];

const OWASP_TOP10 = [
  { rank: "LLM01", name: "Prompt Injection", status: "monitored" },
  { rank: "LLM02", name: "Insecure Output Handling", status: "monitored" },
  { rank: "LLM03", name: "Training Data Poisoning", status: "partial" },
  { rank: "LLM04", name: "Model Denial of Service", status: "monitored" },
  { rank: "LLM05", name: "Supply Chain Vulnerabilities", status: "monitored" },
  { rank: "LLM06", name: "Sensitive Information Disclosure", status: "monitored" },
  { rank: "LLM07", name: "Insecure Plugin Design", status: "partial" },
  { rank: "LLM08", name: "Excessive Agency", status: "monitored" },
  { rank: "LLM09", name: "Overreliance", status: "not_started" },
  { rank: "LLM10", name: "Model Theft", status: "partial" },
];

const RISK_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
const STATUS_COLORS = { monitored: "#22c55e", partial: "#eab308", not_started: "#ef4444" };

export default function MCPSecurityPage() {
  const [tab, setTab] = useState("servers");
  const [selected, setSelected] = useState(null);

  const tabs = [
    { id: "servers", label: "MCP Servers" },
    { id: "agents", label: "Agent Governance" },
    { id: "events", label: "Rogue Events" },
    { id: "compliance", label: "OWASP / Standards" },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
        <Link to="/" className="hover:text-white">Overview</Link><span>/</span>
        <span style={{ color: GOLD }}>MCP Security</span>
      </div>
      <div>
        <h1 className="text-2xl font-black text-white">MCP / Agentic AI Security</h1>
        <p className="text-slate-400 text-sm mt-0.5">Govern AI agent tool access, detect rogue behaviour, enforce least-privilege MCP policies</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "MCP Servers", value: MCP_SERVERS.length, color: "#6366f1" },
          { label: "Critical Risk Servers", value: MCP_SERVERS.filter(s => s.risk === "critical").length, color: "#ef4444" },
          { label: "Rogue Events (7d)", value: ROGUE_EVENTS.length, color: "#f97316" },
          { label: "Agents Governed", value: AGENTS.length, color: "#22c55e" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: k.color + "33" }}>
            <div className="text-[10px] text-slate-500 mb-1">{k.label}</div>
            <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl w-fit overflow-x-auto" style={{ background: "#111827" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
            style={{ background: tab === t.id ? GOLD : "transparent", color: tab === t.id ? "#0A0E1A" : "#9CA3AF" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "servers" && (
        <div className="grid grid-cols-1 gap-3">
          {MCP_SERVERS.map(s => (
            <div key={s.id} onClick={() => setSelected(selected?.id === s.id ? null : s)}
              className="rounded-xl border p-4 cursor-pointer hover:bg-white/5 transition-all"
              style={{ background: "#111827", borderLeft: `3px solid ${RISK_COLORS[s.risk]}`, borderColor: "#1F2937" }}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-white text-sm">{s.name}</span>
                    <span className="text-[10px] text-slate-500">v{s.version}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: RISK_COLORS[s.risk] + "22", color: RISK_COLORS[s.risk] }}>{s.risk}</span>
                    {s.exfiltration_risk && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">exfil risk</span>}
                  </div>
                  <p className="text-xs text-slate-400">{s.desc}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.tools.map(tool => (
                    <span key={tool} className="text-[10px] px-2 py-0.5 rounded font-mono"
                      style={{ background: RISK_COLORS[s.tool_risks[tool]] + "22", color: RISK_COLORS[s.tool_risks[tool]], border: `1px solid ${RISK_COLORS[s.tool_risks[tool]]}33` }}>
                      {tool}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">Policy</div>
                    <div className="text-xs font-bold" style={{ color: s.policy === "none" ? "#ef4444" : "#22c55e" }}>
                      {s.policy === "none" ? "⚠️ No Policy" : `✅ ${s.policy}`}
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}
                    onClick={e => { e.stopPropagation(); }}>Configure</button>
                </div>
              </div>
              {selected?.id === s.id && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "#1F2937" }}>
                  <div className="text-[10px] text-slate-500 mb-1">Used by agents:</div>
                  <div className="flex gap-2">
                    {s.agents_using.map(a => (
                      <span key={a} className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "agents" && (
        <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
              {["Agent", "Risk Level", "MCP Servers", "Events (7d)", "Blocked (7d)", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {AGENTS.map(a => (
                <tr key={a.name} className="hover:bg-white/5" style={{ borderBottom: "1px solid #1F2937" }}>
                  <td className="px-4 py-3 font-bold text-white">{a.name}</td>
                  <td className="px-4 py-3"><span className="text-[10px] font-bold" style={{ color: RISK_COLORS[a.risk] }}>{a.risk}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.servers.map(s => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-800 text-slate-300">{s}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{a.events_7d.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold" style={{ color: a.blocked_7d > 0 ? "#ef4444" : "#22c55e" }}>{a.blocked_7d}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="px-2.5 py-1 rounded text-[10px] font-bold text-black" style={{ background: GOLD }}>Policy</button>
                      <button className="px-2.5 py-1 rounded text-[10px] font-bold border text-slate-400" style={{ borderColor: "#374151", background: "transparent" }}>Logs</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "events" && (
        <div className="space-y-3">
          {ROGUE_EVENTS.map((e, i) => (
            <div key={i} className="rounded-xl border p-4" style={{ background: "#111827", borderLeft: `3px solid ${e.blocked ? "#ef4444" : "#22c55e"}`, borderColor: "#1F2937" }}>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.blocked ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {e.blocked ? "🛑 BLOCKED" : "✅ ALLOWED"}
                    </span>
                    <span className="text-sm font-bold text-white">{e.agent}</span>
                    <span className="text-slate-500">→</span>
                    <span className="font-mono text-blue-400 text-xs">{e.server}.{e.tool}</span>
                  </div>
                  <div className="text-xs text-slate-400">{e.reason}</div>
                  {e.path && <div className="text-[10px] font-mono text-orange-400 mt-1">Target: {e.path}</div>}
                  {e.table && <div className="text-[10px] font-mono text-orange-400 mt-1">Table: {e.table}</div>}
                </div>
                <div className="text-[10px] text-slate-500">{e.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "compliance" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
              <h3 className="text-sm font-bold text-white">OWASP Top 10 for LLM Applications</h3>
            </div>
            <div className="divide-y" style={{ borderColor: "#1F2937" }}>
              {OWASP_TOP10.map(o => (
                <div key={o.rank} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-[10px] font-mono text-slate-500 w-12">{o.rank}</span>
                  <span className="text-xs text-slate-300 flex-1">{o.name}</span>
                  <span className="text-[10px] font-bold" style={{ color: STATUS_COLORS[o.status] }}>
                    {o.status === "monitored" ? "✅ Monitored" : o.status === "partial" ? "⚠️ Partial" : "❌ Not Started"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {[
              { name: "NIST AI RMF", score: 72, color: "#6366f1", desc: "AI Risk Management Framework" },
              { name: "EU AI Act", score: 58, color: "#f97316", desc: "High-risk AI system compliance" },
              { name: "ISO/IEC 42001", score: 41, color: "#eab308", desc: "AI Management System" },
            ].map(f => (
              <div key={f.name} className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-white">{f.name}</div>
                    <div className="text-[10px] text-slate-500">{f.desc}</div>
                  </div>
                  <div className="text-2xl font-black" style={{ color: f.color }}>{f.score}%</div>
                </div>
                <div className="h-2 rounded-full bg-[#1F2937] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${f.score}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}