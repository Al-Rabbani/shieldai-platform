import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { Bot, AlertTriangle, DollarSign, Zap, Shield, Eye, RefreshCw, X, Loader2, FileText } from "lucide-react";
import { formatDistanceToNow, subDays, format, parseISO } from "date-fns";
import { toast } from "sonner";

const MODEL_COLORS = { openai: "#10B981", anthropic: "#C9A84C", google: "#3B82F6", mistral: "#8B5CF6", aws_bedrock: "#F97316", cohere: "#06b6d4", meta: "#ec4899", other: "#6B7280" };
const PROVIDER_LABEL = { openai: "OpenAI", anthropic: "Anthropic", google: "Google", mistral: "Mistral", aws_bedrock: "Bedrock", cohere: "Cohere", meta: "Meta", other: "Other" };

function StatusBadge({ status }) {
  const s = {
    allowed: { color: "#10B981", bg: "rgba(16,185,129,0.1)", label: "Allowed" },
    flagged:  { color: "#F97316", bg: "rgba(249,115,22,0.1)",  label: "Flagged" },
    blocked:  { color: "#EF4444", bg: "rgba(239,68,68,0.1)",   label: "Blocked" },
    logged:   { color: "#6366F1", bg: "rgba(99,102,241,0.1)",  label: "Logged" },
  }[status] || { color: "#6B7280", bg: "rgba(107,114,128,0.1)", label: status || "—" };
  return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ color: s.color, background: s.bg }}>{s.label}</span>;
}

function ComplianceBadge({ flag }) {
  if (!flag) return <span className="text-slate-700">—</span>;
  const isCritical = flag.toLowerCase().includes("critical");
  return <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: isCritical ? "#ef4444" : "#f97316", background: isCritical ? "rgba(239,68,68,0.12)" : "rgba(249,115,22,0.12)" }}>{flag}</span>;
}

