import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Brain, AlertTriangle, Search, DollarSign } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { StatCard, YesNo } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";
const STATUS_COLOR = { allowed: SUCCESS, blocked: DANGER, flagged: "#ffb83b", logged: C };
const PROVIDER_COLOR = { openai: SUCCESS, anthropic: "#ff9900", google: "#4285f4", mistral: "#a78bfa", aws_bedrock: "#ff9900", cohere: "#34d399", meta: "#3b9eff", other: "#64748b" };

export default function LLMMonitorPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["llm-usage-events"],
    queryFn: () => base44.entities.LLMUsageEvent.list("-called_at", 500).catch(() => []),
    initialData: [], refetchInterval: 30000,
  });

  const filtered = events.filter(e => {
    if (status !== "all" && e.status !== status) return false;
    if (provider !== "all" && e.provider !== provider) return false;
    if (search && !e.app_name?.toLowerCase().includes(search.toLowerCase()) && !e.model?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCost = events.reduce((s, e) => s + (e.cost_usd || 0), 0);
  const totalTokens = events.reduce((s, e) => s + (e.tokens_in || 0) + (e.tokens_out || 0), 0);
  const piiEvents = events.filter(e => e.pii_detected).length;

  const rows = filtered.slice(0, 300).map((e, i) => {
    const sc = STATUS_COLOR[e.status] || "#64748b";
    const pc = PROVIDER_COLOR[e.provider] || "#64748b";
    return {
      _key: e.id || i,
      _cells: [
        <span className="text-[10px] font-semibold text-white">{e.app_name || "—"}</span>,
        <span className="text-[9px] font-mono" style={{ color: C }}>{e.model || "—"}</span>,
        <span className="text-[9px] font-bold capitalize" style={{ color: pc }}>{e.provider || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400 truncate max-w-28 block">{e.endpoint || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-300">{e.tokens_in?.toLocaleString() ?? "0"}</span>,
        <span className="text-[9px] font-mono text-slate-300">{e.tokens_out?.toLocaleString() ?? "0"}</span>,
        <span className="text-[9px] font-mono" style={{ color: (e.cost_usd || 0) > 0.1 ? "#ffb83b" : "#64748b" }}>${(e.cost_usd || 0).toFixed(4)}</span>,
        <span className="text-[9px] font-mono text-slate-400">{e.latency_ms ? `${e.latency_ms}ms` : "—"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-28 block">{e.data_destination_url || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{e.data_destination_region || "—"}</span>,
        <YesNo val={e.pii_detected} />,
        <span className="text-[9px]" style={{ color: e.pii_types ? DANGER : "#64748b" }}>{e.pii_types || "—"}</span>,
        <span className="text-[9px]" style={{ color: e.compliance_flags ? "#ffb83b" : "#64748b" }}>{e.compliance_flags || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: sc, background: `${sc}18` }}>{e.status || "—"}</span>,
        <span className="text-[9px] text-slate-500">{e.called_at ? formatDistanceToNow(new Date(e.called_at), { addSuffix: true }) : "—"}</span>,
      ],
    };
  });

  const providers = [...new Set(events.map(e => e.provider).filter(Boolean))];

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "AI Security", path: "/ai-spm" }, { label: "LLM Usage Monitor" }]}
      title="LLM Usage Monitor" subtitle="API CALL TRACKING · PII DETECTION · COST ANALYSIS · COMPLIANCE"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="App, model…" className="w-28 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          <select value={provider} onChange={e => setProvider(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Providers</option>
            {providers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Status</option>
            {["allowed","blocked","flagged","logged"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Calls" value={events.length.toLocaleString()} color={C} icon={Brain} />
        <StatCard label="PII Detected" value={piiEvents} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} color="#ffb83b" icon={DollarSign} />
        <StatCard label="Total Tokens" value={totalTokens > 1e6 ? `${(totalTokens/1e6).toFixed(1)}M` : totalTokens.toLocaleString()} color="#a78bfa" icon={Brain} />
      </div>

      <GDSTable
        columns={["App Name","Model","Provider","Endpoint","Tokens In","Tokens Out","Cost USD","Latency","Data Destination","Region","PII Detected","PII Types","Compliance Flag","Status","Called At"]}
        rows={rows}
        isLoading={isLoading}
        emptyText="No LLM usage events recorded"
      />
    </GDSPageShell>
  );
}