import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Layers, AlertTriangle, Server, Shield } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const CATEGORY_COLORS = {
  rbac: "#a78bfa", network_policy: "#3b82f6", pod_security: "#f97316",
  image_security: "#ef4444", secret_management: "#eab308", cspm: "#00d4ff",
  admission_control: "#10b981",
};

export default function K8sSecurityPage() {
  const [category, setCategory] = useState("all");
  const [sev, setSev] = useState("all");
  const [ns, setNs] = useState("all");

  const { data: scans = [], isLoading: loadS } = useQuery({
    queryKey: ["k8s-scans"],
    queryFn: () => base44.entities.K8sScan.list("-created_date", 50).catch(() => []),
    initialData: [],
  });
  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["k8s-findings"],
    queryFn: () => base44.entities.K8sFinding.list("-created_date", 500).catch(() => []),
    initialData: [],
  });

  const categories = [...new Set(findings.map(f => f.category).filter(Boolean))];
  const namespaces = [...new Set(findings.map(f => f.namespace).filter(Boolean))];

  const filtered = findings.filter(f => {
    if (category !== "all" && f.category !== category) return false;
    if (sev !== "all" && f.severity !== sev) return false;
    if (ns !== "all" && f.namespace !== ns) return false;
    return true;
  });

  const rows = filtered.map(f => {
    const catColor = CATEGORY_COLORS[f.category] || "#64748b";
    return {
      _key: f.id,
      _cells: [
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
          style={{ color: catColor, background: `${catColor}18` }}>
          {(f.category || "—").replace(/_/g, " ")}
        </span>,
        <span className="text-[11px] font-semibold text-white">{f.title || "—"}</span>,
        <SevBadge sev={f.severity} />,
        <span className="text-[9px] font-mono text-slate-400 truncate max-w-28 block">{f.resource_name || "—"}</span>,
        <span className="text-[9px] text-slate-400">{f.namespace || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-500">{f.cis_control || "—"}</span>,
        <StatusBadge status={f.status} />,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Cloud", path: "/cloud" }, { label: "Kubernetes" }]}
      title="Kubernetes Security" subtitle="RBAC · NETWORK POLICIES · POD SECURITY · IMAGE SCANNING"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {[
            ["category", category, setCategory, ["all", ...categories]],
            ["severity", sev, setSev, ["all", "critical", "high", "medium", "low"]],
            ["namespace", ns, setNs, ["all", ...namespaces]],
          ].map(([key, val, set, opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o.replace(/_/g, " ")}</option>)}
            </select>
          ))}
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clusters" value={scans.length} color={CYAN} icon={Layers} />
        <StatCard label="Total Findings" value={findings.length} color="#94a3b8" icon={AlertTriangle} />
        <StatCard label="Critical" value={findings.filter(f => f.severity === "critical").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Namespaces" value={namespaces.length} color="#a78bfa" icon={Server} />
      </div>

      {/* Cluster Cards */}
      {scans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scans.slice(0, 3).map(s => (
            <div key={s.id} className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" style={{ color: CYAN }} />
                  <span className="text-sm font-bold text-white">{s.cluster_name || "Cluster"}</span>
                </div>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded" style={{ color: SUCCESS, background: "rgba(34,197,94,0.1)" }}>
                  {s.scan_mode || "active"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Findings: <span className="font-bold" style={{ color: DANGER }}>{s.total_findings ?? 0}</span></span>
                <span className="text-slate-500">Score: <span className="font-bold" style={{ color: (s.risk_score || 0) >= 75 ? SUCCESS : DANGER }}>{s.risk_score ?? "—"}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}

      <GDSTable
        columns={["Category", "Title", "Severity", "Resource", "Namespace", "CIS Control", "Status"]}
        rows={rows} isLoading={loadF}
        emptyText="No Kubernetes findings" />
    </GDSPageShell>
  );
}