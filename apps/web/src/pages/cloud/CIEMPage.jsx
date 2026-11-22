import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Lock, AlertTriangle, Users, Key, TrendingUp } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard, ProviderBadge } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const BLAST_COLOR = { full_account: "#ef4444", service_wide: "#f97316", resource_specific: "#eab308", minimal: "#22c55e" };

export default function CIEMPage() {
  const [provider, setProvider] = useState("all");
  const [idType, setIdType] = useState("all");
  const [findingType, setFindingType] = useState("all");

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["ciem-findings"],
    queryFn: () => base44.entities.CIEMFinding.list("-detected_at", 500).catch(() => []),
    initialData: [],
  });

  const filtered = findings.filter(f => {
    if (provider !== "all" && f.provider !== provider) return false;
    if (idType !== "all" && f.identity_type !== idType) return false;
    if (findingType !== "all" && f.finding_type !== findingType) return false;
    return true;
  });

  const providers = [...new Set(findings.map(f => f.provider).filter(Boolean))];
  const idTypes = [...new Set(findings.map(f => f.identity_type).filter(Boolean))];
  const findingTypes = [...new Set(findings.map(f => f.finding_type).filter(Boolean))];

  const avgInactive = findings.length
    ? Math.round(findings.reduce((s, f) => s + (f.days_inactive || 0), 0) / findings.length)
    : 0;

  const rows = filtered.map(f => {
    const bc = BLAST_COLOR[f.blast_radius] || "#64748b";
    return {
      _key: f.id,
      _cells: [
        <span className="text-[11px] font-semibold text-white">{f.identity_name || "—"}</span>,
        <span className="text-[9px] font-bold capitalize px-2 py-0.5 rounded" style={{ color: CYAN, background: "rgba(0,212,255,0.1)" }}>{f.identity_type || "—"}</span>,
        <span className="text-[9px] capitalize text-slate-300">{(f.finding_type || "—").replace(/_/g, " ")}</span>,
        // Permissions bar
        <div className="flex items-center gap-2 min-w-32">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: "100%", background: "rgba(239,68,68,0.3)" }} />
          </div>
          <span className="text-[8px] text-slate-500 w-6">ALL</span>
        </div>,
        <span className="text-[10px] font-mono" style={{ color: (f.days_inactive || 0) > 90 ? DANGER : (f.days_inactive || 0) > 30 ? "#eab308" : "#64748b" }}>
          {f.days_inactive != null ? `${f.days_inactive}d` : "—"}
        </span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: bc, background: `${bc}18` }}>
          {(f.blast_radius || "—").replace(/_/g, " ")}
        </span>,
        <SevBadge sev={f.severity} />,
        <StatusBadge status={f.status} />,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Cloud", path: "/cloud" }, { label: "CIEM" }]}
      title="CIEM — Identity Threats" subtitle="CLOUD IDENTITY & ENTITLEMENT MANAGEMENT · ACCESS RISK"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {[
            ["provider", provider, setProvider, ["all", ...providers]],
            ["identity type", idType, setIdType, ["all", ...idTypes]],
            ["finding type", findingType, setFindingType, ["all", ...findingTypes]],
          ].map(([key, val, set, opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o.replace(/_/g, " ")}</option>)}
            </select>
          ))}
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Identity Threats" value={findings.length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Overprivileged" value={findings.filter(f => f.finding_type === "overprivileged").length} color="#f97316" icon={Users} />
        <StatCard label="Stale Keys" value={findings.filter(f => f.finding_type === "stale_credential").length} color="#eab308" icon={Key} />
        <StatCard label="Escalation Paths" value={findings.filter(f => f.finding_type === "privilege_escalation_path").length} color={DANGER} icon={TrendingUp} />
        <StatCard label="Avg Days Inactive" value={avgInactive} color={avgInactive > 90 ? DANGER : "#64748b"} icon={Lock} />
      </div>

      <GDSTable
        columns={["Identity Name", "Type", "Finding Type", "Permissions Scope", "Days Inactive", "Blast Radius", "Severity", "Status"]}
        rows={rows} isLoading={isLoading}
        emptyText="No identity threat findings" />
    </GDSPageShell>
  );
}