function ScanModal({ onClose }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("shieldLLMSecurity", { action: "scan_prompt", text });
      setResult(res?.data || res);
    } catch {
      toast.error("Prompt scanner unavailable — check backend function");
    } finally { setLoading(false); }
  };

  const RISK_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
  const ACTION_COLOR = { BLOCK: "#ef4444", REDACT_AND_ALLOW: "#f97316", ALLOW: "#22c55e" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg" style={{ background: "#0d1117", border: "1px solid #374151" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#1F2937" }}>
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Bot className="w-4 h-4 text-amber-400" /> Prompt Security Scanner</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
        </div>
        <div className="p-5 space-y-4">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
            placeholder="Enter prompt text to scan for injection attacks, PII, and policy violations…"
            className="w-full px-3 py-2.5 rounded-lg text-xs text-white placeholder-slate-500 resize-none bg-slate-900 border border-slate-700 outline-none focus:border-indigo-500" />
          {result && (
            <div className="p-4 rounded-xl space-y-3" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <div className="flex items-center gap-2 flex-wrap">
                {result.risk_level && (
                  <span className="text-xs font-black px-3 py-1 rounded-full uppercase" style={{ color: RISK_COLOR[result.risk_level], background: `${RISK_COLOR[result.risk_level]}20` }}>
                    {result.risk_level} RISK
                  </span>
                )}
                {result.action_recommended && (
                  <span className="text-xs font-black px-3 py-1 rounded-full" style={{ color: ACTION_COLOR[result.action_recommended] || "#64748b", background: `${ACTION_COLOR[result.action_recommended] || "#64748b"}20` }}>
                    → {result.action_recommended}
                  </span>
                )}
              </div>
              {result.injection_attacks?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-red-400 mb-1">Injection Attacks Detected:</p>
                  <div className="flex flex-wrap gap-1">
                    {result.injection_attacks.map(a => <span key={a} className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-300 font-mono">{a}</span>)}
                  </div>
                </div>
              )}
              {result.pii_types?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-orange-400 mb-1">PII Types Found:</p>
                  <div className="flex flex-wrap gap-1">
                    {result.pii_types.map(p => <span key={p} className="text-[9px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-300">{p}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={handleScan} disabled={loading || !text.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#C9A84C,#a8873e)", color: "#0d1117" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? "Scanning…" : "Scan Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LLMSecurityPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const qc = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["llm-events"],
    queryFn: () => base44.entities.LLMUsageEvent.list("-called_at", 200).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  // Stats
  const totalEvents = events.length;
  const injections = events.filter(e => e.prompt_injection_detected).length;
  const piiEvents = events.filter(e => e.pii_detected).length;
  const complianceViolations = events.filter(e => e.compliance_flags).length;
  const totalCost = events.reduce((s, e) => s + (e.cost_usd || 0), 0);
  const blocked = events.filter(e => e.status === "blocked").length;

  // Model bar chart
  const modelData = useMemo(() => {
    const counts = {};
    events.forEach(e => { const k = e.model || "unknown"; counts[k] = (counts[k] || 0) + 1; });
    return Object.entries(counts).map(([model, count]) => {
      const provider = events.find(e => e.model === model)?.provider || "other";
      return { model: model.length > 18 ? model.slice(0, 16) + "…" : model, count, color: MODEL_COLORS[provider] || "#6B7280" };
    }).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [events]);

  // Risk timeline — last 14 days
  const riskTimeline = useMemo(() => {
    const days = 14;
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) buckets[format(subDays(new Date(), i), "MMM dd")] = 0;
    events.filter(e => e.status === "blocked" || e.status === "flagged").forEach(e => {
      try {
        const key = format(parseISO(e.called_at), "MMM dd");
        if (key in buckets) buckets[key]++;
      } catch {}
    });
    return Object.entries(buckets).map(([date, count]) => ({ date, count }));
  }, [events]);

  // Compliance violations table
  const complianceEvents = useMemo(() =>
    events.filter(e => e.compliance_flags).sort((a, b) => new Date(b.called_at || 0) - new Date(a.called_at || 0)),
    [events]
  );

  const handlePolicyReport = async () => {
    setReportLoading(true);
    try {
      const res = await base44.functions.invoke("shieldLLMSecurity", { action: "policy_report" });
      toast.success("Policy report generated");
    } catch {
      toast.error("Policy report unavailable");
    } finally { setReportLoading(false); }
  };

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ background: "#0d1117" }}>
      {showScanner && <ScanModal onClose={() => setShowScanner(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)" }}>
            <Bot className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">LLM Security</h1>
            <p className="text-xs text-slate-500">Monitor, audit & protect AI/LLM usage across all apps</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => qc.invalidateQueries({ queryKey: ["llm-events"] })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-400 hover:text-white transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={handlePolicyReport} disabled={reportLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-slate-600 text-slate-300 hover:text-white transition-all disabled:opacity-50">
            {reportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Policy Report
          </button>
          <button onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-black transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#C9A84C,#a8873e)" }}>
            <Zap className="w-3.5 h-3.5" /> Scan Prompt
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Total LLM Events", value: totalEvents, color: "#6366f1" },
          { label: "Prompt Injections", value: injections, color: "#ef4444", pulse: injections > 0 },
          { label: "PII Leakage Events", value: piiEvents, color: "#f97316", pulse: piiEvents > 0 },
          { label: "Compliance Violations", value: complianceViolations, color: "#ef4444", pulse: complianceViolations > 0 },
          { label: "Total Cost USD", value: `$${totalCost.toFixed(2)}`, color: "#3b82f6" },
          { label: "Blocked Requests", value: blocked, color: "#ef4444", pulse: blocked > 0 },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            {s.pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse mb-1.5" style={{ background: s.color }} />}
            {isLoading ? <div className="h-8 w-16 animate-pulse bg-slate-800 rounded mb-1" /> : (
              <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
            )}
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-semibold text-white mb-4">LLM Usage by Model</h3>
          {modelData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={modelData} layout="vertical" margin={{ left: 5, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} />
                <YAxis type="category" dataKey="model" tick={{ fontSize: 9, fill: "#94a3b8" }} width={110} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 11 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {modelData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Risk Events — Last 14 Days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={riskTimeline} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} interval={2} />
              <YAxis tick={{ fontSize: 9, fill: "#475569" }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 11 }} />
              <Area type="monotone" dataKey="count" stroke="#ef4444" fill="url(#riskGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Compliance violations */}
      {complianceEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Compliance Violations ({complianceViolations})
          </h3>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                  {["App", "Model", "Provider", "PII Types", "Injection", "Compliance Flag", "Status", "Time"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complianceEvents.slice(0, 20).map((e, i) => {
                  const piiTags = (e.pii_types || "").split(",").filter(Boolean);
                  return (
                    <tr key={e.id} style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                      className="hover:bg-red-500/3 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-white">{e.app_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: (MODEL_COLORS[e.provider] || "#6B7280") + "20", color: MODEL_COLORS[e.provider] || "#9CA3AF" }}>
                          {e.model || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-400">{PROVIDER_LABEL[e.provider] || e.provider || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {piiTags.slice(0, 3).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300">{t.trim()}</span>)}
                        </div>
                      </td>
                      <td className="px-4 py-3">{e.prompt_injection_detected ? <span className="text-red-400 font-bold text-[10px] animate-pulse">🔴 YES</span> : <span className="text-slate-600 text-[10px]">✅ No</span>}</td>
                      <td className="px-4 py-3"><ComplianceBadge flag={e.compliance_flags} /></td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3 text-[10px] text-slate-500">
                        {e.called_at ? formatDistanceToNow(new Date(e.called_at), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Event Log */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Full Event Log
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </h3>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                {["Time", "App", "Model", "Provider", "Tokens", "Cost", "Latency", "PII", "Injection", "Status", "Compliance"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(11)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>)}</tr>)
              ) : events.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-16 text-center">
                  <Bot className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No LLM events recorded — instrument your apps with the ShieldAI SDK</p>
                </td></tr>
              ) : (
                events.slice(0, 100).map((e, i) => {
                  const isBad = e.status === "blocked" || e.status === "flagged";
                  return (
                    <tr key={e.id} style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)", borderLeft: isBad ? "2px solid #ef4444" : "2px solid transparent" }}
                      className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                        {e.called_at ? formatDistanceToNow(new Date(e.called_at), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-white">{e.app_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: (MODEL_COLORS[e.provider] || "#6B7280") + "20", color: MODEL_COLORS[e.provider] || "#9CA3AF" }}>
                          {(e.model || "—").slice(0, 20)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-400">{PROVIDER_LABEL[e.provider] || e.provider || "—"}</td>
                      <td className="px-4 py-3 text-[10px] font-mono text-slate-300">{(e.tokens_in || 0) + (e.tokens_out || 0)}</td>
                      <td className="px-4 py-3 text-[10px] font-mono text-amber-400">${(e.cost_usd || 0).toFixed(4)}</td>
                      <td className="px-4 py-3 text-[10px] font-mono" style={{ color: (e.latency_ms || 0) > 2000 ? "#ef4444" : (e.latency_ms || 0) > 500 ? "#eab308" : "#10b981" }}>
                        {e.latency_ms || 0}ms
                      </td>
                      <td className="px-4 py-3">{e.pii_detected ? <span className="text-[10px] text-orange-400 font-bold">🔴 PII</span> : <span className="text-slate-700 text-[10px]">—</span>}</td>
                      <td className="px-4 py-3">{e.prompt_injection_detected ? <span className="text-[10px] text-red-400 font-bold animate-pulse">⚠️ YES</span> : <span className="text-slate-700 text-[10px]">—</span>}</td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3"><ComplianceBadge flag={e.compliance_flags} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}