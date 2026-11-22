import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Network, Globe, Search, AlertTriangle } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { StatCard } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";
const RISK_COLOR = { critical: DANGER, high: "#ff7b3b", medium: "#ffb83b", low: "#3b9eff", info: "#64748b" };
const TYPE_COLOR = {
  cloud_account: "#0EA5E9", vm: "#8B5CF6", container: "#10B981", network: "#F59E0B",
  code_repo: "#00d4ff", exposed_service: DANGER, database: "#a78bfa",
  storage: "#f472b6", iam_role: "#fb923c", api_endpoint: "#34d399",
};

function NodeTypeBadge({ type }) {
  const color = TYPE_COLOR[type] || "#64748b";
  return <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color, background: `${color}18` }}>{(type || "—").replace(/_/g, " ")}</span>;
}

export default function SecurityGraphPage() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ["security-graph"],
    queryFn: () => base44.entities.SecurityGraph.list("-last_scanned", 500).catch(() => []),
    initialData: [],
  });

  const filtered = nodes.filter(n => {
    if (riskFilter !== "all" && n.risk_level !== riskFilter) return false;
    if (typeFilter !== "all" && n.node_type !== typeFilter) return false;
    if (search && !n.node_name?.toLowerCase().includes(search.toLowerCase()) && !n.node_id?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rows = filtered.slice(0, 300).map((n, i) => {
    const rc = RISK_COLOR[n.risk_level] || "#64748b";
    return {
      _key: n.id || i,
      _cells: [
        <span className="text-[9px] font-mono" style={{ color: C }}>{n.node_id || n.id?.slice(0, 12) || `N-${i + 1}`}</span>,
        <NodeTypeBadge type={n.node_type} />,
        <span className="text-[10px] font-semibold text-white">{n.node_name || "—"}</span>,
        <span className="text-[9px] font-bold uppercase" style={{ color: n.provider === "aws" ? "#ff9900" : n.provider === "gcp" ? "#4285f4" : n.provider === "azure" ? "#0078d4" : "#64748b" }}>{n.provider || "—"}</span>,
        <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color: rc, background: `${rc}18` }}>{n.risk_level || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-300">{n.region || "—"}</span>,
        <span className="text-[9px]" style={{ color: n.is_internet_facing ? DANGER : SUCCESS }}>{n.is_internet_facing ? "⚠ Exposed" : "Internal"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-36 block">{n.connected_to || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-500 truncate max-w-32 block">{n.resource_arn || "—"}</span>,
      ],
    };
  });

  const nodeTypes = [...new Set(nodes.map(n => n.node_type).filter(Boolean))];

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Attack Surface", path: "/attack" }, { label: "Security Graph" }]}
      title="Security Graph" subtitle="ASSET TOPOLOGY · ATTACK PATHS · BLAST RADIUS MAP"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Node name or ID…" className="w-36 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Risk</option>
            {["critical","high","medium","low","info"].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Types</option>
            {nodeTypes.map(t => <option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
          </select>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Nodes" value={nodes.length} color={C} icon={Network} />
        <StatCard label="Critical Risk" value={nodes.filter(n => n.risk_level === "critical").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Internet Facing" value={nodes.filter(n => n.is_internet_facing).length} color={DANGER} icon={Globe} />
        <StatCard label="Node Types" value={nodeTypes.length} color="#a78bfa" icon={Network} />
      </div>

      <GDSTable
        columns={["Node ID", "Node Type", "Node Name", "Provider", "Risk Level", "Region", "Exposure", "Connected To", "Resource ARN"]}
        rows={rows}
        isLoading={isLoading}
        emptyText="No graph nodes discovered yet"
      />
    </GDSPageShell>
  );
}