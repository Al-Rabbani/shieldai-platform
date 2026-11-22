import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { GitBranch, AlertTriangle, Search, Activity } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";

const STATUS_COLOR = {
  clean: SUCCESS,
  suspicious: "#ffb83b",
  compromised: DANGER,
  investigating: C,
};

function TraceBadge({ status }) {
  const color = STATUS_COLOR[status] || "#64748b";
  return <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>{status || "—"}</span>;
}

const ENV_COLOR = { production: DANGER, staging: "#ffb83b", development: SUCCESS, testing: C };

export default function CodeToCloudPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [env, setEnv] = useState("all");

  const { data: traces = [], isLoading } = useQuery({
    queryKey: ["code-to-cloud-traces"],
    queryFn: () => base44.entities.CodeToCloudTrace.list("-traced_at", 300).catch(() => []),
    initialData: [], refetchInterval: 30000,
  });

  const filtered = traces.filter(t => {
    if (status !== "all" && t.trace_status !== status) return false;
    if (env !== "all" && t.deployment_environment !== env) return false;
    if (search && !t.repository?.toLowerCase().includes(search.toLowerCase()) && !t.developer?.toLowerCase().includes(search.toLowerCase()) && !t.commit_id?.includes(search)) return false;
    return true;
  });

  const rows = filtered.slice(0, 200).map((t, i) => {
    const confColor = (t.trace_confidence || 0) > 80 ? SUCCESS : (t.trace_confidence || 0) > 50 ? "#ffb83b" : DANGER;
    const envColor = ENV_COLOR[t.deployment_environment] || "#64748b";
    return {
      _key: t.id || i,
      _cells: [
        <span className="text-[9px] font-mono" style={{ color: C }}>{t.trace_id || t.id?.slice(0, 10) || `TR-${i + 1}`}</span>,
        <span className="text-[10px] font-semibold text-white">{t.repository || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{t.commit_id?.slice(0, 8) || "—"}</span>,
        <span className="text-[9px] text-slate-300">{t.developer || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400 truncate max-w-32 block">{t.cicd_workflow || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: envColor, background: `${envColor}18` }}>{t.deployment_environment || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{t.cloud_account || "—"}</span>,
        <span className="text-[9px] text-slate-300 truncate max-w-32 block">{t.affected_asset || "—"}</span>,
        <TraceBadge status={t.trace_status} />,
        <div className="flex items-center gap-1.5">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${t.trace_confidence || 0}%`, background: confColor }} />
          </div>
          <span className="text-[9px] font-mono" style={{ color: confColor }}>{t.trace_confidence ?? "—"}%</span>
        </div>,
      ],
    };
  });

  return (
    <GDSPageShell breadcrumbs={[{ label: "Cloud Security", path: "/cloud" }, { label: "Code-to-Cloud Trace" }]}
      title="Code-to-Cloud Trace" subtitle="COMMIT → CI/CD → DEPLOY → RUNTIME · END-TO-END TRACEABILITY"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Repo, developer, commit…" className="w-36 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Status</option>
            {["clean","suspicious","compromised","investigating"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={env} onChange={e => setEnv(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Envs</option>
            {["production","staging","development","testing"].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      }>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Traces" value={traces.length} color={C} icon={Activity} />
        <StatCard label="Compromised" value={traces.filter(t => t.trace_status === "compromised").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Suspicious" value={traces.filter(t => t.trace_status === "suspicious").length} color="#ffb83b" icon={AlertTriangle} />
        <StatCard label="Production" value={traces.filter(t => t.deployment_environment === "production").length} color={DANGER} icon={GitBranch} />
      </div>
      <GDSTable
        columns={["Trace ID","Repository","Commit ID","Developer","CI/CD Workflow","Environment","Cloud Account","Affected Asset","Trace Status","Confidence"]}
        rows={rows} isLoading={isLoading} emptyText="No code-to-cloud traces found" />
    </GDSPageShell>
  );
}